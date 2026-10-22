import asyncio
import json
import httpx
import pytest
from fastapi import HTTPException
import main


def test_fastrouter_chat_endpoint_and_json_compatibility(monkeypatch):
    sent = {}
    original_async_client = httpx.AsyncClient

    def handle(request):
        sent['url'] = str(request.url)
        sent['auth'] = request.headers.get('authorization')
        sent['json'] = json.loads(request.content)
        return httpx.Response(200, json={'choices':[{'message':{'content':json.dumps({'summary':'AI trả lời'})}}]})

    def factory(*args, **kwargs):
        kwargs['transport'] = httpx.MockTransport(handle)
        return original_async_client(*args, **kwargs)

    monkeypatch.setattr(main, 'API_KEY', 'dummy-for-test-not-real')
    monkeypatch.setattr(main, 'API_BASE', 'https://api.fastrouter.ai/api/v1')
    monkeypatch.setattr(main, 'MODEL', 'fastrouter/auto')
    monkeypatch.setattr(main, 'FORCE_JSON_FORMAT', False)
    monkeypatch.setattr(main.httpx, 'AsyncClient', factory)
    result = asyncio.run(main.call_chat('Return JSON', 'Yêu cầu đăng nhập', json_mode=True))
    assert json.loads(result)['summary'] == 'AI trả lời'
    assert sent['url'] == 'https://api.fastrouter.ai/api/v1/chat/completions'
    assert sent['auth'] == 'Bearer dummy-for-test-not-real'
    assert sent['json']['model'] == 'fastrouter/auto'
    assert 'response_format' not in sent['json']


def test_fastrouter_failed_auth_does_not_expose_key(monkeypatch):
    original_async_client = httpx.AsyncClient
    def factory(*args, **kwargs):
        kwargs['transport'] = httpx.MockTransport(lambda request: httpx.Response(401, json={'error':{'message':'invalid key'}}))
        return original_async_client(*args, **kwargs)
    monkeypatch.setattr(main, 'API_KEY', 'dummy-secret-for-test')
    monkeypatch.setattr(main, 'API_BASE', 'https://api.fastrouter.ai/api/v1')
    monkeypatch.setattr(main.httpx, 'AsyncClient', factory)
    with pytest.raises(HTTPException) as caught:
        asyncio.run(main.call_chat('test', 'test', json_mode=True))
    assert caught.value.status_code == 502
    assert 'HTTP 401' in caught.value.detail
    assert 'dummy-secret-for-test' not in caught.value.detail
