/**
 * Elmoorx v4 — Animation System
 * ===============================
 * نظام حركة متكامل:
 *   - Transition component (enter/leave)
 *   - TransitionGroup (للقوائم)
 *   - Keyframe animations
 *   - Easing functions
 *   - Spring physics
 *   - Stagger animations
 *   - No external deps (CSS-based + requestAnimationFrame)
 */

import { h, $state, $effect, onCleanup, onMount } from '../runtime/core.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// 1) EASING FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

export const easing = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  cubicIn: (t) => t * t * t,
  cubicOut: (t) => --t * t * t + 1,
  cubicInOut: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  bounce: (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  elastic: (t) => {
    if (t === 0 || t === 1) return t;
    const c4 = (2 * Math.PI) / 3;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  back: (t, s = 1.70158) => --t * t * ((s + 1) * t + s) + 1,
};

// ─────────────────────────────────────────────────────────────────────────────
// 2) ANIMATE FUNCTION — حرك قيمة من → إلى
// ─────────────────────────────────────────────────────────────────────────────

export function animate(options) {
  const {
    from = 0,
    to = 1,
    duration = 300,
    easing: easingFn = easing.easeOut,
    onUpdate,
    onComplete,
    delay = 0,
  } = options;

  let rafId;
  let startTime;
  let cancelled = false;

  const start = () => {
    startTime = performance.now();
    const tick = (now) => {
      if (cancelled) return;
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easingFn(progress);
      const value = from + (to - from) * eased;
      onUpdate?.(value, progress);
      if (progress < 1) rafId = requestAnimationFrame(tick);
      else onComplete?.();
    };
    rafId = requestAnimationFrame(tick);
  };

  if (delay > 0) setTimeout(start, delay);
  else start();

  return () => {
    cancelled = true;
    if (rafId) cancelAnimationFrame(rafId);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) SPRING — فيزياء زنبرك
// ─────────────────────────────────────────────────────────────────────────────

export function spring(options) {
  const {
    from = 0,
    to = 1,
    stiffness = 100,
    damping = 10,
    mass = 1,
    onUpdate,
    onComplete,
    precision = 0.01,
  } = options;

  let position = from;
  let velocity = 0;
  let rafId;
  let cancelled = false;
  let lastTime = performance.now();

  const tick = (now) => {
    if (cancelled) return;
    const dt = Math.min((now - lastTime) / 1000, 0.05); // cap at 50ms
    lastTime = now;

    // F = -k*x - c*v
    const force = -stiffness * (position - to) - damping * velocity;
    const acceleration = force / mass;
    velocity += acceleration * dt;
    position += velocity * dt;

    onUpdate?.(position);

    if (Math.abs(position - to) < precision && Math.abs(velocity) < precision) {
      onComplete?.();
      return;
    }
    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);

  return () => {
    cancelled = true;
    if (rafId) cancelAnimationFrame(rafId);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) TRANSITION COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const TRANSITION_STYLES = {
  fade: {
    enter: { opacity: 0 },
    enterActive: { opacity: 1, transition: 'opacity 300ms' },
    leave: { opacity: 1 },
    leaveActive: { opacity: 0, transition: 'opacity 300ms' },
  },
  slide: {
    enter: { transform: 'translateX(100%)', opacity: 0 },
    enterActive: { transform: 'translateX(0)', opacity: 1, transition: 'all 300ms' },
    leave: { transform: 'translateX(0)', opacity: 1 },
    leaveActive: { transform: 'translateX(-100%)', opacity: 0, transition: 'all 300ms' },
  },
  slideUp: {
    enter: { transform: 'translateY(20px)', opacity: 0 },
    enterActive: { transform: 'translateY(0)', opacity: 1, transition: 'all 300ms' },
    leave: { transform: 'translateY(0)', opacity: 1 },
    leaveActive: { transform: 'translateY(-20px)', opacity: 0, transition: 'all 300ms' },
  },
  scale: {
    enter: { transform: 'scale(0.8)', opacity: 0 },
    enterActive: { transform: 'scale(1)', opacity: 1, transition: 'all 300ms' },
    leave: { transform: 'scale(1)', opacity: 1 },
    leaveActive: { transform: 'scale(0.8)', opacity: 0, transition: 'all 300ms' },
  },
};

export function Transition(props) {
  const {
    show,
    children,
    type = 'fade',
    duration = 300,
    onEnter,
    onLeave,
    style = {},
    ...rest
  } = props;

  const phase = $state('leave'); // 'enter' | 'leave'
  const display = $state(false);

  $effect(() => {
    if (show()) {
      display.set(true);
      // ابدأ بـ enter ثم enterActive في الإطار التالي
      requestAnimationFrame(() => {
        phase.set('enter');
        requestAnimationFrame(() => phase.set('enterActive'));
        onEnter?.();
      });
    } else if (display()) {
      phase.set('leave');
      requestAnimationFrame(() => phase.set('leaveActive'));
      setTimeout(() => {
        display.set(false);
        onLeave?.();
      }, duration);
    }
  });

  if (!display()) return null;

  const styles = TRANSITION_STYLES[type] || TRANSITION_STYLES.fade;
  const currentStyle = styles[phase()] || {};

  // ادمج الأنماط
  const mergedStyle = { ...style };
  for (const [key, value] of Object.entries(currentStyle)) {
    mergedStyle[key] = value;
  }

  return h('div', { style: mergedStyle, ...rest }, children);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) TRANSITION GROUP — لقوائم متحركة
// ─────────────────────────────────────────────────────────────────────────────

export function TransitionGroup(props) {
  const {
    items = [],
    getKey = (item, i) => i,
    type = 'fade',
    duration = 300,
    stagger = 0, // تأخير بين كل عنصر
    renderItem,
    ...rest
  } = props;

  return h('div', { ...rest },
    items.map((item, i) => {
      const key = getKey(item, i);
      return h(Transition, {
        key,
        show: () => true,
        type,
        duration,
        style: stagger > 0 ? { animationDelay: `${i * stagger}ms` } : {},
      }, renderItem(item, i));
    })
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) KEYFRAME ANIMATIONS — عبر CSS injection
// ─────────────────────────────────────────────────────────────────────────────

const injectedKeyframes = new Set();

function injectKeyframe(name, definition) {
  if (injectedKeyframes.has(name)) return;
  if (typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = `@keyframes ${name} { ${Object.entries(definition).map(([k, v]) => `${k} { ${Object.entries(v).map(([prop, val]) => `${prop}: ${val};`).join(' ')} }`).join(' ')} }`;
  document.head.appendChild(style);
  injectedKeyframes.add(name);
}

export const keyframes = {
  spin: {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' },
  },
  pulse: {
    '0%, 100%': { opacity: '1' },
    '50%': { opacity: '0.5' },
  },
  shake: {
    '0%, 100%': { transform: 'translateX(0)' },
    '25%': { transform: 'translateX(-10px)' },
    '75%': { transform: 'translateX(10px)' },
  },
  bounce: {
    '0%, 100%': { transform: 'translateY(0)' },
    '50%': { transform: 'translateY(-20px)' },
  },
  flip: {
    '0%': { transform: 'perspective(400px) rotateY(0)' },
    '100%': { transform: 'perspective(400px) rotateY(180deg)' },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 7) ANIMATED COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function Animated(props) {
  const {
    animation, // اسم keyframe
    duration = '1s',
    iteration = '1',
    timingFunction = 'ease',
    delay = '0s',
    children,
    ...rest
  } = props;

  if (typeof keyframes[animation] === 'object') {
    injectKeyframe(animation, keyframes[animation]);
  }

  const style = {
    animation: `${animation} ${duration} ${timingFunction} ${delay} ${iteration}`,
    ...props.style,
  };

  return h('div', { style, ...rest }, children);
}

// ─────────────────────────────────────────────────────────────────────────────
// 8) USE ANIMATION HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useAnimation(options) {
  const value = $state(options.from || 0);
  let cancelFn;

  const play = () => {
    if (cancelFn) cancelFn();
    cancelFn = animate({
      ...options,
      onUpdate: (v) => value.set(v),
    });
  };

  const stop = () => {
    if (cancelFn) cancelFn();
  };

  onCleanup(() => {
    if (cancelFn) cancelFn();
  });

  return { value, play, stop };
}

// ─────────────────────────────────────────────────────────────────────────────
// 9) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  easing,
  animate,
  spring,
  Transition,
  TransitionGroup,
  Animated,
  keyframes,
  useAnimation,
};
