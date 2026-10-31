import React, { useEffect, useState } from 'react';
import {
  ArrowRight, ArrowUpRight, ArrowDownRight, ArrowUp, Check, CheckCheck,
  CheckCircle2, ChevronDown, Code2, Database, FileText, GitBranch,
  Layers3, LayoutDashboard, LockKeyhole, Menu, Moon, Network,
  Search, ShieldCheck, Sparkles, Sun, WandSparkles, X,
  Zap, CircleDot, BookOpen, Workflow, ScanSearch, Route,
  Github, PanelLeft, MessagesSquare, MoveUpRight, Clock3
} from 'lucide-react';
import './LandingPage.css';

/**
 * DevPilot — public product landing.
 * All artwork is CSS/React, and each CTA connects to the existing auth flow.
 * Example values in the interface preview are intentionally labeled as demo.
 */
const PREVIEWS = {
  conflicts: {
    eyebrow: 'REQUIREMENT INTELLIGENCE',
    title: 'Mâu thuẫn được phát hiện.',
    context: 'REQ-014  ↔  REQ-021',
    message: 'Quy tắc hủy đơn hàng đang không nhất quán giữa hai yêu cầu.',
    pills: ['Mức độ cao', 'Cần BA xác nhận'],
    action: 'Đề xuất thống nhất điều kiện hủy trước khi giao hàng.'
  },
  impact: {
    eyebrow: 'CHANGE IMPACT SIMULATOR',
    title: 'Thay đổi, nhìn thấy hệ quả.',
    context: 'REQ-009 → US-004 → TASK-018',
    message: 'Thêm OTP vào luồng đăng nhập có thể ảnh hưởng 1 Story và 2 Task.',
    pills: ['2 Task cần rà soát', 'Chưa áp dụng'],
    action: 'Mô phỏng trước, xác nhận sau. Không tự sửa dữ liệu dự án.'
  },
  rag: {
    eyebrow: 'VERIFIABLE KNOWLEDGE',
    title: 'Câu trả lời có nguồn.',
    context: 'PROJECT DOCS + OFFICIAL WEB',
    message: 'Kết nối tri thức nội bộ với tài liệu kỹ thuật chính thống.',
    pills: ['RAG theo Project', 'URL gốc'],
    action: 'Các trích dẫn chỉ được tạo từ nội dung đã truy xuất.'
  }
};

const FEATURES = [
  { num:'01', icon: ScanSearch, name:'AI kiểm tra yêu cầu', desc:'Phát hiện điểm mơ hồ, trùng lặp và mâu thuẫn giữa những Requirement trong cùng dự án.', tag:'REQUIREMENT QUALITY', tone:'mint', size:'feature-wide', art:'conflict' },
  { num:'02', icon: Workflow, name:'Mô phỏng tác động', desc:'Biết Story, Task hay Sprint nào cần rà soát trước khi thay đổi một yêu cầu.', tag:'CHANGE INTELLIGENCE', tone:'violet', size:'feature-normal', art:'impact' },
  { num:'03', icon: Layers3, name:'Sprint & Kanban', desc:'Lập kế hoạch, phân công và theo dõi công việc trên một workspace thống nhất.', tag:'DELIVERY', tone:'sand', size:'feature-normal', art:'board' },
  { num:'04', icon: BookOpen, name:'RAG có dẫn chứng', desc:'Hỏi đáp từ tài liệu nội bộ và nguồn kỹ thuật được truy xuất qua Tavily.', tag:'KNOWLEDGE', tone:'blue', size:'feature-normal', art:'rag' },
  { num:'05', icon: Route, name:'Truy vết đến bàn giao', desc:'Nối Requirement với User Story, tiêu chí nghiệm thu và trạng thái công việc.', tag:'TRACEABILITY', tone:'peach', size:'feature-wide', art:'trace' }
];

const FAQ = [
  { q:'DevPilot khác gì một công cụ quản lý Task?', a:'DevPilot liên kết quản lý dự án với AI phân tích yêu cầu, mô phỏng thay đổi và RAG. Task và Sprint chỉ là một phần của luồng từ yêu cầu đến bàn giao.' },
  { q:'AI có tự sửa Requirement hoặc triển khai code không?', a:'Không. Các phân tích và mô phỏng là đề xuất hỗ trợ ra quyết định. Những thay đổi quan trọng cần người dùng xem xét và xác nhận.' },
  { q:'Nguồn RAG có phải đều từ website chính thức?', a:'DevPilot có thể ưu tiên các tên miền kỹ thuật chính thống và lưu URL gốc. Nội dung chỉ được dùng làm bằng chứng khi hệ thống truy xuất thành công; bạn vẫn cần đánh giá độ phù hợp của từng nguồn.' },
  { q:'Có sử dụng được trên điện thoại không?', a:'Có. Giao diện responsive để xem và điều hướng trên điện thoại, máy tính bảng và desktop. Những thao tác quản lý phức tạp sẽ thuận tiện hơn trên màn hình lớn.' },
  { q:'Có thể thử giao diện mà chưa cấu hình AI API không?', a:'Bạn có thể xem trang giới thiệu ngay. Để sử dụng workspace, đăng nhập và các tác vụ AI/RAG thật, cần chạy Backend, AI Service và cấu hình các provider cần thiết.' }
];

function Brand({ light = false }) {
  return <span className={'lp-brand'+(light?' lp-brand-light':'')}>
    <span className="lp-brand-symbol" aria-hidden="true"><span>D</span><i/></span>
    <span className="lp-brand-name">devpilot<span className="lp-brand-dot">.</span></span>
    <span className="lp-brand-ai">AI</span>
  </span>;
}

function PreviewPanel({ activeView, setActiveView }) {
  const p = PREVIEWS[activeView];
  return <div className="lp-preview-window" aria-label="Bản minh họa giao diện phân tích dự án">
    <div className="lp-preview-topline"><div className="lp-window-buttons" aria-hidden="true"><i/><i/><i/></div><span>DEVPILOT / PRODUCT STUDIO</span><span className="lp-preview-version">PREVIEW 01—26</span></div>
    <div className="lp-preview-workspace">
      <aside className="lp-preview-sidebar" aria-hidden="true">
        <div className="lp-preview-brandglyph">d<span>.</span></div>
        <span className="lp-preview-side-icon active"><LayoutDashboard size={17}/></span>
        <span className="lp-preview-side-icon"><FileText size={17}/></span>
        <span className="lp-preview-side-icon"><GitBranch size={17}/></span>
        <span className="lp-preview-side-icon"><Database size={17}/></span>
        <span className="lp-preview-side-bottom"><Sparkles size={17}/></span>
      </aside>
      <div className="lp-preview-content">
        <div className="lp-preview-breadcrumb">WORKSPACE <span>/</span> ENGINEERING INTELLIGENCE <span className="lp-preview-live"><i/> LIVE</span></div>
        <div className="lp-preview-heading"><div><span className="lp-mini-label">AI / OPERATIONS CENTER</span><h3>Build with clarity<span>.</span></h3></div><span className="lp-preview-pill"><Sparkles size={12}/> AI ASSISTED</span></div>
        <div className="lp-preview-kpis" aria-label="Số liệu minh họa">
          <div><small>REQUIREMENTS</small><strong>24<span>↗</span></strong></div>
          <div><small>USER STORIES</small><strong>18<span>↗</span></strong></div>
          <div><small>SPRINT PROGRESS</small><strong>68<sup>%</sup></strong></div>
        </div>
        <div className="lp-preview-tablist" role="tablist" aria-label="Chọn tình huống xem thử">
          {[['conflicts','Phát hiện'],['impact','Mô phỏng'],['rag','RAG']].map(([id,text])=><button type="button" role="tab" id={'lp-tab-'+id} aria-controls="lp-preview-panel" aria-selected={activeView===id} key={id} onClick={()=>setActiveView(id)}>{text}</button>)}
        </div>
        <div className="lp-preview-finding" id="lp-preview-panel" role="tabpanel" aria-labelledby={'lp-tab-'+activeView} key={activeView}>
          <div className="lp-preview-finding-top"><span><CircleDot size={12}/> {p.eyebrow}</span><ArrowUpRight size={15}/></div>
          <h4>{p.title}</h4><span className="lp-preview-path">{p.context}</span>
          <p>{p.message}</p>
          <div className="lp-preview-chips">{p.pills.map(x=><span key={x}>{x}</span>)}</div>
          <div className="lp-preview-recommendation"><Sparkles size={15}/><span>{p.action}</span></div>
        </div>
      </div>
    </div>
    <span className="lp-preview-demo">DỮ LIỆU MINH HỌA · KHÔNG PHẢI THỐNG KÊ THỰC</span>
  </div>;
}

function FeatureArt({ type }) {
  if(type==='conflict') return <div className="lp-feature-art-conflict" aria-hidden="true"><span>REQ—014</span><b>≠</b><span>REQ—021</span><i>CONFLICT DETECTED</i></div>;
  if(type==='impact') return <div className="lp-feature-art-impact" aria-hidden="true"><i>REQ</i><span>→</span><i>STORY</i><span>→</span><i>TASK</i></div>;
  if(type==='board') return <div className="lp-feature-art-board" aria-hidden="true"><span><i/><i/><i/></span><span><i/><i/></span><span><i/></span></div>;
  if(type==='rag') return <div className="lp-feature-art-rag" aria-hidden="true"><div className="lp-rag-orbit"><Database size={19}/></div><span className="lp-rag-line"/><div className="lp-rag-orbit"><BookOpen size={20}/></div><span className="lp-rag-line"/><div className="lp-rag-orbit active"><Sparkles size={20}/></div></div>;
  return <div className="lp-feature-art-trace" aria-hidden="true"><span>REQUIREMENT</span><i/><span>STORY</span><i/><span>TASK</span><i/><span>RELEASE</span></div>;
}

export default function LandingPage({ onStart, onRegister = onStart, theme = 'light', onThemeChange }) {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [activeView, setActiveView] = useState('conflicts');
  const [openFaq, setOpenFaq] = useState(0);
  const isDark = theme === 'dark';

  useEffect(() => {
    const els = document.querySelectorAll('.lp-reveal');
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach(e => e.classList.add('lp-in-view')); return;
    }
    const observer = new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('lp-in-view');observer.unobserve(e.target)}}), {threshold:.08, rootMargin:'0px 0px -30px 0px'});
    els.forEach(e=>observer.observe(e));
    return ()=>observer.disconnect();
  }, []);
  useEffect(()=>{
    if (!mobileMenu) return;
    const close = e=>{if(e.key==='Escape')setMobileMenu(false)};
    document.addEventListener('keydown',close);
    return ()=>document.removeEventListener('keydown',close);
  },[mobileMenu]);

  const navigate = () => setMobileMenu(false);
  return <div className="dp-landing" data-theme={theme}>
    <a className="lp-skip" href="#main-content">Bỏ qua điều hướng</a>
    <div className="lp-announcement"><span className="lp-announcement-dot"/> MỘT WORKSPACE CHO TOÀN BỘ HÀNH TRÌNH PHÁT TRIỂN PHẦN MỀM <span className="lp-announcement-arrow">↗</span></div>
    <header className="lp-header">
      <div className="lp-container lp-header-inner">
        <a href="#top" aria-label="DevPilot AI - về đầu trang" onClick={navigate}><Brand/></a>
        <nav className={'lp-nav'+(mobileMenu?' open':'')} aria-label="Điều hướng chính" id="lp-nav">
          <a href="#features" onClick={navigate}>Tính năng</a>
          <a href="#workflow" onClick={navigate}>Cách hoạt động</a>
          <a href="#why" onClick={navigate}>Tại sao DevPilot?</a>
          <a href="#faq" onClick={navigate}>FAQ</a>
          <button type="button" className="lp-mobile-cta" onClick={()=>{navigate();onStart()}}>Mở workspace <ArrowUpRight size={15}/></button>
        </nav>
        <div className="lp-header-actions">
          <button className="lp-theme-toggle" type="button" aria-label={isDark?'Chuyển sang chế độ sáng':'Chuyển sang chế độ tối'} aria-pressed={isDark} onClick={()=>onThemeChange(isDark?'light':'dark')}>{isDark?<Sun size={18}/>:<Moon size={18}/>}</button>
          <button type="button" className="lp-nav-login" onClick={onStart}>Đăng nhập <ArrowUpRight size={16}/></button>
          <button className="lp-menu-toggle" type="button" aria-label={mobileMenu?'Đóng menu':'Mở menu'} aria-expanded={mobileMenu} aria-controls="lp-nav" onClick={()=>setMobileMenu(v=>!v)}>{mobileMenu?<X size={23}/>:<Menu size={23}/>}</button>
        </div>
      </div>
    </header>
    <main id="main-content">
      <section className="lp-hero" id="top" aria-labelledby="lp-hero-heading">
        <div className="lp-hero-noise" aria-hidden="true"/>
        <div className="lp-container lp-hero-grid">
          <div className="lp-hero-copy">
            <div className="lp-eyebrow"><span className="lp-eyebrow-line"/> ENGINEERING INTELLIGENCE / 2026 <span className="lp-eyebrow-star">✳</span></div>
            <h1 id="lp-hero-heading">Ý tưởng lớn.<br/><span>Ít điểm mù.</span><br/><em>Ship tự tin.</em></h1>
            <p className="lp-hero-lead">Từ một dòng yêu cầu đến sản phẩm sẵn sàng bàn giao. DevPilot kết nối <strong>AI, Agile và tri thức dự án</strong> trong một nhịp làm việc rõ ràng.</p>
            <div className="lp-hero-buttons"><button className="lp-button lp-button-primary" type="button" onClick={onStart}>Khám phá workspace <ArrowUpRight size={19}/></button><a className="lp-button lp-button-ghost" href="#features">Xem khả năng <ArrowDownRight size={18}/></a></div>
            <div className="lp-hero-caption"><span className="lp-hero-caption-icon"><Check size={13}/></span> Dành cho Product Owner, BA, Developer và QA <span className="lp-hero-caption-slash">/</span> BUILT FOR TEAMS</div>
          </div>
          <div className="lp-hero-art">
            <div className="lp-hero-art-meta"><span>PRODUCT PREVIEW</span><span>01 / 03</span></div>
            <div className="lp-art-halo" aria-hidden="true"/><div className="lp-art-grid" aria-hidden="true"/>
            <div className="lp-art-stamp" aria-hidden="true"><Sparkles size={15}/> THINK<br/>BETTER</div>
            <PreviewPanel activeView={activeView} setActiveView={setActiveView}/>
          </div>
        </div>
        <div className="lp-hero-bottom"><div className="lp-container lp-hero-bottom-inner"><span>PLAN WITH INTENT</span><span>BUILD WITH CONTEXT</span><span>SHIP WITH CONFIDENCE</span><span>✦</span></div></div>
      </section>

      <section className="lp-logos" aria-label="Các giai đoạn được hỗ trợ"><div className="lp-container lp-logos-inner"><span>ONE WORKSPACE, EVERY STAGE</span><div><span><FileText size={17}/> ANALYZE</span><i/><span><Workflow size={17}/> PLAN</span><i/><span><Code2 size={17}/> BUILD</span><i/><span><ShieldCheck size={17}/> VALIDATE</span></div></div></section>

      <section className="lp-features lp-section" id="features" aria-labelledby="lp-features-title"><div className="lp-container">
        <div className="lp-section-heading lp-reveal"><span className="lp-section-index">01 / THE TOOLKIT</span><div><h2 id="lp-features-title">Không chỉ quản lý.<br/><em>Thấu hiểu cả dự án.</em></h2><p>Những công cụ vừa đủ mạnh để xử lý phần khó nhất của phát triển phần mềm: sự không chắc chắn.</p></div></div>
        <div className="lp-feature-grid">{FEATURES.map(f=><article key={f.num} className={`lp-feature-card lp-${f.tone} ${f.size} lp-reveal`}><div className="lp-feature-top"><span>{f.num} / {f.tag}</span><f.icon size={22} strokeWidth={1.75}/></div><div className="lp-feature-content"><h3>{f.name}</h3><p>{f.desc}</p></div><FeatureArt type={f.art}/></article>)}</div>
      </div></section>

      <section className="lp-process lp-section" id="workflow" aria-labelledby="lp-workflow-title"><div className="lp-container lp-process-container"><div className="lp-section-heading lp-section-heading-inverse lp-reveal"><span className="lp-section-index">02 / HOW IT WORKS</span><div><h2 id="lp-workflow-title">Từ yêu cầu đầu tiên.<br/><em>Đến bản release.</em></h2><p>Một quy trình có thể kiểm soát: AI hỗ trợ hiểu vấn đề, con người đưa ra quyết định.</p></div></div>
        <div className="lp-process-grid">{[
          {id:'01',icon:FileText,title:'Định hình yêu cầu',desc:'Thêm Requirement, phân tích chất lượng và kiểm tra xung đột.'},
          {id:'02',icon:GitBranch,title:'Chuyển thành kế hoạch',desc:'Liên kết Story, Acceptance Criteria, Task và Sprint.'},
          {id:'03',icon:Network,title:'Đánh giá mọi thay đổi',desc:'Mô phỏng tác động trước khi chỉnh sửa dữ liệu chính thức.'},
          {id:'04',icon:CheckCheck,title:'Truy vết đến bàn giao',desc:'Rà soát công việc, tiêu chí nghiệm thu và nguồn tri thức.'}
        ].map((s,i)=><article className="lp-process-step lp-reveal" key={s.id}><span className="lp-process-numeral">{s.id}</span><div className="lp-process-icon"><s.icon size={25} strokeWidth={1.7}/></div><h3>{s.title}</h3><p>{s.desc}</p>{i<3&&<ArrowRight size={20} className="lp-process-arrow" aria-hidden="true"/>}</article>)}</div>
        <div className="lp-process-bottom"><span>THE RESULT</span><p>Ít giả định vô hình hơn. Nhiều quyết định có căn cứ hơn.</p><ArrowUpRight size={21}/></div>
      </div></section>

      <section className="lp-why lp-section" id="why" aria-labelledby="lp-why-title"><div className="lp-container lp-why-grid"><div className="lp-why-copy lp-reveal"><span className="lp-section-index">03 / BUILT DIFFERENT</span><h2 id="lp-why-title">AI tạo ra kết quả.<br/><em>DevPilot tạo ra ngữ cảnh.</em></h2><p>Chatbot có thể đưa ra câu trả lời. Một engineering workspace tốt phải biết câu trả lời ấy đang liên quan đến yêu cầu nào, công việc nào và quyết định nào.</p><button type="button" className="lp-text-link" onClick={onStart}>Bắt đầu với dự án của bạn <ArrowUpRight size={18}/></button></div>
        <div className="lp-why-visual lp-reveal"><div className="lp-why-top"><span>ONE CONNECTED SYSTEM</span><span>DP / 2026</span></div><div className="lp-why-center"><div className="lp-why-center-arc arc1"/><div className="lp-why-center-arc arc2"/><div className="lp-why-center-badge"><Sparkles size={28}/><strong>DEV<br/>PILOT</strong></div><span className="lp-why-node n1"><FileText size={15}/> REQUIREMENT</span><span className="lp-why-node n2"><Database size={15}/> KNOWLEDGE</span><span className="lp-why-node n3"><GitBranch size={15}/> SPRINT</span><span className="lp-why-node n4"><ShieldCheck size={15}/> RELEASE</span></div><div className="lp-why-bottom">CONTEXT → DECISION → DELIVERY <MoveUpRight size={17}/></div></div>
      </div></section>

      <section className="lp-proof lp-section" aria-labelledby="lp-proof-title"><div className="lp-container"><div className="lp-proof-head lp-reveal"><div><span className="lp-section-index">04 / WHAT YOU GET</span><h2 id="lp-proof-title">Một nền tảng.<br/><em>Nhiều góc nhìn.</em></h2></div><p>Những khả năng đang có trong source DevPilot, không phải chỉ số khách hàng hay lời chứng thực được dựng lên.</p></div><div className="lp-proof-row lp-reveal">{[
        {number:'03',label:'CÔNG CỤ AI CHUYÊN SÂU',desc:'Conflict · Impact · Traceability'},
        {number:'02',label:'NGUỒN TRI THỨC',desc:'Tài liệu dự án · Web chính thống'},
        {number:'01',label:'WORKSPACE THỐNG NHẤT',desc:'Requirement · Story · Sprint · Task'}
      ].map(x=><div key={x.number} className="lp-proof-stat"><strong>{x.number}<span>+</span></strong><span>{x.label}</span><p>{x.desc}</p></div>)}</div></div></section>

      <section className="lp-faq lp-section" id="faq" aria-labelledby="lp-faq-title"><div className="lp-container lp-faq-grid"><div className="lp-faq-intro lp-reveal"><span className="lp-section-index">05 / QUESTIONS, ANSWERED</span><h2 id="lp-faq-title">Có câu hỏi?<br/><em>Ở đây có lời giải.</em></h2><p>Những điều bạn nên biết trước khi trải nghiệm DevPilot.</p><span className="lp-faq-decor" aria-hidden="true">?</span></div><div className="lp-faq-list lp-reveal">{FAQ.map((f,i)=><div className={'lp-faq-item'+(openFaq===i?' is-open':'')} key={f.q}><h3><button type="button" aria-expanded={openFaq===i} aria-controls={'faq-answer-'+i} onClick={()=>setOpenFaq(cur=>cur===i?-1:i)}><span className="lp-faq-num">0{i+1}</span><span>{f.q}</span><ChevronDown size={20}/></button></h3><div id={'faq-answer-'+i} hidden={openFaq!==i}><p>{f.a}</p></div></div>)}</div></div></section>

      <section className="lp-endcta" aria-labelledby="lp-endcta-title"><div className="lp-container lp-endcta-grid"><div><span className="lp-endcta-tag"><Zap size={15}/> THE NEXT BUILD STARTS HERE</span><h2 id="lp-endcta-title">Đừng chỉ build nhanh.<br/><em>Build đúng.</em></h2><p>Đưa yêu cầu, đội ngũ và tri thức về cùng một nơi — và bắt đầu tạo ra phần mềm rõ ràng hơn.</p><button type="button" className="lp-button lp-button-primary" onClick={onStart}>Vào DevPilot Studio <ArrowUpRight size={20}/></button></div><div className="lp-endcta-orbit" aria-hidden="true"><div><span>THINK</span><span>PLAN</span><span>SHIP</span></div><span className="lp-endcta-logo">d.</span></div></div></section>
    </main>
    <footer className="lp-footer"><div className="lp-container"><div className="lp-footer-main"><div><Brand light/><p>Engineering clarity, powered by context.</p></div><div className="lp-footer-links"><div><strong>SẢN PHẨM</strong><a href="#features">Tính năng</a><a href="#workflow">Quy trình</a><a href="#faq">FAQ</a></div><div><strong>WORKSPACE</strong><button type="button" onClick={onStart}>Đăng nhập</button><button type="button" onClick={onRegister}>Tạo tài khoản</button></div></div></div><div className="lp-footer-bottom"><span>© {new Date().getFullYear()} DEVPILOT AI · SOFTWARE DEVELOPMENT ASSISTANT</span><span>DESIGNED FOR HUMAN DECISIONS <span aria-hidden="true">✳</span></span><a href="#top" aria-label="Trở về đầu trang">LÊN ĐẦU TRANG <ArrowUp size={14}/></a></div></div></footer>
  </div>;
}
