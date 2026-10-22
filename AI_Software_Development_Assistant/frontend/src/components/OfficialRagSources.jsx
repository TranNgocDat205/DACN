import React, {useEffect,useState} from 'react';
import {BookOpenCheck,ExternalLink,Globe2,LoaderCircle,Search,ShieldCheck,Plus,CheckCircle2,AlertCircle,Info} from 'lucide-react';
import './OfficialRagSources.css';

/** All network calls go through the Spring Boot JWT API, never directly to Tavily or FastAPI. */
export default function OfficialRagSources({projectId,api,documents=[],onImported,notify}){
  const [query,setQuery]=useState('AI Software Testing best practices');
  const [results,setResults]=useState([]);
  const [loading,setLoading]=useState(false);
  const [adding,setAdding]=useState(null);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [warnings,setWarnings]=useState([]);
  const [searchMode,setSearchMode]=useState('catalog_only');
  const indexed=new Set((documents||[]).map(d=>d.externalId));

  useEffect(()=>{
    let active=true;
    setResults([]);setNotice('');setWarnings([]);setError('');setLoading(true);
    // Existing curated catalog loads without requiring a third-party search key.
    api(`/projects/${projectId}/official-sources/search`,{method:'POST',body:JSON.stringify({query:'',limit:8})})
      .then(v=>{if(active){setResults(v.results||[]);setNotice('Đây là các nguồn mẫu. Nhấn Tìm kiếm web để tìm thêm nhiều trang trong các tên miền chính thức.');setSearchMode('catalog_only');}})
      .catch(err=>{if(active)setError(err.message)})
      .finally(()=>{if(active)setLoading(false)});
    return ()=>{active=false};
  },[projectId,api]);

  async function search(event){
    event.preventDefault();if(!query.trim())return;
    setLoading(true);setError('');setNotice('');setWarnings([]);
    try{
      const response=await api(`/projects/${projectId}/official-sources/discover`,{
        method:'POST',body:JSON.stringify({query:query.trim(),limit:12})
      });
      setResults(response.results||[]);
      setNotice(response.notice||'');
      setWarnings(response.warnings||[]);
      setSearchMode(response.searchMode||'catalog_only');
    }catch(err){setError(err.message);setResults([])}finally{setLoading(false)}
  }

  async function addSource(item){
    if(!item?.url)return;
    setAdding(item.id);setError('');
    try{
      const isCatalog=item.status==='catalog_only';
      const path=isCatalog?'import':'import-url';
      const body=isCatalog?{sourceId:item.id}:{url:item.url};
      const doc=await api(`/projects/${projectId}/official-sources/${path}`,{
        method:'POST',body:JSON.stringify(body)
      });
      await onImported();
      notify(doc?.sourceType==='OFFICIAL'?'Đã tải tài liệu chính thống và thêm vào RAG của Project':'Đã lưu nguồn');
    }catch(err){setError(err.message);notify(err.message,'error')}finally{setAdding(null)}
  }

  return <section className="official-rag" aria-label="Tìm tài liệu từ nguồn chính thống">
    <div className="official-rag-heading"><Globe2 size={19}/><div>
      <h4>AI Web Search + RAG · nguồn chính thống</h4>
      <p>Tìm nhiều trang mới trong các tên miền được phê duyệt: NIST, OWASP, GitHub Docs, Microsoft Learn, Spring, React, Python...</p>
    </div></div>
    <form className="official-search" onSubmit={search}>
      <input aria-label="Từ khóa tìm tài liệu web" value={query} onChange={e=>setQuery(e.target.value)} maxLength={300} placeholder="AI Software Testing best practices"/>
      <button type="submit" disabled={loading||!query.trim()} title="Tìm trên web chính thống"><Search size={17}/></button>
    </form>
    <p className="official-rag-explain"><ShieldCheck size={14}/> Kết quả chỉ là gợi ý từ trang chính thức. Nội dung chỉ được dùng làm dẫn chứng sau khi tải trang gốc thành công.</p>
    {notice&&<div className="official-rag-notice"><Info size={14}/><span>{notice}</span></div>}
    {searchMode==='catalog_fallback'&&<p className="official-rag-key-hint">Để tìm ngoài danh mục, thêm <code>TAVILY_API_KEY</code> (hoặc <code>BRAVE_SEARCH_API_KEY</code> của bản cũ) vào <code>ai-service/.env</code> rồi khởi động lại AI Service.</p>}
    {warnings.length>0&&<p className="official-rag-explain">{warnings.join(' · ')}</p>}
    {error&&<div className="official-rag-error" role="alert"><AlertCircle size={15}/>{error}</div>}
    <div className="official-results">
      {loading&&<span className="official-muted"><LoaderCircle size={15} className="spin"/> Đang tra cứu...</span>}
      {!loading&&results.length===0&&<span className="official-muted">Không có kết quả. Thử từ khóa khác hoặc kiểm tra khóa tìm kiếm web.</span>}
      {!loading&&results.map(item=>{
        const added=indexed.has(item.status==='catalog_only'?'official-'+item.id:item.id);
        return <article className="official-source" key={item.id}>
          <div className="official-source-main">
            <span className="official-publisher"><BookOpenCheck size={13}/>{item.publisher}</span>
            <a href={item.url} target="_blank" rel="noopener noreferrer" title="Mở URL gốc">{item.title} <ExternalLink size={12}/></a>
            {item.snippet&&<p className="official-web-snippet">{item.snippet}</p>}
            <small>{item.status==='catalog_only'?'Nguồn mẫu đã chọn lọc':((searchMode==='tavily_official_domains'?'Tavily Search':searchMode==='brave_official_domains'?'Brave Search':'Web Search')+' · '+(item.host||'Tên miền chính thức'))} · Chưa xác minh nội dung</small>
            {item.credibility&&<div className="official-credibility" title={item.credibility.basis}>
              <ShieldCheck size={12}/> Uy tín tên miền: {item.credibility.score}/100 (đánh giá theo danh sách cho phép, không chấm độ đúng bài viết)
            </div>}
            <span className="official-source-url" title={item.url}>{item.url}</span>
          </div>
          <button type="button" className={'official-import '+(added?'is-added':'')}
            disabled={adding!==null||added} onClick={()=>addSource(item)}
            title={added?'Đã có trong dự án':'Tải HTML thực tế, xác minh nguồn và thêm vào RAG'}>
            {added?<><CheckCircle2 size={13}/> Đã lưu</>:adding===item.id?<><LoaderCircle size={13} className="spin"/> Đang tải</>:<><Plus size={13}/> Thêm RAG</>}
          </button>
        </article>;
      })}
    </div>
  </section>;
}
