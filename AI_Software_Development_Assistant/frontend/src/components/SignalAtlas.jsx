import React, { useMemo, useRef, useState } from 'react';
import { ArrowUpRight, CheckCircle2, CircleDot, FileText, GitBranch, Layers, MoveUpRight, Radar, Sparkles } from 'lucide-react';
import './SignalAtlas.css';

/**
 * Signal Atlas — the signature interaction for DevPilot Mission Control.
 * Counts come exclusively from project data. No generated metrics or AI claims.
 * All nodes are buttons: the visual map also works via keyboard and touch.
 */
export default function SignalAtlas({ data = {}, navigate }) {
  const [selected, setSelected] = useState('requirements');
  const panel = useRef(null);
  const requirements = data.requirements || [];
  const stories = data.stories || [];
  const tasks = data.tasks || [];
  const docs = data.documents || [];
  const done = tasks.filter(item => item.status === 'DONE').length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const nodes = useMemo(() => [
    { id: 'requirements', number: '01', title: 'Yêu cầu', count: requirements.length, caption: 'Ghi nhận nhu cầu sản phẩm', route: 'requirements', Icon: FileText, x: 15, y: 46, color: 'mint', note: 'Nền tảng của mọi tính năng: một yêu cầu rõ ràng và có thể kiểm chứng.' },
    { id: 'stories', number: '02', title: 'User Stories', count: stories.length, caption: 'Chuyển hóa ý tưởng', route: 'stories', Icon: GitBranch, x: 39, y: 26, color: 'lavender', note: 'Biến yêu cầu thành trải nghiệm và tiêu chí nghiệm thu cụ thể.' },
    { id: 'tasks', number: '03', title: 'Công việc', count: tasks.length, caption: 'Phát triển qua Sprint', route: 'board', Icon: Layers, x: 64, y: 64, color: 'peach', note: 'Theo dõi tiến độ và phân công thực hiện trên Kanban Board.' },
    { id: 'done', number: '04', title: 'Hoàn tất', count: done, caption: 'Theo dõi việc bàn giao', route: 'ai-traceability', Icon: CheckCircle2, x: 87, y: 32, color: 'gold', note: 'Các Task ở trạng thái Done; kiểm tra Traceability để đánh giá điều kiện bàn giao.' },
  ], [requirements.length, stories.length, tasks.length, done]);
  const active = nodes.find(n => n.id === selected) || nodes[0];

  function moveGlow(event) {
    if (event.pointerType === 'touch' || !panel.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = panel.current.getBoundingClientRect();
    panel.current.style.setProperty('--atlas-pointer-x', `${event.clientX - rect.left}px`);
    panel.current.style.setProperty('--atlas-pointer-y', `${event.clientY - rect.top}px`);
  }

  return (
    <section className="sa" ref={panel} onPointerMove={moveGlow} aria-labelledby="sa-title">
      <div className="sa-noise" aria-hidden="true" />
      <header className="sa-header">
        <div className="sa-heading-group">
          <span className="sa-overline"><span className="sa-diamond" /> PRODUCT INTELLIGENCE / 01 — 04</span>
          <h2 id="sa-title">Một hệ thống. <em>Muôn chuyển động.</em></h2>
          <p>Nhìn thấy dòng chảy của dự án theo thời gian thực. Chọn một điểm tín hiệu để khám phá và đi thẳng tới công việc.</p>
        </div>
        <div className="sa-health" aria-label={`Tiến độ công việc ${progress}%`}>
          <span className="sa-health-wave"><i /><i /><i /><i /><i /></span>
          <span><small>PROJECT PULSE</small><strong>{progress}% <span>đã hoàn thành</span></strong></span>
        </div>
      </header>

      <div className="sa-content">
        <div className="sa-map" aria-label="Sơ đồ 4 giai đoạn phát triển phần mềm">
          <div className="sa-grid" aria-hidden="true" />
          <svg className="sa-routes" viewBox="0 0 900 352" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="sa-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#83f2c6"/><stop offset="38%" stopColor="#ad9cff"/><stop offset="72%" stopColor="#ffb29f"/><stop offset="100%" stopColor="#ffe5aa"/>
              </linearGradient>
              <filter id="sa-glow"><feGaussianBlur stdDeviation="6"/></filter>
            </defs>
            <path className="sa-route-glow" d="M135 162 C248 160 250 91 351 91 S495 233 576 225 S688 113 783 113" />
            <path className="sa-route" d="M135 162 C248 160 250 91 351 91 S495 233 576 225 S688 113 783 113" />
            <path className="sa-route-flow" d="M135 162 C248 160 250 91 351 91 S495 233 576 225 S688 113 783 113" />
            <circle className="sa-orbit-circle" cx="457" cy="161" r="137" />
            <circle className="sa-orbit-circle sa-orbit-inner" cx="457" cy="161" r="81" />
            <circle className="sa-halo" cx="457" cy="161" r="4" fill="#c6bafa"/>
          </svg>
          <div className="sa-center-label" aria-hidden="true"><Radar size={18}/><span>ENGINEERING</span><strong>FLOW</strong><small>DEV / PILOT</small></div>
          {nodes.map((node) => (
            <button
              key={node.id}
              className={`sa-node sa-${node.color} ${selected === node.id ? 'is-active' : ''}`}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              type="button"
              aria-pressed={selected === node.id}
              aria-label={`${node.title}: ${node.count}. Chọn để xem thông tin.`}
              onClick={() => setSelected(node.id)}
            >
              <span className="sa-node-icon"><node.Icon size={19} strokeWidth={1.8}/></span>
              <span className="sa-node-text"><small>{node.number} / SIGNAL</small><strong>{node.count} <span>{node.title}</span></strong></span>
              <span className="sa-node-ring" aria-hidden="true"/>
            </button>
          ))}
          <div className="sa-map-scale" aria-hidden="true">SIGNAL MAP <span>•</span> 4 CONNECTED STAGES</div>
        </div>
        <aside className="sa-inspector" aria-live="polite">
          <div className="sa-inspector-top"><span><Sparkles size={15}/> INSPECT SIGNAL</span><span>{active.number} / 04</span></div>
          <div key={active.id} className="sa-inspector-body">
            <span className={`sa-inspector-symbol sa-${active.color}`}><active.Icon size={29} strokeWidth={1.7}/></span>
            <span className="sa-inspector-eyebrow">CHẶNG {active.number} — {active.caption}</span>
            <strong className="sa-inspector-count">{active.count.toLocaleString('vi-VN')}<span> {active.title}</span></strong>
            <p>{active.note}</p>
          </div>
          <div className="sa-inspector-foot">
            <span><CircleDot size={14}/> DỮ LIỆU PROJECT</span>
            <button type="button" onClick={() => navigate(active.route)}>Mở phân hệ <ArrowUpRight size={16}/></button>
          </div>
        </aside>
      </div>
      <footer className="sa-footer">
        <span><span className="sa-live-dot"/> DỮ LIỆU CẬP NHẬT TỪ PROJECT</span>
        <span>{docs.length} TÀI LIỆU RAG <span className="sa-footer-separator">/</span> <button type="button" onClick={() => navigate('documents')}>KHÁM PHÁ KNOWLEDGE BASE <MoveUpRight size={14}/></button></span>
      </footer>
    </section>
  );
}
