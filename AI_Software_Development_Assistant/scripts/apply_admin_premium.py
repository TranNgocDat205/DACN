# -*- coding: utf-8 -*-
"""Non-destructive DevPilot Admin Premium installer. Keeps AI/SQL/Cloudflare config intact."""
from pathlib import Path
from datetime import datetime
import sys, shutil, argparse

PATCH=Path(__file__).resolve().parent.parent

def require(condition,message):
    if not condition: raise RuntimeError(message)

def once(src,old,new):
    if new in src:return src
    require(src.count(old)==1,'main.jsx was customized; unable to find exactly one: '+old[:100])
    return src.replace(old,new,1)

def install(root):
    root=Path(root).resolve()
    main=root/'frontend/src/main.jsx'
    role=root/'backend/src/main/java/com/dacn/assistant/service/RoleAccess.java'
    users=root/'frontend/src/components/AdminUsers.jsx'
    require(main.is_file() and users.is_file() and role.is_file(),
            'Install the ADMIN/USER roles patch first. Missing main.jsx, AdminUsers.jsx or RoleAccess.java')
    # The previous Analytics patch may never have been installed. Its installer is safe and idempotent.
    sys.path.insert(0,str(PATCH/'bootstrap'))
    import apply_admin_dashboard as bootstrap
    bootstrap.P=PATCH/'bootstrap'
    if "import AdminPremiumWorkspace from './components/AdminPremiumWorkspace.jsx';" not in main.read_text(encoding="utf-8"):
        bootstrap.install(root)
    content=main.read_text(encoding='utf-8')
    content=once(content,"import AdminWorkspace from './components/AdminWorkspace.jsx';",
        "import AdminPremiumWorkspace from './components/AdminPremiumWorkspace.jsx';")
    content=once(content,"['admin-projects','Quản lý dự án',FolderKanban],['admin-analytics'",
        "['admin-projects','Quản lý dự án',FolderKanban],['admin-teams','Quản lý nhóm',Users],['admin-analytics'")
    content=once(content,'<AdminWorkspace mode={page.slice(6)}',
        '<AdminPremiumWorkspace mode={page.slice(6)}')
    content=once(content,'return <div className="app-shell u021-theme-root" data-theme={theme}>',
        "return <div className={'app-shell u021-theme-root'+(isAdmin&&page.startsWith('admin-')?' admin-premium-mode':'')} data-theme={theme}>")
    stamp=datetime.now().strftime('%Y%m%d-%H%M%S')
    updates=[(main,content)]
    paths=[
        'backend/src/main/java/com/dacn/assistant/web/AdminInsightsController.java',
        'backend/src/main/java/com/dacn/assistant/web/AdminManageController.java',
        'frontend/src/components/AdminPremiumWorkspace.jsx',
        'frontend/src/components/AdminPremiumWorkspace.css',
        'backend/src/test/java/com/dacn/assistant/web/AdminManageControllerTest.java'
    ]
    for relative in paths:
        source=PATCH/relative
        require(source.is_file(),'Missing patch file: '+relative)
        dest=root/relative
        updates.append((dest,source.read_text(encoding='utf-8')))
    for dest,value in updates:
        dest.parent.mkdir(parents=True,exist_ok=True)
        if dest.exists() and dest.read_text(encoding='utf-8')==value:
            print('Already up to date:',dest.relative_to(root));continue
        if dest.exists():
            backup=dest.with_name(dest.name+f'.before-admin-premium-{stamp}.bak')
            shutil.copy2(dest,backup)
            print('Backup:',backup.relative_to(root))
        dest.write_text(value,encoding='utf-8')
        print('Updated:',dest.relative_to(root))
    print('Admin Premium patch installed. Database, .env, API keys and existing records unchanged.')

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--project-root',type=Path,default=PATCH.parent)
    args=parser.parse_args()
    install(args.project_root)
