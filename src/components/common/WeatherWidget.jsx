import { useState, useEffect } from 'react';
import { FiSun, FiCloud, FiCloudRain, FiCloudSnow } from 'react-icons/fi';

function WeatherWidget() {
  const [weather, setWeather] = useState({
    temp: 32,
    condition: 'Sunny',
    location: 'Santa Rita, Pampanga',
    icon: FiSun,
    lastUpdated: new Date()
  });

  useEffect(() => {
    // Update last updated time every minute
    const timer = setInterval(() => {
      setWeather(prev => ({ ...prev, lastUpdated: new Date() }));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const WeatherIcon = weather.icon;
  const timeSinceUpdate = Math.floor((new Date() - weather.lastUpdated) / 1000);
  const updateText = timeSinceUpdate < 60 ? 'Updated just now' : `Updated ${timeSinceUpdate} sec ago`;

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
      <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
        <WeatherIcon className="w-6 h-6 text-amber-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-slate-900">{weather.temp}°C</span>
          <span className="text-sm text-slate-600">{weather.condition}</span>
        </div>
        <p className="text-xs text-slate-500 truncate">{weather.location}</p>
        <p className="text-xs text-slate-400">{updateText}</p>
      </div>
    </div>
  );
}

export default WeatherWidget;
