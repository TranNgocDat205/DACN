"""Offline verification of official-source search, safety and citation behavior."""
import sys
from pathlib import Path
import tempfile
import pytest
import httpx
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import main
import official_sources

HEADERS = {"X-Internal-Key": main.INTERNAL_KEY}
CLIENT = TestClient(main.app)

@pytest.fixture(autouse=True)
def no_llm(monkeypatch):
    monkeypatch.setattr(main,"API_KEY","")
    monkeypatch.setattr(main,"EMBED_MODEL","")


def test_official_catalog_requires_internal_key():
    assert CLIENT.post("/rag/official/catalog",json={"query":"authentication"}).status_code==401
    result=CLIENT.post("/rag/official/catalog",headers=HEADERS,json={"query":"authentication"}).json()
    assert result["results"]
    assert all(item["url"].startswith("https://") for item in result["results"])
    assert all(item["verified"] is False and item["status"]=="catalog_only" for item in result["results"])


def test_search_vietnamese_can_find_owasp_and_scrum():
    auth=official_sources.search_catalog("bảo mật đăng nhập xác thực",10)
    assert any(s["id"]=="owasp-auth" for s in auth)
    scrum=official_sources.search_catalog("kế hoạch Sprint Scrum",10)
    assert any(s["id"]=="scrum-guide" for s in scrum)


def test_unknown_source_blocked_before_network():
    with tempfile.TemporaryDirectory() as folder:
        old=main.DATA_DIR
        main.DATA_DIR=Path(folder)
        try:
            response=CLIENT.post("/rag/official/import",headers=HEADERS,
                     json={"project_id":42,"source_id":"http://127.0.0.1/private"})
            assert response.status_code==404
            assert not list(Path(folder).glob("**/*"))
        finally:
            main.DATA_DIR=old


def test_official_import_requires_successful_fetch(monkeypatch):
    async def fail(id):
        raise RuntimeError("HTTP 302 blocked")
    monkeypatch.setattr(main,"fetch_official",fail)
    with tempfile.TemporaryDirectory() as folder:
        monkeypatch.setattr(main,"DATA_DIR",Path(folder))
        response=CLIENT.post("/rag/official/import",headers=HEADERS,
                  json={"project_id":17,"source_id":"nist-ssdf"})
        assert response.status_code==502
        assert main.read_index(17)==[]


def test_import_is_project_scoped_idempotent_and_citable(monkeypatch):
    async def fake(id):
        meta=official_sources.SOURCE_BY_ID[id]
        return {"id":id,"title":meta["title"],"publisher":meta["publisher"],
                "url":meta["url"],"text":"Authentication requires a strong secret and well configured sessions. "*15,
                "fetchedAt":"2026-10-19T10:00:00+00:00","sha256":"f"*64}
    monkeypatch.setattr(main,"fetch_official",fake)
    with tempfile.TemporaryDirectory() as folder:
        monkeypatch.setattr(main,"DATA_DIR",Path(folder))
        body={"project_id":91,"source_id":"owasp-auth"}
        reply=CLIENT.post("/rag/official/import",headers=HEADERS,json=body)
        assert reply.status_code==200,reply.text
        indexed=reply.json()
        assert indexed["sourceType"]=="OFFICIAL"
        assert indexed["sourceUrl"]==official_sources.SOURCE_BY_ID["owasp-auth"]["url"]
        assert indexed["chunks"]>0
        assert CLIENT.post("/rag/official/import",headers=HEADERS,json=body).json()["alreadyIndexed"] is True
        q={"project_id":91,"question":"authentication sessions"}
        ans=CLIENT.post("/rag/chat",headers=HEADERS,json=q).json()
        assert ans["mode"]=="retrieval_only"
        assert any(s["url"]==indexed["sourceUrl"] and s["publisher"]=="OWASP" for s in ans["sources"])
        other=CLIENT.post("/rag/chat",headers=HEADERS,json={**q,"project_id":92}).json()
        assert other["sources"]==[]
        assert CLIENT.delete(f"/rag/documents/91/{indexed['document_id']}",headers=HEADERS).status_code==200
        assert main.read_index(91)==[]


def test_live_chat_succeeds_only_if_publisher_page_fetched(monkeypatch):
    async def fake(id):
        meta=official_sources.SOURCE_BY_ID[id]
        return {"id":id,"title":meta["title"],"publisher":meta["publisher"],
                "url":meta["url"],"text":"Scrum Sprint planning backlog review retrospective and team goals. "*20,
                "fetchedAt":"2026-10-19T10:00:00+00:00"}
    monkeypatch.setattr(main,"fetch_official",fake)
    with tempfile.TemporaryDirectory() as folder:
        monkeypatch.setattr(main,"DATA_DIR",Path(folder))
        answer=CLIENT.post("/rag/chat",headers=HEADERS,json={
            "project_id":3,"question":"scrum sprint planning backlog", "include_official_sources":True}).json()
        assert answer["sources"]
        assert all(s["sourceType"]=="OFFICIAL_LIVE" and s["url"].startswith("https://") for s in answer["sources"])
        assert main.read_index(3)==[], "Live retrieval must not silently import into project"


def test_live_chat_failure_does_not_fake_a_source(monkeypatch):
    async def fail(id): raise RuntimeError("HTTP 302 blocked")
    monkeypatch.setattr(main,"fetch_official",fail)
    with tempfile.TemporaryDirectory() as folder:
        monkeypatch.setattr(main,"DATA_DIR",Path(folder))
        answer=CLIENT.post("/rag/chat",headers=HEADERS,json={
            "project_id":3,"question":"scrum sprint planning", "include_official_sources":True}).json()
        assert answer["sources"]==[]
        assert answer["warnings"]


def test_html_parser_drops_site_scripts_and_navigation():
    document='<html><nav><p>Ignore navbar full text</p></nav><script><p>Ignore attack text!</p></script>' \
        '<main><h1>Official RAG Evidence About Requirements and Testing</h1>' \
        '<p>The published guidance recommends a process for validating inputs.</p></main></html>'
    parser=official_sources.PublicDocumentHTML()
    parser.feed(document)
    extracted=parser.content()
    assert 'Official RAG Evidence' in extracted
    assert 'validating inputs' in extracted
    assert 'Ignore navbar' not in extracted
    assert 'attack text' not in extracted


@pytest.mark.asyncio
async def test_http_redirect_rejected_not_followed(monkeypatch):
    # Mock a real HTTP transport, with a redirect pointing to a private address.
    class MockClient:
        def __init__(self,**kwargs):
            assert kwargs["follow_redirects"] is False
            assert kwargs["trust_env"] is False
        async def __aenter__(self):return self
        async def __aexit__(self,*args):pass
        def stream(self,*args,**kwargs):return MockResponse()
    class MockResponse:
        status_code=302
        headers={"location":"http://127.0.0.1/admin","content-type":"text/html"}
        async def __aenter__(self):return self
        async def __aexit__(self,*args):pass
    monkeypatch.setattr(official_sources.httpx,"AsyncClient",MockClient)
    with pytest.raises(RuntimeError,match="302"):
        await official_sources.fetch_official("owasp-auth")
