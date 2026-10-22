"""Install the real-upload Lucian #032 uploader into DevPilot's Documents page.

Run in the project root: python scripts/apply_rag_drag_upload.py
Does NOT overwrite existing .env, proxy, Cloudflare, theme or backend code.
"""
from datetime import datetime
from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parents[1]
source = root / 'frontend' / 'src' / 'main.jsx'
component = root / 'frontend' / 'src' / 'components' / 'DocumentDropUploader.jsx'
styles = root / 'frontend' / 'src' / 'components' / 'DocumentDropUploader.css'

if not (source.is_file() and component.is_file() and styles.is_file()):
    sys.exit('ERROR: Missing main.jsx or DocumentDropUploader files. Extract patch into project root.')
text = source.read_text(encoding='utf-8-sig')
if "import DocumentDropUploader from" in text:
    if '<DocumentDropUploader ' in text:
        print('Already installed: no changes made.')
        sys.exit(0)
    sys.exit('ERROR: Found a partial uploader installation. main.jsx unchanged.')

def once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise ValueError(f'{label} not unique (found {count}). main.jsx unchanged.')
    text = text.replace(old, new, 1)

def regex_once(pattern, repl, label):
    global text
    updated, hits = re.subn(pattern, repl, text, count=0, flags=re.DOTALL)
    if hits != 1:
        raise ValueError(f'{label} not unique (found {hits}). main.jsx unchanged.')
    text = updated

try:
    once("import './style.css';", "import './style.css';\nimport DocumentDropUploader from './components/DocumentDropUploader.jsx';", 'style import')
    # Preserve the JWT token; the new uploader supplies it via the original Bearer header.
    regex_once(r"(\{page==='documents'&&<Documents\s+[^>]*?\bcall=\{call\})(/>)", r"\1 token={token}\2", 'Documents call')
    once('function Documents({data,busy,api,mutate,projectId,reload,notify,call}){',
         'function Documents({data,busy,api,mutate,projectId,reload,notify,call,token}){', 'Documents signature')
    once("const [question,setQuestion]=useState('');const [messages,setMessages]=useState([]);const [uploading,setUploading]=useState(false);",
         "const [question,setQuestion]=useState('');const [messages,setMessages]=useState([]);", 'upload state')
    regex_once(r'(?m)^ async function upload\(e\)\{[^\n]*\}\n', '', 'old upload handler')
    replacement = ("<DocumentDropUploader key={projectId} projectId={projectId} "
                   "endpoint={`${API}/projects/${projectId}/documents`} token={token} "
                   "onUploaded={async()=>{notify('Đã lập chỉ mục tài liệu');await reload();}} "
                   "onError={message=>notify(message,'error')}/>")
    regex_once(r'<label className="dropzone">.*?</label>', replacement, 'old dropzone')
except ValueError as error:
    sys.exit('ERROR: ' + str(error))

backup = source.with_name('main.jsx.before-rag-upload-' + datetime.now().strftime('%Y%m%d-%H%M%S') + '.bak')
backup.write_text(source.read_text(encoding='utf-8-sig'), encoding='utf-8')
source.write_text(text, encoding='utf-8')
print('SUCCESS: Real-progress drag & drop installed in Documents / RAG.')
print('Unchanged: login, API URL/proxy, existing theme switch, project data, Java, Python and SQL.')
print('Backup:', backup)
print('Restart the frontend with scripts\\Start-Frontend.ps1')
