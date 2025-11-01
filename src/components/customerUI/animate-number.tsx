import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  value: number;
  duration?: number; // seconds
  format?: (n: number) => string; // custom formatter
  className?: string;
};

export function AnimatedNumber({ value = 0, duration = 0.5, format, className }: Props) {
  const normalizeZero = (n: number) => (n === 0 ? 0 : n);
  // Internal displayed value that animates towards target
  const [displayValue, setDisplayValue] = useState<number>(() => normalizeZero(Math.round(value)));

  // Physics-based spring integrator state
  const positionRef = useRef<number>(normalizeZero(Math.round(value)));
  const velocityRef = useRef<number>(0);
  const targetRef = useRef<number>(normalizeZero(Math.round(value)));
  const rafIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const lastRenderedRoundedRef = useRef<number>(normalizeZero(Math.round(value)));

  // Respect user reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const formatted = useMemo(() => {
    const rounded = Math.round(displayValue);
    const safe = normalizeZero(rounded);
    return format ? format(safe) : safe.toLocaleString();
  }, [displayValue, format]);

  // Update target on prop change
  useEffect(() => {
    const nextTarget = normalizeZero(Math.round(value));

    if (prefersReducedMotion || duration <= 0) {
      targetRef.current = nextTarget;
      positionRef.current = nextTarget;
      velocityRef.current = 0;
      lastRenderedRoundedRef.current = nextTarget;
      setDisplayValue(nextTarget);
      // Stop any running loop
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }

    targetRef.current = nextTarget;

    // Kick the loop if it isn't running
    if (rafIdRef.current === null) {
      lastTimeRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
      rafIdRef.current = requestAnimationFrame(step);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration, prefersReducedMotion]);

  // rAF step function kept stable via ref binding
  const step = (now: number) => {
    const previousTime = lastTimeRef.current || now;
    let dt = (now - previousTime) / 1000; // seconds
    lastTimeRef.current = now;

    // Avoid large time steps (e.g., tab inactive)
    if (dt > 0.05) dt = 0.05;

    // Map duration to spring constants. Shorter duration => snappier spring
    // k roughly inverse to duration, damping set near critical
    const clampedDuration = Math.max(0.12, Math.min(2.5, duration));
    const stiffness = 30 / clampedDuration; // arbitrary mapping tuned for UI
    const critical = 2 * Math.sqrt(stiffness);
    const damping = 0.9 * critical;

    const target = targetRef.current;
    const position = positionRef.current;
    const velocity = velocityRef.current;

    const displacement = position - target;
    const acceleration = -stiffness * displacement - damping * velocity;
    const nextVelocity = velocity + acceleration * dt;
    const nextPosition = position + nextVelocity * dt;

    positionRef.current = nextPosition;
    velocityRef.current = nextVelocity;

    // Determine if we can stop: near target and almost no motion
    const rounded = normalizeZero(Math.round(nextPosition));
    const done = Math.abs(nextPosition - target) < 0.001 && Math.abs(nextVelocity) < 0.001;

    // Only commit a state update if visible integer changed
    if (rounded !== lastRenderedRoundedRef.current) {
      lastRenderedRoundedRef.current = rounded;
      setDisplayValue(rounded);
    }

    if (done) {
      positionRef.current = target;
      velocityRef.current = 0;
      // Final commit if needed
      if (lastRenderedRoundedRef.current !== target) {
        lastRenderedRoundedRef.current = target;
        setDisplayValue(target);
      }
      rafIdRef.current = null;
      return;
    }

    rafIdRef.current = requestAnimationFrame(step);
  };

  // Start the loop on mount if needed; will be kicked by value effect
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  return (
    <span
      className={`inline-flex items-baseline font-bold tabular-nums ${className ?? ''}`}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      <span className="sr-only">{formatted}</span>
      <span aria-hidden="true">{formatted}</span>
    </span>
  );
}
