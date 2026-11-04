// Lucian UX/UI Prompt #103 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#103
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FolderKanban, FolderOpen, LayoutDashboard, Shield, ChevronRight, Check, Boxes } from 'lucide-react';
import './ProjectBreadcrumb103.css';

/**
 * Breadcrumb / folder explorer for the real DevPilot workspace.
 * The user can explore project folders or move directly to existing pages.
 * Navigation is delegated to App so its auth, RBAC and API state remain unchanged.
 */
export default function ProjectBreadcrumb103({
  project, projects = [], page, tabs = [], adminTabs = [], isAdmin = false,
  onNavigate, onChangeProject,
}) {
  const [openedAt, setOpenedAt] = useState(null);
  const rootRef = useRef(null);
  const buttonsRef = useRef({});
  const adminPage = page?.startsWith('admin-');
  const pageTabs = adminPage ? adminTabs : tabs;
  const currentPage = pageTabs.find(([id]) => id === page);
  const section = adminPage ? 'Quản trị' : 'Dự án';
  const crumbs = useMemo(() => [
    { label: 'DevPilot', kind: 'root' },
    { label: section, kind: 'directory' },
    ...(!adminPage && project ? [{ label: project.name || 'Dự án hiện tại', kind: 'project' }] : []),
    ...(currentPage ? [{ label: currentPage[1], kind: 'page' }] : []),
  ], [section, adminPage, project, currentPage?.[0]]);

  useEffect(() => { setOpenedAt(null); }, [page, project?.id, adminPage]);
  useEffect(() => {
    if (openedAt === null) return;
    function onOutsidePointer(event) {
      if (!rootRef.current?.contains(event.target)) setOpenedAt(null);
    }
    function onEscape(event) {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      const index = openedAt;
      setOpenedAt(null);
      buttonsRef.current[index]?.focus();
    }
    document.addEventListener('pointerdown', onOutsidePointer);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('pointerdown', onOutsidePointer);
      document.removeEventListener('keydown', onEscape);
    };
  }, [openedAt]);

  const directoryItems = adminPage ? adminTabs.map(([id, label, Icon]) => ({
    id, label, Icon: Icon || Shield, type: 'page', selected: id === page,
  })) : projects.map(p => ({
    id: p.id, label: p.name || `Dự án ${p.id}`, Icon: FolderKanban,
    type: 'project', selected: p.id === project?.id,
  }));
  const pageItems = tabs.map(([id, label, Icon]) => ({
    id, label, Icon: Icon || FolderOpen, type: 'page', selected: id === page,
  }));
  const rootItems = [
    { id: 'directory', label: 'Dự án', Icon: FolderKanban, type: 'open-projects', detail: `${projects.length} dự án` },
    ...(isAdmin ? [{ id: 'admin-overview', label: 'Quản trị hệ thống', Icon: Shield, type: 'page' }] : []),
  ];
  const activeKind = crumbs[openedAt]?.kind;
  let choices = [];
  if (activeKind === 'root') choices = rootItems;
  else if (activeKind === 'directory') choices = directoryItems;
  else if (activeKind === 'project' || activeKind === 'page') choices = adminPage ? directoryItems : pageItems;

  function choose(item) {
    if (item.type === 'open-projects') {
      const index = crumbs.findIndex(c => c.kind === 'directory');
      if (adminPage) onNavigate('dashboard');
      else setOpenedAt(index >= 0 ? index : null);
    } else if (item.type === 'project') {
      onChangeProject(item.id);
      onNavigate('dashboard');
      setOpenedAt(null);
    } else if (item.type === 'page') {
      onNavigate(item.id);
      setOpenedAt(null);
    }
  }

  return (
    <div className="u103" ref={rootRef}>
      <nav className="u103-path" aria-label="Đường dẫn điều hướng DevPilot">
        {crumbs.map((crumb, i) => (
          <React.Fragment key={`${crumb.kind}-${i}`}>
            {i > 0 && <ChevronRight className="u103-separator" size={14} aria-hidden="true" />}
            <button
              ref={element => { buttonsRef.current[i] = element; }}
              type="button"
              className={`u103-crumb u103-${crumb.kind}`}
              aria-current={i === crumbs.length - 1 ? 'page' : undefined}
              aria-haspopup="true"
              aria-expanded={openedAt === i}
              aria-controls="u103-explorer"
              onClick={() => setOpenedAt(old => old === i ? null : i)}
              title={`${crumb.label} — mở điều hướng`}
            >
              {i === 0 && <Boxes size={15} aria-hidden="true" />}
              <span>{crumb.label}</span>
            </button>
          </React.Fragment>
        ))}
      </nav>
      {openedAt !== null && (
        <div className="u103-explorer" id="u103-explorer" role="region" aria-label="Duyệt vị trí trong DevPilot">
          <div className="u103-explorer-heading">
            <span>{activeKind === 'root' ? 'Không gian làm việc' : activeKind === 'directory' ? section : (adminPage ? 'Quản trị' : 'Các khu vực dự án')}</span>
            <span className="u103-explorer-count">{choices.length}</span>
          </div>
          <div className="u103-places">
            {choices.length ? choices.map(item => {
              const Icon = item.Icon || LayoutDashboard;
              return (
                <button
                  className="u103-place"
                  type="button"
                  key={`${item.type}-${item.id}`}
                  onClick={() => choose(item)}
                  aria-current={item.selected ? 'page' : undefined}
                  title={item.label}
                >
                  <span className="u103-place-symbol" aria-hidden="true"><Icon size={18} /></span>
                  <span className="u103-place-copy">
                    <span className="u103-place-title">{item.label}</span>
                    {item.detail && <small>{item.detail}</small>}
                  </span>
                  {item.selected ? <Check size={16} className="u103-place-check" aria-hidden="true" /> : <ChevronRight size={14} className="u103-place-chevron" aria-hidden="true" />}
                </button>
              );
            }) : <p className="u103-empty">Chưa có mục nào ở vị trí này.</p>}
          </div>
          <p className="u103-hint">Chọn một thư mục để mở · Esc để đóng</p>
        </div>
      )}
    </div>
  );
}
