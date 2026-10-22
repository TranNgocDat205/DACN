import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1]))
import main
import pytest
from fastapi.testclient import TestClient

@pytest.fixture(autouse=True)
def offline_demo_mode(monkeypatch):
    monkeypatch.setattr(main, "API_KEY", "")
    monkeypatch.setattr(main, "EMBED_MODEL", "")

CLIENT = TestClient(main.app)
HEADERS = {"X-Internal-Key": main.INTERNAL_KEY}

def test_auth_protected():
    assert CLIENT.post("/ai/analyze",json={"title":"Login","description":"Login"}).status_code == 401
    assert CLIENT.get("/health").status_code == 200

def test_heuristic_ai_endpoints():
    assert CLIENT.post("/ai/analyze",headers=HEADERS,json={"title":"Login","description":"Email + password"}).status_code == 200
    stories=CLIENT.post("/ai/stories",headers=HEADERS,json={"title":"Login","description":"User login"}).json()
    assert stories["stories"] and stories["stories"][0]["title"] == "Login"
    criteria=CLIENT.post("/ai/criteria",headers=HEADERS,json={"title":"Login","narrative":"As a user ..."}).json()
    assert len(criteria["criteria"]) >= 3

def test_chunk_and_vector():
    assert main.chunks_from_document("readme.txt",b"hello "*500)
    a=main.hashed_vector("login email password")
    b=main.hashed_vector("login email password")
    assert len(a)==768 and main.cosine(a,b)>0.99
    assert main.cosine(a,main.hashed_vector("unrelated fox")) < 0.9

def test_project_rag_scoping_upload_and_delete(monkeypatch):
    with tempfile.TemporaryDirectory() as directory:
        monkeypatch.setattr(main,"DATA_DIR",Path(directory))
        project=991001
        response=CLIENT.post("/rag/upload",headers=HEADERS,
              data={"project_id":str(project)},files={"file":("api.txt",b"API login uses HTTP POST method at /api/auth/login and requires email and password.","text/plain")})
        assert response.status_code==200, response.text
        doc=response.json()
        assert doc["chunks"]==1
        answer=CLIENT.post("/rag/chat",headers=HEADERS,json={"project_id":project,"question":"login POST method"})
        assert answer.status_code==200 and answer.json()["sources"]
        other=CLIENT.post("/rag/chat",headers=HEADERS,json={"project_id":project+1,"question":"login POST"}).json()
        assert not other["sources"]
        delete=CLIENT.delete(f"/rag/documents/{project}/{doc['document_id']}",headers=HEADERS)
        assert delete.status_code==200
        assert CLIENT.post("/rag/chat",headers=HEADERS,json={"project_id":project,"question":"login POST"}).json()["sources"]==[]

def test_upload_rejects_unsupported_file(monkeypatch):
    with tempfile.TemporaryDirectory() as directory:
        monkeypatch.setattr(main,"DATA_DIR",Path(directory))
        resp=CLIENT.post("/rag/upload",headers=HEADERS,data={"project_id":"1"},files={"file":("hack.exe",b"hi")})
        assert resp.status_code==415
