# -*- coding: utf-8 -*-
"""Surgically install Admin dashboard after the existing Admin/User roles patch.
Preserves the current React page, Cloudflare proxy, RAG, themes, .env and SQL data.
"""
from pathlib import Path
from datetime import datetime
import argparse, shutil

P=Path(__file__).resolve().parent

def transform_main(s):
    if "import AdminWorkspace from './components/AdminWorkspace.jsx';" in s:
        return s
    edits=[
      ("import AdminUsers from './components/AdminUsers.jsx';", "import AdminWorkspace from './components/AdminWorkspace.jsx';"),
      ("const [page,setPage]=useState('dashboard');", "const [page,setPage]=useState(()=>initialSession()?.user?.role==='ADMIN'?'admin-overview':'dashboard');const [adminUserFilter,setAdminUserFilter]=useState(null);"),
      ("const visibleTabs=isAdmin?[...tabs,['admin','Quản trị tài khoản',Shield]]:tabs;", "const adminTabs=[['admin-overview','Admin · Tổng quan',Shield],['admin-users','Quản lý tài khoản',Users],['admin-projects','Quản lý dự án',FolderKanban],['admin-analytics','Số liệu phân tích',LayoutDashboard]];\n const visibleTabs=isAdmin?[...adminTabs,...tabs]:tabs;"),
      ("function logout(){localStorage.removeItem('devpilot-session');setSession(null);setProjects([]);setProjectId(null);setData({requirements:[],stories:[],criteria:[],sprints:[],tasks:[],documents:[],members:[]});setPage('dashboard')}", "function logout(){localStorage.removeItem('devpilot-session');setSession(null);setProjects([]);setProjectId(null);setAdminUserFilter(null);setData({requirements:[],stories:[],criteria:[],sprints:[],tasks:[],documents:[],members:[]});setPage('dashboard')}"),
      ("<AuthPage onAuth={s=>{setSession(s);localStorage.setItem('devpilot-session',JSON.stringify(s))}} api={api}/>", "<AuthPage onAuth={s=>{setSession(s);setPage(s.user?.role==='ADMIN'?'admin-overview':'dashboard');localStorage.setItem('devpilot-session',JSON.stringify(s))}} api={api}/>"),
      ("<nav>{visibleTabs.map(([id,label,Icon])=><button", "<nav>{visibleTabs.map(([id,label,Icon])=><React.Fragment key={id}>{isAdmin&&id==='admin-overview'&&sidebar&&<span className=\"side-label\">ADMINISTRATION</span>}{isAdmin&&id==='dashboard'&&sidebar&&<span className=\"side-label\" style={{marginTop:16}}>WORKSPACE</span>}<button"),
      ("</button>)}</nav>", "</button></React.Fragment>)}</nav>"),
      ("{page==='admin'&&isAdmin?<AdminUsers api={api} notify={notify} currentId={session.user.id}/>:!project?<EmptyProject onCreate={()=>setShowProjectForm(true)}/>:" , "{page.startsWith('admin-')&&isAdmin?<AdminWorkspace mode={page.slice(6)} api={api} notify={notify} currentId={session.user.id} userFilter={adminUserFilter} setUserFilter={setAdminUserFilter} onNavigate={setPage} onOpenProject={id=>{setProjectId(id);setPage('dashboard')}} refreshProjects={reloadProjects}/>:!project?<EmptyProject onCreate={()=>setShowProjectForm(true)}/>:"),
    ]
    for old,new in edits:
        if s.count(old)!=1:
            raise RuntimeError('main.jsx source does not match expected Admin/User version. Stop to avoid overwriting custom edits. Missing: '+old[:70])
        s=s.replace(old,new,1)
    return s

def transform_users(s):
    if 'onViewProjects' in s:
        return s
    edits=[
      ("import {Shield, RefreshCw, Users, AlertCircle} from 'lucide-react';", "import {Shield, RefreshCw, Users, AlertCircle, FolderKanban, Search} from 'lucide-react';"),
      ("export default function AdminUsers({api,notify,currentId})", "export default function AdminUsers({api,notify,currentId,onViewProjects})"),
      ("const [loading,setLoading]=useState(true);", "const [loading,setLoading]=useState(true);\n  const [query,setQuery]=useState('');"),
      ('<div className="panel-header"><div><h3><Users size={18}/> Tài khoản hệ thống</h3><p>{users.length} tài khoản</p></div><Shield size={20}/></div>', '<div className="panel-header"><div><h3><Users size={18}/> Tài khoản hệ thống</h3><p>{users.length} tài khoản</p></div><Shield size={20}/></div><label className="admin-users-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm theo tên hoặc email..." aria-label="Tìm tài khoản"/></label>'),
      ('<tr><th>Tài khoản</th><th>Email</th><th>Quyền hệ thống</th></tr>', '<tr><th>Tài khoản</th><th>Email</th><th>Quyền hệ thống</th><th>Dự án</th></tr>'),
      ('{users.map(user=><tr key={user.id}>', '{users.filter(u=>`${u.name} ${u.email}`.toLowerCase().includes(query.toLowerCase())).map(user=><tr key={user.id}>'),
      ("</select>\n        </label></td>\n      </tr>", "</select>\n        </label></td><td><button className=\"admin-users-projects-btn\" onClick={()=>onViewProjects?.(user)} type=\"button\"><FolderKanban size={15}/> Xem dự án</button></td>\n      </tr>"),
    ]
    for old,new in edits:
        if s.count(old)!=1: raise RuntimeError('AdminUsers.jsx source differs; stop before overwriting. Missing: '+old[:70])
        s=s.replace(old,new,1)
    return s

CSS="""
.admin-users-search{display:flex;align-items:center;gap:9px;max-width:460px;background:#f9fbfe;border:1px solid #dfe8f1;border-radius:10px;padding:0 12px;margin-bottom:14px}
.admin-users-search input{height:42px;border:0;background:transparent;flex:1;min-width:0;outline:0;color:#2e4259}
.admin-users-projects-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 10px;border:1px solid #bee6df;background:#eafbf8;border-radius:9px;color:#188e86;font-size:11px;font-weight:750;white-space:nowrap}
.admin-users-projects-btn:focus-visible{outline:2px solid #2bb5a9;outline-offset:3px}
.u021-theme-root[data-theme="dark"] .admin-users-search{background:#243047;border-color:#53617b}
.u021-theme-root[data-theme="dark"] .admin-users-search input{color:#edf3ff}
@media(max-width:600px){.admin-users-table{min-width:680px}}
"""

def install(root):
    main=root/'frontend/src/main.jsx'
    users=root/'frontend/src/components/AdminUsers.jsx'
    css=root/'frontend/src/components/AdminUsers.css'
    for f in [main,users,css,root/'backend/pom.xml']:
        if not f.is_file(): raise RuntimeError('Missing '+str(f)+'; install the Admin/User patch first')
    # Validate *all* transformations before writing any file.
    updated_main=transform_main(main.read_text(encoding='utf-8'))
    updated_users=transform_users(users.read_text(encoding='utf-8'))
    old_css=css.read_text(encoding='utf-8')
    updated_css=old_css if 'admin-users-search{' in old_css else old_css+'\n'+CSS
    dests=[(main,updated_main),(users,updated_users),(css,updated_css)]
    payload=['backend/src/main/java/com/dacn/assistant/web/AdminInsightsController.java',
       'backend/src/test/java/com/dacn/assistant/web/AdminInsightsControllerTest.java',
       'frontend/src/components/AdminWorkspace.jsx',
       'frontend/src/components/AdminWorkspace.css']
    for src in payload:
        if not (P/src).exists(): raise RuntimeError('Missing patch file: '+src)
    stamp=datetime.now().strftime('%Y%m%d-%H%M%S')
    for dest,content in dests:
        if dest.read_text(encoding='utf-8') != content:
            shutil.copy2(dest,dest.with_suffix(dest.suffix+'.before-admin-dashboard-'+stamp+'.bak'))
            dest.write_text(content,encoding='utf-8')
            print('Updated',dest.relative_to(root))
        else: print('Already updated',dest.relative_to(root))
    for src in payload:
        dest=root/src;dest.parent.mkdir(parents=True,exist_ok=True)
        if dest.exists() and dest.read_bytes()==(P/src).read_bytes():continue
        if dest.exists():shutil.copy2(dest,dest.with_suffix(dest.suffix+'.before-admin-dashboard-'+stamp+'.bak'))
        shutil.copy2(P/src,dest)
        print('Updated',dest.relative_to(root))
    print('Done. No database, .env, API keys, members, roles, or SQL records were changed.')

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--project-root',type=Path,default=P.parent)
    args=parser.parse_args()
    install(args.project_root.expanduser().resolve())
