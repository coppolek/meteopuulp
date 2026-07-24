import React, { useState, useEffect } from "react";
import { cities } from "./data/cities";
import { City, WeatherData, WindyWebcam } from "./types";
import { MapPin, AlertCircle, Search } from "lucide-react";

export default function App() {
  const [customCities, setCustomCities] = useState<City[]>(cities);
  const [activeCity, setActiveCity] = useState<City>(cities[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e?: React.KeyboardEvent<HTMLInputElement>) => {
    if (e && e.key !== 'Enter') return;
    if (!searchQuery.trim()) return;

    // Check if it's already in the local list
    const existing = customCities.find(c => c.name.toLowerCase() === searchQuery.toLowerCase().trim());
    if (existing) {
      setActiveCity(existing);
      setSearchQuery("");
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`);
      const data = await res.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const newCity: City = {
          id: result.place_id.toString(),
          name: result.name,
          country: result.display_name.split(',').pop()?.trim() || "",
          lat: parseFloat(result.lat),
          lon: parseFloat(result.lon),
          imageUrl: "https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&q=80&w=300" 
        };
        
        setCustomCities(prev => [newCity, ...prev]);
        setActiveCity(newCity);
        setSearchQuery("");
      } else {
        alert("City not found. Try a different name.");
      }
    } catch (err) {
      console.error(err);
      alert("Error searching for city");
    } finally {
      setIsSearching(false);
    }
  };
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [webcams, setWebcams] = useState<WindyWebcam[]>([]);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [loadingWebcams, setLoadingWebcams] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [localTime, setLocalTime] = useState<string>("");
  const [selectedWebcamId, setSelectedWebcamId] = useState<number | null>(null);

  useEffect(() => {
    setSelectedWebcamId(null);
    async function fetchWeather() {
      setLoadingWeather(true);
      setError(null);
      try {
        const res = await fetch(`/api/weather?lat=${activeCity.lat}&lon=${activeCity.lon}`);
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch weather data");
        }
        
        setWeather(data);
      } catch (err: any) {
        setError(err.message);
        setWeather(null);
      } finally {
        setLoadingWeather(false);
      }
    }

    async function fetchWebcams() {
      setLoadingWebcams(true);
      setWebcamError(null);
      try {
        const res = await fetch(`/api/webcams?lat=${activeCity.lat}&lon=${activeCity.lon}`);
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch webcams data");
        }
        
        if (data.webcams && data.webcams.length > 0) {
          setWebcams(data.webcams);
        } else {
          setWebcams([]);
        }
      } catch (err: any) {
        setWebcamError(err.message);
        setWebcams([]);
      } finally {
        setLoadingWebcams(false);
      }
    }

    fetchWeather();
    fetchWebcams();
  }, [activeCity]);

  useEffect(() => {
    if (!weather) return;
    
    // Update time every second
    const interval = setInterval(() => {
      // Calculate local time based on the city's timezone offset
      // timezone is shift in seconds from UTC
      const d = new Date();
      const localTimeMs = d.getTime() + (d.getTimezoneOffset() * 60000) + (weather.timezone * 1000);
      const cityDate = new Date(localTimeMs);
      
      const timeString = cityDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const offsetHours = weather.timezone / 3600;
      const offsetString = offsetHours >= 0 ? `+${offsetHours}` : `${offsetHours}`;
      
      setLocalTime(`${timeString} GMT${offsetString}`);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [weather]);

  // Find the active webcam (user selected, or fallback to best available)
  const activeWebcam = selectedWebcamId 
    ? webcams.find(w => w.webcamId === selectedWebcamId) 
    : (webcams.find(w => w.player?.live) || webcams.find(w => w.player?.day) || webcams[0]);
  
  let playerUrl = undefined;
  if (activeWebcam?.player) {
    playerUrl = activeWebcam.player.live || activeWebcam.player.day || activeWebcam.player.lifetime;
    if (playerUrl) {
      try {
        const url = new URL(playerUrl);
        url.searchParams.set('play', '1');
        playerUrl = url.toString();
      } catch (e) {
        // Fallback if URL parsing fails
      }
    }
  }

  const filteredCities = customCities.filter(city => 
    city.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen bg-[#020617] text-slate-100 flex flex-col font-sans overflow-hidden">
      
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2 shrink-0 p-6 pb-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">puulp<span className="text-blue-400">.it</span></h1>
        </div>
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="relative flex-grow md:flex-grow-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input 
              type="text" 
              placeholder="Search any city..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              disabled={isSearching}
              className="w-full md:w-56 pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
            />
          </div>
          {localTime && (
            <div className="px-4 py-2 bg-slate-900 rounded-lg border border-slate-800 text-xs font-semibold flex items-center whitespace-nowrap">
              {localTime}
            </div>
          )}
          <div className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap ${activeWebcam?.player?.live ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
            <span className={`w-2 h-2 rounded-full ${activeWebcam?.player?.live ? 'bg-red-400 animate-pulse' : 'bg-amber-400'}`}></span>
            {activeWebcam?.player?.live ? 'LIVE' : 'TIMELAPSE'}
          </div>
        </div>
      </header>

      <div className="flex-none px-6 pb-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 w-max">
          {filteredCities.map((city) => (
            <button
              key={city.id}
              onClick={() => setActiveCity(city)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                activeCity.id === city.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700"
              }`}
            >
              {city.name}
            </button>
          ))}
          {filteredCities.length === 0 && (
            <div className="px-4 py-2 text-sm text-slate-500 italic">
              {isSearching ? "Searching..." : `Press Enter to search for "${searchQuery}"`}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-grow p-6 pt-2 overflow-hidden">
        
        {/* Left Column */}
        <div className="md:col-span-8 flex flex-col gap-4 overflow-hidden h-full">
          {/* Live Cam - main player */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 relative overflow-hidden group flex-grow min-h-[250px]">
            <div className="absolute top-6 left-6 z-10 flex flex-col gap-2 pointer-events-none">
              <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest w-fit text-white shadow-md ${activeWebcam?.player?.live ? 'bg-red-600' : 'bg-amber-600'}`}>
                {activeWebcam?.player?.live ? 'LIVE STREAM' : 'TIMELAPSE'}
              </span>
              <span className="bg-black/60 backdrop-blur-md px-3 py-1 rounded text-[10px] uppercase text-white w-fit font-semibold shadow-md max-w-sm truncate">
                {activeWebcam ? activeWebcam.title : activeCity.name}
              </span>
            </div>
            
            {loadingWebcams ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : webcamError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
                <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
                <p className="text-red-400 max-w-md">{webcamError}</p>
              </div>
            ) : playerUrl ? (
              <iframe 
                src={playerUrl}
                title={`${activeCity.name} Live Cam`}
                className="absolute inset-0 w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                scrolling="no"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 p-6 text-center z-20">
                <AlertCircle className="w-10 h-10 text-slate-500 mb-4" />
                <p className="text-slate-400 max-w-md">No live webcams found for this location.</p>
              </div>
            )}
          </div>
          
          {/* Webcam Selector */}
          {!loadingWebcams && webcams.length > 0 && (
            <div className="flex-none bg-slate-900/50 rounded-2xl border border-slate-800/50 p-3 overflow-x-auto scrollbar-hide">
              <div className="flex gap-3 w-max">
                {webcams.map((webcam) => {
                  const isActive = (selectedWebcamId === webcam.webcamId) || (!selectedWebcamId && activeWebcam?.webcamId === webcam.webcamId);
                  return (
                    <button
                      key={webcam.webcamId}
                      onClick={() => setSelectedWebcamId(webcam.webcamId)}
                      title={webcam.title}
                      className={`relative rounded-xl overflow-hidden h-20 w-32 flex-shrink-0 transition-all ${
                        isActive
                          ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/20 opacity-100'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      {webcam.images?.current?.thumbnail ? (
                        <img src={webcam.images.current.thumbnail} alt={webcam.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                          <span className="text-[10px] text-slate-400 p-2 text-center line-clamp-2">{webcam.title}</span>
                        </div>
                      )}
                      {webcam.player?.live && (
                        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-sm shadow-red-500/50"></div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-4">
                        <p className="text-[9px] text-white font-medium truncate text-left leading-tight">{webcam.title}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Windy Map - 4 columns */}
        <div className="md:col-span-4 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between h-full min-h-[300px]">
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <p className="text-xs font-bold uppercase text-slate-400">Windy Layers</p>
          </div>
          <div className="flex-grow bg-slate-950 rounded-xl border border-slate-800 overflow-hidden relative">
            <iframe 
              className="absolute inset-0 w-full h-full pointer-events-auto"
              src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=%C2%B0C&metricWind=km%2Fh&zoom=10&overlay=wind&product=ecmwf&level=surface&lat=${activeCity.lat}&lon=${activeCity.lon}&detailLat=${activeCity.lat}&detailLon=${activeCity.lon}&detail=true`}
              frameBorder="0"
              title="Windy Map"
            />
          </div>
        </div>
        
      </div>
    </div>
  );
}

