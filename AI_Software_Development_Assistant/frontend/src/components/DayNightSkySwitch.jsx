// Lucian UX/UI Prompt #021 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#021
import React from "react";

export default function DayNightSkySwitch({theme, onChange}) {
 const night = theme === 'dark';
 const stars = [
  {left:30,top:20},
  {left:58,top:56,animationDelay:'-.6s',width:3,height:3},
  {left:86,top:26,animationDelay:'-1.2s'},
  {left:44,top:72,animationDelay:'-1.8s',width:3,height:3},
  {left:110,top:60,animationDelay:'-.9s',width:2,height:2},
  {left:20,top:46,animationDelay:'-1.5s',width:2,height:2}
 ];
 return <div className="u021-mount">
  <div className={'ux u021' + (night ? ' is-night' : '')}>
   <button className="u021-sw" type="button" role="switch"
    aria-checked={night} aria-label="Chế độ tối"
    title={night ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
    onClick={()=>onChange(night ? 'light' : 'dark')}>
    <span className="u021-halo" aria-hidden="true"><i/><i/><i/></span>
    <span className="u021-stars" aria-hidden="true">
     {stars.map((style,idx)=><i key={idx} style={style}/>)}
    </span>
    <span className="u021-clouds" aria-hidden="true"><i/><i/></span>
    <span className="u021-knob" aria-hidden="true"><span className="u021-moon"><i/><i/><i/></span></span>
   </button>
   <p className="u021-lab" aria-hidden="true">
    <span>Chế độ sáng<small>DevPilot</small></span>
    <span>Chế độ tối<small>DevPilot</small></span>
   </p>
  </div>
 </div>;
}

