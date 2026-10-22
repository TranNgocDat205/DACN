import React, { useEffect, useState } from 'react';
import {
  Layers, FolderKanban, Plus, Shield, ChevronDown,
  Sparkles, PanelLeftClose, PanelLeftOpen, LogOut, X, ArrowRight
} from 'lucide-react';
import './CompactSidebar.css';

/** Compact, responsive sidebar for DevPilot AI. Navigation and permissions are supplied by App. */
export default function CompactSidebar({
  isAdmin, adminTabs, tabs, page, onNavigate, projectName, onCreateProject,
  requirementCount = 0, collapsed, onToggleCollapse, onExpand,
  mobileOpen, onCloseMobile, onLogout
}) {
  const [adminOpen, setAdminOpen] = useState(() => isAdmin && page.startsWith('admin-'));
  const [workspaceOpen, setWorkspaceOpen] = useState(() => !isAdmin || !page.startsWith('admin-'));

  const compact = collapsed && !mobileOpen;

  useEffect(() => {
    const isAdminPage = isAdmin && page.startsWith('admin-');
    setAdminOpen(isAdminPage);
    setWorkspaceOpen(!isAdminPage);
  }, [page, isAdmin]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = e => { if (e.key === 'Escape') onCloseMobile?.(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen, onCloseMobile]);

  function navigate(id) {
    onNavigate(id);
    onCloseMobile?.();
  }

  function group(id, title, Icon, entries, isOpen, toggle) {
    return (
      <section className="dp-side-group" key={id} aria-label={title}>
        <button
          type="button"
          className={'dp-side-group-toggle' + (entries.some(([entryId]) => entryId === page) ? ' has-active' : '')}
          aria-expanded={compact ? false : isOpen}
          aria-controls={compact ? undefined : `dp-side-group-${id}`}
          aria-label={compact ? `Mở menu ${title}` : `${isOpen ? 'Thu gọn' : 'Mở rộng'} ${title}`}
          title={compact ? title : undefined}
          onClick={() => compact ? onExpand() : toggle(!isOpen)}
        >
          <Icon size={16} aria-hidden="true" />
          {!compact && <><span>{title}</span><ChevronDown size={15} className={isOpen ? 'is-open' : ''} aria-hidden="true" /></>}
        </button>
        {!compact && (
          <div id={`dp-side-group-${id}`} className="dp-side-group-items" hidden={!isOpen}>
            {entries.map(([entryId, label, NavIcon]) => (
              <button
                type="button"
                key={entryId}
                className={'dp-side-link' + (page === entryId ? ' active' : '')}
                aria-current={page === entryId ? 'page' : undefined}
                title={label}
                onClick={() => navigate(entryId)}
              >
                <NavIcon size={17} strokeWidth={1.9} aria-hidden="true" />
                <span className="dp-side-link-label">{label}</span>
                {entryId === 'requirements' && <span className="dp-side-count">{requirementCount}</span>}
              </button>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <>
      {mobileOpen && <button type="button" className="dp-side-backdrop" onClick={onCloseMobile} aria-label="Đóng menu điều hướng" />}
      <aside className={'sidebar dp-side' + (isAdmin ? ' dp-side-admin' : '') + (compact ? ' sidebar-collapsed' : '') + (mobileOpen ? ' dp-side-mobile-open' : '')} aria-label="Điều hướng DevPilot AI">
        <div className="dp-side-brand">
          <div className="dp-side-logo" aria-hidden="true"><Layers size={21} /></div>
          {!compact && <div className="dp-side-wordmark">DevPilot <b>AI</b><small>DEVELOPMENT STUDIO</small></div>}
          <button type="button" className="dp-side-mobile-close" aria-label="Đóng menu" onClick={onCloseMobile}><X size={19} /></button>
        </div>
        <div className="dp-side-project-wrap">
          {!compact && <span className="dp-side-caption">DỰ ÁN ĐANG CHỌN</span>}
          <button type="button" className="dp-side-project" title="Tạo dự án mới" aria-label={`Tạo dự án mới. Hiện tại: ${projectName || 'Chưa chọn dự án'}`} onClick={() => { onCreateProject(); onCloseMobile?.(); }}>
            <FolderKanban size={19} aria-hidden="true" />
            {!compact && <><span title={projectName || 'Tạo dự án mới'}>{projectName || 'Tạo dự án mới'}</span><Plus size={15} aria-hidden="true" /></>}
          </button>
        </div>
        <nav className="dp-side-nav" aria-label="Các phân hệ">
          {isAdmin && group('admin', 'QUẢN TRỊ HỆ THỐNG', Shield, adminTabs, adminOpen, next => { setAdminOpen(next); if (next) setWorkspaceOpen(false); })}
          {group('workspace', 'KHÔNG GIAN LÀM VIỆC', FolderKanban, tabs, workspaceOpen, next => { setWorkspaceOpen(next); if (next) setAdminOpen(false); })}
        </nav>
        <div className="dp-side-footer">
          <button type="button" className="dp-side-ai" title="Mở trợ lý AI & RAG" onClick={() => navigate('documents')}>
            <Sparkles size={17} aria-hidden="true" />
            {!compact && <><span>Trợ lý AI & RAG</span><ArrowRight size={14} aria-hidden="true" /></>}
          </button>
          <div className="dp-side-footer-tools">
            <button type="button" className="dp-side-tool dp-side-desktop-collapse" title={compact ? 'Mở rộng thanh menu' : 'Thu gọn thanh menu'} aria-label={compact ? 'Mở rộng thanh menu' : 'Thu gọn thanh menu'} onClick={onToggleCollapse}>
              {compact ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
              {!compact && <span>Thu gọn</span>}
            </button>
            <button type="button" className="dp-side-tool dp-side-logout" title="Đăng xuất" onClick={onLogout} aria-label="Đăng xuất">
              <LogOut size={17} />{!compact && <span>Đăng xuất</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
