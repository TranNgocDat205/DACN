import React, {useState} from 'react';
import {
  ArrowRight, ShieldCheck, Eye, EyeOff, Check, X, Mail, LockKeyhole,
  Sparkles, KeyRound, Fingerprint, Layers3, GitBranch, ScanSearch,
  LoaderCircle, BadgeCheck
} from 'lucide-react';
import './AuthExperience.css';

const emptyForm={name:'',email:'',password:'',confirm:''};
const passwordRules=[
  ['length','10–72 byte UTF-8'], ['upper','Có chữ hoa A–Z'],
  ['lower','Có chữ thường a–z'], ['digit','Có chữ số 0–9'],
  ['special','Có ký tự đặc biệt'], ['space','Không có khoảng trắng']
];
function evaluatePassword(value){
  return {
    length:value.length>=10 && new TextEncoder().encode(value).length<=72,
    upper:/[A-Z]/.test(value), lower:/[a-z]/.test(value), digit:/\d/.test(value),
    special:/[^A-Za-z0-9\s]/.test(value), space:!(/\s/.test(value)) && !!value
  };
}

export default function AuthExperience({onAuth, api, initialMode='login'}){
  const [mode,setMode]=useState(initialMode==='register'?'register':'login');
  const [form,setForm]=useState(emptyForm);
  const [showPassword,setShowPassword]=useState(false);
  const [showConfirm,setShowConfirm]=useState(false);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const strength=evaluatePassword(form.password);
  const score=passwordRules.filter(([key])=>strength[key]).length;
  const canRegister=passwordRules.every(([key])=>strength[key]) && form.password===form.confirm;

  const update=(key,value)=>{setForm(f=>({...f,[key]:value}));if(error)setError('');};
  const switchMode=(next)=>{setMode(next);setError('');};

  async function submit(e){
    e.preventDefault();setError('');
    if(mode==='register' && !canRegister){setError('Vui lòng đáp ứng đầy đủ quy tắc mật khẩu và nhập lại mật khẩu khớp nhau.');return;}
    setBusy(true);
    try {
      if(mode==='login'){
        const session=await api('/auth/login',{method:'POST',body:JSON.stringify({email:form.email,password:form.password})});
        onAuth(session);
      } else if(mode==='register'){
        const session=await api('/auth/register',{method:'POST',body:JSON.stringify({name:form.name,email:form.email,password:form.password})});
        onAuth(session);
      }
    } catch(ex){setError(ex.message||'Không thể xử lý yêu cầu. Vui lòng thử lại.');}
    finally {setBusy(false);}
  }
  return <div className="dp-auth-experience">
    <div className="dp-auth-stage" aria-hidden="true">
      <div className="dp-auth-grid"/><div className="dp-auth-glow"/>
      <div className="dp-auth-orbit orbit-a"/><div className="dp-auth-orbit orbit-b"/>
      <div className="dp-auth-satellite sat-a"/><div className="dp-auth-satellite sat-b"/>
    </div>
    <aside className="dp-auth-story">
      <div className="dp-auth-story-top">
        <div className="dp-auth-logo"><span className="dp-auth-logomark"><Layers3 size={21}/></span><strong>DevPilot<span>AI</span></strong></div>
        <div className="dp-auth-edition"><span className="dp-auth-green-dot"/> ENGINEERING STUDIO / 2026</div>
      </div>
      <div className="dp-auth-story-center">
        <div className="dp-auth-eyebrow"><span className="dp-auth-eyebrow-line"/> BUILD WITH CLARITY</div>
        <h1>Ý tưởng lớn.<br/><span>Triển khai</span><br/><em>thông minh.</em></h1>
        <p>Từ yêu cầu đầu tiên đến bản phát hành cuối cùng. Một không gian duy nhất để đội ngũ kiến tạo, cộng tác và đưa AI vào quy trình.</p>
        <div className="dp-auth-orbit-art dp-premium-kinetic" aria-hidden="true">
          <div className="dp-auth-orbit-ring ring-1"/><div className="dp-auth-orbit-ring ring-2"/>
          <div className="dp-auth-core"><Layers3 size={25}/><span>DEVPILOT</span><strong>AI</strong></div>
          <div className="dp-auth-chip chip-1"><ScanSearch size={17}/><span>REQUIREMENTS</span><i/></div>
          <div className="dp-auth-chip chip-2"><GitBranch size={17}/><span>CHANGE IMPACT</span><i/></div>
          <div className="dp-auth-chip chip-3"><Sparkles size={17}/><span>KNOWLEDGE</span><i/></div>
        </div>
      </div>
      <div className="dp-auth-story-bottom"><span>01 / REQUIREMENTS</span><span>02 / INTELLIGENCE</span><span>03 / DELIVERY</span></div>
    </aside>
    <main className="dp-auth-form-area">
      <div className="dp-auth-form-upper"><div className="dp-auth-mobile-brand"><span className="dp-auth-logomark"><Layers3 size={19}/></span> DevPilot AI</div><div className="dp-auth-secure"><ShieldCheck size={15}/> SECURE ACCESS</div></div>
      <section className="dp-auth-panel" key={mode} aria-labelledby="dp-auth-heading">
        <div className="dp-auth-stepmark">{mode==='register'?'NEW WORKSPACE / CREATE ACCOUNT':'YOUR WORKSPACE / SIGN IN'}</div>
        <div className="dp-auth-heading-row"><div className="dp-auth-heading-icon">{mode==='register'?<Fingerprint size={24}/>:<KeyRound size={24}/>}</div><span className="dp-auth-panel-index">/{mode==='register'?'01':'00'}</span></div>
        <h2 id="dp-auth-heading">{mode==='login'?'Chào mừng trở lại.':'Bắt đầu từ đây.'}</h2>
        <p className="dp-auth-description">{mode==='login'?'Đăng nhập để tiếp tục công việc, nơi mọi ý tưởng đều có lộ trình rõ ràng.':'Tạo tài khoản DevPilot và bắt đầu sử dụng ngay.'}</p>
        <div className="dp-auth-mode-switch" role="group" aria-label="Chọn hình thức truy cập">
          <button type="button" aria-pressed={mode==='login'} className={mode==='login'?'selected':''} onClick={()=>switchMode('login')}>Đăng nhập</button>
          <button type="button" aria-pressed={mode==='register'} className={mode==='register'?'selected':''} onClick={()=>switchMode('register')}>Đăng ký</button>
        </div>
        <form className="dp-auth-fields" onSubmit={submit} noValidate={false}>
          {mode==='register'&&<label className="dp-auth-field"><span>HỌ VÀ TÊN</span><div className="dp-auth-input-wrap"><Fingerprint size={18}/><input required minLength={2} maxLength={120} autoComplete="name" placeholder="Nguyễn Văn A" value={form.name} onChange={e=>update('name',e.target.value)}/></div></label>}
          <>
            <label className="dp-auth-field"><span>EMAIL CỦA BẠN</span><div className="dp-auth-input-wrap"><Mail size={18}/><input required type="email" maxLength={200} autoComplete="email" placeholder="you@example.com" value={form.email} onChange={e=>update('email',e.target.value)}/></div></label>
            <label className="dp-auth-field"><span>MẬT KHẨU</span><div className="dp-auth-input-wrap"><LockKeyhole size={18}/><input required type={showPassword?'text':'password'} autoComplete={mode==='register'?'new-password':'current-password'} minLength={mode==='register'?10:1} maxLength={72} value={form.password} placeholder="Nhập mật khẩu" onChange={e=>update('password',e.target.value)}/><button type="button" className="dp-auth-eye" aria-label={showPassword?'Ẩn mật khẩu':'Hiện mật khẩu'} onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
          </>
          {mode==='register'&&<>
            <div className="dp-auth-password-guide" aria-live="polite">
              <div className="dp-auth-strength-top"><span>ĐỘ MẠNH MẬT KHẨU</span><strong>{score<=2?'Yếu':score<=4?'Trung bình':score===5?'Khá':'Đạt yêu cầu'}</strong></div>
              <div className="dp-auth-strength-track" role="progressbar" aria-label="Độ mạnh mật khẩu" aria-valuemin={0} aria-valuemax={6} aria-valuenow={score}><div style={{width:`${score/6*100}%`}} className={score===6?'strong':score>=4?'medium':'weak'}/></div>
              <div className="dp-auth-rules">{passwordRules.map(([key,label])=><span key={key} className={strength[key]?'valid':''}>{strength[key]?<Check size={13}/>:<span className="dp-auth-rule-dot"/>}{label}</span>)}</div>
            </div>
            <label className="dp-auth-field"><span>XÁC NHẬN MẬT KHẨU</span><div className="dp-auth-input-wrap"><LockKeyhole size={18}/><input required type={showConfirm?'text':'password'} autoComplete="new-password" minLength={10} value={form.confirm} placeholder="Nhập lại mật khẩu" onChange={e=>update('confirm',e.target.value)}/><button type="button" className="dp-auth-eye" aria-label={showConfirm?'Ẩn xác nhận':'Hiện xác nhận'} onClick={()=>setShowConfirm(v=>!v)}>{showConfirm?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>{form.confirm&&<small className={form.password===form.confirm?'dp-auth-ok':'dp-auth-invalid'}>{form.password===form.confirm?'Mật khẩu trùng khớp':'Mật khẩu chưa trùng khớp'}</small>}</label>
          </>}
          {error&&<div className="dp-auth-error" role="alert"><X size={16}/>{error}</div>}
          <button type="submit" className="dp-auth-submit" disabled={busy}>
            {busy?<><LoaderCircle className="dp-auth-spinning" size={19}/> Đang xử lý...</>:<>{mode==='login'?'Đăng nhập vào Workspace':'Tạo tài khoản'}<ArrowRight size={19}/></>}
          </button>
        </form>
        <div className="dp-auth-lower"><span>{mode==='login'?'Chưa có tài khoản?':'Đã có tài khoản?'} <button type="button" onClick={()=>switchMode(mode==='login'?'register':'login')}>{mode==='login'?'Đăng ký ngay':'Đăng nhập'} <ArrowRight size={14}/></button></span></div>
      </section>
      <div className="dp-auth-form-footer"><span><BadgeCheck size={15}/> Bảo vệ tài khoản bằng mật khẩu</span><span>© DevPilot Studio</span></div>
    </main>
  </div>;
}
