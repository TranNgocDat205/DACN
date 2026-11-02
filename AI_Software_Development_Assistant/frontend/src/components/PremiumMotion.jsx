import React, { useEffect, useRef, useState } from 'react';

/**
 * Progressive, dependency-free 3D motion. All transforms are presentation-only.
 * No WebGL, no network calls, no authentication or API side effects.
 */
export function MotionSurfaceController({ page }) {
  useEffect(() => {
    const host = document.querySelector('.dp-next');
    if (!host || !window.matchMedia('(hover: hover) and (pointer: fine)').matches ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    let target = null;
    const selector = '.dp-tilt';
    function reset(node) {
      if (!node) return;
      node.style.removeProperty('--dp-tilt-x');
      node.style.removeProperty('--dp-tilt-y');
      node.style.removeProperty('--dp-pointer-x');
      node.style.removeProperty('--dp-pointer-y');
    }
    function onMove(event) {
      const node = event.target instanceof Element ? event.target.closest(selector) : null;
      if (!node || !host.contains(node) || event.buttons !== 0) {
        if (target) reset(target);
        target = null;
        return;
      }
      if (target && target !== node) reset(target);
      target = node;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const bounds = node.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
        const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
        node.style.setProperty('--dp-tilt-x', `${((.5 - y) * 5).toFixed(2)}deg`);
        node.style.setProperty('--dp-tilt-y', `${((x - .5) * 7).toFixed(2)}deg`);
        node.style.setProperty('--dp-pointer-x', `${(x * 100).toFixed(1)}%`);
        node.style.setProperty('--dp-pointer-y', `${(y * 100).toFixed(1)}%`);
      });
    }
    function onLeave() { cancelAnimationFrame(frame); reset(target); target = null; }
    host.addEventListener('pointermove', onMove, { passive: true });
    host.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      reset(target);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
    };
  }, [page]);
  return null;
}

/** Animates actual API data; falls back to an immediate value if motion is reduced. */
export function AnimatedMetric({ value, duration = 900 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const target = Number(value) || 0;
    if (typeof window === 'undefined' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(target);
      return;
    }
    let frame = 0;
    let observer;
    let started = false;
    let cancelled = false;
    function animate() {
      if (started || cancelled) return;
      started = true;
      const start = performance.now();
      const initial = 0;
      function tick(now) {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        setShown(Math.round(initial + (target - initial) * eased));
        if (t < 1) frame = requestAnimationFrame(tick);
      }
      frame = requestAnimationFrame(tick);
    }
    if ('IntersectionObserver' in window && ref.current) {
      observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); animate(); }
      }, {threshold: 0.08});
      observer.observe(ref.current);
    } else animate();
    return () => { cancelled = true; cancelAnimationFrame(frame); observer?.disconnect(); };
  }, [value, duration]);
  return <span ref={ref} className="dp-count" aria-label={String(value)}>{String(shown).padStart(2, '0')}</span>;
}

/** CSS perspective + concentric rotating rings. Decorative, GPU-light, WebGL-free. */
export function HoloReactor({ progress = 0 }) {
  return <div className="dp-reactor-stage" aria-hidden="true">
    <div className="dp-reactor-fog"/>
    <div className="dp-reactor-assembly">
      <div className="dp-reactor-ring dp-reactor-ring-one"/>
      <div className="dp-reactor-ring dp-reactor-ring-two"/>
      <div className="dp-reactor-ring dp-reactor-ring-three"/>
      <div className="dp-reactor-sphere"><span className="dp-reactor-sphere-gloss"/></div>
      <span className="dp-reactor-crosshair one"/><span className="dp-reactor-crosshair two"/>
    </div>
    <span className="dp-reactor-caption">LIVE / {String(progress).padStart(2, '0')}%</span>
  </div>;
}

/** Uses real pending state, not a simulated model response. */
export function AiActivityOrb({ busy = false }) {
  return <span className={'dp-ai-activity-orb' + (busy ? ' is-busy' : '')} aria-hidden="true">
    <span/><span/><span/>
  </span>;
}
