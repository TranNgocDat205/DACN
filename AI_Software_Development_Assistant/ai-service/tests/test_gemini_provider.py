"""No paid Google calls are made in these tests."""
import asyncio
import json
import httpx
import pytest
from fastapi import HTTPException
import main


def _mock_client(monkeypatch, handler):
    original_client = httpx.AsyncClient
    def factory(*args, **kwargs):
        kwargs['transport'] = httpx.MockTransport(handler)
        return original_client(*args, **kwargs)
    monkeypatch.setattr(main.httpx, 'AsyncClient', factory)


def test_gemini_routes_chat_and_keeps_secret_in_auth_header(monkeypatch):
    requests = []
    def handler(req):
        requests.append(req)
        return httpx.Response(200, json={'choices': [{'message': {'content': '{"summary":"ok"}'}}]})
    _mock_client(monkeypatch, handler)
    monkeypatch.setattr(main, 'AI_PROVIDER', 'gemini')
    monkeypatch.setattr(main, 'GEMINI_API_KEY', 'test-only-google-key')
    monkeypatch.setattr(main, 'GEMINI_MODEL', 'gemini-3.5-flash-lite')
    monkeypatch.setattr(main, 'FORCE_JSON_FORMAT', False)
    answer = asyncio.run(main.call_chat('Return JSON', 'Analyze requirement', json_mode=True))
    assert json.loads(answer)['summary'] == 'ok'
    req = requests[0]
    assert str(req.url) == 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
    assert req.headers['Authorization'] == 'Bearer test-only-google-key'
    assert 'test-only-google-key' not in req.content.decode('utf-8')
    assert json.loads(req.content)['model'] == 'gemini-3.5-flash-lite'


def test_gemini_health_hides_key_and_selected_model(monkeypatch):
    monkeypatch.setattr(main, 'AI_PROVIDER', 'gemini')
    monkeypatch.setattr(main, 'GEMINI_API_KEY', 'test-only-google-key')
    result = main.health()
    assert result['provider'] == 'Gemini'
    assert result['model'] == main.GEMINI_MODEL
    assert result['llm_configured'] is True
    assert 'test-only-google-key' not in json.dumps(result)


def test_gemini_no_key_does_not_call_external_api(monkeypatch):
    monkeypatch.setattr(main, 'AI_PROVIDER', 'gemini')
    monkeypatch.setattr(main, 'GEMINI_API_KEY', '')
    assert asyncio.run(main.call_chat('system', 'prompt')) is None
    assert main.health()['llm_configured'] is False


def test_unsupported_provider_is_not_silently_routed(monkeypatch):
    monkeypatch.setattr(main, 'AI_PROVIDER', 'unknown-provider')
    with pytest.raises(HTTPException) as exc:
        asyncio.run(main.call_chat('sys', 'prompt'))
    assert exc.value.status_code == 503


def test_gemini_errors_do_not_echo_secret(monkeypatch):
    def handler(req):
        return httpx.Response(403, json={'error': {'message': 'key test-only-google-key is blocked'}})
    _mock_client(monkeypatch, handler)
    monkeypatch.setattr(main, 'AI_PROVIDER', 'gemini')
    monkeypatch.setattr(main, 'GEMINI_API_KEY', 'test-only-google-key')
    with pytest.raises(HTTPException) as exc:
        asyncio.run(main.call_chat('sys', 'prompt'))
    assert exc.value.status_code == 502
    assert '403' in exc.value.detail
    assert 'test-only-google-key' not in exc.value.detail
