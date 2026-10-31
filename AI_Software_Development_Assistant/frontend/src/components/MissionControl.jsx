import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, ArrowUpRight, Activity, BookOpen, Boxes, CalendarClock,
  Check, CheckCircle2, ChevronRight, CircleDot, ClipboardList,
  Command, FileText, GitBranch, Layers3, Network, Orbit, Radar,
  ScanSearch, ShieldCheck, Sparkles, Split, Target, WandSparkles,
  Zap
} from 'lucide-react';
import SignalAtlas from './SignalAtlas.jsx';

/**
 * DevPilot / Mission Control — project-native dashboard.
 * Every number is derived from the existing project payload. This view does
 * not change requirements, tasks, or any API contracts.
 */
export default function MissionControl({ project, data, counts, navigate, projects, changeProject, aiStatus, onOpenCommand }) {
  const [activeLens, setActiveLens] = useState('pipeline');
  // Progressive enhancement: keep content visible when JS observers or reduced motion are unavailable.
  useEffect(() => {
    const root = document.querySelector('.mc');
    if (!root || !('IntersectionObserver' in window) ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const targets = [...root.querySelectorAll('.mc-metric, .mc-panel, .mc-ai-card, .mc-research-rail, .sa')];
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('mc-in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
    targets.forEach(node => observer.observe(node));
    root.classList.add('mc-motion-ready');
    return () => { observer.disconnect(); root.classList.remove('mc-motion-ready'); };
  }, []);
  const tasks = data.tasks || [];
  const requirements = data.requirements || [];
  const stories = data.stories || [];
  const sprints = data.sprints || [];
  const documents = data.documents || [];
  const done = tasks.filter(task => task.status === 'DONE').length;
  const progress = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  const status = [
    { key:'TODO', label:'Cần làm', color:'var(--mc-slate)' },
    { key:'IN_PROGRESS', label:'Đang làm', color:'var(--mc-purple)' },
    { key:'REVIEW', label:'Kiểm tra', color:'var(--mc-coral)' },
    { key:'DONE', label:'Hoàn thành', color:'var(--mc-mint)' },
  ].map(s => ({ ...s, count:tasks.filter(t => t.status === s.key).length }));
  const recent = useMemo(() => [...requirements].sort((a,b) =>
    new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
  ).slice(0, 4), [requirements]);
  const focus = useMemo(() => [...tasks].filter(t => t.status !== 'DONE').sort((a,b) => {
    const weight = {CRITICAL:4, HIGH:3, MEDIUM:2, LOW:1};
    return (weight[b.priority]||0) - (weight[a.priority]||0) ||
      (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
  }).slice(0, 3), [tasks]);
  const stages = [
    {label:'YÊU CẦU',count:requirements.length,icon:FileText,page:'requirements',detail:'Requirement'},
    {label:'USER STORY',count:stories.length,icon:GitBranch,page:'stories',detail:'User Story'},
    {label:'CÔNG VIỆC',count:tasks.length,icon:ClipboardList,page:'board',detail:'Task'},
    {label:'HOÀN TẤT',count:done,icon:CheckCircle2,page:'board',detail:'Done'},
  ];
  const activeSprint = sprints.find(s => s.status === 'ACTIVE');
  const connected = aiStatus?.status !== 'offline' && !!aiStatus?.llm_configured;
  const formattedDate = new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'long',year:'numeric'}).format(new Date());

  return <div className="mc" aria-label="DevPilot Mission Control">
    <div className="mc-kicker"><span><span className="mc-led"/> WORKSPACE / CONTROL DECK <span className="mc-kicker-slash">/</span> 01</span><span className="mc-kicker-date">{formattedDate}</span></div>

    <section className="mc-hero" aria-labelledby="mc-title">
      <div className="mc-hero-aura" aria-hidden="true"/>
      <div className="mc-hero-left">
        <div className="mc-mini-label"><span className="mc-mini-symbol"><Orbit size={14}/></span> SOFTWARE INTELLIGENCE PLATFORM <span>— EST. 2026</span></div>
        <h1 id="mc-title">Ideas into<br/><span className="mc-gradient-word">impact.</span><span className="mc-heading-dot">✳</span></h1>
        <p>Điều hành dự án với một góc nhìn rõ ràng. Đưa yêu cầu, con người và trí tuệ nhân tạo vào cùng một nhịp phát triển.</p>
        <div className="mc-hero-actions">
          <button className="mc-primary" type="button" onClick={()=>navigate('ai-conflicts')}><WandSparkles size={17}/> Khám phá AI <ArrowUpRight size={17}/></button>
          <button className="mc-link-hero" type="button" onClick={()=>navigate('board')}>Mở Kanban <ArrowRight size={17}/></button>
        </div>
        <div className="mc-hero-footer"><span className="mc-live-badge"><span/> {connected?'AI ENGINE CONNECTED':'WORKSPACE READY'}</span><span>DEV → PILOT / V3.0</span></div>
      </div>
      <div className="mc-hero-right" aria-label={`Luồng phát triển và tiến độ ${progress}%`}>
        <div className="mc-orbit-top"><span>01 / SYSTEM TOPOLOGY</span><span className="mc-orbit-top-right">LIVE PROJECT DATA <span/></span></div>
        <div className="mc-topology">
          <svg className="mc-connections" viewBox="0 0 600 360" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="mc-bridge" x1="0" x2="1"><stop stopColor="#94f4cb"/><stop offset=".58" stopColor="#9694ef"/><stop offset="1" stopColor="#fc9d92"/></linearGradient>
              <radialGradient id="mc-core-gradient"><stop stopColor="#9c8bf6" stopOpacity=".21"/><stop offset="1" stopColor="#9c8bf6" stopOpacity="0"/></radialGradient>
            </defs>
            <circle cx="304" cy="174" r="150" fill="url(#mc-core-gradient)"/>
            <circle cx="304" cy="174" r="128" fill="none" stroke="#ffffff" strokeOpacity=".12" strokeDasharray="3 9"/>
            <circle cx="304" cy="174" r="100" fill="none" stroke="#ffffff" strokeOpacity=".09"/>
            <path d="M 114 88 C 165 88 174 134 221 151" fill="none" stroke="url(#mc-bridge)" strokeWidth="2" strokeDasharray="4 7"/>
            <path d="M 411 148 C 470 128 472 92 528 96" fill="none" stroke="url(#mc-bridge)" strokeWidth="2" strokeDasharray="4 7"/>
            <path d="M 217 223 C 184 238 173 278 125 282" fill="none" stroke="url(#mc-bridge)" strokeWidth="2" strokeDasharray="4 7"/>
            <path d="M 412 217 C 469 230 472 288 523 286" fill="none" stroke="url(#mc-bridge)" strokeWidth="2" strokeDasharray="4 7"/>
            <circle cx="221" cy="151" r="4" fill="#92f3ce"/><circle cx="411" cy="148" r="4" fill="#a8a0ff"/>
            <circle cx="217" cy="223" r="4" fill="#a8a0ff"/><circle cx="412" cy="217" r="4" fill="#f7a996"/>
          </svg>
          <button type="button" className="mc-node mc-node-req" onClick={()=>navigate('requirements')}><span className="mc-node-dot mint"/><small>01 / INPUT</small><strong>{requirements.length} <span>Yêu cầu</span></strong></button>
          <button type="button" className="mc-node mc-node-story" onClick={()=>navigate('stories')}><span className="mc-node-dot purple"/><small>02 / DESIGN</small><strong>{stories.length} <span>Stories</span></strong></button>
          <button type="button" className="mc-node mc-node-task" onClick={()=>navigate('board')}><span className="mc-node-dot purple"/><small>03 / BUILD</small><strong>{tasks.length} <span>Tasks</span></strong></button>
          <button type="button" className="mc-node mc-node-done" onClick={()=>navigate('board')}><span className="mc-node-dot coral"/><small>04 / SHIP</small><strong>{done} <span>Done</span></strong></button>
          <div className="mc-topology-core" style={{'--mc-fill':`${progress}%`}}><div><small>DELIVERY</small><strong>{progress}<span>%</span></strong><span>PROJECT PROGRESS</span></div></div>
        </div>
        <div className="mc-orbit-bottom"><span>SPECIFY</span><i/> <span>BUILD</span><i/><span>VALIDATE</span><i/><span>SHIP</span></div>
      </div>
    </section>

    <div className="mc-project-strip"><div><span className="mc-mono">ACTIVE WORKSPACE</span><strong title={project?.name}>{project?.name || 'Project'}</strong></div><label>PROJECT SWITCHER <select value={project.id} onChange={e=>changeProject(Number(e.target.value))}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><button className="mc-shortcut" type="button" onClick={onOpenCommand}><Command size={15}/> <span>Quick switch</span><kbd>Ctrl K</kbd></button></div>

    <div className="mc-metrics" aria-label="Chỉ số thực của dự án">
      {[
        {name:'Requirements',number:requirements.length,desc:'Phạm vi đã ghi nhận',page:'requirements',icon:FileText,tone:'mint'},
        {name:'User Stories',number:stories.length,desc:'Góc nhìn người dùng',page:'stories',icon:GitBranch,tone:'purple'},
        {name:'Total Tasks',number:tasks.length,desc:'Công việc đang quản lý',page:'board',icon:Boxes,tone:'coral'},
        {name:'Completed',number:done,desc:'Đã chuyển sang Done',page:'board',icon:CheckCircle2,tone:'yellow'}
      ].map((m,i)=><button type="button" className={'mc-metric mc-tone-'+m.tone} key={m.name} onClick={()=>navigate(m.page)}>
        <div className="mc-metric-head"><span>0{i+1} / LIVE METRIC</span><m.icon size={18}/></div>
        <div className="mc-metric-number">{String(m.number).padStart(2,'0')}<sup>↗</sup></div>
        <div className="mc-metric-bottom"><div><strong>{m.name}</strong><span>{m.desc}</span></div><ArrowUpRight size={17}/></div>
      </button>)}
    </div>

    <SignalAtlas data={data} navigate={navigate} />

    <div className="mc-section-heading"><div><span className="mc-mono">02 — PROJECT PULSE</span><h2>Mọi tín hiệu. Một màn hình.</h2></div><span>QUAN SÁT / PHÂN TÍCH / HÀNH ĐỘNG</span></div>
    <div className="mc-middle-grid">
      <section className="mc-panel mc-delivery">
        <div className="mc-panel-head"><div><span className="mc-mono">DELIVERY VELOCITY</span><h3>Tiến độ sản phẩm</h3></div><button onClick={()=>navigate('sprints')} type="button" aria-label="Mở Sprint"><ArrowUpRight size={20}/></button></div>
        <div className="mc-delivery-body">
          <div className="mc-delivery-ring" style={{'--mc-fill':`${progress}%`}}><div><span>COMPLETED</span><strong>{progress}<small>%</small></strong></div></div>
          <div className="mc-delivery-summary"><span className="mc-mono">CURRENT STATUS</span><strong>{tasks.length===0?'Chưa bắt đầu':progress===100?'Đã hoàn thành':'Đang phát triển'}</strong><p>{tasks.length ? `${done} / ${tasks.length} công việc hoàn tất` : 'Tạo Task đầu tiên để bắt đầu theo dõi tiến độ.'}</p><span className="mc-sprint-line"><CalendarClock size={15}/>{activeSprint ? activeSprint.name : 'Chưa có Sprint đang chạy'}</span></div>
        </div>
        <div className="mc-status-track" aria-label="Phân bố công việc theo trạng thái">{status.map(s=>s.count>0?<div key={s.key} style={{width:`${s.count/tasks.length*100}%`,background:s.color}} title={`${s.label}: ${s.count}`}/>:null)}</div>
        <div className="mc-status-legend">{status.map(s=><span key={s.key}><i style={{background:s.color}}/>{s.label}<b>{s.count}</b></span>)}</div>
      </section>
      <section className="mc-panel mc-activity">
        <div className="mc-panel-head"><div><span className="mc-mono">WORKSTREAM / SIGNALS</span><h3>Tiêu điểm gần đây</h3></div><button onClick={()=>navigate('requirements')} type="button" aria-label="Xem toàn bộ yêu cầu"><ArrowUpRight size={20}/></button></div>
        <div className="mc-lens-tabs" role="group" aria-label="Chế độ xem hoạt động">
          <button type="button" className={activeLens==='pipeline'?'active':''} aria-pressed={activeLens==='pipeline'} onClick={()=>setActiveLens('pipeline')}><Activity size={14}/> Workflow</button>
          <button type="button" className={activeLens==='focus'?'active':''} aria-pressed={activeLens==='focus'} onClick={()=>setActiveLens('focus')}><Target size={14}/> Ưu tiên</button>
        </div>
        {activeLens==='pipeline'?<div className="mc-activity-list">{recent.length?recent.map((r,i)=><button key={r.id} type="button" onClick={()=>navigate('requirements')} className="mc-activity-row"><span className="mc-activity-index">{String(i+1).padStart(2,'0')}</span><div><strong>{r.title}</strong><small>REQ-{r.id}{r.createdAt?' · '+new Date(r.createdAt).toLocaleDateString('vi-VN'):''}</small></div><span className="mc-small-pill">{({DRAFT:'Bản nháp',APPROVED:'Đã duyệt',ANALYZING:'Phân tích',IN_DEVELOPMENT:'Phát triển',COMPLETED:'Hoàn thành'})[r.status]||r.status||'Yêu cầu'}</span><ChevronRight size={17}/></button>):<div className="mc-empty-state"><FileText size={26}/><strong>Không gian cho yêu cầu đầu tiên.</strong><p>Thêm Requirement để bắt đầu theo dõi hoạt động.</p><button type="button" onClick={()=>navigate('requirements')}>Mở yêu cầu <ArrowRight size={15}/></button></div>}</div>
        :<div className="mc-activity-list">{focus.length?focus.map((t,i)=><button key={t.id} type="button" onClick={()=>navigate('board')} className="mc-activity-row"><span className="mc-activity-index">{String(i+1).padStart(2,'0')}</span><div><strong>{t.title}</strong><small>TASK-{t.id} · {t.dueDate?`Hạn ${new Date(t.dueDate).toLocaleDateString('vi-VN')}`:'Chưa có deadline'}</small></div><span className="mc-small-pill">{({CRITICAL:'Khẩn',HIGH:'Cao',MEDIUM:'Vừa',LOW:'Thấp'})[t.priority]||'Task'}</span><ChevronRight size={17}/></button>):<div className="mc-empty-state"><Check size={28}/><strong>Không có công việc tồn đọng.</strong><p>Những Task cần ưu tiên sẽ hiển thị tại đây.</p><button type="button" onClick={()=>navigate('board')}>Mở Kanban <ArrowRight size={15}/></button></div>}</div>}
      </section>
    </div>

    <div className="mc-section-heading mc-ai-section"><div><span className="mc-mono">03 — INTELLIGENCE LAYER</span><h2>Think ahead. <em>Ship better.</em></h2></div><span>AI TOOLKIT / 03 MODULES</span></div>
    <div className="mc-ai-grid">
      {[
        {num:'01',kicker:'DETECT',title:'AI phát hiện xung đột',body:'Tìm những yêu cầu trùng lặp, mâu thuẫn và điểm thiếu nhất quán.',page:'ai-conflicts',icon:ScanSearch,foot:'REQUIREMENTS INTELLIGENCE',cls:'mc-ai-mint'},
        {num:'02',kicker:'SIMULATE',title:'AI mô phỏng thay đổi',body:'Nhìn trước tác động đến Story, Task, Sprint trước khi thay đổi.',page:'ai-impact',icon:Split,foot:'CHANGE IMPACT ENGINE',cls:'mc-ai-violet'},
        {num:'03',kicker:'TRACE',title:'AI truy vết bàn giao',body:'Kết nối yêu cầu với quá trình phát triển và điều kiện nghiệm thu.',page:'ai-traceability',icon:Network,foot:'RELEASE TRACEABILITY',cls:'mc-ai-coral'}
      ].map(x=><button key={x.num} className={`mc-ai-card ${x.cls}`} type="button" onClick={()=>navigate(x.page)}><div className="mc-ai-card-top"><span>{x.num} / {x.kicker}</span><ArrowUpRight size={19}/></div><div className="mc-ai-card-icon"><x.icon size={29} strokeWidth={1.4}/></div><h3>{x.title}</h3><p>{x.body}</p><div className="mc-ai-card-bottom"><span>{x.foot}</span><ArrowRight size={18}/></div></button>)}
    </div>
    <button type="button" onClick={()=>navigate('documents')} className="mc-research-rail"><span className="mc-research-icon"><BookOpen size={21}/></span><span><small>04 / KNOWLEDGE ENGINE</small><strong>AI Research & RAG <i>—</i> biến tài liệu thành câu trả lời có dẫn chứng.</strong></span><span className="mc-research-trail"><span>{documents.length} TÀI LIỆU</span><ArrowUpRight size={19}/></span></button>
    <footer className="mc-footer"><span>DEVPILOT © {new Date().getFullYear()} / ENGINEERING INTELLIGENCE</span><span>BUILT FOR THE PEOPLE WHO BUILD.</span></footer>
  </div>;
}
