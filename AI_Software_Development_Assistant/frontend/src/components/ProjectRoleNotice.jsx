import React from 'react';
import { Eye, ShieldCheck } from 'lucide-react';
import './ProjectRoleNotice.css';

/** Informational only: the Backend always enforces project permissions. */
export default function ProjectRoleNotice({ role, projectName }) {
  if (!role) return null;
  const viewer = role === 'VIEWER';
  return (
    <div className={'dp-permission-strip ' + (viewer ? 'is-viewer' : 'is-editor')} role="status">
      {viewer ? <Eye size={17} aria-hidden="true" /> : <ShieldCheck size={17} aria-hidden="true" />}
      <div className="dp-permission-strip-content">
        <strong>{viewer ? 'Chế độ chỉ xem' : role === 'OWNER' ? 'Chủ dự án' : 'Quyền chỉnh sửa'}</strong>
        <span>{viewer
          ? `Bạn có thể xem dữ liệu và hỏi AI trong ${projectName || 'dự án'}; mọi thay đổi đều bị Backend từ chối.`
          : role === 'OWNER'
            ? 'Bạn có thể quản lý dữ liệu và phân quyền thành viên.'
            : 'Bạn có thể chỉnh sửa công việc nhưng không thể phân quyền thành viên.'}</span>
      </div>
    </div>
  );
}
