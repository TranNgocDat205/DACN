"""Constrained Web Search: first-party publisher domains only, with explicit provenance.

The web-search provider finds candidate URLs; none are evidence until HTTPS fetch succeeds.
All result URLs are revalidated on the server before indexing or fetching.
"""
from __future__ import annotations

import asyncio
import hashlib
import os
import re
import unicodedata
from urllib.parse import urlsplit, urlunsplit

import httpx

# Exact hostnames (NOT eTLD matching) prevent search API snippets from causing SSRF.
# Different publishers may have multiple explicitly approved official hostnames.
TRUSTED_DOMAINS = (
    {"host":"owasp.org", "publisher":"OWASP", "topics":"software testing application security web validation secure testing best practices risks"},
    {"host":"cheatsheetseries.owasp.org", "publisher":"OWASP", "topics":"security testing authentication session validation checklist"},
    {"host":"csrc.nist.gov", "publisher":"NIST", "topics":"software testing secure development verification ssdf engineering risk best practices"},
    {"host":"pages.nist.gov", "publisher":"NIST", "topics":"software engineering security standards test assurance"},
    {"host":"docs.github.com", "publisher":"GitHub Docs", "topics":"software testing automated testing ci cd unit tests github actions development"},
    {"host":"learn.microsoft.com", "publisher":"Microsoft Learn", "topics":"software testing unit integration best practices dotnet sql testing guide"},
    {"host":"docs.python.org", "publisher":"Python Software Foundation", "topics":"python unittest development programming testing"},
    {"host":"react.dev", "publisher":"React", "topics":"react frontend testing components development user interface"},
    {"host":"docs.spring.io", "publisher":"Spring", "topics":"spring boot java testing junit integration security"},
    {"host":"spring.io", "publisher":"Spring", "topics":"spring boot java guides testing"},
    {"host":"fastapi.tiangolo.com", "publisher":"FastAPI", "topics":"fastapi python api testing pytest best practices"},
    {"host":"scrumguides.org", "publisher":"Scrum Guides", "topics":"scrum sprint agile backlog software process development"},
    {"host":"developer.mozilla.org", "publisher":"MDN Web Docs", "topics":"web browser javascript testing accessibility http frontend"},
    {"host":"www.w3.org", "publisher":"W3C", "topics":"accessibility wcag web standard conformance testing"},
    {"host":"www.typescriptlang.org", "publisher":"TypeScript", "topics":"typescript javascript types development programming"},
)
BY_HOST = {item['host']: item for item in TRUSTED_DOMAINS}
SEARCH_URL = "https://api.search.brave.com/res/v1/web/search"
TAVILY_SEARCH_URL = "https://api.tavily.com/search"


def ascii_tokens(value: str) -> set[str]:
    normalized = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode('ascii').lower()
    return {x for x in re.findall(r'[a-z0-9]+', normalized) if len(x) >= 2}


def validate_official_url(url: str) -> tuple[str, dict]:
    """Canonicalize only HTTPS URLs at an *exact* allowlisted publisher hostname."""
    if not isinstance(url, str) or len(url) > 800 or not url or any(ord(c) < 32 for c in url):
        raise ValueError('Invalid or oversized official URL')
    try:
        url_parts = urlsplit(url)
        hostname = (url_parts.hostname or '').lower().rstrip('.')
        port = url_parts.port
    except ValueError as exc:
        raise ValueError('Invalid official URL') from exc
    if (url_parts.scheme.lower() != 'https' or port is not None or
            url_parts.username is not None or url_parts.password is not None or
            hostname not in BY_HOST or url_parts.netloc.lower().rstrip('.') != hostname):
        raise ValueError('URL is outside the explicitly approved publisher domains')
    if len(url_parts.query) > 320 or len(url_parts.path) > 600:
        raise ValueError('Official URL path or query too long')
    safe_url = urlunsplit(('https', hostname, url_parts.path or '/', url_parts.query, ''))
    if len(safe_url) > 800:
        raise ValueError('Official URL exceeds database column size')
    return safe_url, BY_HOST[hostname]


def url_document_id(url: str) -> str:
    canonical, _ = validate_official_url(url)
    return 'official-web-' + hashlib.sha256(canonical.encode()).hexdigest()[:32]


def relevant_domains(query: str, max_domains: int = 4) -> list[dict]:
    terms = ascii_tokens(query)
    scored = []
    for item in TRUSTED_DOMAINS:
        score = len(terms & ascii_tokens(item['topics']))
        # Default to docs from software/QA publishers for broad queries.
        if score:
            scored.append((score, item))
    scored.sort(key=lambda pair: (-pair[0], pair[1]['host']))
    if not scored:
        defaults = ('owasp.org', 'csrc.nist.gov', 'docs.github.com', 'learn.microsoft.com')
        return [BY_HOST[host] for host in defaults[:max_domains]]
    return [item for _, item in scored[:max_domains]]


def credibility(domain: dict, url: str = '', fetched: bool = False) -> dict:
    # Transparent provenance *signals*, not an assessment of the author's accuracy.
    doc_path = any(word in (urlsplit(url).path or '').lower()
                   for word in ('/docs/', '/guides/', '/guide/', '/testing/', '/reference/', '/cheatsheets/'))
    score = 80 + (5 if doc_path else 0) + (10 if fetched else 0)
    return {
        'score': score,
        'label': 'Trang thuộc tên miền chính thức',
        'basis': (f"Tên miền được cho phép: {domain['host']} (70đ); HTTPS (10đ); "
                  f"đường dẫn tài liệu (+5đ nếu có): {'có' if doc_path else 'không'}; "
                  f"đã tải HTML hợp lệ (+10đ nếu có): {'có' if fetched else 'chưa'}. "
                  'Điểm không xác nhận tính đúng đắn; vẫn chưa kiểm chứng nội dung chuyên môn.'),
        'method': 'allowlisted_hostname_only',
    }


def clean_excerpt(raw: object, limit: int) -> str:
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]*>', ' ', str(raw or ''))).strip()[:limit]


def _build_candidates(batches: list[list[dict]], limit: int, provider: str, hosts: list[dict], warnings: list[str]) -> dict:
    """Normalize providers identically and re-check *every* external URL."""
    results, seen = [], set()
    for batch in batches:
        for entry in batch:
            if not isinstance(entry, dict):
                continue
            try:
                canonical, domain = validate_official_url(entry.get('url', ''))
            except ValueError:
                continue
            if canonical in seen:
                continue
            seen.add(canonical)
            results.append({
                'id': url_document_id(canonical),
                'title': clean_excerpt(entry.get('title') or canonical, 220),
                'publisher': domain['publisher'], 'host': domain['host'], 'url': canonical,
                'snippet': clean_excerpt(entry.get('content') or entry.get('description'), 360),
                'verified': False, 'status': 'search_candidate',
                'credibility': credibility(domain, canonical), 'sourceType': 'OFFICIAL_WEB',
            })
            if len(results) >= limit:
                break
        if len(results) >= limit:
            break
    return {
        'results': results, 'searchMode': provider + '_official_domains',
        'domainsSearched': [d['host'] for d in hosts],
        'warnings': warnings,
        'notice': ('URL do ' + ('Tavily' if provider == 'tavily' else 'Brave Search') +
                   ' gợi ý trong các tên miền được phê duyệt. Chưa xác minh nội dung; '
                   'chỉ khi đọc trang gốc thành công mới dùng làm nguồn RAG. '
                   'Điểm uy tín thể hiện tên miền, không xác thực nội dung tài liệu.'),
    }


async def _search_tavily(query: str, limit: int, key: str) -> dict:
    """One basic Tavily request with the approved domains; avoids spending N searches per query.

    Authorization is server-side only. Never log the key, request headers or response body.
    """
    domains = relevant_domains(query, max_domains=8)
    payload = {
        'query': query, 'search_depth': 'basic', 'topic': 'general',
        'max_results': max(1, min(20, limit)),
        'include_domains': [d['host'] for d in domains],
        'include_answer': False, 'include_raw_content': False,
        'include_images': False,
    }
    warnings = []
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(15.0, connect=5.0),
                                     trust_env=False) as client:
            response = await client.post(
                TAVILY_SEARCH_URL, json=payload,
                headers={'Authorization': f'Bearer {key}', 'Accept': 'application/json'},
                follow_redirects=False)
        if response.status_code != 200:
            # Upstream bodies may contain credentials/debug internals: never display them.
            warnings.append('Tavily Search HTTP ' + str(response.status_code) +
                            (': kiểm tra API key và quota.' if response.status_code in (401, 403, 429) else '.'))
            return _build_candidates([], limit, 'tavily', domains, warnings)
        data = response.json()
        if not isinstance(data, dict) or not isinstance(data.get('results'), list):
            raise ValueError('Malformed search response')
        return _build_candidates([data['results']], limit, 'tavily', domains, warnings)
    except (httpx.HTTPError, ValueError, TypeError, AttributeError):
        warnings.append('Tavily không khả dụng (kết nối hoặc định dạng phản hồi).')
        return _build_candidates([], limit, 'tavily', domains, warnings)


async def _search_brave(query: str, limit: int, key: str) -> dict:
    """Keep optional backwards compatibility for existing Brave users."""
    domains = relevant_domains(query, 4)
    per_domain = max(3, min(10, (limit + len(domains) - 1) // len(domains) + 2))
    warnings = []

    async def search_one(client: httpx.AsyncClient, domain: dict):
        params = {'q': f"{query} site:{domain['host']}", 'count': per_domain, 'safesearch': 'strict'}
        try:
            response = await client.get(
                SEARCH_URL, params=params,
                headers={'X-Subscription-Token': key, 'Accept': 'application/json'},
                follow_redirects=False)
            if response.status_code != 200:
                warnings.append(f"Brave Search HTTP {response.status_code} cho {domain['host']}")
                return []
            data = response.json()
            return data.get('web', {}).get('results', [])[:per_domain]
        except (httpx.HTTPError, ValueError, TypeError, AttributeError):
            warnings.append(f"Không tìm kiếm được trên {domain['host']} (mạng/định dạng phản hồi).")
            return []

    async with httpx.AsyncClient(timeout=httpx.Timeout(12.0, connect=4.0), trust_env=False) as client:
        batches = await asyncio.gather(*(search_one(client, domain) for domain in domains))
    return _build_candidates(batches, limit, 'brave', domains, warnings)


async def search_official_web(query: str, limit: int = 12) -> dict:
    """Discover across official domains; prefer Tavily, optionally fall back to Brave.

    A search provider returns candidate URLs, never evidence. All URLs are independently
    allowlist-validated before they are presented or retrieved.
    """
    query = re.sub(r'[^\w\s\-]', ' ', query, flags=re.UNICODE).strip()[:160]
    limit = max(1, min(25, int(limit)))
    if not query:
        return {'results': [], 'searchMode': 'empty_query', 'notice': 'Hãy nhập từ khóa cần tìm.'}
    tavily_key = os.environ.get('TAVILY_API_KEY', '').strip()
    if tavily_key:
        return await _search_tavily(query, limit, tavily_key)
    brave_key = os.environ.get('BRAVE_SEARCH_API_KEY', '').strip()
    if brave_key:
        return await _search_brave(query, limit, brave_key)
    return {'results': [], 'searchMode': 'needs_api_key',
            'notice': 'Chưa cấu hình TAVILY_API_KEY (hoặc BRAVE_SEARCH_API_KEY cũ). '
                      'Chỉ có thể tìm trong danh mục nguồn mẫu.'}
