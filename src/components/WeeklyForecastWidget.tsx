import React from 'react';
import { CalendarDays } from 'lucide-react';
import { WeatherData } from '../types';

interface WeeklyForecastWidgetProps {
  weather: WeatherData;
}

export const WeeklyForecastWidget: React.FC<WeeklyForecastWidgetProps> = ({ weather }) => {
  if (!weather?.forecast || weather.forecast.length === 0) {
    return null;
  }

  // Use the full available forecast (up to 5 days)
  const forecastDays = weather.forecast;

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/90 rounded-2xl p-3.5 sm:p-4 shrink-0 shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="w-4 h-4 text-emerald-400" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Riepilogo Settimana</h3>
      </div>
      
      <div className="flex flex-col gap-2">
        {forecastDays.map((day, idx) => {
          const date = new Date(day.dt * 1000);
          const dayName = date.toLocaleDateString('it-IT', { weekday: 'long' });
          const isToday = new Date().toDateString() === date.toDateString();
          
          return (
            <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/40 hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-3 w-1/3">
                <span className="text-xs font-semibold text-slate-200 capitalize">
                  {isToday ? 'Oggi' : dayName}
                </span>
              </div>
              
              <div className="flex items-center justify-center gap-2 w-1/3">
                <img 
                  src={`https://openweathermap.org/img/wn/${day.icon}.png`} 
                  alt={day.description}
                  title={day.description}
                  className="w-8 h-8 object-contain drop-shadow-md brightness-110"
                />
              </div>
              
              <div className="flex items-center justify-end gap-3 w-1/3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white text-right w-6">{Math.round(day.temp_max)}°</span>
                  <span className="text-xs font-semibold text-slate-500 text-right w-6">{Math.round(day.temp_min)}°</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
