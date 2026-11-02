// Lucian UX/UI Prompt #005 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#005
import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './PaperPlaneComposer.css';

/**
 * Paper-plane composer for the REAL DevPilot chat.
 * - Starts flight in the actual submit handler (click OR Enter), not in a later parent-state effect.
 * - Uses a document.body portal with a viewport-fixed SVG: no ancestor overflow/transform can crop it.
 * - Parent owns the input, JWT, API request, messages and all RAG settings.
 * - Shows a green success state only when onSubmit resolves truthy.
 */
export default function PaperPlaneComposer({
  value, onChange, onSubmit, disabled = false,
  includeOfficial, onIncludeOfficialChange,
}) {
  const [phase, setPhase] = useState('idle');
  const [invalid, setInvalid] = useState(false);
  const [flight, setFlight] = useState(null);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const buttonRef = useRef(null);
  const pathRef = useRef(null);
  const revealRef = useRef(null);
  const planeRef = useRef(null);
  const frameRef = useRef(null);
  const timersRef = useRef([]);
  const sequenceRef = useRef(0);
  const pendingRef = useRef(false);
  const flightEndedRef = useRef(true);
  const responseRef = useRef(null);
  const mountedRef = useRef(true);
  const maskId = useId().replace(/:/g, '_');

  const reducedMotion = () => typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };
  const stopFrame = () => {
    if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  };
  const later = (callback, delay) => {
    timersRef.current.push(setTimeout(callback, delay));
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      sequenceRef.current += 1;
      clearTimers();
      stopFrame();
    };
  }, []);

  function buildRoute() {
    const button = buttonRef.current;
    if (!button) return null;
    const b = button.getBoundingClientRect();
    const panel = rootRef.current?.closest('.chat-panel');
    const p = panel?.getBoundingClientRect();
    const width = window.innerWidth;
    const height = window.innerHeight;
    const sx = b.left + b.width / 2;
    const sy = b.top + b.height / 2;
    // The destination is inside the chat message area and adapts to mobile.
    const tx = p ? Math.max(36, Math.min(width - 36, p.left + p.width * .53)) : width * .55;
    const ty = p ? Math.max(65, Math.min(height - 120, p.top + Math.min(p.height * .30, 205))) : Math.max(65, sy - 215);
    const loopX = Math.max(34, Math.min(width - 42, sx - Math.min(width * .26, 180)));
    const loopY = Math.max(56, sy - Math.min(height * .31, 225));
    const path = [
      `M ${sx} ${sy}`,
      `C ${sx - 33} ${sy - 60} ${loopX - 18} ${sy - 50} ${loopX} ${loopY + 64}`,
      `C ${loopX + 22} ${loopY - 28} ${loopX + 117} ${loopY - 38} ${loopX + 111} ${loopY + 21}`,
      `C ${loopX + 105} ${loopY + 83} ${loopX - 34} ${loopY + 80} ${loopX + 13} ${loopY - 7}`,
      `C ${loopX + 47} ${loopY - 86} ${tx + 54} ${ty + 66} ${tx} ${ty}`,
    ].join(' ');
    return { width, height, path, id: sequenceRef.current };
  }

  // Only transition after BOTH the visible flight and the actual HTTP request finish.
  function maybeComplete(id) {
    if (id !== sequenceRef.current || !mountedRef.current) return;
    if (!flightEndedRef.current || responseRef.current === null) return;
    const success = responseRef.current;
    pendingRef.current = false;
    setFlight(null);
    setPhase(success ? 'done' : 'error');
    later(() => {
      if (id === sequenceRef.current && mountedRef.current) setPhase('back');
    }, 1050);
    later(() => {
      if (id === sequenceRef.current && mountedRef.current) setPhase('idle');
    }, 1700);
  }

  // SVG flight is rendered in a portal directly under document.body.
  useLayoutEffect(() => {
    if (!flight || phase !== 'fly') return;
    const route = pathRef.current;
    const reveal = revealRef.current;
    const plane = planeRef.current;
    const id = flight.id;
    if (!route || !reveal || !plane) return;
    const total = route.getTotalLength();
    if (!total || !Number.isFinite(total)) {
      flightEndedRef.current = true;
      setPhase('wait');
      maybeComplete(id);
      return;
    }
    reveal.style.strokeDasharray = `${total} ${total}`;
    reveal.style.strokeDashoffset = String(total);
    const duration = 1500;
    const start = performance.now();
    const tick = now => {
      if (id !== sequenceRef.current || !mountedRef.current) return;
      const fraction = Math.max(0, Math.min(1, (now - start) / duration));
      // Same flight duration and easing family as original Lucian #005.
      const eased = fraction < .5
        ? 4 * fraction * fraction * fraction
        : 1 - Math.pow(-2 * fraction + 2, 3) / 2;
      const distance = total * eased;
      const point = route.getPointAtLength(distance);
      const earlier = route.getPointAtLength(Math.max(0, distance - 2));
      const laterPoint = route.getPointAtLength(Math.min(total, distance + 2));
      const angle = Math.atan2(laterPoint.y - earlier.y, laterPoint.x - earlier.x) * 180 / Math.PI;
      const scale = fraction < .35 ? .75 + .5 * (fraction / .35) : 1.25 - .55 * ((fraction - .35) / .65);
      plane.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${angle}) scale(${scale}) translate(-14 -12)`);
      reveal.style.strokeDashoffset = String(total * (1 - eased));
      if (fraction < 1) frameRef.current = requestAnimationFrame(tick);
      else {
        frameRef.current = null;
        flightEndedRef.current = true;
        setPhase('wait');
        maybeComplete(id);
      }
    };
    frameRef.current = requestAnimationFrame(tick);
    return stopFrame;
  }, [flight, phase]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (pendingRef.current || disabled) return;
    if (!value?.trim()) {
      setInvalid(false);
      requestAnimationFrame(() => { if (mountedRef.current) setInvalid(true); });
      inputRef.current?.focus();
      return;
    }
    clearTimers();
    stopFrame();
    setInvalid(false);
    const id = ++sequenceRef.current;
    pendingRef.current = true;
    responseRef.current = null;
    const reduce = reducedMotion();
    const route = reduce ? null : buildRoute();
    flightEndedRef.current = !route;
    setFlight(route);
    setPhase(route ? 'fly' : 'wait');

    try {
      // onSubmit is the existing real API call. Returns true only if it succeeds.
      const ok = await onSubmit(event);
      if (id !== sequenceRef.current || !mountedRef.current) return;
      responseRef.current = ok === true;
    } catch (_error) {
      if (id !== sequenceRef.current || !mountedRef.current) return;
      responseRef.current = false;
    }
    maybeComplete(id);
  }

  const flying = phase === 'fly';
  const running = flying || phase === 'wait';
  const success = phase === 'done';
  const failure = phase === 'error';
  return <>
    <form ref={rootRef} className="chat-input u005" data-phase={phase}
      onSubmit={handleSubmit} aria-label="Nhập câu hỏi cho trợ lý DevPilot">
      <label className="official-checkbox u005-option">
        <input type="checkbox" checked={includeOfficial} onChange={e => onIncludeOfficialChange(e.target.checked)} />
        Tra cứu trực tuyến từ tên miền chính thống (cần Tavily key để mở rộng ngoài danh mục)
      </label>
      <div className={`u005-cp${invalid ? ' u005-shake' : ''}`} onAnimationEnd={() => setInvalid(false)}>
        <input ref={inputRef} className="u005-in" type="text" aria-label="Nhập câu hỏi cho trợ lý AI"
          value={value} onChange={e => onChange(e.target.value)} maxLength={3000}
          placeholder="Hỏi về yêu cầu, bảo mật, API, quy trình Sprint..." />
        <button ref={buttonRef} className="u005-btn" type="submit" disabled={disabled || pendingRef.current || !value?.trim()}
          aria-label={running ? 'Đang gửi câu hỏi' : success ? 'AI đã phản hồi' : failure ? 'Gửi không thành công' : 'Gửi câu hỏi'}
          aria-busy={running}>
          <svg className="u005-rg" viewBox="0 0 50 50" aria-hidden="true"><circle cx="25" cy="25" r="23" /></svg>
          <svg className="u005-pl" viewBox="0 0 28 24" aria-hidden="true">
            <path d="M1 3 27 12 10 13Z" fill="#fff" />
            <path d="M10 13 27 12 6 22Z" fill="#D8E0FF" />
            <path d="M10 13 27 12 12.5 17Z" fill="#A3B4FF" />
          </svg>
          <svg className="u005-ck" viewBox="0 0 20 20" aria-hidden="true">
            <path d={failure ? 'M5 5 15 15 M15 5 5 15' : 'M4 10.5 8.3 14.5 16 6'} />
          </svg>
        </button>
      </div>
      <span className="u005-feedback" role="status" aria-live="polite">
        {running ? 'Máy bay đang gửi câu hỏi...' : success ? 'AI đã phản hồi' : failure ? 'AI chưa xử lý được câu hỏi' : ''}
      </span>
    </form>
    {typeof document !== 'undefined' && flight && flying && createPortal(
      <div className="u005 u005-flight-layer" aria-hidden="true">
        <svg className="u005-flight-svg" viewBox={`0 0 ${flight.width} ${flight.height}`}
          width="100%" height="100%" preserveAspectRatio="none">
          <defs><mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={flight.width} height={flight.height}>
            <path ref={revealRef} d={flight.path} fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round" />
          </mask></defs>
          <path ref={pathRef} d={flight.path} className="u005-flight-route" mask={`url(#${maskId})`} />
          <g ref={planeRef} className="u005-flight-plane">
            <path d="M1 3 27 12 10 13Z" fill="#fff" />
            <path d="M10 13 27 12 6 22Z" fill="#D8E0FF" />
            <path d="M10 13 27 12 12.5 17Z" fill="#A3B4FF" />
            <path d="M1 3 27 12 10 13Z" fill="none" stroke="#7B61FF" strokeWidth=".8" strokeLinejoin="round" />
          </g>
        </svg>
      </div>, document.body
    )}
  </>;
}
