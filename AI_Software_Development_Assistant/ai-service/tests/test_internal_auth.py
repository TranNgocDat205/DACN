"""Local internal handshake tests; these never contact a paid LLM provider."""
import sys
from pathlib import Path
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import main


def test_internal_check_requires_key():
    client = TestClient(main.app)
    assert client.get('/internal/check').status_code == 401
    assert client.get('/internal/check', headers={'X-Internal-Key': 'wrong-credential'}).status_code == 401


def test_internal_check_accepts_key_without_llm_call(monkeypatch):
    client = TestClient(main.app)
    def no_api(*args, **kwargs):
        raise AssertionError('Must not invoke FastRouter')
    monkeypatch.setattr(main, 'call_chat', no_api)
    reply = client.get('/internal/check', headers={'X-Internal-Key': main.INTERNAL_KEY})
    assert reply.status_code == 200
    assert reply.json()['authenticated'] is True


def test_health_endpoint_reports_setup_not_actual_upstream_status():
    result = TestClient(main.app).get('/health')
    assert result.status_code == 200
    assert result.json()['status'] == 'ok'
    assert 'llm_configured' in result.json()
