import { useEffect, useState, useRef } from 'react';

/**
 * AnimatedCounter
 * Smoothly animates numbers from previous to target value using requestAnimationFrame with easeOutExpo easing.
 *
 * @param {number|string} value - The target numeric value to count up to.
 * @param {number} [duration=1100] - Duration of the animation in milliseconds.
 * @param {number} [decimals=0] - Number of decimal places to format.
 * @param {string} [prefix=''] - Optional prefix (e.g. '₱', '$').
 * @param {string} [suffix=''] - Optional suffix (e.g. '%', ' books').
 * @param {string} [className=''] - Optional CSS classes for the text container.
 * @param {function} [formatter] - Optional custom formatting function (val) => string.
 */
export default function AnimatedCounter({
  value = 0,
  duration = 1100,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
  formatter,
}) {
  const numericTarget = typeof value === 'number' ? value : (parseFloat(String(value).replace(/[^0-9.-]+/g, '')) || 0);
  const [displayValue, setDisplayValue] = useState(0);
  const startValRef = useRef(0);
  const animRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    const startVal = startValRef.current;
    const endVal = numericTarget;
    
    // If start and end are identical, no need to animate
    if (startVal === endVal) {
      setDisplayValue(endVal);
      return;
    }

    startTimeRef.current = null;

    const easeOutExpo = (t) => {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    };

    const animate = (currentTime) => {
      if (!startTimeRef.current) startTimeRef.current = currentTime;
      const progress = Math.min((currentTime - startTimeRef.current) / duration, 1);
      const easedProgress = easeOutExpo(progress);
      
      const current = startVal + (endVal - startVal) * easedProgress;
      setDisplayValue(current);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endVal);
        startValRef.current = endVal;
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [numericTarget, duration]);

  const formattedOutput = () => {
    if (formatter) {
      return formatter(displayValue);
    }
    
    let formattedNum;
    if (decimals > 0) {
      formattedNum = displayValue.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    } else {
      formattedNum = Math.round(displayValue).toLocaleString();
    }
    
    return `${prefix}${formattedNum}${suffix}`;
  };

  return <span className={className}>{formattedOutput()}</span>;
}
