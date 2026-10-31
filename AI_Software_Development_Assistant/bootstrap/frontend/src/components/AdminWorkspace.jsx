import React, {useCallback,useEffect,useMemo,useState} from 'react';
import {Activity,BarChart3,BookOpen,CheckCircle2,ChevronRight,ClipboardList,Edit3,
  FileText,FolderKanban,GitBranch,RefreshCw,Search,Shield,Users,X} from 'lucide-react';
import AdminUsers from './AdminUsers.jsx';
import './AdminWorkspace.css';

const monthFields = [ ['users','Tài khoản'], ['projects','Dự án'], ['tasks','Task mới'] ];
const taskLabels = {TODO:'Cần làm',IN_PROGRESS:'Đang thực hiện',REVIEW:'Kiểm tra',DONE:'Hoàn thành'};
const date = value => value ? new Date(value).toLocaleDateString('vi-VN') : '—';
const percent = (x,n) => n ? Math.round(x*100/n) : 0;

function Metric({icon:Icon,label,value,hint,tone='teal'}) {
  return <article className={'adm-metric '+tone}>
    <div className="adm-metric-icon"><Icon size={20}/></div>
    <div><span>{label}</span><strong>{Number(value||0).toLocaleString('vi-VN')}</strong><small>{hint}</small></div>
  </article>;
}

function Overview({data,onGo,onOpenProject}) {
  if (!data) return <p className="adm-state">Đang tải số liệu từ hệ thống...</p>;
  const completion=percent(data.completedTasks,data.tasks);
  return <>
    <div className="adm-heading"><div><span className="adm-eyebrow">ADMIN CONTROL CENTER</span><h1>Tổng quan hệ thống</h1><p>Số liệu được tổng hợp từ tài khoản và dự án đang lưu trong SQL Server.</p></div></div>
    <div className="adm-metrics">
      <Metric icon={Users} label="Tài khoản" value={data.users} hint={`${data.admins} ADMIN · ${Math.max(0,data.users-data.admins)} USER`}/>
      <Metric icon={FolderKanban} label="Tổng dự án" value={data.projects} hint="Toàn hệ thống" tone="indigo"/>
      <Metric icon={ClipboardList} label="Tổng công việc" value={data.tasks} hint={`${data.activeTasks} đang thực hiện`} tone="orange"/>
      <Metric icon={CheckCircle2} label="Hoàn thành" value={data.completedTasks} hint={`${completion}% số Task`} tone="green"/>
      <Metric icon={FileText} label="Requirement" value={data.requirements} hint="Yêu cầu phần mềm" tone="blue"/>
      <Metric icon={GitBranch} label="User Stories" value={data.stories} hint={`${data.sprints} Sprint`} tone="purple"/>
      <Metric icon={BookOpen} label="Tài liệu RAG" value={data.documents} hint="Tệp đã được ghi nhận" tone="teal"/>
      <Metric icon={Users} label="Lượt tham gia" value={data.memberships} hint="Quan hệ thành viên – dự án" tone="indigo"/>
    </div>
    <div className="adm-duo">
      <section className="adm-panel"><div className="adm-panel-head"><h2>Tiến độ công việc toàn hệ thống</h2><button className="adm-link" onClick={()=>onGo('admin-analytics')}>Phân tích <ChevronRight size={15}/></button></div>
        <div className="adm-large-pct">{completion}<small>%</small></div>
        <div className="adm-progress"><span style={{width:`${completion}%`}}/></div>
        <p className="adm-caption">{data.completedTasks} / {data.tasks} công việc hoàn thành</p>
        <div className="adm-status-list">{Object.entries(taskLabels).map(([key,label])=><div key={key}><span className={'adm-dot '+key}/>{label}<strong>{data.taskStatuses?.[key]||0}</strong></div>)}</div>
      </section>
      <section className="adm-panel"><div className="adm-panel-head"><h2>Dự án gần đây</h2><button className="adm-link" onClick={()=>onGo('admin-projects')}>Xem tất cả <ChevronRight size={15}/></button></div>
        {(data.recentProjects||[]).length===0?<p className="adm-state">Chưa có dự án nào.</p>:<div className="adm-recent">
          {data.recentProjects.map(p=><button key={p.id} onClick={()=>onOpenProject(p.id)} title={`Mở ${p.name}`}>
            <div className="adm-recent-icon"><FolderKanban size={17}/></div><div><strong>{p.name}</strong><small>{p.ownerName} · {date(p.createdAt)}</small></div><ChevronRight size={17}/>
          </button>)}
        </div>}
      </section>
    </div>
  </>;
}

function Analytics({data}) {
  const [metric,setMetric]=useState('projects');
  if(!data)return <p className="adm-state">Đang tải dữ liệu phân tích...</p>;
  const points=data.activity||[];
  const maximum=Math.max(1,...points.map(p=>Number(p[metric]||0)));
  return <>
    <div className="adm-heading"><div><span className="adm-eyebrow">SYSTEM ANALYTICS</span><h1>Số liệu & phân tích</h1><p>Thống kê dữ liệu thực tế, không sử dụng số liệu mô phỏng.</p></div></div>
    <div className="adm-duo adm-analytics-grid">
      <section className="adm-panel"><div className="adm-panel-head"><h2>Hoạt động 6 tháng gần nhất</h2><select value={metric} onChange={e=>setMetric(e.target.value)} aria-label="Loại số liệu">{monthFields.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div>
        <div className="adm-chart" role="img" aria-label={`Biểu đồ ${monthFields.find(x=>x[0]===metric)?.[1]} 6 tháng`}>
          {points.map((p,i)=><div className="adm-chart-col" key={i} title={`${p.month}: ${p[metric]}`}><strong>{p[metric]}</strong><div className="adm-chart-track"><span style={{height:`${Math.max(2,(Number(p[metric]||0)/maximum)*100)}%`}}/></div><small>{p.month}</small></div>)}
        </div>
        <p className="adm-caption">Thống kê theo thời điểm tạo tài khoản, dự án hoặc Task (UTC).</p>
      </section>
      <section className="adm-panel"><div className="adm-panel-head"><h2>Phân bổ trạng thái Task</h2><Activity size={18}/></div>
        <div className="adm-bars">{Object.entries(taskLabels).map(([key,label])=>{const n=data.taskStatuses?.[key]||0;return <div key={key} className="adm-bar-row"><div><span className={'adm-dot '+key}/>{label}<b>{n}</b></div><div className="adm-progress"><span className={key} style={{width:`${percent(n,data.tasks)}%`}}/></div></div>})}</div>
      </section>
    </div>
    <section className="adm-panel"><div className="adm-panel-head"><h2>Dự án có nhiều công việc nhất</h2><BarChart3 size={18}/></div>
      <div className="adm-bars">{(data.busiestProjects||[]).length===0?<p className="adm-state">Chưa có Task để thống kê.</p>:data.busiestProjects.map(p=><div className="adm-bar-row" key={p.id}><div><span className="adm-project-name">{p.name}</span><b>{p.tasks} Task</b></div><div className="adm-progress"><span style={{width:`${percent(p.tasks,Math.max(1,...data.busiestProjects.map(x=>x.tasks)))}%`}}/></div></div>)}</div>
    </section>
  </>;
}

function Projects({api,notify,initialUser,clearUser,onOpenProject,onUpdated}) {
  const [list,setList]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [query,setQuery]=useState('');
  const [editing,setEditing]=useState(null);
  const [saving,setSaving]=useState(false);
  const [draft,setDraft]=useState({name:'',description:''});
  const reload=useCallback(async()=>{
    setLoading(true);setError('');
    try { setList(await api(initialUser?`/admin/users/${initialUser.id}/projects`:'/admin/projects')||[]); }
    catch(e){setError(e.message)} finally {setLoading(false)}
  },[api,initialUser]);
  useEffect(()=>{reload()},[reload]);
  const shown=useMemo(()=>list.filter(p=>[p.name,p.ownerName,p.ownerEmail].join(' ').toLowerCase().includes(query.trim().toLowerCase())),[list,query]);
  async function save(e){e.preventDefault();if(!draft.name.trim()||saving)return;setSaving(true);
    try {await api(`/projects/${editing.id}`,{method:'PUT',body:JSON.stringify(draft)});setEditing(null);notify('Đã cập nhật dự án');await reload();await onUpdated?.();}
    catch(e){notify(e.message,'error')}finally{setSaving(false)}
  }
  return <>
    <div className="adm-heading"><div><span className="adm-eyebrow">PROJECT ADMINISTRATION</span><h1>Quản lý dự án</h1>
      <p>{initialUser?`Các dự án thuộc hoặc có tài khoản ${initialUser.email} tham gia.`:'Xem, tìm kiếm và cập nhật các dự án của mọi tài khoản.'}</p></div>
      <button className="btn secondary" type="button" onClick={reload} disabled={loading}><RefreshCw size={16}/> Làm mới</button>
    </div>
    {initialUser&&<div className="adm-filter-banner"><Users size={17}/><span>Đang lọc theo: <b>{initialUser.name}</b> ({initialUser.email})</span><button type="button" onClick={clearUser}>Xem tất cả dự án <X size={15}/></button></div>}
    <section className="adm-panel"><div className="adm-toolbar"><div className="adm-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm theo dự án hoặc chủ dự án..." aria-label="Tìm dự án"/></div><span>{shown.length} dự án</span></div>
      {error&&<p className="adm-error" role="alert">{error}</p>}
      {loading?<p className="adm-state">Đang tải dự án...</p>:<div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>Dự án</th><th>Chủ dự án</th><th>Thành viên</th><th>Yêu cầu</th><th>Task</th><th>Tiến độ</th><th>Thao tác</th></tr></thead><tbody>
        {shown.map(p=><tr key={p.id}><td><strong>{p.name}</strong><small>#{p.id} · {date(p.createdAt)}{p.membershipRole?` · ${p.membershipRole}`:''}</small></td><td>{p.ownerName}<small>{p.ownerEmail}</small></td><td>{p.members}</td><td>{p.requirements}</td><td>{p.tasks}</td><td><div className="adm-percent"><span>{percent(p.completedTasks,p.tasks)}%</span><div className="adm-progress"><span style={{width:`${percent(p.completedTasks,p.tasks)}%`}}/></div></div></td><td><div className="adm-actions"><button onClick={()=>onOpenProject(p.id)} className="adm-action primary" type="button">Mở dự án</button><button onClick={()=>{setEditing(p);setDraft({name:p.name||'',description:p.description||''})}} className="adm-action" type="button" aria-label={`Sửa dự án ${p.name}`}><Edit3 size={15}/></button></div></td></tr>)}
        {!shown.length&&<tr><td colSpan="7" className="adm-empty-cell">Không tìm thấy dự án phù hợp.</td></tr>}
      </tbody></table></div>}
    </section>
    {editing&&<div className="adm-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!saving)setEditing(null)}}><section className="adm-modal" role="dialog" aria-modal="true" aria-label="Cập nhật dự án"><div className="adm-panel-head"><h2>Cập nhật dự án</h2><button className="adm-icon-btn" onClick={()=>setEditing(null)} disabled={saving} aria-label="Đóng"><X size={18}/></button></div><form onSubmit={save}>
      <label>Tên dự án<input required maxLength={160} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
      <label>Mô tả<textarea rows={4} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></label>
      <div className="adm-form-actions"><button type="button" className="btn secondary" onClick={()=>setEditing(null)} disabled={saving}>Hủy</button><button className="btn primary" type="submit" disabled={saving}>{saving?'Đang lưu...':'Lưu thay đổi'}</button></div>
    </form></section></div>}
  </>;
}

export default function AdminWorkspace({mode,api,notify,currentId,userFilter,setUserFilter,onNavigate,onOpenProject,refreshProjects}) {
  const [overview,setOverview]=useState(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const refresh=useCallback(async()=>{setLoading(true);setError('');try{setOverview(await api('/admin/overview'))}catch(e){setError(e.message)}finally{setLoading(false)}},[api]);
  useEffect(()=>{if(mode==='overview'||mode==='analytics')refresh()},[mode,refresh]);
  if(mode==='users')return <AdminUsers api={api} notify={notify} currentId={currentId} onViewProjects={user=>{setUserFilter(user);onNavigate('admin-projects')}}/>;
  if(mode==='projects')return <Projects api={api} notify={notify} initialUser={userFilter} clearUser={()=>setUserFilter(null)} onOpenProject={onOpenProject} onUpdated={refreshProjects}/>;
  return <div className="adm-console">
    <div className="adm-top-actions"><span><Shield size={14}/> KHU VỰC QUẢN TRỊ</span><button type="button" onClick={refresh} disabled={loading} aria-label="Làm mới số liệu"><RefreshCw size={15}/> Làm mới</button></div>
    {error&&<p className="adm-error" role="alert">{error}</p>}
    {mode==='analytics'?<Analytics data={overview}/>:<Overview data={overview} onGo={onNavigate} onOpenProject={onOpenProject}/>}
  </div>;
}
