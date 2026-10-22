"""Security tests: safe canonical redirects and key-presence diagnostics."""
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import main
import official_sources


@pytest.mark.parametrize('location', [
    'http://127.0.0.1/admin',
    'https://learn.microsoft.com.evil.example/docs',
    'http://learn.microsoft.com/en-us/docs',
    'https://username@learn.microsoft.com/en-us/docs',
])
@pytest.mark.asyncio
async def test_redirect_does_not_escape_allowlist(monkeypatch, location):
    class Response:
        status_code=301
        headers={'location':location}
        async def __aenter__(self):return self
        async def __aexit__(self,*args):return False
    class Client:
        def __init__(self,**kwargs):
            assert kwargs['follow_redirects'] is False
            assert kwargs['trust_env'] is False
        async def __aenter__(self):return self
        async def __aexit__(self,*args):return False
        def stream(self,*args,**kwargs):return Response()
    monkeypatch.setattr(official_sources.httpx, 'AsyncClient',Client)
    with pytest.raises(RuntimeError, match='outside approved HTTPS domains'):
        await official_sources.fetch_trusted_url('https://learn.microsoft.com/en-us/dotnet/')


@pytest.mark.asyncio
async def test_microsoft_learn_301_to_localized_url_is_accepted(monkeypatch):
    paths=[]
    page='<html><head><title>Microsoft Learn Testing</title></head><body><main><h1>Testing best practices</h1><p>' + ('Official documentation about software testing. '*10) + '</p></main></body></html>'
    class Response:
        def __init__(self, url):
            self.url=url
            self.status_code=301 if url.endswith('/dotnet/') else 200
            self.headers={'location':'/en-us/dotnet/core/testing/'} if self.status_code==301 else {'content-type':'text/html'}
            self.encoding='utf-8'
        async def __aenter__(self):return self
        async def __aexit__(self,*args):return False
        async def aiter_bytes(self):yield page.encode('utf8')
    class Client:
        def __init__(self,**kwargs):
            assert kwargs['follow_redirects'] is False
            assert kwargs['trust_env'] is False
        async def __aenter__(self):return self
        async def __aexit__(self,*args):return False
        def stream(self, method, url, headers):
            paths.append(url)
            return Response(url)
    monkeypatch.setattr(official_sources.httpx, 'AsyncClient',Client)
    result=await official_sources.fetch_trusted_url('https://learn.microsoft.com/dotnet/')
    assert result['verified'] and result['publisher']=='Microsoft Learn'
    assert result['url']=='https://learn.microsoft.com/en-us/dotnet/core/testing/'
    assert len(paths)==2


@pytest.mark.asyncio
async def test_redirect_loops_are_rejected(monkeypatch):
    class Response:
        status_code=302
        headers={'location':'/docs/'}
        async def __aenter__(self):return self
        async def __aexit__(self,*args):return False
    class Client:
        def __init__(self,**kwargs):pass
        async def __aenter__(self):return self
        async def __aexit__(self,*args):return False
        def stream(self,*args,**kwargs):return Response()
    monkeypatch.setattr(official_sources.httpx, 'AsyncClient',Client)
    with pytest.raises(RuntimeError, match='redirect loop'):
        await official_sources.fetch_trusted_url('https://learn.microsoft.com/docs/')


def test_health_reports_provider_without_exposing_keys(monkeypatch):
    monkeypatch.setenv('TAVILY_API_KEY','private-test-secret')
    payload=TestClient(main.app).get('/health').json()
    assert payload['web_search_provider']=='tavily'
    assert payload['web_search_configured'] is True
    assert 'private-test-secret' not in str(payload)
    monkeypatch.delenv('TAVILY_API_KEY')
    monkeypatch.delenv('BRAVE_SEARCH_API_KEY',raising=False)
    payload=TestClient(main.app).get('/health').json()
    assert payload['web_search_provider']=='catalog_only'
    assert payload['web_search_configured'] is False
