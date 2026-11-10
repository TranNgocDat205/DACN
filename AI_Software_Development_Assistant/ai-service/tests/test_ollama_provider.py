"""Offline integration tests: no Ollama process or network required."""
import asyncio
import json
import httpx
import main


def mock_http(monkeypatch, handler):
    original = httpx.AsyncClient
    monkeypatch.setattr(main.httpx, "AsyncClient", lambda *a, **kw: original(*a, transport=httpx.MockTransport(handler), **kw))


def test_local_chat_no_cloud_key(monkeypatch):
    calls = []
    def handler(req):
        calls.append(req)
        return httpx.Response(200, json={"choices": [{"message": {"content": "Xin chào"}}]})
    mock_http(monkeypatch, handler)
    monkeypatch.setattr(main, "AI_PROVIDER", "ollama")
    assert asyncio.run(main.call_chat("system", "hello")) == "Xin chào"
    assert str(calls[0].url) == "http://127.0.0.1:11434/v1/chat/completions"
    assert "authorization" not in calls[0].headers
    assert json.loads(calls[0].content)["model"] == main.OLLAMA_MODEL
    assert main.health()["local_mode"] is True


def test_local_embedding(monkeypatch):
    def handler(req):
        assert str(req.url) == "http://127.0.0.1:11434/api/embed"
        return httpx.Response(200, json={"embeddings": [[3.0, 4.0]]})
    mock_http(monkeypatch, handler)
    monkeypatch.setattr(main, "AI_PROVIDER", "ollama")
    monkeypatch.setattr(main, "OLLAMA_EMBED_MODEL", "nomic-embed-text")
    vector, mode = asyncio.run(main.embed("some text"))
    assert vector == [0.6, 0.8]
    assert mode == "ollama:nomic-embed-text"


def test_local_embedding_failure_is_not_silent(monkeypatch):
    def handler(req):
        return httpx.Response(404, json={"error": "model not found"})
    mock_http(monkeypatch, handler)
    monkeypatch.setattr(main, "AI_PROVIDER", "ollama")
    monkeypatch.setattr(main, "OLLAMA_EMBED_MODEL", "nomic-embed-text")
    try:
        asyncio.run(main.embed("some text"))
        assert False, "Expected HTTPException"
    except Exception as exc:
        assert getattr(exc, "status_code", None) == 502
