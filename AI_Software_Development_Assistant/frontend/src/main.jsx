import ProjectRoleNotice from './components/ProjectRoleNotice.jsx';
import React, {useEffect,useState,useMemo,useCallback} from 'react';
import {createRoot} from 'react-dom/client';
import {LayoutDashboard,FolderKanban,FileText,GitBranch,Columns3,BookOpen,Users,LogOut,Plus,Search,ChevronDown,Sparkles,PanelLeftClose,PanelLeftOpen,ArrowRight,LoaderCircle,Trash2,CheckCircle2,AlertCircle,ExternalLink,Send,UploadCloud,Menu,CalendarDays,Target,Play,Edit3,X,ClipboardList,Check,Shield,Layers,Clock,Database,RefreshCw} from 'lucide-react';
import './style.css';
import CompactSidebar from './components/CompactSidebar.jsx';
import AuthExperience from './components/AuthExperience.jsx';
import LandingPage from './components/LandingPage.jsx';
import DocumentDropUploader from './components/DocumentDropUploader.jsx';
import OfficialRagSources from './components/OfficialRagSources.jsx';
import AdminPremiumWorkspace from './components/AdminPremiumWorkspace.jsx';
import './components/DayNightSkySwitch.css';
import DayNightSkySwitch from './components/DayNightSkySwitch.jsx';
import {ConflictDetector,ChangeImpactSimulator,ReleaseTraceability} from './components/EngineeringIntelligence.jsx';
import {GitCompareArrows,Network,ScanSearch,ArrowUpRight,MoveRight,CircleDot,Layers3,ChartNoAxesCombined,Route} from 'lucide-react';
import './studio-redesign.css';
import MissionControl from './components/MissionControl.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import './mission-control.css';
import { MotionSurfaceController, AiActivityOrb } from './components/PremiumMotion.jsx';
import './premium-experience.css';
import './nexus-v7.css';
import PaperPlaneComposer from './components/PaperPlaneComposer.jsx';
import ProjectBreadcrumb103 from './components/ProjectBreadcrumb103.jsx';

const API = import.meta.env.VITE_API_URL || '/api';
const displayStatus={DRAFT:'Bản nháp',ANALYZING:'Đang phân tích',APPROVED:'Đã duyệt',IN_DEVELOPMENT:'Đang phát triển',COMPLETED:'Hoàn thành',PLANNED:'Kế hoạch',ACTIVE:'Đang chạy',TODO:'Cần làm',IN_PROGRESS:'Đang làm',REVIEW:'Kiểm tra',DONE:'Hoàn tất'};
const priorities={LOW:'Thấp',MEDIUM:'Trung bình',HIGH:'Cao',CRITICAL:'Khẩn cấp'};
const tabs=[['dashboard','Tổng quan',LayoutDashboard],['requirements','Yêu cầu',FileText],['ai-conflicts','AI · Xung đột yêu cầu',ScanSearch],['ai-impact','AI · Mô phỏng thay đổi',GitCompareArrows],['ai-traceability','AI · Truy vết bàn giao',Network],['stories','User Stories',GitBranch],['sprints','Sprint',CalendarDays],['board','Kanban Board',Columns3],['documents','Tài liệu & RAG',BookOpen],['members','Thành viên',Users]];
const niceDate=s=>s?new Date(s).toLocaleDateString('vi-VN'):'';
function initialSession(){try{return JSON.parse(localStorage.getItem('devpilot-session')||'null')}catch{return null}}

function initialTheme(){
 try { return localStorage.getItem('devpilot-theme') === 'light' ? 'light' : 'dark'; }
 catch { return 'dark'; }
}
function App(){
 const [session,setSession]=useState(initialSession);
 const [commandOpen,setCommandOpen]=useState(false);
 const [showAuth,setShowAuth]=useState(()=>window.location.hash==='#login');
 const [authMode,setAuthMode]=useState('login');
 const [theme,setTheme]=useState(initialTheme);
 useEffect(()=>{try{localStorage.setItem('devpilot-theme',theme)}catch{}},[theme]);
 const [projects,setProjects]=useState([]);const [projectId,setProjectId]=useState(null);
 const [page,setPage]=useState(()=>initialSession()?.user?.role==='ADMIN'?'admin-overview':'dashboard');const [adminUserFilter,setAdminUserFilter]=useState(null);const [data,setData]=useState({requirements:[],stories:[],criteria:[],sprints:[],tasks:[],documents:[],members:[]});
 const [aiStatus,setAiStatus]=useState(null);const [busy,setBusy]=useState(false);const [toast,setToast]=useState(null);const [mobileSideOpen,setMobileSideOpen]=useState(false);const [sidebar,setSidebar]=useState(true);const [showProjectForm,setShowProjectForm]=useState(false);
 useEffect(()=>{const handler=(e)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(session)setCommandOpen(old=>!old)} };window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler)},[session]);
 const token=session?.token;
 const isAdmin=session?.user?.role==='ADMIN';
 const adminTabs=[['admin-overview','Admin · Tổng quan',Shield],['admin-users','Quản lý tài khoản',Users],['admin-projects','Quản lý dự án',FolderKanban],['admin-teams','Quản lý nhóm',Users],['admin-analytics','Số liệu phân tích',LayoutDashboard]];
 const visibleTabs=isAdmin?[...adminTabs,...tabs]:tabs;
 const notify=(message,type='ok')=>{setToast({message,type});window.setTimeout(()=>setToast(null),5000)};
 const api=useCallback(async(path,options={})=>{
  const body=options.body;
  let response;
  try{response=await fetch(API+path,{...options,headers:{...(body instanceof FormData?{}:{'Content-Type':'application/json'}),...(token?{'Authorization':'Bearer '+token}:{}),...options.headers}})}
  catch{throw new Error('Không kết nối được backend. Kiểm tra Spring Boot tại cổng 8080.');}
  const text=await response.text();let result;try{result=text?JSON.parse(text):null}catch{result={error:text}}
  if(!response.ok){if(response.status===401&&token){localStorage.removeItem('devpilot-session');setSession(null);setProjects([]);setProjectId(null);setData({requirements:[],stories:[],criteria:[],sprints:[],tasks:[],documents:[],members:[]});setPage('dashboard')}throw new Error(result?.error||result?.message||`HTTP ${response.status}`)}
  return result;
 },[token]);
 const call=async(fn)=>{setBusy(true);try{return await fn()}catch(err){notify(err.message,'error')}finally{setBusy(false)}};
 const reloadProjects=useCallback(async()=>{if(!token)return;try{const r=await api('/projects');setProjects(r||[]);setProjectId(cur=>(cur&&r.some(p=>p.id===cur)?cur:(r[0]?.id??null)))}catch(e){notify(e.message,'error')}},[api,token]);
 const reload=useCallback(async()=>{if(!token||!projectId)return;
  const keys=['requirements','stories','criteria','sprints','tasks','documents','members'];
  const results=await Promise.allSettled(keys.map(k=>api(`/projects/${projectId}/${k}`)));
  setData(old=>Object.fromEntries(keys.map((k,i)=>[k,
    results[i].status==='fulfilled'?(results[i].value||[]):(old[k]||[])
  ])));
  const errors=keys.filter((k,i)=>results[i].status==='rejected');
  if(errors.length){
    console.error('DevPilot: API lỗi',errors.map(k=>({api:k,error:results[keys.indexOf(k)].reason?.message})));
    notify('Không tải được API: '+errors.join(', '),'error');
  }
 },[api,token,projectId]);
 useEffect(()=>{if(!token)return;api('/me').then(user=>{
    setSession(old=>old&&old.token===token?{...old,user}:old);
    if(user?.role!=='ADMIN')setPage(old=>old.startsWith('admin-')?'dashboard':old);
  }).catch(()=>{});},[token,api]);
 useEffect(()=>{if(session?.token){try{localStorage.setItem('devpilot-session',JSON.stringify(session))}catch{}}},[session]);
 useEffect(()=>{reloadProjects()},[reloadProjects]);useEffect(()=>{reload()},[reload]);
 useEffect(()=>{if(token)api('/ai/status').then(setAiStatus).catch(()=>setAiStatus({status:'offline'}))},[token,api]);
 const project=projects.find(p=>p.id===projectId);
 const projectMembership=data.members.find(m=>m.userId===session?.user?.id);
 const projectRole=isAdmin?'ADMIN':project?.ownerId===session?.user?.id?'OWNER':(projectMembership?.role||'MEMBER');
 const isProjectViewer=projectRole==='VIEWER';
 const counts=useMemo(()=>({requirements:data.requirements.length,stories:data.stories.length,tasks:data.tasks.length,done:data.tasks.filter(t=>t.status==='DONE').length}),[data]);
 async function mutate(path,method,body){if(isProjectViewer){notify('Tài khoản chỉ có quyền xem dự án, không thể chỉnh sửa.','error');return null;}return await call(async()=>{const result=await api(`/projects/${projectId}${path}`,{method,body:body instanceof FormData?body:(body?JSON.stringify(body):undefined)});await reload();notify('Đã lưu thành công');return result})}
 function logout(){localStorage.removeItem('devpilot-session');setSession(null);setProjects([]);setProjectId(null);setAdminUserFilter(null);setData({requirements:[],stories:[],criteria:[],sprints:[],tasks:[],documents:[],members:[]});setPage('dashboard')}
 if(!session)return showAuth
  ? <div className="u021-theme-root u021-auth-shell dp-premium-auth" data-theme={theme}><button className="lp-auth-back" type="button" onClick={()=>{setShowAuth(false);window.history.replaceState(null,'',window.location.pathname)}}>← Quay lại trang giới thiệu</button><div className="u021-auth-toggle"><DayNightSkySwitch theme={theme} onChange={setTheme}/></div><AuthExperience initialMode={authMode} onAuth={s=>{setSession(s);setPage(s.user?.role==='ADMIN'?'admin-overview':'dashboard');localStorage.setItem('devpilot-session',JSON.stringify(s))}} api={api}/></div>
  : <LandingPage theme={theme} onThemeChange={setTheme} onStart={()=>{setAuthMode('login');setShowAuth(true);window.history.replaceState(null,'', '#login');window.scrollTo(0,0);}} onRegister={()=>{setAuthMode('register');setShowAuth(true);window.history.replaceState(null,'', '#login');window.scrollTo(0,0);}} />;
 return <div className={'app-shell dp-studio u021-theme-root dp-next'+(isAdmin&&page.startsWith('admin-')?' admin-premium-mode':'')} data-theme={theme}>
  <MotionSurfaceController page={page} />
  <CompactSidebar
   isAdmin={isAdmin} adminTabs={adminTabs} tabs={tabs} page={page}
   onNavigate={setPage} projectName={project?.name} onCreateProject={()=>setShowProjectForm(true)}
   requirementCount={counts.requirements} collapsed={!sidebar} onToggleCollapse={()=>setSidebar(v=>!v)}
   onExpand={()=>setSidebar(true)} mobileOpen={mobileSideOpen}
   onCloseMobile={()=>setMobileSideOpen(false)} onLogout={logout}
  />
  <main className="main-panel"><header className="topbar"><div className="top-left"><button className="mobile-menu icon-btn" aria-label="Mở menu" aria-expanded={mobileSideOpen} onClick={()=>setMobileSideOpen(v=>!v)}><Menu size={20}/></button><ProjectBreadcrumb103 project={project} projects={projects} page={page} tabs={tabs} adminTabs={adminTabs} isAdmin={isAdmin} onNavigate={setPage} onChangeProject={setProjectId}/></div><div className="top-right"><button type="button" className="mc-command-trigger" onClick={()=>setCommandOpen(true)} aria-label="Tìm và chuyển nhanh, Ctrl K"><Search size={16}/><span>Tìm kiếm</span><kbd>Ctrl K</kbd></button><button type="button" className="studio-top-action" onClick={()=>setPage('documents')} title="Mở kho tài liệu và AI Web Search"><BookOpen size={15}/> Knowledge</button><DayNightSkySwitch theme={theme} onChange={setTheme}/><span className="online-dot"/> <span className="connected">{aiStatus?.status==='offline'?'AI offline':aiStatus?.llm_configured?'AI đã kết nối':'AI demo mode'}</span><div className="avatar">{session.user?.name?.[0]?.toUpperCase()||'U'}</div><span className="username">{session.user?.name} · {isAdmin?'Admin':'User'}</span></div></header>
   <div className="main-content" key={page}>
    {project && isProjectViewer && !page.startsWith('admin-') && <ProjectRoleNotice role="VIEWER" projectName={project.name}/>}
    {showProjectForm&&<Modal title="Tạo dự án mới" onClose={()=>setShowProjectForm(false)}><ProjectForm save={async(v)=>{const created=await call(()=>api('/projects',{method:'POST',body:JSON.stringify(v)}));if(created){setShowProjectForm(false);await reloadProjects();setProjectId(created.id);setPage('dashboard');notify('Đã tạo dự án')}}}/></Modal>}
    {page.startsWith('admin-')&&isAdmin?<AdminPremiumWorkspace mode={page.slice(6)} api={api} notify={notify} currentId={session.user.id} userFilter={adminUserFilter} setUserFilter={setAdminUserFilter} onNavigate={setPage} onOpenProject={id=>{setProjectId(id);setPage('dashboard')}} refreshProjects={reloadProjects}/>:!project?<EmptyProject onCreate={()=>setShowProjectForm(true)}/>:
     <>{page==='dashboard'&&<MissionControl project={project} data={data} counts={counts} navigate={setPage} projects={projects} changeProject={setProjectId} aiStatus={aiStatus} onOpenCommand={()=>setCommandOpen(true)}/>}
      {page==='requirements'&&<Requirements data={data} busy={busy} mutate={mutate}/>}
      {page==='ai-conflicts'&&<ConflictDetector key={projectId} projectId={projectId} data={data} api={api} notify={notify}/>}
      {page==='ai-impact'&&<ChangeImpactSimulator key={projectId} projectId={projectId} data={data} api={api} notify={notify} onApplied={reload}/>}
      {page==='ai-traceability'&&<ReleaseTraceability key={projectId} projectId={projectId} api={api} notify={notify}/>} 
      {page==='stories'&&<Stories data={data} busy={busy} mutate={mutate}/>}
      {page==='sprints'&&<Sprints data={data} busy={busy} mutate={mutate}/>}
      {page==='board'&&<Board data={data} busy={busy} mutate={mutate}/>}
      {page==='documents'&&<Documents data={data} busy={busy} api={api} mutate={mutate} projectId={projectId} reload={reload} notify={notify} call={call} token={token}/>}
      {page==='members'&&<Members data={data} project={project} session={session} mutate={mutate}/>}
     </>}
   </div>
  </main>
  <CommandPalette open={commandOpen} onClose={()=>setCommandOpen(false)} onNavigate={setPage} tabs={visibleTabs} data={data}/>
  {busy&&<div className="saving-indicator"><LoaderCircle className="spin" size={16}/> Đang xử lý...</div>}
  {toast&&<div role="alert" className={'toast '+(toast.type==='error'?'toast-error':'')}><span>{toast.type==='error'?<AlertCircle size={18}/>:<CheckCircle2 size={18}/>}</span>{toast.message}</div>}
 </div>
}
function PageTitle({eyebrow,title,subtitle,actions}){return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>{actions&&<div className="heading-actions">{actions}</div>}</div>}
function Panel({title,subtitle,children,action,className=''}){return <section className={'panel '+className}><div className="panel-header"><div><h3>{title}</h3>{subtitle&&<p>{subtitle}</p>}</div>{action}</div>{children}</section>}
function Stat({icon:Icon,label,value,tone='blue'}){return <div className="stat-card"><div className={'stat-icon '+tone}><Icon size={22}/></div><div><span>{label}</span><strong>{value}</strong></div></div>}
function Empty({icon:Icon=FolderKanban,title,subtitle,action}){return <div className="empty"><div className="empty-icon"><Icon size={26}/></div><h3>{title}</h3><p>{subtitle}</p>{action}</div>}
function EmptyProject({onCreate}){return <div className="empty-project"><Empty icon={FolderKanban} title="Tạo dự án đầu tiên của bạn" subtitle="Dự án là không gian lưu trữ các yêu cầu, User Story, Sprint và tài liệu AI của nhóm." action={<button className="btn primary" onClick={onCreate}><Plus size={17}/> Tạo dự án</button>}/></div>}
function Modal({title,onClose,children}){useEffect(()=>{const esc=e=>{if(e.key==='Escape')onClose()};window.addEventListener('keydown',esc);return()=>window.removeEventListener('keydown',esc)},[onClose]);return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal"><div className="modal-title"><h2>{title}</h2><button className="icon-btn" onClick={onClose}><X size={20}/></button></div>{children}</div></div>}
function ProjectForm({save}){const [v,set]=useState({name:'',description:''});return <form className="form" onSubmit={e=>{e.preventDefault();save(v)}}><Field label="Tên dự án" required value={v.name} onChange={e=>set({...v,name:e.target.value})} placeholder="Ví dụ: E-commerce Platform"/><Field label="Mô tả"><textarea value={v.description} onChange={e=>set({...v,description:e.target.value})} placeholder="Mục tiêu và phạm vi dự án"/></Field><button className="btn primary" type="submit">Tạo dự án <ArrowRight size={17}/></button></form>}
function Field({label,children,...rest}){return <label className="field"><span>{label}</span>{children||<input {...rest}/>}</label>}
function Status({value}){return <span className={'status status-'+(value||'').toLowerCase()}><i/>{displayStatus[value]||value}</span>}
function Priority({value}){return <span className={'priority priority-'+(value||'').toLowerCase()}>{priorities[value]||value}</span>}
function Dashboard({project,data,counts,navigate,projects,changeProject}){
 const progress=counts.tasks?Math.round(counts.done/counts.tasks*100):0;
 const recent=[...data.requirements].sort((a,b)=>new Date(b.updatedAt||b.createdAt||0)-new Date(a.updatedAt||a.createdAt||0)).slice(0,5);
 const stages=[
  {key:'TODO',label:'Chờ thực hiện',color:'var(--studio-ink)'},
  {key:'IN_PROGRESS',label:'Đang triển khai',color:'var(--studio-blue)'},
  {key:'REVIEW',label:'Kiểm tra',color:'var(--studio-orange)'},
  {key:'DONE',label:'Hoàn tất',color:'var(--studio-mint)'}
 ];
 const stageCounts=stages.map(s=>({...s,count:data.tasks.filter(t=>t.status===s.key).length}));
 const metrics=[
  {label:'Yêu cầu',value:counts.requirements,icon:FileText,detail:'Phạm vi sản phẩm',target:'requirements'},
  {label:'User Stories',value:counts.stories,icon:GitBranch,detail:'Góc nhìn người dùng',target:'stories'},
  {label:'Công việc',value:counts.tasks,icon:ClipboardList,detail:'Lượng việc toàn dự án',target:'board'},
  {label:'Đã hoàn thành',value:counts.done,icon:CheckCircle2,detail:'Được ghi nhận là Done',target:'board'}
 ];
 return <div className="studio-dashboard">
  <div className="studio-dashboard-overline"><span><CircleDot size={13}/> PROJECT / CONTROL CENTER</span><span className="studio-current-date">{new Date().toLocaleDateString('vi-VN',{day:'2-digit',month:'long',year:'numeric'})}</span></div>
  <section className="studio-hero" aria-labelledby="studio-hero-title">
   <div className="studio-hero-copy">
    <div className="studio-hero-tag"><span className="studio-status-pulse"/> KHÔNG GIAN DỰ ÁN <span className="studio-hero-index">/ 01</span></div>
    <h1 id="studio-hero-title">Xây đúng thứ.<br/><em>Đi đúng hướng.</em></h1>
    <p>Biến những ý tưởng phức tạp thành sản phẩm rõ ràng. Mọi yêu cầu, tiến độ và quyết định AI — trong một không gian làm việc.</p>
    <div className="studio-hero-cta">
     <button type="button" className="studio-btn-lime" onClick={()=>navigate('ai-conflicts')}>Khám phá AI Intelligence <ArrowUpRight size={18}/></button>
     <button type="button" className="studio-btn-outline" onClick={()=>navigate('board')}>Xem Kanban <MoveRight size={17}/></button>
    </div>
   </div>
   <div className="studio-hero-visual" aria-label="Bản tóm tắt tiến độ dự án">
    <div className="studio-hero-visual-top"><span>DEVPILOT / FLOW MAP</span><span>LIVE DATA <i/></span></div>
    <div className="studio-orbit">
     <div className="studio-orbit-ring ring-outer"/><div className="studio-orbit-ring ring-inner"/>
     <div className="studio-orbit-hub"><span>PROJECT</span><strong>{String(progress).padStart(2,'0')}<small>%</small></strong><i>COMPLETE</i></div>
     <div className="studio-orbit-point point-1"><FileText size={16}/></div>
     <div className="studio-orbit-point point-2"><GitBranch size={16}/></div>
     <div className="studio-orbit-point point-3"><CheckCircle2 size={16}/></div>
    </div>
    <div className="studio-hero-visual-bottom"><span>PLAN</span><b>→</b><span>BUILD</span><b>→</b><span>VALIDATE</span><b>→</b><span>SHIP</span></div>
   </div>
   <div className="studio-hero-corner">D<span>·</span>P</div>
  </section>
  <div className="studio-project-rail">
   <div className="studio-project-current"><span className="studio-mono-label">ĐANG THEO DÕI</span><strong title={project.name}>{project.name}</strong></div>
   <label className="studio-project-select">CHUYỂN DỰ ÁN <select value={project.id} onChange={e=>changeProject(Number(e.target.value))}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
  </div>
  <section className="studio-metrics" aria-label="Chỉ số dự án">
   {metrics.map((metric,i)=><button type="button" className="studio-metric" key={metric.label} onClick={()=>navigate(metric.target)} title={'Mở '+metric.label}>
    <div className="studio-metric-top"><span className="studio-metric-number">0{i+1} / METRIC</span><metric.icon size={19} strokeWidth={1.8}/></div>
    <div className="studio-metric-value">{String(metric.value).padStart(2,'0')}</div>
    <div className="studio-metric-bottom"><div><strong>{metric.label}</strong><small>{metric.detail}</small></div><ArrowUpRight size={17}/></div>
   </button>)}
  </section>
  <div className="studio-section-line"><div><span className="studio-mono-label">02 / MOMENTUM</span><h2>Toàn cảnh hoạt động</h2></div><span className="studio-section-aside">SỐ LIỆU ĐƯỢC CẬP NHẬT TỪ DỰ ÁN</span></div>
  <div className="studio-insights">
   <section className="studio-insight-card studio-progress-card">
    <div className="studio-card-header"><div><span className="studio-mono-label">DELIVERY / 01</span><h3>Nhịp độ phát triển</h3></div><Target size={19}/></div>
    <div className="studio-progress-body"><div className="studio-progress-gauge" style={{'--studio-progress':progress+'%'}}><div className="studio-progress-gauge-inner"><strong>{progress}<span>%</span></strong><small>COMPLETE</small></div></div><div className="studio-progress-copy"><span>TRẠNG THÁI HIỆN TẠI</span><strong>{counts.tasks===0?'Sẵn sàng bắt đầu':progress===100?'Đã hoàn thành':'Đang tiến hành'}</strong><p>{counts.tasks===0?'Thêm công việc vào Kanban để bắt đầu theo dõi tiến độ.':`${counts.done} trên ${counts.tasks} công việc đã hoàn thành.`}</p><button type="button" onClick={()=>navigate('sprints')}>Mở quản lý Sprint <ArrowUpRight size={16}/></button></div></div>
    <div className="studio-stage-track" role="img" aria-label={'Phân bố '+counts.tasks+' công việc theo trạng thái'}>{counts.tasks?stageCounts.filter(s=>s.count).map(s=><div key={s.key} title={`${s.label}: ${s.count}`} style={{width:(100*s.count/counts.tasks)+'%',background:s.color}}/>):<div style={{width:'100%',background:'var(--studio-hairline)'}}/>}</div>
    <div className="studio-stage-legend">{stageCounts.map(s=><div key={s.key}><i style={{background:s.color}}/><span>{s.label}</span><b>{s.count}</b></div>)}</div>
   </section>
   <section className="studio-insight-card studio-requirements-card">
    <div className="studio-card-header"><div><span className="studio-mono-label">REQUIREMENTS / 02</span><h3>Dòng yêu cầu mới nhất</h3></div><button type="button" className="studio-link-btn" onClick={()=>navigate('requirements')}>Xem tất cả <ArrowUpRight size={16}/></button></div>
    <div className="studio-recent-list">{recent.length?recent.map((r,i)=><button type="button" className="studio-recent-row" key={r.id} onClick={()=>navigate('requirements')}><span className="studio-recent-index">{String(i+1).padStart(2,'0')}</span><div><strong>{r.title}</strong><small>REQ-{String(r.id).padStart(3,'0')} {r.createdAt?'· '+niceDate(r.createdAt):''}</small></div><Status value={r.status}/><ArrowUpRight className="studio-recent-arrow" size={16}/></button>):<div className="studio-recent-empty"><FileText size={24}/><strong>Không gian cho ý tưởng đầu tiên.</strong><p>Chưa có yêu cầu nào. Tạo Requirement để biến ý tưởng thành kế hoạch rõ ràng.</p><button type="button" onClick={()=>navigate('requirements')}>Tạo Requirement <ArrowRight size={16}/></button></div>}</div>
    <div className="studio-card-footer"><span>{data.requirements.length} REQUIREMENTS IN TOTAL</span><span>DEV → PILOT / {new Date().getFullYear()}</span></div>
   </section>
  </div>
  <div className="studio-section-line studio-toolkit-heading"><div><span className="studio-mono-label">03 / INTELLIGENCE</span><h2>AI đồng hành trong từng quyết định.</h2></div><span className="studio-section-aside">3 CÔNG CỤ AI CHUYÊN SÂU</span></div>
  <div className="studio-ai-tools">
   {[
     {code:'AI / 01',title:'Phát hiện xung đột',description:'Phát hiện các yêu cầu mâu thuẫn, trùng lặp và điểm thiếu nhất quán.',icon:ScanSearch,page:'ai-conflicts',color:'violet'},
     {code:'AI / 02',title:'Mô phỏng thay đổi',description:'Thấy trước tác động đến Story, Task và Sprint trước khi quyết định.',icon:GitCompareArrows,page:'ai-impact',color:'peach'},
     {code:'AI / 03',title:'Truy vết bàn giao',description:'Theo dõi hành trình từ yêu cầu đến những điều kiện sẵn sàng release.',icon:Route,page:'ai-traceability',color:'mint'}
   ].map(tool=><button type="button" className={'studio-tool studio-tool-'+tool.color} key={tool.code} onClick={()=>navigate(tool.page)}><span className="studio-tool-top"><span>{tool.code}</span><ArrowUpRight size={18}/></span><span className="studio-tool-icon"><tool.icon size={29} strokeWidth={1.5}/></span><strong>{tool.title}</strong><span className="studio-tool-description">{tool.description}</span><span className="studio-tool-bottom">KHÁM PHÁ CÔNG CỤ <MoveRight size={17}/></span></button>)}
  </div>
  <button type="button" className="studio-knowledge-strip" onClick={()=>navigate('documents')}><span className="studio-knowledge-symbol"><BookOpen size={23}/></span><span className="studio-knowledge-copy"><small>RESEARCH ENGINE / RAG KNOWLEDGE</small><strong>Từ tài liệu đến câu trả lời có dẫn chứng.</strong></span><span className="studio-knowledge-cta">Mở AI Research <ArrowUpRight size={18}/></span></button>
  <div className="studio-dashboard-footer"><span>DEVPILOT / ENGINEERING INTELLIGENCE</span><span>DESIGNED FOR CLARITY. BUILT FOR PROGRESS.</span></div>
 </div>
}
function Requirements({data,busy,mutate}){
 const [selected,setSelected]=useState(null);const [editing,setEditing]=useState(false);const [search,setSearch]=useState('');const [analysis,setAnalysis]=useState(null);
 const current=data.requirements.find(r=>r.id===selected);
 const rows=data.requirements.filter(r=>(r.title+' '+r.description).toLowerCase().includes(search.toLowerCase()));
 return <><PageTitle eyebrow="REQUIREMENT ENGINEERING" title="Quản lý yêu cầu" subtitle="Thu thập, phân tích và biến yêu cầu thành tác vụ phát triển." actions={<button className="btn primary" onClick={()=>{setEditing(true);setSelected(null);setAnalysis(null)}}><Plus size={17}/> Thêm Requirement</button>}/>
 <div className="panel"><div className="toolbar"><div className="searchbox"><Search size={18}/><input placeholder="Tìm yêu cầu..." value={search} onChange={e=>setSearch(e.target.value)}/></div><span className="muted">{rows.length} requirements</span></div>{rows.length?<div className="table-wrap"><table><thead><tr><th>YÊU CẦU</th><th>ĐỘ ƯU TIÊN</th><th>TRẠNG THÁI</th><th>NGÀY TẠO</th><th></th></tr></thead><tbody>{rows.map(r=><tr key={r.id} onClick={()=>{setSelected(r.id);setAnalysis(null);setEditing(false)}} className="clickable"><td><b>{r.title}</b><small>REQ-{String(r.id).padStart(3,'0')} · {r.type==='FUNCTIONAL'?'Functional':'Non-functional'}</small></td><td><Priority value={r.priority}/></td><td><Status value={r.status}/></td><td className="muted">{niceDate(r.createdAt)}</td><td><ArrowRight size={16}/></td></tr>)}</tbody></table></div>:<Empty icon={FileText} title="Chưa có Requirement" subtitle="Thêm yêu cầu để sử dụng chức năng phân tích AI." action={<button className="btn primary" onClick={()=>setEditing(true)}>Thêm yêu cầu</button>}/>}</div>
 {editing&&<Modal title={selected?'Chỉnh sửa Requirement':'Tạo Requirement'} onClose={()=>setEditing(false)}><RequirementForm initial={current} submit={async(v)=>{const result=await mutate(selected?`/requirements/${selected}`:'/requirements',selected?'PUT':'POST',v);if(result){setEditing(false);setSelected(result.id)}}}/></Modal>}
 {current&&!editing&&<div className="drawer-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget){setSelected(null);setAnalysis(null)}}}><aside className="detail-drawer"><div className="drawer-header"><span className="eyebrow">REQ-{String(current.id).padStart(3,'0')}</span><button className="icon-btn" onClick={()=>setSelected(null)}><X size={20}/></button></div><h2>{current.title}</h2><div className="row-tags"><Status value={current.status}/><Priority value={current.priority}/></div><h4>Mô tả nghiệp vụ</h4><p className="description-text">{current.description||'Chưa có mô tả.'}</p><div className="drawer-actions"><button className="btn secondary" onClick={()=>setEditing(true)}><Edit3 size={16}/> Chỉnh sửa</button><button className="btn danger-subtle" onClick={async()=>{if(window.confirm('Xóa Requirement này? (Không thể xóa nếu có User Story liên quan)')){await mutate(`/requirements/${current.id}`,'DELETE');setSelected(null)}}}><Trash2 size={16}/></button></div><div className="ai-section"><h3><Sparkles size={20}/> AI Requirement Assistant</h3><p>Phân tích yêu cầu, phát hiện điểm mơ hồ và tạo User Story.</p><button disabled={busy} className="btn primary full" onClick={async()=>{const result=await mutate(`/requirements/${current.id}/analyze`,'POST');if(result)setAnalysis(result)}}><Sparkles size={17}/> Phân tích yêu cầu bằng AI</button><button disabled={busy} className="btn secondary full" onClick={async()=>{const r=await mutate(`/requirements/${current.id}/generate-stories`,'POST');if(r)window.alert(`Đã tạo ${r.length} User Story. Xem tại mục User Stories.`)}}><GitBranch size={17}/> Sinh User Stories</button>
 {(analysis||current.aiAnalysis)&&<AnalysisView data={analysis||safeJSON(current.aiAnalysis)}/>}</div></aside></div>}
 </>}
function safeJSON(s){try{return JSON.parse(s)}catch{return {summary:s}}}
function RequirementForm({initial,submit}){const [v,set]=useState({title:initial?.title||'',description:initial?.description||'',priority:initial?.priority||'MEDIUM',type:initial?.type||'FUNCTIONAL',status:initial?.status||'DRAFT'});return <form className="form" onSubmit={e=>{e.preventDefault();submit(v)}}><Field label="Tên Requirement"><input required maxLength={200} value={v.title} onChange={e=>set({...v,title:e.target.value})} placeholder="VD: Đăng nhập bằng email"/></Field><Field label="Mô tả yêu cầu"><textarea required rows={5} value={v.description} onChange={e=>set({...v,description:e.target.value})} placeholder="Mô tả chi tiết về chức năng, điều kiện..."/></Field><div className="form-cols"><Field label="Độ ưu tiên"><select value={v.priority} onChange={e=>set({...v,priority:e.target.value})}>{Object.entries(priorities).map(([key,val])=><option key={key} value={key}>{val}</option>)}</select></Field><Field label="Loại yêu cầu"><select value={v.type} onChange={e=>set({...v,type:e.target.value})}><option value="FUNCTIONAL">Functional</option><option value="NON_FUNCTIONAL">Non-functional</option></select></Field></div><Field label="Trạng thái"><select value={v.status} onChange={e=>set({...v,status:e.target.value})}>{['DRAFT','ANALYZING','APPROVED','IN_DEVELOPMENT','COMPLETED'].map(s=><option key={s} value={s}>{displayStatus[s]}</option>)}</select></Field><button type="submit" className="btn primary">Lưu Requirement <Check size={17}/></button></form>}
function AnalysisView({data}){if(!data)return null;const groups=[['functionalRequirements','Yêu cầu chức năng'],['nonFunctionalRequirements','Yêu cầu phi chức năng'],['ambiguities','Điểm chưa rõ'],['missingInformation','Thông tin còn thiếu'],['risks','Rủi ro'],['suggestions','Đề xuất']];return <div className="analysis-result"><div className="analysis-mode"><Sparkles size={15}/> {data.mode==='demo_rule_based'?'Minh họa (chưa cấu hình AI API)':'Kết quả phân tích AI'}</div><p>{data.summary}</p>{groups.map(([field,label])=>Array.isArray(data[field])&&data[field].length>0&&<section key={field}><strong>{label}</strong><ul>{data[field].map((x,i)=><li key={i}>{typeof x==='string'?x:JSON.stringify(x)}</li>)}</ul></section>)}</div>}
function Stories({data,busy,mutate}){const [expanded,setExpanded]=useState(null);return <><PageTitle eyebrow="AGILE PLANNING" title="User Stories" subtitle="Các câu chuyện người dùng và tiêu chí nghiệm thu được đề xuất bởi AI."/><div className="stack">{data.stories.length===0?<div className="panel"><Empty icon={GitBranch} title="Chưa có User Story" subtitle="Vào Yêu cầu, chọn một Requirement, sau đó bấm Sinh User Stories."/></div>:data.stories.map(s=><div className="panel story-panel" key={s.id}><div className="story-head"><div className="story-icon"><GitBranch size={21}/></div><div className="story-body"><span className="overline">US-{String(s.id).padStart(3,'0')} · REQ-{s.requirementId}</span><h3>{s.title}</h3><p>{s.narrative}</p></div><div className="story-controls"><button className="btn secondary small" disabled={busy} onClick={async()=>{const r=await mutate(`/stories/${s.id}/generate-criteria`,'POST');if(r)setExpanded(s.id)}}><Sparkles size={15}/> Sinh AC</button><button className="icon-btn" onClick={()=>setExpanded(expanded===s.id?null:s.id)}><ChevronDown size={18}/></button></div></div>{expanded===s.id&&<div className="criteria-list"><h4>Acceptance Criteria ({data.criteria.filter(c=>c.storyId===s.id).length})</h4>{data.criteria.filter(c=>c.storyId===s.id).map((c,i)=><div className="criterion" key={c.id}><span>AC {i+1}</span><p><b>Given</b> {c.givenText}</p><p><b>When</b> {c.whenText}</p><p><b>Then</b> {c.thenText}</p></div>)}{data.criteria.filter(c=>c.storyId===s.id).length===0&&<p className="muted">Chưa có Acceptance Criteria. Bấm “Sinh AC”.</p>}</div>}</div>)}</div></>}
function Sprints({data,mutate,busy}){const [modal,setModal]=useState(null);return <><PageTitle eyebrow="ITERATION MANAGEMENT" title="Quản lý Sprint" subtitle="Lên kế hoạch cho từng chu kỳ phát triển và theo dõi mục tiêu." actions={<button className="btn primary" onClick={()=>setModal({})}><Plus size={16}/> Sprint mới</button>}/><div className="sprint-grid">{data.sprints.map(s=>{const related=data.tasks.filter(t=>t.sprintId===s.id);const done=related.filter(t=>t.status==='DONE').length;return <div className="panel sprint-card" key={s.id}><div className="sprint-top"><div className="sprint-glyph"><CalendarDays size={20}/></div><Status value={s.status}/></div><h3>{s.name}</h3><p>{s.goal||'Chưa có mục tiêu sprint.'}</p><div className="sprint-dates"><Clock size={15}/>{s.startDate||'Chưa có ngày bắt đầu'} — {s.endDate||'...'}</div><div className="sprint-progress"><div><span>Tiến độ</span><b>{related.length?Math.round(done/related.length*100):0}%</b></div><div className="progress-track"><div style={{width:(related.length?100*done/related.length:0)+'%'}}/></div><small>{done}/{related.length} tasks</small></div><div className="sprint-footer"><button className="btn secondary small" onClick={()=>setModal(s)}><Edit3 size={15}/> Chỉnh sửa</button><button className="btn danger-subtle small" onClick={async()=>{if(window.confirm('Xóa Sprint? Hãy chuyển task sang sprint khác trước.'))await mutate(`/sprints/${s.id}`,'DELETE')}}><Trash2 size={15}/></button></div></div>})}{!data.sprints.length&&<div className="panel"><Empty icon={CalendarDays} title="Chưa có Sprint" subtitle="Tạo sprint để nhóm lên kế hoạch làm việc."/></div>}</div>{modal&&<Modal title={modal.id?'Chỉnh sửa Sprint':'Tạo Sprint'} onClose={()=>setModal(null)}><SprintForm initial={modal} save={async(v)=>{const r=await mutate(modal.id?`/sprints/${modal.id}`:'/sprints',modal.id?'PUT':'POST',v);if(r)setModal(null)}}/></Modal>}</>}
function SprintForm({initial,save}){const [v,set]=useState({name:initial?.name||'',goal:initial?.goal||'',startDate:initial?.startDate||'',endDate:initial?.endDate||'',status:initial?.status||'PLANNED'});return <form className="form" onSubmit={e=>{e.preventDefault();save(v)}}><Field label="Tên Sprint"><input required value={v.name} onChange={e=>set({...v,name:e.target.value})} placeholder="Sprint 01"/></Field><Field label="Mục tiêu"><textarea value={v.goal} onChange={e=>set({...v,goal:e.target.value})} placeholder="Mục tiêu của Sprint..."/></Field><div className="form-cols"><Field label="Bắt đầu"><input type="date" value={v.startDate} onChange={e=>set({...v,startDate:e.target.value})}/></Field><Field label="Kết thúc"><input type="date" value={v.endDate} onChange={e=>set({...v,endDate:e.target.value})}/></Field></div><Field label="Trạng thái"><select value={v.status} onChange={e=>set({...v,status:e.target.value})}>{['PLANNED','ACTIVE','COMPLETED'].map(s=><option key={s} value={s}>{displayStatus[s]}</option>)}</select></Field><button className="btn primary" type="submit">Lưu Sprint</button></form>}
function Board({data,mutate,busy}){const [modal,setModal]=useState(null);const [sprintFilter,setSprintFilter]=useState('all');const [dragging,setDragging]=useState(null);const columns=[['TODO','Cần làm'],['IN_PROGRESS','Đang thực hiện'],['REVIEW','Đang kiểm tra'],['DONE','Hoàn thành']];const filtered=data.tasks.filter(t=>sprintFilter==='all'||String(t.sprintId||'backlog')===sprintFilter);
 return <><PageTitle eyebrow="TASK MANAGEMENT" title="Kanban Board" subtitle="Quản lý và kéo thả công việc qua các trạng thái." actions={<><select className="control" value={sprintFilter} onChange={e=>setSprintFilter(e.target.value)}><option value="all">Tất cả Sprint</option><option value="backlog">Backlog</option>{data.sprints.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><button className="btn primary" onClick={()=>setModal({})}><Plus size={16}/> Tạo Task</button></>}/><div className="kanban">{columns.map(([status,title])=><div key={status} className="kanban-col" onDragOver={e=>e.preventDefault()} onDrop={async(e)=>{e.preventDefault();if(dragging){await mutate(`/tasks/${dragging}`,'PUT',{status});setDragging(null)}}}><div className="kanban-head"><div><span className={'status-dot '+status.toLowerCase()}/><b>{title}</b></div><span>{filtered.filter(t=>t.status===status).length}</span></div><div className="kanban-items">{filtered.filter(t=>t.status===status).map(task=><article draggable key={task.id} onDragStart={()=>setDragging(task.id)} onDragEnd={()=>setDragging(null)} onClick={()=>setModal(task)} className="task-card"><div className="task-overline">TASK-{String(task.id).padStart(3,'0')} <Priority value={task.priority}/></div><h4>{task.title}</h4><p>{task.description||'Chưa có mô tả.'}</p><div className="task-bottom"><span><Layers size={13}/> {data.sprints.find(s=>s.id===task.sprintId)?.name||'Backlog'}</span><span className="tiny-avatar">{data.members.find(m=>m.userId===task.assigneeId)?.name?.[0]||'—'}</span></div></article>)}<button className="add-card" onClick={()=>setModal({status})}><Plus size={16}/> Thêm công việc</button></div></div>)}</div>{modal&&<Modal title={modal.id?'Cập nhật Task':'Tạo Task'} onClose={()=>setModal(null)}><TaskForm data={data} initial={modal} submit={async(v)=>{const r=await mutate(modal.id?`/tasks/${modal.id}`:'/tasks',modal.id?'PUT':'POST',v);if(r)setModal(null)}} onDelete={modal.id?async()=>{if(window.confirm('Xóa task này?')){await mutate(`/tasks/${modal.id}`,'DELETE');setModal(null)}}:null}/></Modal>}</>}
function TaskForm({data,initial,submit,onDelete}){const [v,set]=useState({title:initial?.title||'',description:initial?.description||'',priority:initial?.priority||'MEDIUM',status:initial?.status||'TODO',sprintId:initial?.sprintId||'',storyId:initial?.storyId||'',assigneeId:initial?.assigneeId||'',dueDate:initial?.dueDate||''});return <form className="form" onSubmit={e=>{e.preventDefault();submit(v)}}><Field label="Tiêu đề Task"><input required maxLength={230} value={v.title} onChange={e=>set({...v,title:e.target.value})} placeholder="VD: Tạo API đăng nhập"/></Field><Field label="Mô tả"><textarea value={v.description} onChange={e=>set({...v,description:e.target.value})}/></Field><div className="form-cols"><Field label="Trạng thái"><select value={v.status} onChange={e=>set({...v,status:e.target.value})}>{['TODO','IN_PROGRESS','REVIEW','DONE'].map(s=><option key={s} value={s}>{displayStatus[s]}</option>)}</select></Field><Field label="Ưu tiên"><select value={v.priority} onChange={e=>set({...v,priority:e.target.value})}>{Object.entries(priorities).map(([k,val])=><option key={k} value={k}>{val}</option>)}</select></Field></div><div className="form-cols"><Field label="Sprint"><select value={v.sprintId} onChange={e=>set({...v,sprintId:e.target.value})}><option value="">Backlog</option>{data.sprints.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field><Field label="User Story"><select value={v.storyId} onChange={e=>set({...v,storyId:e.target.value})}><option value="">Không liên kết</option>{data.stories.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></Field></div><div className="form-cols"><Field label="Người thực hiện"><select value={v.assigneeId} onChange={e=>set({...v,assigneeId:e.target.value})}><option value="">Chưa phân công</option>{data.members.map(m=><option key={m.userId} value={m.userId}>{m.name}</option>)}</select></Field><Field label="Hạn hoàn thành"><input type="date" value={v.dueDate} onChange={e=>set({...v,dueDate:e.target.value})}/></Field></div><div className="form-buttons"><button type="submit" className="btn primary">Lưu Task</button>{onDelete&&<button type="button" className="btn danger-subtle" onClick={onDelete}><Trash2 size={17}/> Xóa</button>}</div></form>}
function Documents({data,busy,api,mutate,projectId,reload,notify,call,token}){
 const [question,setQuestion]=useState('');
 const [messages,setMessages]=useState([]);
 const [includeOfficial,setIncludeOfficial]=useState(false);
 useEffect(()=>{setMessages([]);setIncludeOfficial(false)},[projectId]);
 async function submit(e){
  e.preventDefault();if(!question.trim()||busy)return;
  const q=question.trim();
  setMessages(a=>[...a,{kind:'user',text:q}]);setQuestion('');
  // Preserve the real project-scoped API and authentication. The animation
  // resolves only after the server confirms delivery; errors never show a tick.
  const result=await call(()=>api(`/projects/${projectId}/chat`,{method:'POST',body:JSON.stringify({question:q,includeOfficialSources:includeOfficial})}));
  if(result)setMessages(a=>[...a,{kind:'ai',text:result.answer,sources:result.sources,mode:result.mode,warnings:result.warnings}]);
  return !!result;
 }
 return <><PageTitle eyebrow="KNOWLEDGE BASE" title="Trợ lý AI & RAG" subtitle="Tra cứu tài liệu dự án và nguồn chính thống, trả lời có đường dẫn kiểm chứng."/>
  <div className="rag-layout">
   <Panel title="Tài liệu dự án" subtitle="PDF, DOCX, TXT, MD · Tối đa 10 MB" className="docs-panel" action={<BookOpen size={20}/> }>
    <DocumentDropUploader key={projectId} projectId={projectId} endpoint={`${API}/projects/${projectId}/documents`} token={token} onUploaded={async()=>{notify('Đã lập chỉ mục tài liệu');await reload()}} onError={message=>notify(message,'error')}/>
    <div className="document-list"><h4>Đã lập chỉ mục ({data.documents.length})</h4>
     {data.documents.length?data.documents.map(doc=><div className="document-item" key={doc.id}>
      <div className="file-icon">{doc.sourceType==='OFFICIAL'?<Shield size={18}/>:<FileText size={18}/>}</div>
      <div><strong title={doc.filename}>{doc.filename}</strong>
       <span>{doc.chunkCount} đoạn · {doc.sourceType==='OFFICIAL'&&doc.fetchedAt?'Đọc: '+niceDate(doc.fetchedAt):niceDate(doc.createdAt)}</span>
       {doc.sourceType==='OFFICIAL'&&doc.sourceUrl&&<a className="official-doc-origin" href={doc.sourceUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={11}/>{doc.publisher||'Nguồn chính thống'}</a>}
      </div>
      <button title="Xóa" className="icon-btn" onClick={async()=>{if(window.confirm('Xóa tài liệu khỏi RAG?'))await mutate(`/documents/${doc.id}`,'DELETE')}}><Trash2 size={16}/></button>
     </div>):<p className="muted">Chưa có tài liệu.</p>}</div>
    <OfficialRagSources projectId={projectId} api={api} documents={data.documents} onImported={reload} notify={notify}/>
    <div className="info-box"><Shield size={17}/><span>Chỉ tài liệu đã nhập vào dự án mới được lưu. Chế độ tra cứu trực tuyến chỉ đọc các trang trong tên miền được phê duyệt; tìm kiếm web mở rộng cần Tavily API key.</span></div>
   </Panel>
   <div className="panel chat-panel"><div className="chat-header"><div className="chat-avatar"><AiActivityOrb busy={busy}/></div><div><h3>Project Knowledge AI</h3><p>Tài liệu dự án + nguồn chính thống</p></div><span className="assistant-state"><i/> {busy ? "Đang phân tích" : "Sẵn sàng"}</span></div>
    <div className="chat-messages" aria-live="polite">{messages.length===0?<div className="chat-intro"><div className="chat-hero-icon"><AiActivityOrb busy={busy}/></div><h3>Hỏi đáp có dẫn chứng</h3><p>Chọn tài liệu từ các nhà phát hành chính thức ở bên trái, hoặc bật tra cứu trực tuyến khi đặt câu hỏi.</p>
     <div className="suggested-questions">{['NIST khuyến nghị gì về phát triển phần mềm an toàn?','OWASP hướng dẫn xác thực ra sao?','AI Software Testing best practices là gì?'].map(q=><button key={q} onClick={()=>setQuestion(q)}>{q}<ArrowRight size={14}/></button>)}</div></div>
     :messages.map((m,i)=><div key={i} className={'chat-message '+m.kind}><div className="bubble">{m.text}</div>
      {m.sources?.length>0&&<div className="source-list"><strong><BookOpen size={14}/> Nguồn tham khảo</strong>{m.sources.map((source,index)=><div key={index} className="source-item">[{index+1}] {source.document}{source.page?` · trang ${source.page}`:''} · đoạn {source.chunk}
       {source.publisher&&<span> · {source.publisher}</span>}{source.fetchedAt&&<span> · truy xuất {niceDate(source.fetchedAt)}</span>}
       {source.url&&<a className="official-source-link" href={source.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={12}/> Xem URL gốc</a>}
      </div>)}</div>}
      {m.warnings?.length>0&&<div className="official-chat-warnings">{m.warnings.join(' · ')}</div>}
      {m.mode==='retrieval_only'&&<div className="muted hint">Chưa cấu hình API AI; đây là các đoạn trích từ tài liệu thực sự truy xuất được.</div>}
     </div>)}{busy&&<div className="dp-chat-typing" role="status"><AiActivityOrb busy/><span>DevPilot đang xử lý câu hỏi</span><span className="dp-typing-dots"><i/><i/><i/></span></div>}</div>
    <PaperPlaneComposer
     key={projectId} value={question} onChange={setQuestion} onSubmit={submit} disabled={busy}
     includeOfficial={includeOfficial} onIncludeOfficialChange={setIncludeOfficial}
    />
   </div>
  </div>
 </>;
}
function Members({data,project,session,mutate}) {
 const [email,setEmail]=useState('');
 const [newRole,setNewRole]=useState('MEMBER');
 const canManage=project.ownerId===session.user.id||session.user?.role==='ADMIN';
 const roleLabels={OWNER:'Chủ dự án',MEMBER:'Thành viên chỉnh sửa',VIEWER:'Chỉ xem'};
 return <>
  <PageTitle eyebrow="PROJECT TEAM" title="Thành viên & phân quyền" subtitle="JWT xác định tài khoản; Backend kiểm tra quyền từ database trong từng yêu cầu."/>
  {canManage&&<div className="panel members-invite">
   <div><h3>Mời thành viên</h3><p>Người được mời cần đăng ký tài khoản trước khi tham gia dự án.</p></div>
   <form onSubmit={async(e)=>{e.preventDefault();const r=await mutate('/members','POST',{email,role:newRole});if(r)setEmail('')}}>
    <input required type="email" placeholder="email@company.com" value={email} onChange={e=>setEmail(e.target.value)}/>
    <select className="dp-member-role-select" aria-label="Quyền thành viên mới" value={newRole} onChange={e=>setNewRole(e.target.value)}>
     <option value="MEMBER">Chỉnh sửa</option><option value="VIEWER">Chỉ xem</option>
    </select>
    <button className="btn primary" type="submit"><Plus size={16}/> Thêm thành viên</button>
   </form>
  </div>}
  <Panel title="Phân quyền dự án" subtitle={`${data.members.length} thành viên · Quyền được kiểm tra ở Backend`}>
   <div className="member-list">{data.members.map(m=><div className="member" key={m.userId}>
    <div className="avatar big">{m.name?.[0]?.toUpperCase()||'U'}</div>
    <div className="member-name"><strong>{m.name}</strong><span>{m.email}</span></div>
    {canManage&&m.userId!==project.ownerId?
     <div className="dp-member-tools">
      <select className="dp-member-role-select" aria-label={`Quyền của ${m.name}`} value={m.role==='VIEWER'?'VIEWER':'MEMBER'} onChange={e=>mutate(`/members/${m.userId}/role`,'PUT',{role:e.target.value})}>
       <option value="MEMBER">Chỉnh sửa</option><option value="VIEWER">Chỉ xem</option>
      </select>
      <button type="button" className="dp-member-remove" onClick={()=>{if(window.confirm(`Xóa ${m.name} khỏi dự án?`))mutate(`/members/${m.userId}`,'DELETE')}}>Xóa</button>
     </div>
    :<span className="role-pill">{roleLabels[m.role]||'Thành viên'}</span>}
   </div>)}</div>
  </Panel>
 </>;
}


createRoot(document.getElementById('root')).render(<App/>);
