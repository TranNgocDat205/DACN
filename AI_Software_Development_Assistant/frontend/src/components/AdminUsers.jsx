import React, {useEffect,useState} from 'react';
import {Shield, RefreshCw, Users, AlertCircle, FolderKanban, Search} from 'lucide-react';
import './AdminUsers.css';

export default function AdminUsers({api,notify,currentId,onViewProjects}) {
  const [users,setUsers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [query,setQuery]=useState('');
  const [pending,setPending]=useState(null);
  const [error,setError]=useState('');

  async function refresh() {
    setLoading(true); setError('');
    try { setUsers(await api('/admin/users')); }
    catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(()=>{refresh();},[api]);

  async function updateRole(user,nextRole) {
    if(nextRole===user.role || pending!==null)return;
    if(!window.confirm(`Đổi quyền của ${user.name} (${user.email}) thành ${nextRole}?`))return;
    setPending(user.id);
    try {
      const updated=await api(`/admin/users/${user.id}/role`,{
        method:'PUT',body:JSON.stringify({role:nextRole})
      });
      setUsers(prev=>prev.map(u=>u.id===updated.id?updated:u));
      notify('Đã cập nhật quyền tài khoản');
    } catch(e) { notify(e.message,'error'); }
    finally { setPending(null); }
  }
  return <div className="admin-users">
    <div className="page-heading">
      <div><span className="eyebrow">ROLE-BASED ACCESS CONTROL</span><h1>Quản trị tài khoản</h1>
        <p>Admin có quyền quản lý tài khoản và truy cập tất cả dự án. User chỉ truy cập dự án mình tham gia.</p></div>
      <button type="button" className="btn secondary" onClick={refresh} disabled={loading||pending!==null}>
        <RefreshCw size={16}/> Làm mới
      </button>
    </div>
    <section className="panel admin-users-panel">
      <div className="panel-header"><div><h3><Users size={18}/> Tài khoản hệ thống</h3><p>{users.length} tài khoản</p></div><Shield size={20}/></div><label className="admin-users-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm theo tên hoặc email..." aria-label="Tìm tài khoản"/></label>
      {error&&<p className="admin-users-error" role="alert"><AlertCircle size={17}/>{error}</p>}
      {loading?<p className="admin-users-loading">Đang tải danh sách tài khoản...</p>:
      <div className="admin-users-table-wrap"><table className="admin-users-table"><thead>
        <tr><th>Tài khoản</th><th>Email</th><th>Quyền hệ thống</th><th>Dự án</th></tr>
      </thead><tbody>{users.filter(u=>`${u.name} ${u.email}`.toLowerCase().includes(query.toLowerCase())).map(user=><tr key={user.id}>
        <td><strong>{user.name}</strong>{user.id===currentId&&<span className="admin-users-self"> (Bạn)</span>}</td>
        <td>{user.email}</td>
        <td><label className="admin-users-role-label">
          <span className="admin-users-sr-only">Quyền của {user.name}</span>
          <select value={user.role} disabled={user.id===currentId||pending!==null}
            onChange={e=>updateRole(user,e.target.value)} aria-label={`Quyền của ${user.name}`}>
            <option value="USER">USER — Người dùng</option>
            <option value="ADMIN">ADMIN — Quản trị viên</option>
          </select>
        </label></td><td><button className="admin-users-projects-btn" onClick={()=>onViewProjects?.(user)} type="button"><FolderKanban size={15}/> Xem dự án</button></td>
      </tr>)}</tbody></table></div>}
      <p className="admin-users-note">Tài khoản đăng ký mới luôn là USER. Không thể tự thu hồi quyền ADMIN của chính mình. Quyền OWNER/MEMBER trong dự án được giữ nguyên.</p>
    </section>
  </div>;
}
