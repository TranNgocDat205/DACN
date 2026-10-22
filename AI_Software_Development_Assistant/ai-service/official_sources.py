"""Controlled, public, first-party documentation discovery for DevPilot RAG.

Discovery searches a transparent curated catalog, NOT the whole internet. Only
catalog-pinned HTTPS resources may be downloaded; there is no arbitrary URL fetch.
Remote text is untrusted evidence, never model instructions.
"""
from __future__ import annotations

from datetime import datetime, timezone
from html.parser import HTMLParser
import hashlib
import re
import unicodedata
from urllib.parse import urlsplit, urljoin
from web_discovery import validate_official_url
from typing import Any

import httpx

# Canonical public documentation pages; these are not arbitrary user-provided URLs.
# A catalog result is a *candidate* until a successful HTTPS fetch.
SOURCES: tuple[dict[str, str], ...] = (
    {"id":"nist-ssdf","publisher":"NIST","title":"Secure Software Development Framework (SSDF) SP 800-218","url":"https://csrc.nist.gov/pubs/sp/800/218/final","tags":"security secure development software lifecycle risk secure coding devsecops nist ssdf bao mat phat trien phan mem"},
    {"id":"nist-ssdf-updates","publisher":"NIST","title":"Secure Software Development Framework publications","url":"https://csrc.nist.gov/projects/ssdf/publications","tags":"security software ssdf nist standard revision standard quy chuan bao mat"},
    {"id":"owasp-top10","publisher":"OWASP","title":"OWASP Top 10 Web Application Security Risks","url":"https://owasp.org/www-project-top-ten/","tags":"owasp security web vulnerability injection access control authorization bao mat lo hong"},
    {"id":"owasp-asvs","publisher":"OWASP","title":"Application Security Verification Standard (ASVS)","url":"https://owasp.org/www-project-application-security-verification-standard/","tags":"owasp asvs requirements verification security test security requirements tieu chi bao mat kiem thu"},
    {"id":"owasp-cheatsheets","publisher":"OWASP","title":"OWASP Cheat Sheet Series","url":"https://cheatsheetseries.owasp.org/","tags":"owasp security checklists secure coding cheat sheets developer bao mat"},
    {"id":"owasp-auth","publisher":"OWASP","title":"Authentication Cheat Sheet","url":"https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html","tags":"login authentication password mfa otp dang nhap xac thuc bao mat owasp"},
    {"id":"owasp-access","publisher":"OWASP","title":"Authorization Cheat Sheet","url":"https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html","tags":"authorization access control permissions roles role-based phan quyen owasp"},
    {"id":"owasp-session","publisher":"OWASP","title":"Session Management Cheat Sheet","url":"https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html","tags":"session timeout cookies jwt authentication phien dang nhap owasp"},
    {"id":"scrum-guide","publisher":"Scrum Guides","title":"Official Scrum Guide","url":"https://scrumguides.org/scrum-guide.html","tags":"scrum sprint backlog product owner scrum master agile planning review retrospective story team quy trinh sprint"},
    {"id":"python-tutorial","publisher":"Python Software Foundation","title":"The Python Tutorial","url":"https://docs.python.org/3/tutorial/","tags":"python python3 programming code class function packages development lap trinh"},
    {"id":"python-security","publisher":"Python Software Foundation","title":"Python Security Considerations","url":"https://docs.python.org/3/library/security_warnings.html","tags":"python security warnings safe development bao mat"},
    {"id":"react-learn","publisher":"React","title":"React: Learn","url":"https://react.dev/learn","tags":"react frontend jsx component props state hooks javascript giao dien"},
    {"id":"react-effects","publisher":"React","title":"React: Synchronizing with Effects","url":"https://react.dev/learn/synchronizing-with-effects","tags":"react effects useeffect hooks frontend lifecycle state"},
    {"id":"typescript-handbook","publisher":"TypeScript","title":"TypeScript Handbook","url":"https://www.typescriptlang.org/docs/handbook/intro.html","tags":"typescript javascript types interfaces frontend code"},
    {"id":"spring-security","publisher":"Spring","title":"Spring Security Reference","url":"https://docs.spring.io/spring-security/reference/","tags":"spring java security authentication authorization jwt role access control backend bao mat"},
    {"id":"spring-security-auth","publisher":"Spring","title":"Spring Security: Authentication","url":"https://docs.spring.io/spring-security/reference/servlet/authentication/index.html","tags":"spring boot authentication password login oauth2 xac thuc dang nhap"},
    {"id":"spring-data-jpa","publisher":"Spring","title":"Spring Data JPA Reference","url":"https://docs.spring.io/spring-data/jpa/reference/","tags":"spring boot jpa persistence hibernate repository sql database backend"},
    {"id":"spring-rest","publisher":"Spring","title":"Spring: Building a RESTful Web Service","url":"https://spring.io/guides/gs/rest-service","tags":"spring boot rest api controller java endpoint backend"},
    {"id":"fastapi-tutorial","publisher":"FastAPI","title":"FastAPI Tutorial","url":"https://fastapi.tiangolo.com/tutorial/","tags":"fastapi python backend api rest validation pydantic ai service"},
    {"id":"fastapi-security","publisher":"FastAPI","title":"FastAPI Security","url":"https://fastapi.tiangolo.com/tutorial/security/","tags":"fastapi python security oauth2 jwt authorization authentication bao mat"},
    {"id":"ms-aspnet","publisher":"Microsoft Learn","title":"ASP.NET Core documentation","url":"https://learn.microsoft.com/en-us/aspnet/core/","tags":"microsoft asp.net csharp dotnet core web api backend"},
    {"id":"ms-sql","publisher":"Microsoft Learn","title":"SQL Server documentation","url":"https://learn.microsoft.com/en-us/sql/sql-server/","tags":"sql server t-sql database microsoft microsoft sql server database co so du lieu"},
    {"id":"ms-github-actions","publisher":"GitHub Docs","title":"GitHub Actions documentation","url":"https://docs.github.com/en/actions","tags":"github actions ci cd pipeline testing automation deployment deploy kiem thu tu dong"},
    {"id":"mdn-http","publisher":"MDN Web Docs","title":"HTTP overview","url":"https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview","tags":"http methods status codes request response api rest networking"},
    {"id":"w3c-wcag","publisher":"W3C","title":"Web Content Accessibility Guidelines (WCAG) 2.2","url":"https://www.w3.org/TR/WCAG22/","tags":"accessibility wcag usability ux accessible interface web user experience kha nang tiep can"},
)
SOURCE_BY_ID = {source["id"]: source for source in SOURCES}

# Small bilingual expansion for common questions. Catalog search stays deterministic.
SYNONYMS = {
    "yeu": ("requirements", "requirement"), "cau": ("requirements",),
    "kiem": ("testing", "verification"), "thu": ("test", "testing"),
    "bao": ("security",), "mat": ("security",),
    "dang": ("login", "authentication"), "nhap": ("login", "authentication"),
    "xac": ("authentication",), "thuc": ("authentication",),
    "phan": ("authorization", "roles"), "quyen": ("authorization", "access"),
    "du": ("project",), "an": ("project",),
    "quan": ("management",), "ly": ("management",),
    "phat": ("development",), "trien": ("development",),
    "co": ("database",), "so": ("database",), "lieu": ("data",),
    "tieu": ("standard",), "chuan": ("standard",),
    "giao": ("interface",), "dien": ("interface",),
    "truy": ("traceability",), "vet": ("traceability",),
    "tien": ("progress",), "do": ("progress",),
}
STOP = {"the", "and", "for", "from", "what", "how", "are", "with", "toi", "cho", "cua", "ve", "la", "nhung", "can", "mot", "trong", "tai", "co", "duoc", "hay", "xin", "voi", "giup", "nhu", "nao", "canh", "trinh"}


def tokens(text: str) -> set[str]:
    deaccent = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii").lower()
    return {word for word in re.findall(r"[a-z0-9]+", deaccent) if len(word) > 1 and word not in STOP}


def query_tokens(query: str) -> set[str]:
    terms = tokens(query)
    expanded = set(terms)
    for term in terms:
        expanded.update(SYNONYMS.get(term, ()))
    return expanded


def search_catalog(query: str, limit: int = 10) -> list[dict[str, Any]]:
    if not query or not query.strip():
        return [{"id": s["id"], "title":s["title"], "publisher":s["publisher"],
                 "url":s["url"], "verified":False, "status":"catalog_only"} for s in SOURCES[:limit]]
    terms = query_tokens(query)
    scored = []
    for s in SOURCES:
        title = tokens(s["title"])
        tag = tokens(s["tags"])
        publisher = tokens(s["publisher"])
        matched = terms & (title | tag | publisher)
        score = sum(4 if term in title else 2 if term in tag else 1 for term in matched)
        if score:
            scored.append((score, s))
    scored.sort(key=lambda pair: (-pair[0], pair[1]["id"]))
    return [{"id":s["id"], "title":s["title"], "publisher":s["publisher"],
             "url":s["url"], "verified":False, "status":"catalog_only", "matchScore":score}
            for score,s in scored[:limit]]


class PublicDocumentHTML(HTMLParser):
    """Extract readable evidence without trusting embedded scripts or metadata."""
    BLOCKS = {"h1", "h2", "h3", "h4", "p", "li", "pre", "td"}
    IGNORED = {"script", "style", "noscript", "nav", "footer", "header", "svg", "form", "button"}
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ignored: list[str] = []
        self.capturing = 0
        self.buffer: list[str] = []
        self.fragments: list[str] = []

    def handle_starttag(self, tag: str, attrs):
        if tag in self.IGNORED:
            self.ignored.append(tag)
        elif not self.ignored and tag in self.BLOCKS:
            if self.capturing == 0:
                self.buffer = []
            self.capturing += 1

    def handle_data(self, data: str):
        if not self.ignored and self.capturing:
            self.buffer.append(data)

    def handle_endtag(self, tag: str):
        if self.ignored:
            if tag == self.ignored[-1]:
                self.ignored.pop()
        elif tag in self.BLOCKS and self.capturing:
            self.capturing -= 1
            if not self.capturing:
                text = re.sub(r"\s+", " ", "".join(self.buffer)).strip()
                if len(text) >= 25:
                    self.fragments.append(text[:3000])
                self.buffer = []

    def content(self) -> str:
        # Ignore repeated blocks produced by deeply nested page templates.
        result, seen = [], set()
        for paragraph in self.fragments:
            if paragraph in seen:
                continue
            seen.add(paragraph)
            result.append(paragraph)
            if sum(map(len, result)) >= 22000:
                break
        return "\n\n".join(result)[:22000]


async def fetch_trusted_url(url: str) -> dict[str, Any]:
    """Read official public HTML, safely following at most 3 validated redirects.

    A redirect is followed only after revalidating its full target URL against the
    HTTPS exact-hostname allowlist. This accommodates locale/canonical redirects
    (including Microsoft Learn HTTP 301) without allowing arbitrary SSRF targets.
    """
    safe_url, _ = validate_official_url(url)
    seen: set[str] = set()
    redirects = {301, 302, 303, 307, 308}
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(14.0, connect=5.0),
                                     follow_redirects=False, trust_env=False) as client:
            for hop in range(4):
                if safe_url in seen:
                    raise RuntimeError('Official page redirect loop; not indexed')
                seen.add(safe_url)
                async with client.stream('GET', safe_url, headers={
                    'User-Agent':'DevPilotOfficialRAG/2.1 (public software documentation)',
                    'Accept':'text/html, application/xhtml+xml'}) as response:
                    if response.status_code in redirects:
                        if hop >= 3:
                            raise RuntimeError('Official page exceeded 3 redirects; not indexed')
                        location = response.headers.get('location', '')
                        if not location:
                            raise RuntimeError(f'Official page returned HTTP {response.status_code} without Location; not indexed')
                        try:
                            # Support relative locale redirects, but never bypass allowlist.
                            safe_url, _ = validate_official_url(urljoin(safe_url, location))
                        except ValueError as exc:
                            raise RuntimeError(
                                f'Official page HTTP {response.status_code} redirects outside approved HTTPS domains; not indexed'
                            ) from exc
                        continue
                    if response.status_code != 200:
                        raise RuntimeError(f'Official page returned HTTP {response.status_code}; not indexed')
                    mime = response.headers.get('content-type', '').split(';', 1)[0].strip().lower()
                    if mime not in ('text/html', 'application/xhtml+xml'):
                        raise RuntimeError('Official page is not readable HTML (PDF and JS-only pages unsupported)')
                    chunks, size = [], 0
                    async for fragment in response.aiter_bytes():
                        size += len(fragment)
                        if size > 2_000_000:
                            raise RuntimeError('Official page exceeds the 2 MB HTML limit')
                        chunks.append(fragment)
                    raw = b''.join(chunks)
                    charset = (response.encoding or 'utf-8').lower()
                    if charset not in ('utf-8', 'iso-8859-1'):
                        charset = 'utf-8'
                    decoded = raw.decode(charset, errors='replace')
                    last_modified = response.headers.get('last-modified','')[:100]
                    break
    except httpx.HTTPError as exc:
        raise RuntimeError(f'Cannot reach official publisher: {type(exc).__name__}') from exc
    parser = PublicDocumentHTML()
    parser.feed(decoded)
    content = parser.content()
    if len(content) < 100:
        raise RuntimeError('Official page did not contain enough readable text')
    match = re.search(r'<title[^>]*>(.*?)</title\s*>', decoded, flags=re.I | re.S)
    title = re.sub(r'\s+', ' ', re.sub(r'<[^>]*>', '', match.group(1))).strip() if match else ''
    title = title[:220] or safe_url.rsplit('/', 1)[-1][:180] or 'Official documentation'
    _, domain = validate_official_url(safe_url)
    return {'title':title, 'publisher':domain['publisher'], 'url':safe_url,
            'text':content, 'sha256':hashlib.sha256(content.encode()).hexdigest(),
            'fetchedAt':datetime.now(timezone.utc).isoformat(), 'lastModified':last_modified,
            'verified':True, 'status':'fetched'}


async def fetch_official(source_id: str) -> dict[str, Any]:
    """Backward-compatible reader for existing fixed catalog pages."""
    source = SOURCE_BY_ID.get(source_id)
    if source is None:
        raise ValueError('Unknown official source ID')
    page = await fetch_trusted_url(source['url'])
    return {**page, 'id':source_id, 'title':source['title']}
