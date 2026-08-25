import { useState, useEffect } from 'react';

function LiveAnalogClock({ size = 'normal' }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getManilaTime = () => {
    return new Date(time.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  };

  const manilaTime = getManilaTime();
  const hours = manilaTime.getHours();
  const minutes = manilaTime.getMinutes();
  const seconds = manilaTime.getSeconds();

  // More accurate hand calculations
  const secondAngle = seconds * 6;
  const minuteAngle = minutes * 6 + seconds * 0.1;
  const hourAngle = (hours % 12) * 30 + minutes * 0.5 + seconds * (0.5 / 60);

  const clockSize = size === 'small' ? 80 : size === 'header' ? 140 : 200;
  const radius = size === 'small' ? 38 : size === 'header' ? 67 : 95;
  const hourHandLength = size === 'small' ? 20 : size === 'header' ? 35 : 50;
  const minuteHandLength = size === 'small' ? 28 : size === 'header' ? 50 : 70;
  const secondHandLength = size === 'small' ? 32 : size === 'header' ? 57 : 80;

  return (
    <svg width={clockSize} height={clockSize} viewBox="0 0 200 200">
      {/* Clock face */}
      <circle cx="100" cy="100" r={radius} fill="white" stroke="#1e293b" strokeWidth="2" />
      
      {/* Hour markers */}
      {[...Array(12)].map((_, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const x1 = 100 + Math.cos(angle) * (radius - 8);
        const y1 = 100 + Math.sin(angle) * (radius - 8);
        const x2 = 100 + Math.cos(angle) * radius;
        const y2 = 100 + Math.sin(angle) * radius;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#1e293b"
            strokeWidth={i % 3 === 0 ? 3 : 2}
            strokeLinecap="round"
          />
        );
      })}

      {/* Minute tick marks - only for larger sizes */}
      {(size === 'normal') && [...Array(60)].map((_, i) => {
        if (i % 5 === 0) return null;
        const angle = (i * 6 - 90) * (Math.PI / 180);
        const x1 = 100 + Math.cos(angle) * (radius - 5);
        const y1 = 100 + Math.sin(angle) * (radius - 5);
        const x2 = 100 + Math.cos(angle) * radius;
        const y2 = 100 + Math.sin(angle) * radius;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#94a3b8"
            strokeWidth="1"
            strokeLinecap="round"
          />
        );
      })}

      {/* Hour hand */}
      <g transform={`rotate(${hourAngle}, 100, 100)`}>
        <line
          x1="100"
          y1="100"
          x2="100"
          y2={100 - hourHandLength}
          stroke="#1e293b"
          strokeWidth={size === 'header' ? 5 : 6}
          strokeLinecap="round"
        />
      </g>

      {/* Minute hand */}
      <g transform={`rotate(${minuteAngle}, 100, 100)`}>
        <line
          x1="100"
          y1="100"
          x2="100"
          y2={100 - minuteHandLength}
          stroke="#1e293b"
          strokeWidth={size === 'header' ? 3 : 4}
          strokeLinecap="round"
        />
      </g>

      {/* Second hand */}
      <g transform={`rotate(${secondAngle}, 100, 100)`}>
        <line
          x1="100"
          y1="100"
          x2="100"
          y2={100 - secondHandLength}
          stroke="#dc2626"
          strokeWidth={size === 'header' ? 1.5 : 2}
          strokeLinecap="round"
        />
      </g>

      {/* Center dot */}
      <circle cx="100" cy="100" r={size === 'header' ? 5 : 6} fill="#1e293b" />
      <circle cx="100" cy="100" r={size === 'header' ? 2 : 3} fill="#dc2626" />
    </svg>
  );
}

export default LiveAnalogClock;
