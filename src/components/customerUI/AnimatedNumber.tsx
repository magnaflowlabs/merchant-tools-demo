'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import BigNumber from 'bignumber.js';

type Props = {
  value: number | string | BigNumber;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
};

export default function AnimatedNumber2({ value = 0, duration = 0.5, format, className }: Props) {
  const normalizeZero = (n: number) => (n === 0 ? 0 : n);

  const numericValue = useMemo(() => {
    if (value instanceof BigNumber) {
      return value.toNumber();
    }
    return typeof value === 'string' ? parseFloat(value) || 0 : value;
  }, [value]);

  const [displayValue, setDisplayValue] = useState<number>(() =>
    normalizeZero(Math.round(numericValue))
  );

  const positionRef = useRef<number>(normalizeZero(Math.round(numericValue)));
  const velocityRef = useRef<number>(0);
  const targetRef = useRef<number>(normalizeZero(Math.round(numericValue)));
  const rafIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const lastRenderedRoundedRef = useRef<number>(normalizeZero(Math.round(numericValue)));

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const formatted = useMemo(() => {
    const rounded = Math.round(displayValue);
    const safe = normalizeZero(rounded);
    return format ? format(safe) : safe.toLocaleString();
  }, [displayValue, format]);

  useEffect(() => {
    const nextTarget = normalizeZero(Math.round(numericValue));

    if (prefersReducedMotion || duration <= 0) {
      targetRef.current = nextTarget;
      positionRef.current = nextTarget;
      velocityRef.current = 0;
      lastRenderedRoundedRef.current = nextTarget;
      setDisplayValue(nextTarget);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }

    targetRef.current = nextTarget;

    if (rafIdRef.current === null) {
      lastTimeRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
      rafIdRef.current = requestAnimationFrame(step);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericValue, duration, prefersReducedMotion]);

  const step = (now: number) => {
    const previousTime = lastTimeRef.current || now;
    let dt = (now - previousTime) / 1000;
    lastTimeRef.current = now;

    if (dt > 0.05) dt = 0.05;

    const clampedDuration = Math.max(0.12, Math.min(2.5, duration));
    const stiffness = 30 / clampedDuration;
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

    const rounded = normalizeZero(Math.round(nextPosition));
    const done = Math.abs(nextPosition - target) < 0.001 && Math.abs(nextVelocity) < 0.001;

    if (rounded !== lastRenderedRoundedRef.current) {
      lastRenderedRoundedRef.current = rounded;
      setDisplayValue(rounded);
    }

    if (done) {
      positionRef.current = target;
      velocityRef.current = 0;
      if (lastRenderedRoundedRef.current !== target) {
        lastRenderedRoundedRef.current = target;
        setDisplayValue(target);
      }
      rafIdRef.current = null;
      return;
    }

    rafIdRef.current = requestAnimationFrame(step);
  };

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
