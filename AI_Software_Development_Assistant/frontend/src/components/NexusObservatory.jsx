import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity, ArrowRight, ArrowUpRight, CheckCircle2, ChevronRight,
  CircleDot, Command, FileText, GitBranch, Layers3, Maximize2,
  ShieldCheck, Sparkles, X, Zap
} from 'lucide-react';

const ACTIONS = [
  { id:'requirements', name:'Requirements', subtitle:'Ý tưởng trở thành đặc tả', icon:FileText, color:'cyan', number:'01', hint:'Khởi tạo và kiểm soát phạm vi' },
  { id:'stories', name:'User Stories', subtitle:'Chuyển ý tưởng thành giá trị', icon:GitBranch, color:'violet', number:'02', hint:'Mô tả góc nhìn người dùng' },
  { id:'board', name:'Execution', subtitle:'Sắp xếp công việc để triển khai', icon:Layers3, color:'peach', number:'03', hint:'Theo dõi tiến độ Kanban' },
  { id:'done', name:'Delivered', subtitle:'Những công việc đã hoàn tất', icon:CheckCircle2, color:'mint', number:'04', hint:'Kiểm tra kết quả thực tế' },
];

/**
 * Nexus Observatory is a presentation layer for data already returned by
 * the existing project APIs. No credentials, network requests, route or
 * authorization logic is added here. Protected navigation stays in App.
 */
export default function NexusObservatory({ project, data, aiStatus, navigate }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('requirements');
  const dialogRef = useRef(null);
  const launchRef = useRef(null);
  const moveFrame = useRef(0);
  const totalRequirements = (data?.requirements || []).length;
  const totalStories = (data?.stories || []).length;
  const tasks = data?.tasks || [];
  const done = tasks.filter(task => task.status === 'DONE').length;
  const counts = [totalRequirements, totalStories, tasks.length, done];
  const completion = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const aiConfigured = Boolean(aiStatus?.llm_configured) && aiStatus?.status !== 'offline';
  const nodes = useMemo(() => ACTIONS.map((item,index) => ({ ...item, count:counts[index] })), [totalRequirements,totalStories,tasks.length,done]);
  const current = nodes.find(node=>node.id===selected) || nodes[0];
  const IndexIcon = current.icon;

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Shift focus into the dialog; restore it to the launcher on close.
    const focusId = requestAnimationFrame(() => dialogRef.current?.querySelector('.nx-close')?.focus());
    function onKeyDown(event) {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); return; }
      if (event.key !== 'Tab') return;
      const elements = [...(dialogRef.current?.querySelectorAll('button:not([disabled]),a[href],select,input,[tabindex]:not([tabindex="-1"])') || [])]
        .filter(element => element.getClientRects().length > 0);
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(focusId);
      cancelAnimationFrame(moveFrame.current);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      launchRef.current?.focus();
    };
  }, [open]);

  const openModule = (page) => {
    setOpen(false);
    navigate(page === 'done' ? 'board' : page);
  };
  const trackPointer = (event) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse)').matches) return;
    const box = event.currentTarget.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const x = (event.clientX - box.left) / box.width - .5;
    const y = (event.clientY - box.top) / box.height - .5;
    cancelAnimationFrame(moveFrame.current);
    const element = event.currentTarget;
    moveFrame.current = requestAnimationFrame(() => {
      element.style.setProperty('--nx-motion-x', `${Math.max(-.5,Math.min(.5,x)) * 10}deg`);
      element.style.setProperty('--nx-motion-y', `${Math.max(-.5,Math.min(.5,y)) * -9}deg`);
    });
  };
  const resetPointer = event => {
    cancelAnimationFrame(moveFrame.current);
    event.currentTarget.style.removeProperty('--nx-motion-x');
    event.currentTarget.style.removeProperty('--nx-motion-y');
  };

  return <>
    <section className="nx-launcher" aria-label="Nexus Observatory">
      <div className="nx-launcher-copy">
        <span className="nx-launcher-icon"><Sparkles size={19}/></span>
        <span><small>DEVPILOT / NEXUS MODE</small><strong>Nhìn toàn bộ dự án dưới một góc độ khác.</strong></span>
      </div>
      <div className="nx-launcher-stats" aria-label={`Tiến độ hoàn thành ${completion}%`}>
        <span className="nx-launcher-pulse" aria-hidden="true"/><span>{completion}% delivered</span>
      </div>
      <button ref={launchRef} type="button" className="nx-open" onClick={()=>setOpen(true)}>
        <Maximize2 size={16}/><span>Mở Nexus View</span><ArrowUpRight size={17}/>
      </button>
    </section>

    {open && createPortal(<div className="nx-overlay" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setOpen(false)}}>
      <section role="dialog" aria-modal="true" aria-labelledby="nx-title" ref={dialogRef} className="nx-shell">
        <div className="nx-backlight" aria-hidden="true"/>
        <header className="nx-topbar">
          <div className="nx-brand"><span className="nx-brandmark"><CircleDot size={23}/></span><span><strong>DEVPILOT<span className="nx-brand-star">✳</span></strong><small>THE NEXUS OBSERVATORY</small></span></div>
          <div className="nx-top-center"><span className="nx-live-dot"/> LIVE PROJECT INTELLIGENCE</div>
          <button className="nx-close" type="button" onClick={()=>setOpen(false)} aria-label="Đóng Nexus View"><X size={20}/><span>ESC</span></button>
        </header>
        <div className="nx-body">
          <div className="nx-intro">
            <div className="nx-eyebrow"><span className="nx-bleep"/> LIVE OPERATIONS <span className="nx-crumb">/</span> PROJECT SPACE</div>
            <h2 id="nx-title">Build with<br/><em>clarity.</em></h2>
            <p>Từ ý tưởng đến sản phẩm — một bức tranh thống nhất về tiến độ, yêu cầu và công việc. Chọn điểm tín hiệu để khám phá.</p>
            <div className="nx-project-tag"><span>WORKSPACE</span><strong title={project?.name}>{project?.name || 'DevPilot Project'}</strong></div>
          </div>
          <div className="nx-observatory" onPointerMove={trackPointer} onPointerLeave={resetPointer}>
            <div className="nx-space" aria-hidden="true"><span className="nx-grid"/><span className="nx-ellipse one"/><span className="nx-ellipse two"/><span className="nx-ellipse three"/><span className="nx-stars"/></div>
            <svg className="nx-lines" viewBox="0 0 670 540" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
              <defs><linearGradient id="nx-flow" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#61e4f5"/><stop offset=".5" stopColor="#9d8cff"/><stop offset="1" stopColor="#ffaf88"/></linearGradient></defs>
              <path d="M156 140 Q 260 75 338 260 Q 440 85 535 144 M156 405 Q 250 480 338 280 Q 450 463 535 405" fill="none" stroke="url(#nx-flow)" strokeWidth="1.5" strokeDasharray="5 10" opacity=".82"/>
              <circle cx="338" cy="270" r="188" stroke="#7779b5" strokeOpacity=".22" strokeWidth="1" fill="none" strokeDasharray="2 12"/>
              <circle cx="338" cy="270" r="138" stroke="#77d9ee" strokeOpacity=".18" strokeWidth="1" fill="none"/>
            </svg>
            <div className="nx-core" aria-hidden="true"><div className="nx-core-halo"/><div className="nx-core-ring ring-1"/><div className="nx-core-ring ring-2"/><div className="nx-core-ring ring-3"/><div className="nx-core-object"><div className="nx-core-object-inner"/></div><div className="nx-core-mark"><span>PROJECT CORE</span><strong>{completion}<small>%</small></strong><span>DELIVERED</span></div></div>
            <div className="nx-node-grid">
              {nodes.map(node=>{const Icon = node.icon;return <button key={node.id} type="button"
                className={`nx-node nx-node-${node.id} nx-${node.color}${selected===node.id?' is-selected':''}`}
                aria-pressed={selected===node.id} onClick={()=>setSelected(node.id)}>
                <span className="nx-node-index">{node.number} / STAGE</span>
                <span className="nx-node-title"><Icon size={17}/><strong>{node.name}</strong></span>
                <span className="nx-node-count">{node.count}<small>items</small></span>
                <span className="nx-node-arrow"><ChevronRight size={16}/></span>
              </button>})}
            </div>
            <div className="nx-coordinates" aria-hidden="true">X 001.4 — Y 092.8<br/>DEV // PILOT</div>
          </div>
          <aside className="nx-side">
            <div className="nx-side-top"><span>INSIGHT / {current.number}</span><span className="nx-side-spark"><Activity size={16}/></span></div>
            <span className={`nx-side-icon nx-${current.color}`}><IndexIcon size={28}/></span>
            <span className="nx-side-kicker">CURRENT NODE</span><h3>{current.name}</h3>
            <p>{current.subtitle}. {current.hint}.</p>
            <div className="nx-side-number"><strong>{current.count}</strong><span>hạng mục hiện có</span></div>
            <button className="nx-go" type="button" onClick={()=>openModule(current.id)}>Mở {current.name}<ArrowUpRight size={17}/></button>
            <div className="nx-side-divider"/>
            <div className="nx-status-item"><span><ShieldCheck size={16}/> Quyền truy cập</span><b>Theo phiên hiện tại</b></div>
            <div className="nx-status-item"><span><Zap size={16}/> AI Provider</span><b>{aiConfigured?'Đã cấu hình':'Chưa xác nhận'}</b></div>
            <div className="nx-status-item"><span><CheckCircle2 size={16}/> Hoàn tất</span><b>{done}/{tasks.length} tasks</b></div>
            <div className="nx-side-foot"><Command size={14}/> Bấm vào một node để xem chi tiết</div>
          </aside>
        </div>
        <footer className="nx-bottom"><span>DESIGNED FOR THE PEOPLE WHO BUILD.</span><span>THE NEXUS / {new Date().getFullYear()}</span></footer>
      </section>
    </div>, document.body)}
  </>;
}
