import React, {useEffect, useRef, useState} from 'react';
import {
  ArrowRight, ArrowLeft, ShieldCheck, Eye, EyeOff, Check, X, Mail, LockKeyhole,
  Sparkles, KeyRound, Fingerprint, Layers3, GitBranch, ScanSearch, RefreshCw,
  CircleCheck, LoaderCircle, BadgeCheck
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
function niceEmail(email){
  const [user,domain]=email.split('@');
  return user && domain ? `${user.slice(0,2)}${'•'.repeat(Math.min(5,Math.max(user.length-2,2)))}@${domain}` : email;
}

export default function AuthExperience({onAuth, api, initialMode='login'}){
  const [mode,setMode]=useState(initialMode==='register'?'register':'login');
  const [form,setForm]=useState(emptyForm);
  const [showPassword,setShowPassword]=useState(false);
  const [showConfirm,setShowConfirm]=useState(false);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [otp,setOtp]=useState('');
  const [verifyEmail,setVerifyEmail]=useState('');
  const [cooldown,setCooldown]=useState(0);
  const [notice,setNotice]=useState('');
  const fields=useRef([]);
  const strength=evaluatePassword(form.password);
  const score=passwordRules.filter(([key])=>strength[key]).length;
  const canRegister=passwordRules.every(([key])=>strength[key]) && form.password===form.confirm;

  useEffect(()=>{
    if(mode!=='verify' || cooldown<=0) return;
    const timer=setTimeout(()=>setCooldown(v=>Math.max(0,v-1)),1000);
    return ()=>clearTimeout(timer);
  },[mode,cooldown]);
  useEffect(()=>{ if(mode==='verify') fields.current[0]?.focus(); },[mode]);

  const update=(key,value)=>{setForm(f=>({...f,[key]:value}));if(error)setError('');};
  const switchMode=(next)=>{setMode(next);setError('');setNotice('');setOtp('');};

  async function submit(e){
    e.preventDefault();setError('');setNotice('');
    if(mode==='register' && !canRegister){setError('Vui lòng đáp ứng đầy đủ quy tắc mật khẩu và nhập lại mật khẩu khớp nhau.');return;}
    setBusy(true);
    try {
      if(mode==='login'){
        const session=await api('/auth/login',{method:'POST',body:JSON.stringify({email:form.email,password:form.password})});
        onAuth(session);
      } else if(mode==='register'){
        const response=await api('/auth/register',{method:'POST',body:JSON.stringify({name:form.name,email:form.email,password:form.password})});
        setVerifyEmail(response.email||form.email.trim().toLowerCase());
        setForm(v=>({...v,password:'',confirm:''}));
        setCooldown(response.resendAfterSeconds||60);
        setMode('verify');
        setNotice('Mã xác minh đã được gửi. Kiểm tra Hộp thư đến hoặc Spam.');
      } else if(mode==='verify'){
        if(otp.length!==6){setError('Vui lòng nhập đủ 6 chữ số OTP.');return;}
        const session=await api('/auth/verify-email',{method:'POST',body:JSON.stringify({email:verifyEmail,otp})});
        onAuth(session);
      }
    } catch(ex){setError(ex.message||'Không thể xử lý yêu cầu. Vui lòng thử lại.');}
    finally {setBusy(false);}
  }
  async function resend(){
    if(cooldown>0||busy)return;
    setError('');setNotice('');setBusy(true);
    try{
      await api('/auth/resend-otp',{method:'POST',body:JSON.stringify({email:verifyEmail})});
      setOtp('');setCooldown(60);setNotice('Đã yêu cầu mã mới. Hãy kiểm tra email của bạn.');
      fields.current[0]?.focus();
    }catch(ex){setError(ex.message||'Gửi lại OTP thất bại.');}finally{setBusy(false);}
  }
  function changeDigit(index,value){
    const digits=value.replace(/\D/g,'');
    if(digits.length>1){pasteOtp(digits);return;}
    const characters=otp.padEnd(6,' ').split('');characters[index]=digits||' ';
    setOtp(characters.join('').trimEnd().replace(/ /g,''));
    if(digits && index<5)fields.current[index+1]?.focus();
  }
  function pasteOtp(text){
    const digits=text.replace(/\D/g,'').slice(0,6);setOtp(digits);
    fields.current[Math.min(digits.length,5)]?.focus();
  }
  function keyDigit(event,index){
    if(event.key==='Backspace'){
      event.preventDefault();
      const items=otp.padEnd(6,' ').split('');
      if(items[index]?.trim()){items[index]=' ';setOtp(items.join('').trimEnd().replace(/ /g,''));}
      else if(index>0){items[index-1]=' ';setOtp(items.join('').trimEnd().replace(/ /g,''));fields.current[index-1]?.focus();}
    }
    if(event.key==='ArrowLeft' && index>0)fields.current[index-1]?.focus();
    if(event.key==='ArrowRight' && index<5)fields.current[index+1]?.focus();
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
        <div className="dp-auth-orbit-art" aria-hidden="true">
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
        <div className="dp-auth-stepmark">{mode==='verify'?'STEP 02 / EMAIL VERIFICATION':mode==='register'?'NEW WORKSPACE / CREATE ACCOUNT':'YOUR WORKSPACE / SIGN IN'}</div>
        <div className="dp-auth-heading-row"><div className="dp-auth-heading-icon">{mode==='verify'?<Mail size={24}/>:mode==='register'?<Fingerprint size={24}/>:<KeyRound size={24}/>}</div><span className="dp-auth-panel-index">/{mode==='verify'?'02':mode==='register'?'01':'00'}</span></div>
        <h2 id="dp-auth-heading">{mode==='login'?'Chào mừng trở lại.':mode==='register'?'Bắt đầu từ đây.':'Xác minh email.'}</h2>
        <p className="dp-auth-description">{mode==='login'?'Đăng nhập để tiếp tục công việc, nơi mọi ý tưởng đều có lộ trình rõ ràng.':mode==='register'?'Tạo tài khoản DevPilot và kết nối với quy trình phát triển thông minh hơn.':<>Chúng mình đã gửi mã 6 chữ số đến <strong>{niceEmail(verifyEmail)}</strong>. Mã có hiệu lực trong 10 phút.</>}</p>
        {mode!=='verify' && <div className="dp-auth-mode-switch" role="group" aria-label="Chọn hình thức truy cập">
          <button type="button" aria-pressed={mode==='login'} className={mode==='login'?'selected':''} onClick={()=>switchMode('login')}>Đăng nhập</button>
          <button type="button" aria-pressed={mode==='register'} className={mode==='register'?'selected':''} onClick={()=>switchMode('register')}>Đăng ký</button>
        </div>}
        <form className="dp-auth-fields" onSubmit={submit} noValidate={false}>
          {mode==='register'&&<label className="dp-auth-field"><span>HỌ VÀ TÊN</span><div className="dp-auth-input-wrap"><Fingerprint size={18}/><input required minLength={2} maxLength={120} autoComplete="name" placeholder="Nguyễn Văn A" value={form.name} onChange={e=>update('name',e.target.value)}/></div></label>}
          {mode!=='verify'&&<>
            <label className="dp-auth-field"><span>EMAIL CỦA BẠN</span><div className="dp-auth-input-wrap"><Mail size={18}/><input required type="email" maxLength={200} autoComplete="email" placeholder="you@example.com" value={form.email} onChange={e=>update('email',e.target.value)}/></div></label>
            <label className="dp-auth-field"><span>MẬT KHẨU</span><div className="dp-auth-input-wrap"><LockKeyhole size={18}/><input required type={showPassword?'text':'password'} autoComplete={mode==='register'?'new-password':'current-password'} minLength={mode==='register'?10:1} maxLength={72} value={form.password} placeholder="Nhập mật khẩu" onChange={e=>update('password',e.target.value)}/><button type="button" className="dp-auth-eye" aria-label={showPassword?'Ẩn mật khẩu':'Hiện mật khẩu'} onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
          </>}
          {mode==='register'&&<>
            <div className="dp-auth-password-guide" aria-live="polite">
              <div className="dp-auth-strength-top"><span>ĐỘ MẠNH MẬT KHẨU</span><strong>{score<=2?'Yếu':score<=4?'Trung bình':score===5?'Khá':'Đạt yêu cầu'}</strong></div>
              <div className="dp-auth-strength-track" role="progressbar" aria-label="Độ mạnh mật khẩu" aria-valuemin={0} aria-valuemax={6} aria-valuenow={score}><div style={{width:`${score/6*100}%`}} className={score===6?'strong':score>=4?'medium':'weak'}/></div>
              <div className="dp-auth-rules">{passwordRules.map(([key,label])=><span key={key} className={strength[key]?'valid':''}>{strength[key]?<Check size={13}/>:<span className="dp-auth-rule-dot"/>}{label}</span>)}</div>
            </div>
            <label className="dp-auth-field"><span>XÁC NHẬN MẬT KHẨU</span><div className="dp-auth-input-wrap"><LockKeyhole size={18}/><input required type={showConfirm?'text':'password'} autoComplete="new-password" minLength={10} value={form.confirm} placeholder="Nhập lại mật khẩu" onChange={e=>update('confirm',e.target.value)}/><button type="button" className="dp-auth-eye" aria-label={showConfirm?'Ẩn xác nhận':'Hiện xác nhận'} onClick={()=>setShowConfirm(v=>!v)}>{showConfirm?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>{form.confirm&&<small className={form.password===form.confirm?'dp-auth-ok':'dp-auth-invalid'}>{form.password===form.confirm?'Mật khẩu trùng khớp':'Mật khẩu chưa trùng khớp'}</small>}</label>
          </>}
          {mode==='verify'&&<>
            <div className="dp-auth-otp-intro"><span>MÃ XÁC MINH 6 CHỮ SỐ</span><span>OTP / 06</span></div>
            <div className="dp-auth-otp-fields" role="group" aria-label="Nhập mã OTP 6 số">
              {Array.from({length:6},(_,i)=><input key={i} ref={el=>{fields.current[i]=el}} aria-label={`Chữ số OTP ${i+1}`} inputMode="numeric" type="text" maxLength={i===0?6:1} autoComplete={i===0?'one-time-code':'off'} value={otp[i]||''} onChange={e=>changeDigit(i,e.target.value)} onKeyDown={e=>keyDigit(e,i)} onPaste={e=>{e.preventDefault();pasteOtp(e.clipboardData.getData('text'))}}/>) }
            </div>
            <div className="dp-auth-resend"><span>Không nhận được email?</span><button type="button" disabled={busy||cooldown>0} onClick={resend}><RefreshCw size={14}/> {cooldown>0?`Gửi lại sau ${cooldown}s`:'Gửi mã mới'}</button></div>
            <div className="dp-auth-help"><ShieldCheck size={16}/> Mã OTP được sử dụng một lần. Không chia sẻ mã với người khác.</div>
          </>}
          {notice&&<div className="dp-auth-notice" role="status"><CircleCheck size={17}/>{notice}</div>}
          {error&&<div className="dp-auth-error" role="alert"><X size={16}/>{error}</div>}
          <button type="submit" className="dp-auth-submit" disabled={busy || (mode==='verify'&&otp.length!==6)}>
            {busy?<><LoaderCircle className="dp-auth-spinning" size={19}/> Đang xử lý...</>:<>{mode==='login'?'Đăng nhập vào Workspace':mode==='register'?'Gửi mã xác minh':'Xác nhận và tạo tài khoản'}<ArrowRight size={19}/></>}
          </button>
        </form>
        <div className="dp-auth-lower">{mode==='verify'?<button type="button" onClick={()=>switchMode('register')}><ArrowLeft size={16}/> Đổi thông tin đăng ký</button>:<span>{mode==='login'?'Chưa có tài khoản?':'Đã có tài khoản?'} <button type="button" onClick={()=>switchMode(mode==='login'?'register':'login')}>{mode==='login'?'Đăng ký ngay':'Đăng nhập'} <ArrowRight size={14}/></button></span>}</div>
      </section>
      <div className="dp-auth-form-footer"><span><BadgeCheck size={15}/> Xác thực email bảo mật</span><span>© DevPilot Studio</span></div>
    </main>
  </div>;
}
