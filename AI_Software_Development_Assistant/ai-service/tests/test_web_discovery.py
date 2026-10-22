"""Network-mocked verification of dynamic official-domain Web Search -> RAG."""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import pytest
from fastapi.testclient import TestClient
import main
import web_discovery

CLIENT = TestClient(main.app)
HEADERS = {'X-Internal-Key':main.INTERNAL_KEY}

@pytest.fixture(autouse=True)
def isolated_config(monkeypatch,tmp_path):
    monkeypatch.setattr(main,'API_KEY','')
    monkeypatch.setattr(main,'EMBED_MODEL','')
    monkeypatch.setattr(main,'DATA_DIR',tmp_path)
    monkeypatch.delenv('BRAVE_SEARCH_API_KEY',raising=False)
    monkeypatch.delenv('TAVILY_API_KEY',raising=False)


def test_strict_url_allowlist_rejects_ssrf_and_lookalikes():
    invalid = [
        'http://owasp.org/document', 'https://owasp.org.evil.example/doc',
        'https://evil.owasp.org/doc','https://127.0.0.1/admin',
        'https://169.254.169.254/latest/meta-data',
        'https://username@owasp.org/file', 'https://owasp.org:444/admin',
        'https://owasp.org\\@127.0.0.1/a','https://owasp.org/a\nB',
        'https://owasp.org:'+'a'*1000,
    ]
    for url in invalid:
        with pytest.raises(ValueError):
            web_discovery.validate_official_url(url)
    clean, meta = web_discovery.validate_official_url('https://owasp.org/www-project-top-ten/#foo')
    assert clean == 'https://owasp.org/www-project-top-ten/'
    assert meta['publisher']=='OWASP'


def test_no_key_is_explicit_catalog_fallback():
    reply=CLIENT.post('/rag/official/discover',headers=HEADERS,
                      json={'query':'AI Software Testing best practices','limit':6})
    assert reply.status_code==200
    data=reply.json()
    assert data['searchMode']=='catalog_fallback'
    assert 'TAVILY_API_KEY' in data['notice']
    assert all(x['status']=='catalog_only' for x in data['results'])


def test_discover_requires_internal_auth():
    reply=CLIENT.post('/rag/official/discover',json={'query':'AI Software Testing'})
    assert reply.status_code==401
    reply=CLIENT.post('/rag/official/import-url',json={'project_id':3,'url':'https://owasp.org/a'})
    assert reply.status_code==401


@pytest.mark.asyncio
async def test_search_filters_untrusted_search_provider_urls(monkeypatch):
    monkeypatch.setenv('BRAVE_SEARCH_API_KEY','test-fake-key')
    calls=[]
    class FakeResponse:
        status_code=200
        def json(self):
            return {'web':{'results':[
                {'url':'https://evil.example/steal','title':'Evil Testing', 'description':'not official'},
                {'url':'https://owasp.org.evil.example/unsafe','title':'Fake OWASP'},
                {'url':'https://owasp.org/www-project-web-security-testing-guide/',
                 'title':'OWASP Web Security Testing Guide','description':'A testing guide on OWASP'},
                {'url':'https://owasp.org/www-project-web-security-testing-guide/#section',
                 'title':'Duplicate','description':'Duplicate via fragment'},
            ]}}
    class FakeClient:
        def __init__(self,**kw):
            assert kw['trust_env'] is False
        async def __aenter__(self):return self
        async def __aexit__(self,*args):return False
        async def get(self,url,params,headers,follow_redirects):
            assert url == web_discovery.SEARCH_URL
            assert headers['X-Subscription-Token']=='test-fake-key'
            assert params['q'].count('site:') == 1
            assert follow_redirects is False
            calls.append(params['q'])
            return FakeResponse()
    monkeypatch.setattr(web_discovery.httpx, 'AsyncClient',FakeClient)
    result=await web_discovery.search_official_web('AI Software Testing best practices',10)
    assert calls and result['searchMode']=='brave_official_domains'
    assert len(result['results']) == 1
    candidate=result['results'][0]
    assert candidate['url'].startswith('https://owasp.org/')
    assert candidate['verified'] is False
    assert candidate['credibility']['method']=='allowlisted_hostname_only'
    assert 'chưa kiểm chứng' in candidate['credibility']['basis']


def test_web_import_refuses_unknown_hosts_without_fetch(monkeypatch):
    async def no_fetch(*args):
        raise AssertionError('Must never access network for external host')
    monkeypatch.setattr(main,'fetch_trusted_url',no_fetch)
    response=CLIENT.post('/rag/official/import-url',headers=HEADERS,
              json={'project_id':2,'url':'https://example.com/private'})
    assert response.status_code==422
    assert main.read_index(2)==[]


def test_verified_web_import_idempotence_project_scope_and_citations(monkeypatch):
    pages=[]
    async def fetch(url):
        pages.append(url)
        return {'title':'Official Web Security Testing Guide',
                'publisher':'OWASP','url':url,
                'text':'Software testing best practices include verifying inputs, checking access control, and automated regression testing. '*20,
                'fetchedAt':'2026-10-19T16:01:00+00:00','sha256':'d'*64}
    monkeypatch.setattr(main,'fetch_trusted_url',fetch)
    url='https://owasp.org/www-project-web-security-testing-guide/'
    first=CLIENT.post('/rag/official/import-url',headers=HEADERS,
                  json={'project_id':8,'url':url})
    assert first.status_code==200,first.text
    imported=first.json()
    assert imported['verified'] is True
    assert imported['sourceUrl']==url
    assert imported['sourceType']=='OFFICIAL'
    assert imported['document_id'].startswith('official-web-')
    assert imported['chunks']>0
    repeat=CLIENT.post('/rag/official/import-url',headers=HEADERS,
                       json={'project_id':8,'url':url}).json()
    assert repeat['alreadyIndexed'] is True
    assert len(pages)==1
    answer=CLIENT.post('/rag/chat',headers=HEADERS,
                 json={'project_id':8,'question':'software testing best practices'}).json()
    assert any(s['url']==url and s['publisher']=='OWASP' and s['trustLevel']=='official_domain' for s in answer['sources'])
    other=CLIENT.post('/rag/chat',headers=HEADERS,
                 json={'project_id':9,'question':'software testing best practices'}).json()
    assert not other['sources']
    assert CLIENT.delete('/rag/documents/8/'+imported['document_id'],headers=HEADERS).status_code==200
    assert main.read_index(8)==[]


def test_failed_page_fetch_never_indexes(monkeypatch):
    async def bad(url):
        raise RuntimeError('HTTP 302 redirect blocked')
    monkeypatch.setattr(main,'fetch_trusted_url',bad)
    answer=CLIENT.post('/rag/official/import-url',headers=HEADERS,
        json={'project_id':11,'url':'https://docs.python.org/3/library/unittest.html'})
    assert answer.status_code==502
    assert main.read_index(11)==[]


@pytest.mark.asyncio
async def test_tavily_preferred_single_call_filters_urls_and_deduplicates(monkeypatch):
    monkeypatch.setenv('TAVILY_API_KEY','dummy-unit-test-secret')
    monkeypatch.setenv('BRAVE_SEARCH_API_KEY','legacy-fake-key')
    calls=[]

    class FakeResponse:
        status_code=200
        def json(self):
            return {'results':[
                {'url':'https://owasp.org.evil.example/bad','title':'Fake'},
                {'url':'https://localhost/private','title':'Private'},
                {'url':'https://owasp.org/www-project-web-security-testing-guide/',
                 'title':'OWASP Web Security Testing Guide', 'content':'Official guide to testing software.'},
                {'url':'https://owasp.org/www-project-web-security-testing-guide/#duplicate',
                 'title':'Duplicate', 'content':'Duplicate'},
                {'url':'https://docs.spring.io/spring-boot/reference/testing/index.html',
                 'title':'Testing Spring Boot', 'content':'Spring tests'},
            ]}

    class FakeClient:
        def __init__(self, **kwargs):
            assert kwargs['trust_env'] is False
        async def __aenter__(self): return self
        async def __aexit__(self, *args): return False
        async def post(self, url, json, headers, follow_redirects):
            assert url == web_discovery.TAVILY_SEARCH_URL
            assert headers['Authorization']=='Bearer dummy-unit-test-secret'
            assert follow_redirects is False
            assert json['search_depth']=='basic'
            assert json['include_answer'] is False
            assert json['include_raw_content'] is False
            assert all(host in web_discovery.BY_HOST for host in json['include_domains'])
            assert len(json['include_domains'])<=8
            calls.append(json)
            return FakeResponse()

    monkeypatch.setattr(web_discovery.httpx,'AsyncClient',FakeClient)
    response=await web_discovery.search_official_web('AI Software Testing best practices',10)
    assert len(calls)==1, 'Use one Tavily request per user search to save credits'
    assert response['searchMode']=='tavily_official_domains'
    assert len(response['results'])==2
    assert all(r['verified'] is False and r['status']=='search_candidate' for r in response['results'])
    assert response['results'][0]['publisher']=='OWASP'
    assert response['results'][0]['snippet']=='Official guide to testing software.'
    assert not any('dummy-unit-test-secret' in str(v) for v in response.values())


@pytest.mark.asyncio
async def test_tavily_failure_does_not_fake_results_or_leak_key(monkeypatch):
    monkeypatch.setenv('TAVILY_API_KEY','dummy-unit-test-secret')
    class FakeResponse:
        status_code=429
    class FakeClient:
        def __init__(self, **kw): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *args): return False
        async def post(self, *args, **kwargs): return FakeResponse()
    monkeypatch.setattr(web_discovery.httpx,'AsyncClient',FakeClient)
    response=await web_discovery.search_official_web('software testing',10)
    assert response['results']==[]
    assert response['searchMode']=='tavily_official_domains'
    assert any('429' in w for w in response['warnings'])
    assert 'dummy-unit-test-secret' not in str(response)


def test_tavily_dynamic_search_used_in_chat_when_enabled(monkeypatch):
    monkeypatch.setenv('TAVILY_API_KEY','dummy-unit-test-secret')
    async def fake_search(query,limit):
        return {'searchMode':'tavily_official_domains','results':[
            {'url':'https://owasp.org/www-project-web-security-testing-guide/',
             'title':'OWASP Web Security Testing Guide','publisher':'OWASP'}]}
    async def fake_fetch(url):
        return {'title':'Testing Guide','publisher':'OWASP','url':url,
            'text':'The official testing guide discusses software security testing, validation, and quality assurance. '*20,
            'fetchedAt':'2026-10-19T16:00:00+00:00'}
    monkeypatch.setattr(main,'search_official_web',fake_search)
    monkeypatch.setattr(main,'fetch_trusted_url',fake_fetch)
    response=CLIENT.post('/rag/chat',headers=HEADERS,json={
        'project_id':4,'question':'software security testing','include_official_sources':True})
    assert response.status_code==200,response.text
    obj=response.json()
    assert obj['sources'] and obj['sources'][0]['sourceType']=='OFFICIAL_LIVE'
    assert obj['sources'][0]['url'].startswith('https://owasp.org/')
    assert main.read_index(4)==[], 'Live RAG should not persist without explicit import'
