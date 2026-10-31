import React, {useEffect, useRef, useState} from 'react';
import {ArrowRight, Command, CornerDownLeft, Search, X} from 'lucide-react';

/** Keyboard-accessible local navigation. Ctrl/⌘+K anywhere within the app. */
export default function CommandPalette({open,onClose,onNavigate,tabs, data}) {
 const [query,setQuery]=useState('');
 const [index,setIndex]=useState(0);
 const input=useRef(null);
 const previousFocus=useRef(null);
 const dialog=useRef(null);
 const items=[
   ...tabs.map(([page,label,Icon])=>({page,label,Icon,description:'Chuyển đến phân hệ'})),
   ...(data.requirements||[]).slice(0,30).map(r=>({page:'requirements',label:r.title,description:`Requirement #${r.id}`,Icon:null})),
   ...(data.tasks||[]).slice(0,30).map(t=>({page:'board',label:t.title,description:`Task #${t.id}`,Icon:null}))
 ];
 const results=items.filter(x=>(`${x.label} ${x.description}`).toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi'))).slice(0,9);
 useEffect(()=>{if(open){previousFocus.current=document.activeElement;setQuery('');setIndex(0);requestAnimationFrame(()=>input.current?.focus())}else{previousFocus.current?.focus?.()}},[open]);
 useEffect(()=>setIndex(0),[query]);
 if(!open)return null;
 const choose=item=>{onNavigate(item.page);onClose()};
 const onKeyDown=e=>{
   if(e.key==='Escape'){e.preventDefault();onClose()}
   if(e.key==='ArrowDown'){e.preventDefault();setIndex(v=>Math.min(results.length-1,v+1))}
   if(e.key==='ArrowUp'){e.preventDefault();setIndex(v=>Math.max(0,v-1))}
   if(e.key==='Enter'&&results[index]){e.preventDefault();choose(results[index])}
   if(e.key==='Tab') { // Focus stays within this small dialog.
     const focusables=Array.from(dialog.current?.querySelectorAll('button:not([disabled]), input:not([disabled])')||[]);
     if(!focusables.length)return;
     const first=focusables[0], last=focusables[focusables.length-1];
     if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
     else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
   }
 };
 return <div className="mc-command-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
   <div className="mc-command-panel" ref={dialog} role="dialog" aria-modal="true" aria-label="Tìm kiếm và điều hướng nhanh" onKeyDown={onKeyDown}>
     <div className="mc-command-search"><Search size={20}/><input ref={input} aria-label="Tìm trang, Requirement hoặc Task" placeholder="Tìm phân hệ, yêu cầu hoặc công việc..." value={query} onChange={e=>setQuery(e.target.value)}/><button type="button" id="mc-command-close" onClick={onClose} aria-label="Đóng"><X size={18}/></button></div>
     <span className="mc-command-caption">{query?'KẾT QUẢ TÌM KIẾM':'CHUYỂN NHANH ĐẾN'}</span>
     <div className="mc-command-results" role="listbox" aria-label="Gợi ý điều hướng">{results.length?results.map((item,i)=><button key={`${item.page}-${i}`} role="option" aria-selected={i===index} type="button" className={index===i?'selected':''} onMouseEnter={()=>setIndex(i)} onClick={()=>choose(item)}><span className="mc-command-result-icon">{item.Icon?<item.Icon size={17}/>:<ArrowRight size={17}/>}</span><span><strong>{item.label}</strong><small>{item.description}</small></span>{i===index&&<CornerDownLeft size={15}/>}</button>):<p className="mc-command-noresults">Không tìm thấy kết quả. Hãy thử từ khóa khác.</p>}</div>
     <div className="mc-command-help"><span><kbd>↑</kbd><kbd>↓</kbd> Di chuyển</span><span><kbd>Enter</kbd> Mở</span><span><kbd>Esc</kbd> Thoát</span></div>
   </div>
 </div>;
}
