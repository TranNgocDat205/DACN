// Lucian UX/UI Prompt #032 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#032
import React, {useEffect, useRef, useState} from 'react';
import './DocumentDropUploader.css';

const MAX_BYTES = 10 * 1024 * 1024;
const EXT_COLOR = {pdf:'#E5484D', docx:'#3D8BFF', txt:'#22A06B', md:'#8B6CFF'};
const ACCEPTED_EXTENSION = /\.(pdf|docx|txt|md)$/i;
const prettySize = bytes => bytes >= 1048576
  ? `${(bytes/1048576).toFixed(1)} MB`
  : `${Math.max(1, Math.round(bytes/1024))} KB`;

/**
 * File upload for the real DevPilot RAG endpoint.
 * The percentage is measured from XMLHttpRequest.upload (never simulated).
 * After the upload reaches 100%, the server can still be indexing the document.
 */
export default function DocumentDropUploader({projectId, endpoint, token, onUploaded, onError}) {
  const inputRef = useRef(null);
  const queueRef = useRef([]);
  const sendingRef = useRef(false);
  const xhrRef = useRef(null);
  const idRef = useRef(0);
  const epochRef = useRef(0);
  const dragDepthRef = useRef(0);
  const [over, setOver] = useState(false);
  const [rows, setRows] = useState([]);

  useEffect(() => () => {
    epochRef.current += 1;
    queueRef.current = [];
    sendingRef.current = false;
    xhrRef.current?.abort();
    xhrRef.current = null;
  }, [projectId]);

  function patchRow(id, props) {
    setRows(old => old.map(row => row.id === id ? {...row, ...props} : row));
  }

  function startNext() {
    if (sendingRef.current || queueRef.current.length === 0) return;
    const item = queueRef.current.shift();
    const epoch = epochRef.current;
    sendingRef.current = true;
    patchRow(item.id, {status:'uploading', percent:0, error:''});

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    let finished = false;
    const live = () => epochRef.current === epoch;
    async function complete(error) {
      if (finished || !live()) return;
      finished = true;
      if (error) {
        patchRow(item.id, {status:'fail', error});
        onError?.(`${item.file.name}: ${error}`);
      } else {
        patchRow(item.id, {status:'done', percent:100});
        try { await onUploaded?.(item.file); }
        catch (e) { onError?.(e?.message || 'Đã tải lên nhưng không làm mới được danh sách.'); }
      }
      if (!live()) return;
      xhrRef.current = null;
      sendingRef.current = false;
      startNext();
    }
    xhr.open('POST', endpoint, true);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.timeout = 240000;
    xhr.upload.onprogress = event => {
      if (!live()) return;
      if (event.lengthComputable && event.total > 0) {
        const value = Math.min(99, Math.floor(event.loaded / event.total * 100));
        patchRow(item.id, {percent:value});
      }
    };
    xhr.upload.onload = () => { if (live()) patchRow(item.id, {status:'indexing', percent:99}); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) { void complete(null); return; }
      let message = `HTTP ${xhr.status}`;
      try {
        const data = JSON.parse(xhr.responseText || '{}');
        const detail = data.error || data.message || data.detail;
        if (typeof detail === 'string') message = detail;
      } catch { /* Keep HTTP status when the response is not JSON. */ }
      if (xhr.status === 401 || xhr.status === 403) {
        message = `Không có quyền tải tài liệu (HTTP ${xhr.status}). Hãy đăng nhập lại hoặc kiểm tra quyền dự án.`;
      }
      void complete(message);
    };
    xhr.onerror = () => { void complete('Mất kết nối tới Backend.'); };
    xhr.ontimeout = () => { void complete('Tải lên/lập chỉ mục quá thời gian chờ.'); };
    xhr.onabort = () => { if (live()) void complete('Yêu cầu đã bị hủy.'); };
    const body = new FormData();
    body.append('file', item.file);
    try { xhr.send(body); }
    catch (error) { void complete(error?.message || 'Không thể gửi tập tin.'); }
  }

  function addFiles(selected) {
    const files = Array.from(selected || []);
    if (!files.length) return;
    const records = files.map(file => {
      let error = '';
      if (!ACCEPTED_EXTENSION.test(file.name)) error = 'Chỉ hỗ trợ PDF, DOCX, TXT, MD.';
      else if (file.size === 0) error = 'Tập tin không được rỗng.';
      else if (file.size > MAX_BYTES) error = 'Tập tin vượt quá 10 MB.';
      return {id:++idRef.current, file, percent:0, status:error?'fail':'queued', error};
    });
    setRows(prev => [...records, ...prev]);
    for (const record of records) {
      if (record.error) onError?.(`${record.file.name}: ${record.error}`);
      else queueRef.current.push(record);
    }
    startNext();
  }

  function retry(row) {
    if (row.status !== 'fail' || row.file.size === 0 || row.file.size > MAX_BYTES || !ACCEPTED_EXTENSION.test(row.file.name)) return;
    patchRow(row.id, {status:'queued', percent:0, error:''});
    queueRef.current.push(row);
    startNext();
  }

  function onDrop(event) {
    event.preventDefault();
    dragDepthRef.current = 0;
    setOver(false);
    addFiles(event.dataTransfer?.files);
  }
  function onLeave(event) {
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (!dragDepthRef.current) setOver(false);
  }

  return <div className={'u032'+(over?' is-over':'')} onDragEnter={event=>{event.preventDefault(); dragDepthRef.current++; setOver(true);}} onDragOver={event=>{event.preventDefault();event.dataTransfer.dropEffect='copy';}} onDragLeave={onLeave} onDrop={onDrop}>
    <button className="u032-zone" type="button" onClick={()=>inputRef.current?.click()}
      aria-label="Tải tài liệu cho RAG. Nhấn để chọn hoặc kéo thả tập tin PDF, DOCX, TXT, MD">
      <svg className="u032-dash" aria-hidden="true" focusable="false"><rect width="100%" height="100%" rx="25"/></svg>
      <span className="u032-orb" aria-hidden="true"><svg viewBox="0 0 28 28"><path d="M8.5 20.5H7a5 5 0 0 1-.6-10 7 7 0 0 1 13.4-1.6A5.5 5.5 0 0 1 21 20.5h-1.5M14 13v10M10.5 16.5L14 13l3.5 3.5"/></svg></span>
      <b>Kéo tài liệu vào đây hoặc <em>chọn tệp</em></b>
      <small>PDF, DOCX, TXT, MD · tối đa 10 MB mỗi tệp</small>
    </button>
    <input ref={inputRef} className="u032-file" type="file" accept=".pdf,.docx,.txt,.md" multiple tabIndex={-1} aria-hidden="true"
      onChange={event=>{addFiles(event.target.files);event.target.value='';}}/>
    {rows.length>0&&<ul className="u032-list" aria-label="Tiến trình tải tài liệu" aria-live="polite">
      {rows.map(row => {
        const ext = (row.file.name.split('.').pop() || '').toLowerCase();
        const done = row.status==='done';
        const failed = row.status==='fail';
        const invalid = row.file.size===0 || row.file.size>MAX_BYTES || !ACCEPTED_EXTENSION.test(row.file.name);
        const details = failed ? row.error
          : done ? `${prettySize(row.file.size)} · Đã lập chỉ mục`
          : row.status==='indexing' ? `${prettySize(row.file.size)} · Đang lập chỉ mục...`
          : row.status==='queued' ? `${prettySize(row.file.size)} · Đang chờ`
          : `${Math.round(row.file.size * row.percent / 100 / 1024)} KB / ${prettySize(row.file.size)} · ${row.percent}%`;
        return <li key={row.id} className={'u032-row'+(done?' done':'')+(failed?' fail':'')} style={{'--p':row.percent/100}}>
          <span className="u032-ic" style={{'--c':EXT_COLOR[ext]||'#8E8A97'}} aria-hidden="true">{(ext.slice(0,3)||'FILE').toUpperCase()}</span>
          <span className="u032-meta"><b title={row.file.name}>{row.file.name}</b><small role={failed?'alert':undefined}>{details}</small></span>
          {failed ? (invalid
            ? <button className="u032-retry" type="button" onClick={()=>setRows(old=>old.filter(r=>r.id!==row.id))}>Bỏ qua</button>
            : <button className="u032-retry" type="button" onClick={()=>retry(row)} aria-label={`Thử lại ${row.file.name}`}>Thử lại</button>)
            : <span className="u032-st" aria-hidden="true">{done
              ? <svg viewBox="0 0 16 16"><path d="M3.5 8.4l3 3 6-6.4"/></svg>
              : row.status==='queued' ? null : <span className="u032-spin"/>}</span>}
          <span className="u032-bar" aria-hidden="true"/>
        </li>;
      })}
    </ul>}
  </div>;
}
