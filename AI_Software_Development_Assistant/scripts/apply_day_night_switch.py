"""Add the Lucian #021 theme toggle to the current DevPilot AI frontend in place.
Preserves local API/Cloudflare edits and creates main.jsx backup.
Usage: python ./scripts/apply_day_night_switch.py
"""
from pathlib import Path
from datetime import datetime
import re
import sys

root = Path(__file__).resolve().parents[1]
source = root / 'frontend' / 'src' / 'main.jsx'
component = root / 'frontend' / 'src' / 'components' / 'DayNightSkySwitch.jsx'
css = root / 'frontend' / 'src' / 'components' / 'DayNightSkySwitch.css'

if not source.is_file():
    sys.exit(f'ERROR: missing {source}. Extract the ZIP at the project root first.')
if not component.is_file() or not css.is_file():
    sys.exit('ERROR: missing one of the components/DayNightSkySwitch files.')
text = source.read_text(encoding='utf-8-sig')
if "import DayNightSkySwitch from" in text:
    print('DayNightSkySwitch is already installed in main.jsx. No change made.')
    sys.exit(0)


def replace_once(s, old, new, name):
    count = s.count(old)
    if count != 1:
        raise ValueError(f'Cannot locate unique {name} (matches: {count}). main.jsx unchanged.')
    return s.replace(old, new, 1)

try:
    updated = replace_once(text, "import './style.css';",
                           "import './style.css';\nimport './components/DayNightSkySwitch.css';\nimport DayNightSkySwitch from './components/DayNightSkySwitch.jsx';", 'style import')
    updated = replace_once(updated, 'function App(){', """function initialTheme(){
 try { return localStorage.getItem('devpilot-theme') === 'dark' ? 'dark' : 'light'; }
 catch { return 'light'; }
}
function App(){""", 'App entry')
    updated = replace_once(updated, 'const [session,setSession]=useState(initialSession);', """const [session,setSession]=useState(initialSession);
 const [theme,setTheme]=useState(initialTheme);
 useEffect(()=>{try{localStorage.setItem('devpilot-theme',theme)}catch{}},[theme]);""", 'session state')
    # Preserve the full AuthPage JSX and its existing callbacks, API props and form values.
    pattern = r'(?m)^(\s*)if\(!session\)return (<AuthPage[^\n]*?/>);\s*$'
    matches = list(re.finditer(pattern, updated))
    if len(matches) != 1:
        raise ValueError('Cannot locate a unique AuthPage return. main.jsx unchanged.')
    m = matches[0]
    auth = (f'{m.group(1)}if(!session)return <div className="u021-theme-root u021-auth-shell" data-theme={{theme}}>'
            '<div className="u021-auth-toggle"><DayNightSkySwitch theme={theme} onChange={setTheme}/></div>'
            + m.group(2) + '</div>;')
    updated = updated[:m.start()] + auth + updated[m.end():]
    updated = replace_once(updated, 'return <div className="app-shell">',
                           'return <div className="app-shell u021-theme-root" data-theme={theme}>', 'app shell')
    updated = replace_once(updated, '<div className="top-right">',
                           '<div className="top-right"><DayNightSkySwitch theme={theme} onChange={setTheme}/>', 'top-right header')
except ValueError as error:
    sys.exit(f'ERROR: {error}')

backup = source.with_name('main.jsx.before-day-night-' + datetime.now().strftime('%Y%m%d-%H%M%S') + '.bak')
backup.write_text(text, encoding='utf-8')
source.write_text(updated, encoding='utf-8')
print('SUCCESS: DayNightSkySwitch added to header and login screen.')
print('Theme setting is stored under localStorage key: devpilot-theme')
print('Saved backup:', backup)
print('Restart the frontend with scripts\\Start-Frontend.ps1')
