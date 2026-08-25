import { useState, useEffect } from 'react';

function DigitalClock() {
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
  const digitalTime = manilaTime.toLocaleTimeString('en-US', { 
    hour12: true, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });

  const dayName = manilaTime.toLocaleDateString('en-US', { weekday: 'long' });
  const monthName = manilaTime.toLocaleDateString('en-US', { month: 'long' });
  const dayNumber = manilaTime.getDate();
  const year = manilaTime.getFullYear();

  return (
    <div className="text-right">
      <div className="text-3xl font-bold text-slate-900 font-mono tracking-tight">
        {digitalTime}
      </div>
      <div className="text-sm text-slate-600">
        {dayName}, {monthName} {dayNumber}, {year}
      </div>
      <div className="text-xs text-slate-500">
        Philippine Standard Time
      </div>
    </div>
  );
}

export default DigitalClock;
