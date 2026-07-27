import React, { useState, useEffect, useRef } from "react";
import { cities } from "./data/cities";
import { City, WeatherData, WindyWebcam } from "./types";
import { db, auth } from "./lib/firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit,
  increment
} from "firebase/firestore";
import { 
  onAuthStateChanged, 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { 
  MapPin, 
  AlertCircle, 
  Search, 
  Video, 
  Radio, 
  Wind, 
  Droplets, 
  Maximize2, 
  Clock, 
  Heart, 
  MessageSquare, 
  Send, 
  Sparkles,
  Bookmark,
  X,
  User as UserIcon,
  UserPlus,
  LogIn,
  LogOut,
  Mail,
  Lock,
  CheckCircle,
  ShieldCheck,
  ExternalLink,
  Sliders,
  Megaphone
} from "lucide-react";
import { AdminPanelModal } from "./components/AdminPanelModal";
import { Banner, AppSettings } from "./types";


interface FavoriteCam {
  id: string;
  webcamId: number;
  title: string;
  cityName: string;
  thumbnailUrl: string;
  userId: string;
}

interface CommentItem {
  id: string;
  webcamId: number;
  userName: string;
  text: string;
  createdAt: string;
  userId: string;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [customCities, setCustomCities] = useState<City[]>(cities);
  const [activeCity, setActiveCity] = useState<City>(cities[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [onlyLiveStreams, setOnlyLiveStreams] = useState<boolean>(true);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [webcams, setWebcams] = useState<WindyWebcam[]>([]);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [loadingWebcams, setLoadingWebcams] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [localTime, setLocalTime] = useState<string>("");
  const [selectedWebcamId, setSelectedWebcamId] = useState<number | null>(null);
  const [directStreamUrl, setDirectStreamUrl] = useState<string | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Firestore & Auth state
  const [favorites, setFavorites] = useState<FavoriteCam[]>([]);
  const [webcamLikesMap, setWebcamLikesMap] = useState<Record<number, number>>({});
  const [showFavoritesModal, setShowFavoritesModal] = useState<boolean>(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [userNameInput, setUserNameInput] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authSuccessMessage, setAuthSuccessMessage] = useState<string | null>(null);

  // Admin Panel & App Config State
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [activeBanners, setActiveBanners] = useState<Banner[]>([]);

  // Sync App Settings from Firestore
  useEffect(() => {
    if (!db) return;
    const settingsRef = doc(db, "app_settings", "config");
    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        setAppSettings(snapshot.data() as AppSettings);
      }
    }, (err) => console.warn("App settings subscription warning:", err));

    return () => unsubscribe();
  }, []);

  // Sync Banners from Firestore
  useEffect(() => {
    if (!db) return;
    const bannersRef = collection(db, "banners");
    const unsubscribe = onSnapshot(bannersRef, (snapshot) => {
      const bannerList: Banner[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Banner;
        if (data.active) {
          bannerList.push({ id: docSnap.id, ...data });
        }
      });
      setActiveBanners(bannerList);
    }, (err) => console.warn("Banners subscription warning:", err));

    return () => unsubscribe();
  }, []);


  // Handle Auth state change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user && !user.isAnonymous) {
        const name = user.displayName || user.email?.split('@')[0] || "Utente";
        setUserNameInput(name);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError("Inserisci sia l'email che la password.");
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccessMessage(null);

    try {
      const userCred = await createUserWithEmailAndPassword(auth, authEmail.trim(), authPassword.trim());
      if (authDisplayName.trim()) {
        await updateProfile(userCred.user, { displayName: authDisplayName.trim() });
      }
      setAuthSuccessMessage("Registrazione completata! Benvenuto.");
      setTimeout(() => {
        setShowAuthModal(false);
        setAuthSuccessMessage(null);
        setAuthEmail("");
        setAuthPassword("");
        setAuthDisplayName("");
      }, 1200);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setAuthError("Indirizzo email già registrato! Se hai già un account, seleziona la scheda 'Accedi' in alto oppure utilizza il pulsante 'Continua con Google'.");
      } else if (err.code === 'auth/weak-password') {
        setAuthError("La password deve contenere almeno 6 caratteri.");
      } else if (err.code === 'auth/invalid-email') {
        setAuthError("Indirizzo email non valido.");
      } else {
        setAuthError(err.message || "Errore durante la registrazione.");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError("Inserisci sia l'email che la password.");
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccessMessage(null);

    try {
      await signInWithEmailAndPassword(auth, authEmail.trim(), authPassword.trim());
      setAuthSuccessMessage("Accesso effettuato con successo!");
      setTimeout(() => {
        setShowAuthModal(false);
        setAuthSuccessMessage(null);
        setAuthEmail("");
        setAuthPassword("");
      }, 1200);
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setAuthError("Email o password errati. Prova ad accedere con Google o a creare un nuovo account.");
      } else {
        setAuthError(err.message || "Errore durante l'accesso.");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccessMessage(null);

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setAuthSuccessMessage("Accesso con Google effettuato con successo!");
      setTimeout(() => {
        setShowAuthModal(false);
        setAuthSuccessMessage(null);
        setAuthEmail("");
        setAuthPassword("");
        setAuthDisplayName("");
      }, 1000);
    } catch (err: any) {
      console.warn("Google Sign-In Error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setAuthError("Finestra di accesso chiusa prima del completamento.");
      } else if (err.code === 'auth/cancelled-popup-request') {
        // request cancelled
      } else {
        setAuthError(err.message || "Impossibile accedere con Google. Riprova o usa Email e Password.");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Re-sign in anonymously so features remain functional
      await signInAnonymously(auth);
    } catch (err) {
      console.warn("Logout error:", err);
    }
  };

  // Sync Webcam Likes Counter from Firestore
  useEffect(() => {
    if (!db) return;
    const likesRef = collection(db, "webcam_likes");
    const unsubscribe = onSnapshot(likesRef, (snapshot) => {
      const map: Record<number, number> = {};
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.webcamId && typeof data.count === "number") {
          map[data.webcamId] = Math.max(0, data.count);
        }
      });
      setWebcamLikesMap(map);
    }, (err) => {
      console.warn("Firestore webcam_likes subscription warning:", err);
    });

    return () => unsubscribe();
  }, []);

  // Sync Saved Cities from Firestore
  useEffect(() => {
    if (!db) return;
    const citiesRef = collection(db, "saved_cities");
    const unsubscribe = onSnapshot(citiesRef, (snapshot) => {
      const dbCities: City[] = snapshot.docs.map(docSnap => ({
        id: docSnap.data().id || docSnap.id,
        name: docSnap.data().name,
        country: docSnap.data().country || "",
        lat: docSnap.data().lat,
        lon: docSnap.data().lon,
        imageUrl: docSnap.data().imageUrl || "https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&q=80&w=300"
      }));

      // Merge built-in cities with dbCities
      const mergedMap = new Map<string, City>();
      cities.forEach(c => mergedMap.set(c.id, c));
      dbCities.forEach(c => mergedMap.set(c.id, c));

      setCustomCities(Array.from(mergedMap.values()));
    }, (err) => {
      console.warn("Firestore cities subscription warning:", err);
    });

    return () => unsubscribe();
  }, []);

  // Sync User Favorites from Firestore
  useEffect(() => {
    if (!db || !currentUser) return;
    const favsRef = collection(db, "favorites");
    const q = query(favsRef, where("userId", "==", currentUser.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const favList: FavoriteCam[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        webcamId: docSnap.data().webcamId,
        title: docSnap.data().title || "",
        cityName: docSnap.data().cityName || "",
        thumbnailUrl: docSnap.data().thumbnailUrl || "",
        userId: docSnap.data().userId
      }));
      setFavorites(favList);
    }, (err) => {
      console.warn("Firestore favorites subscription warning:", err);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleSearch = async (e?: React.KeyboardEvent<HTMLInputElement>) => {
    if (e && e.key !== 'Enter') return;
    if (!searchQuery.trim()) return;

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

        // Persist to Firestore
        if (db && currentUser) {
          const docRef = doc(db, "saved_cities", newCity.id);
          await setDoc(docRef, {
            ...newCity,
            userId: currentUser.uid,
            createdAt: new Date().toISOString()
          }).catch(err => console.warn("Error saving city to Firestore:", err));
        }
      } else {
        alert("Città non trovata. Prova un altro nome.");
      }
    } catch (err) {
      console.error(err);
      alert("Errore durante la ricerca della città");
    } finally {
      setIsSearching(false);
    }
  };

  // Firestore Custom Webcams Subscription
  const [firestoreCustomCams, setFirestoreCustomCams] = useState<any[]>([]);

  useEffect(() => {
    if (!db) return;
    const camsRef = collection(db, "custom_webcams");
    const unsubscribe = onSnapshot(camsRef, (snapshot) => {
      const list: any[] = [];
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.active !== false) {
          list.push({ id: docSnap.id, ...data });
        }
      });
      setFirestoreCustomCams(list);
    }, (err) => {
      console.warn("Firestore custom_webcams error:", err);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setSelectedWebcamId(null);
    const headers: Record<string, string> = {};
    if (appSettings?.windyApiKey) {
      headers["x-windy-api-key"] = appSettings.windyApiKey;
    }
    if (appSettings?.openWebcamDbApiKey) {
      headers["x-openwebcamdb-api-key"] = appSettings.openWebcamDbApiKey;
    }
    if (appSettings?.openWeatherApiKey) {
      headers["x-weather-api-key"] = appSettings.openWeatherApiKey;
    }

    async function fetchWeather() {
      setLoadingWeather(true);
      setError(null);
      try {
        const res = await fetch(`/api/weather?lat=${activeCity.lat}&lon=${activeCity.lon}`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Impossibile recuperare i dati meteo");
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
        const res = await fetch(`/api/webcams?lat=${activeCity.lat}&lon=${activeCity.lon}`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Impossibile caricare le webcam");

        let fetchedCams = data.webcams || [];

        // Match custom webcams for active city or general
        const matchingCustomCams = firestoreCustomCams.filter((c: any) => 
          c.cityName?.toLowerCase() === activeCity.name?.toLowerCase() ||
          c.cityName?.toLowerCase() === 'generico' ||
          !c.cityName
        ).map((c: any) => ({
          id: `custom_${c.id}`,
          title: c.title,
          city: c.cityName || activeCity.name,
          status: "active",
          playerUrl: c.streamUrl,
          thumbnailUrl: c.thumbnailUrl || "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=600&q=80",
          provider: c.provider || "Custom Stream"
        }));

        setWebcams([...matchingCustomCams, ...fetchedCams]);
      } catch (err: any) {
        setWebcamError(err.message);
        setWebcams([]);
      } finally {
        setLoadingWebcams(false);
      }
    }

    fetchWeather();
    fetchWebcams();
  }, [activeCity, appSettings?.windyApiKey, appSettings?.openWebcamDbApiKey, appSettings?.openWeatherApiKey, firestoreCustomCams]);

  useEffect(() => {
    if (!weather) return;
    
    const interval = setInterval(() => {
      const d = new Date();
      const localTimeMs = d.getTime() + (d.getTimezoneOffset() * 60000) + (weather.timezone * 1000);
      const cityDate = new Date(localTimeMs);
      
      const timeString = cityDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const offsetHours = weather.timezone / 3600;
      const offsetString = offsetHours >= 0 ? `+${offsetHours}` : `${offsetHours}`;
      
      setLocalTime(`${timeString} UTC${offsetString}`);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [weather]);

  // Active webcam selection (strictly prioritizes active live streams)
  const activeWebcam = selectedWebcamId 
    ? webcams.find(w => w.webcamId === selectedWebcamId) || webcams[0]
    : webcams.find(w => w.player?.live) || webcams[0];

  // Sync Comments for active webcam from Firestore
  useEffect(() => {
    if (!db || !activeWebcam) {
      setComments([]);
      return;
    }

    const commentsRef = collection(db, "comments");
    const q = query(
      commentsRef, 
      where("webcamId", "==", activeWebcam.webcamId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentList: CommentItem[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        webcamId: docSnap.data().webcamId,
        userName: docSnap.data().userName || "Anonimo",
        text: docSnap.data().text || "",
        createdAt: docSnap.data().createdAt || new Date().toISOString(),
        userId: docSnap.data().userId
      }));

      // Sort client-side by date
      commentList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setComments(commentList);
    }, (err) => {
      console.warn("Firestore comments subscription warning:", err);
    });

    return () => unsubscribe();
  }, [activeWebcam?.webcamId]);

  // Fetch Direct Stream Embed URL if available
  useEffect(() => {
    if (!activeWebcam) {
      setDirectStreamUrl(null);
      return;
    }

    let isMounted = true;
    setDirectStreamUrl(null);

    if (activeWebcam.player?.live) {
      fetch(`/api/stream-url?id=${activeWebcam.webcamId}`)
        .then(res => res.json())
        .then(data => {
          if (isMounted && data?.streamUrl) {
            setDirectStreamUrl(data.streamUrl);
          }
        })
        .catch(err => console.error("Failed to fetch direct stream URL:", err));
    }

    return () => {
      isMounted = false;
    };
  }, [activeWebcam?.webcamId]);

  let playerUrl: string | undefined = directStreamUrl || undefined;
  if (!playerUrl) {
    playerUrl = activeWebcam?.player?.live || activeWebcam?.player?.day;
    if (playerUrl) {
      try {
        const url = new URL(playerUrl);
        url.searchParams.set('play', '1');
        url.searchParams.set('autoplay', '1');
        url.searchParams.set('live', '1');
        playerUrl = url.toString();
      } catch (e) {
        // Fallback
      }
    }
  }

  if (playerUrl && playerUrl.startsWith('http://')) {
    playerUrl = playerUrl.replace('http://', 'https://');
  }

  // Toggle Favorite & Update Likes Counter in Firestore
  const isFavorite = favorites.some(f => f.webcamId === activeWebcam?.webcamId);
  const activeLikesCount = activeWebcam ? (webcamLikesMap[activeWebcam.webcamId] || 0) : 0;
  
  const toggleFavorite = async () => {
    if (!db || !currentUser || !activeWebcam) return;

    try {
      const favDocRef = doc(db, "favorites", `${currentUser.uid}_${activeWebcam.webcamId}`);
      const likesDocRef = doc(db, "webcam_likes", String(activeWebcam.webcamId));
      const existing = favorites.find(f => f.webcamId === activeWebcam.webcamId);

      if (existing) {
        await deleteDoc(favDocRef);
        await setDoc(likesDocRef, {
          webcamId: activeWebcam.webcamId,
          count: increment(-1)
        }, { merge: true });
      } else {
        await setDoc(favDocRef, {
          webcamId: activeWebcam.webcamId,
          title: activeWebcam.title,
          cityName: activeCity.name,
          thumbnailUrl: activeWebcam.images?.current?.thumbnail || "",
          userId: currentUser.uid,
          createdAt: new Date().toISOString()
        });
        await setDoc(likesDocRef, {
          webcamId: activeWebcam.webcamId,
          count: increment(1)
        }, { merge: true });
      }
    } catch (err) {
      console.error("Error updating favorite or likes counter:", err);
    }
  };

  // Submit Comment to Firestore
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !activeWebcam || !db || !currentUser) return;

    setIsSubmittingComment(true);
    try {
      await addDoc(collection(db, "comments"), {
        webcamId: activeWebcam.webcamId,
        userName: userNameInput.trim() || "Spettatore",
        text: newCommentText.trim(),
        userId: currentUser.uid,
        createdAt: new Date().toISOString()
      });
      setNewCommentText("");
    } catch (err) {
      console.error("Error adding comment:", err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const toggleFullscreen = () => {
    if (playerContainerRef.current) {
      if (!document.fullscreenElement) {
        playerContainerRef.current.requestFullscreen().catch((err) => {
          console.error("Fullscreen error:", err);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };

  const filteredCities = customCities.filter(city => 
    city.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans overflow-x-hidden md:h-screen md:overflow-hidden">
      
      {/* Header Bar - Mobile Optimized */}
      <header className="p-3 sm:p-4 md:p-5 pb-2 shrink-0 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <MapPin className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight leading-none">puulp<span className="text-blue-400">.it</span></h1>
              <p className="text-[10px] text-slate-400 font-medium">World Live Webcams & Weather</p>
            </div>
          </div>

          {/* Clock badge for mobile */}
          {localTime && (
            <div className="md:hidden px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-blue-400" />
              {localTime}
            </div>
          )}
        </div>

        {/* Search & Actions Bar */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-grow md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input 
              type="search"
              enterKeyHint="search"
              placeholder="Cerca città (es. Roma, Tokyo)..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              disabled={isSearching}
              className="w-full pl-9 pr-4 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs md:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50 min-h-[40px]"
            />
          </div>

          {/* Desktop Clock */}
          {localTime && (
            <div className="hidden md:flex px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold items-center gap-2 whitespace-nowrap">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              {localTime}
            </div>
          )}

          {/* Live Stream Only Indicator */}
          <div className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap bg-red-600/20 border border-red-500/50 text-red-400 shadow-md shadow-red-950/40 min-h-[40px] shrink-0">
            <Radio className="w-3.5 h-3.5 animate-pulse text-red-500" />
            <span className="hidden sm:inline">Solo Live Stream</span>
            <span className="sm:hidden">LIVE</span>
          </div>

          {/* Favorites Modal Trigger Button */}
          <button
            onClick={() => setShowFavoritesModal(true)}
            className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 transition-all min-h-[40px] shrink-0 hover:border-red-500/40"
            title="I miei preferiti salvati in Firestore"
          >
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
            <span className="hidden sm:inline">Preferiti</span>
            <span className="px-1.5 py-0.5 text-[10px] bg-red-600/30 text-red-400 rounded-full font-extrabold border border-red-500/30">
              {favorites.length}
            </span>
          </button>

          {/* Admin Control Panel Trigger Button */}
          {currentUser && (
            <button
              onClick={() => setShowAdminModal(true)}
              className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white transition-all min-h-[40px] shrink-0 shadow-md shadow-blue-900/40 border border-blue-500/30"
              title="Pannello Amministratore (Chiavi API, Iscrizioni, Banner)"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-300" />
              <span className="hidden sm:inline">Admin</span>
              <span className="px-1.5 py-0.5 text-[9px] bg-blue-500/30 text-blue-200 rounded font-black uppercase">
                Control
              </span>
            </button>
          )}


          {/* User Account / Auth Trigger */}
          {currentUser && !currentUser.isAnonymous ? (
            <div className="flex items-center gap-1.5 bg-slate-900 border border-blue-500/30 rounded-xl px-2.5 py-1 min-h-[40px] shrink-0">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-[11px] font-extrabold shadow-sm">
                {(currentUser.displayName || currentUser.email || "U")[0].toUpperCase()}
              </div>
              <div className="flex flex-col text-left px-0.5 hidden lg:flex max-w-[110px]">
                <span className="text-[11px] font-bold text-slate-100 truncate leading-tight">
                  {currentUser.displayName || currentUser.email?.split('@')[0]}
                </span>
                <span className="text-[9px] text-emerald-400 font-semibold leading-tight">Account Attivo</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all"
                title="Disconnetti account"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setAuthMode('register');
                setShowAuthModal(true);
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition-all min-h-[40px] shrink-0"
              title="Registrati per mettere mi piace e salvare le tue webcam"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Registrati</span>
            </button>
          )}
        </div>
      </header>

      {/* System Announcement Bar (Managed via Admin Control Panel) */}
      {appSettings?.announcementActive && appSettings?.announcementText && (
        <div className={`px-4 py-2 text-xs font-semibold flex items-center justify-between border-b ${
          appSettings.announcementType === 'warning'
            ? 'bg-amber-950/90 border-amber-500/40 text-amber-200'
            : appSettings.announcementType === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
            : 'bg-blue-950/90 border-blue-500/40 text-blue-200'
        }`}>
          <div className="flex items-center gap-2 max-w-4xl mx-auto w-full justify-center text-center">
            <Megaphone className="w-4 h-4 shrink-0 animate-bounce" />
            <span>{appSettings.announcementText}</span>
          </div>
        </div>
      )}

      {/* Horizontal City Selector Pills */}
      <div className="flex-none px-3 sm:px-4 md:px-5 py-2.5 overflow-x-auto scrollbar-hide bg-slate-950/40 border-b border-slate-900">
        <div className="flex gap-2 w-max snap-x">
          {filteredCities.map((city) => (
            <button
              key={city.id}
              onClick={() => setActiveCity(city)}
              className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap snap-center min-h-[36px] flex items-center gap-1.5 ${
                activeCity.id === city.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/30"
                  : "bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800"
              }`}
            >
              <span>{city.name}</span>
            </button>
          ))}
          {filteredCities.length === 0 && (
            <div className="px-4 py-2 text-xs text-slate-500 italic flex items-center">
              {isSearching ? "Ricerca in corso..." : `Premi Invio per cercare "${searchQuery}"`}
            </div>
          )}
        </div>
      </div>

      {/* Main Responsive Layout */}
      <div className="flex-grow p-3 sm:p-4 md:p-5 pt-2 flex flex-col md:grid md:grid-cols-12 md:gap-4 md:overflow-hidden gap-4">
        
        {/* Left Area: Live Video Player & Webcam Selector */}
        <div className="md:col-span-8 flex flex-col gap-3 md:gap-4 md:overflow-hidden md:h-full">
          
          {/* Main Video Player Container */}
          <div 
            ref={playerContainerRef}
            className="w-full aspect-video md:aspect-auto md:flex-grow md:min-h-[280px] bg-slate-950 rounded-2xl md:rounded-3xl border border-slate-800 relative overflow-hidden group shadow-2xl shrink-0"
          >
            {/* Top Badge Overlay */}
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 flex flex-wrap gap-1.5 pointer-events-none max-w-[75%]">
              <span className="px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white shadow-lg backdrop-blur-md flex items-center gap-1.5 bg-red-600/90">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                LIVE STREAM
              </span>
              <span className="bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] sm:text-xs uppercase text-slate-200 font-semibold shadow-lg truncate max-w-[180px] sm:max-w-sm">
                {activeWebcam ? activeWebcam.title : activeCity.name}
              </span>
            </div>

            {/* Top Right Actions: Favorite, External Source & Fullscreen */}
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex items-center gap-2">
              {activeWebcam && (
                <button
                  onClick={toggleFavorite}
                  className={`px-3 py-2 rounded-xl backdrop-blur-md transition-all border shadow-lg flex items-center gap-2 ${
                    isFavorite 
                      ? 'bg-red-600 text-white border-red-500 scale-105 ring-2 ring-red-400/40' 
                      : 'bg-black/60 hover:bg-black/90 text-slate-300 hover:text-white border-white/10'
                  }`}
                  title={isFavorite ? "Rimuovi dai Preferiti" : "Aggiungi ai Preferiti"}
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current text-white' : 'text-red-400'}`} />
                  <span className="text-xs font-extrabold">{activeLikesCount} <span className="font-medium opacity-80 hidden sm:inline">Mi Piace</span></span>
                </button>
              )}

              {(activeWebcam?.url || playerUrl) && (
                <a
                  href={activeWebcam?.url || playerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-black/60 hover:bg-black/90 backdrop-blur-md text-slate-300 hover:text-white transition-all border border-white/10 shadow-lg flex items-center gap-1.5"
                  title="Apri sorgente della diretta in una nuova scheda"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="text-xs font-semibold hidden sm:inline">Apri Sorgente</span>
                </a>
              )}

              {playerUrl && (
                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-xl bg-black/60 hover:bg-black/90 backdrop-blur-md text-slate-300 hover:text-white transition-all border border-white/10 shadow-lg"
                  title="Schermo Intero"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Video Player Frame or Loading States */}
            {loadingWebcams ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                <p className="text-xs text-slate-400 font-medium">Caricamento streaming live in corso...</p>
              </div>
            ) : webcamError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 p-6 text-center z-10">
                <AlertCircle className="w-10 h-10 text-red-500 mb-3 animate-bounce" />
                <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-1">
                  Errore di caricamento webcam
                </h3>
                <p className="text-xs text-slate-300 max-w-md leading-relaxed bg-red-950/40 p-3 rounded-xl border border-red-500/30">
                  {webcamError}
                </p>
                {webcamError.includes("WINDY_API_KEY") && (
                  <p className="text-[11px] text-amber-300/90 mt-3 max-w-sm">
                    💡 <strong>Nota per l'amministratore della VPS:</strong> Aggiungi <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-200">WINDY_API_KEY</code> nel file <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-200">.env</code> sulla tua VPS e riavvia il container con <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-200">docker compose restart</code>.
                  </p>
                )}
              </div>
            ) : playerUrl ? (
              <iframe 
                key={playerUrl}
                src={playerUrl}
                title={`${activeCity.name} Live Cam`}
                className="absolute inset-0 w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                scrolling="no"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 p-6 text-center z-10 gap-2">
                <Video className="w-10 h-10 text-slate-600 mb-1" />
                <p className="text-sm text-slate-300 font-medium">
                  Nessuna diretta streaming live attiva trovata entro 250km da {activeCity.name}.
                </p>
                <p className="text-xs text-slate-500 max-w-md">
                  Prova a selezionare una di queste famose destinazioni con webcam live streaming attive:
                </p>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {customCities.slice(0, 5).map(c => (
                    <button
                      key={c.id}
                      onClick={() => setActiveCity(c)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg text-xs font-medium border border-slate-700 transition-all"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Promotional Banners (Managed via Admin Control Panel) */}
          {activeBanners.filter(b => b.position === 'under_player').map(banner => (
            banner.type === 'html' ? (
              <div key={banner.id} className="w-full my-2 overflow-hidden flex justify-center items-center" dangerouslySetInnerHTML={{ __html: banner.htmlCode || "" }} />
            ) : (
              <div key={banner.id} className="bg-slate-950/90 border border-blue-500/30 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg shadow-blue-950/20">
                <div className="flex items-center gap-3">
                  {banner.imageUrl && (
                    <img src={banner.imageUrl} alt={banner.title} className="w-16 h-12 rounded-lg object-cover border border-slate-800 shrink-0" />
                  )}
                  <div>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30">
                      Sponsor Live
                    </span>
                    <h4 className="text-xs font-bold text-white mt-0.5">{banner.title}</h4>
                    {banner.subtitle && <p className="text-[11px] text-slate-400">{banner.subtitle}</p>}
                  </div>
                </div>
                {banner.linkUrl && (
                  <a 
                    href={banner.linkUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 shadow-md shadow-blue-600/30"
                  >
                    <span>Scopri di più</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )
          ))}

          {/* Webcam Selector Thumbnails Strip */}
          {!loadingWebcams && webcams.length > 0 && (
            <div className="flex-none bg-slate-900/60 rounded-2xl border border-slate-800/80 p-2.5 sm:p-3 overflow-x-auto scrollbar-hide">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-blue-400" />
                  Webcam Live Stream ({webcams.length})
                </span>
                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Streaming in Diretta
                </span>
              </div>

              <div className="flex gap-2.5 w-max snap-x">
                {webcams.map((webcam) => {
                  const isActive = (selectedWebcamId === webcam.webcamId) || (!selectedWebcamId && activeWebcam?.webcamId === webcam.webcamId);
                  const isFav = favorites.some(f => f.webcamId === webcam.webcamId);
                  const likesCount = webcamLikesMap[webcam.webcamId] || 0;

                  return (
                    <button
                      key={webcam.webcamId}
                      onClick={() => setSelectedWebcamId(webcam.webcamId)}
                      title={webcam.title}
                      className={`relative rounded-xl overflow-hidden h-20 w-32 sm:h-22 sm:w-36 flex-shrink-0 snap-center transition-all border ${
                        isActive
                          ? 'ring-2 ring-blue-500 border-blue-400/50 shadow-lg shadow-blue-500/20 opacity-100 scale-[1.02]'
                          : 'border-slate-800 opacity-65 hover:opacity-100'
                      }`}
                    >
                      {webcam.images?.current?.thumbnail ? (
                        <img 
                          src={webcam.images.current.thumbnail} 
                          alt={webcam.title} 
                          className="w-full h-full object-cover" 
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center p-2">
                          <span className="text-[10px] text-slate-400 text-center line-clamp-2">{webcam.title}</span>
                        </div>
                      )}

                      {/* Badges */}
                      <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                        <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-1 backdrop-blur-md ${
                          isFav ? 'bg-red-600/90 text-white' : 'bg-black/75 text-slate-200 border border-white/10'
                        }`}>
                          <Heart className={`w-2.5 h-2.5 ${isFav ? 'fill-current text-white' : 'text-red-400'}`} />
                          <span>{likesCount}</span>
                        </div>
                        <div className="bg-red-600 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded shadow flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                          LIVE
                        </div>
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-1.5 pt-3">
                        <p className="text-[9px] sm:text-[10px] text-white font-medium truncate text-left leading-tight">{webcam.title}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Right Area: Weather Stats, Interactive Map & Realtime Community Chat */}
        <div className="md:col-span-4 flex flex-col gap-3 min-h-[350px] md:min-h-0 md:h-full md:overflow-y-auto pr-0.5">
          
          {/* Weather Widget */}
          {weather && (
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/90 rounded-2xl p-3.5 sm:p-4 shrink-0 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black tracking-tight text-white">{Math.round(weather.main.temp)}°C</span>
                  <div className="text-xs text-slate-400 capitalize font-medium">
                    {weather.weather[0]?.description}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Percepita</span>
                  <span className="text-xs font-semibold text-slate-300">{Math.round(weather.main.feels_like)}°C</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60">
                <div className="flex items-center gap-2 bg-slate-900/60 p-2 rounded-xl border border-slate-800/40">
                  <Wind className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold uppercase">Vento</span>
                    <span className="text-xs font-semibold text-slate-200">{Math.round(weather.wind.speed * 3.6)} km/h</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-900/60 p-2 rounded-xl border border-slate-800/40">
                  <Droplets className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold uppercase">Umidità</span>
                    <span className="text-xs font-semibold text-slate-200">{weather.main.humidity}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Windy Map Box */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col justify-between h-[220px] shrink-0 shadow-lg overflow-hidden">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <p className="text-xs font-bold uppercase text-slate-300 tracking-wider">Mappa Meteo</p>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">{activeCity.name}</span>
            </div>
            
            <div className="flex-grow bg-slate-950 rounded-xl border border-slate-800 overflow-hidden relative shadow-inner">
              <iframe 
                className="absolute inset-0 w-full h-full border-0 pointer-events-auto"
                src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=%C2%B0C&metricWind=km%2Fh&zoom=10&overlay=wind&product=ecmwf&level=surface&lat=${activeCity.lat}&lon=${activeCity.lon}&detailLat=${activeCity.lat}&detailLon=${activeCity.lon}&detail=true`}
                title="Windy Map"
              />
            </div>
          </div>

          {/* Real-time Community Comments / Live Chat (Firestore DB) */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col flex-grow min-h-[240px] shadow-xl">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Commenti Live (Firestore)</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold bg-slate-800/80 px-2 py-0.5 rounded-full">
                {comments.length}
              </span>
            </div>

            {/* Comment List */}
            <div className="flex-grow overflow-y-auto max-h-[180px] space-y-2 pr-1 my-1 scrollbar-thin scrollbar-thumb-slate-800">
              {comments.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  Nessun commento ancora. Sii il primo a commentare!
                </div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/50 text-xs">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-blue-400 text-[11px] truncate max-w-[120px]">{c.userName}</span>
                      <span className="text-[9px] text-slate-500">
                        {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed break-words">{c.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="mt-2 pt-2 border-t border-slate-800/80 flex flex-col gap-2">
              <input 
                type="text" 
                placeholder="Il tuo nome (opzionale)" 
                value={userNameInput} 
                onChange={(e) => setUserNameInput(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <div className="flex gap-1.5">
                <input 
                  type="text" 
                  placeholder="Scrivi un commento..." 
                  value={newCommentText} 
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="flex-grow px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button 
                  type="submit" 
                  disabled={isSubmittingComment || !newCommentText.trim()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 disabled:opacity-50 transition-all shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>

      {/* Favorites Modal Drawer (Firestore DB) */}
      {showFavoritesModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  Le Tue Webcam Preferite ({favorites.length})
                </h2>
              </div>
              <button
                onClick={() => setShowFavoritesModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-grow">
              {favorites.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <Heart className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-300 mb-1">Nessuna webcam nei preferiti</p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Clicca sul pulsante <span className="text-red-400 font-bold">❤️ Mi Piace</span> sul player di qualsiasi webcam per salvarla in Firestore!
                  </p>
                </div>
              ) : (
                favorites.map((fav) => {
                  const likesCount = webcamLikesMap[fav.webcamId] || 0;
                  return (
                    <div
                      key={fav.id}
                      className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex items-center gap-3 hover:border-blue-500/50 transition-all group"
                    >
                      {fav.thumbnailUrl ? (
                        <img
                          src={fav.thumbnailUrl}
                          alt={fav.title}
                          className="w-16 h-12 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-12 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                          <Video className="w-5 h-5 text-slate-500" />
                        </div>
                      )}

                      <div className="flex-grow min-w-0">
                        <p className="text-xs font-bold text-slate-100 truncate group-hover:text-blue-400 transition-colors">
                          {fav.title}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">{fav.cityName}</p>
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-red-400 font-bold">
                          <Heart className="w-3 h-3 fill-current" />
                          <span>{likesCount} Mi Piace salvati</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => {
                            const cityMatch = customCities.find(c => c.name.toLowerCase() === fav.cityName.toLowerCase());
                            if (cityMatch) {
                              setActiveCity(cityMatch);
                            }
                            setSelectedWebcamId(fav.webcamId);
                            setShowFavoritesModal(false);
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-all"
                        >
                          Guarda
                        </button>
                        <button
                          onClick={async () => {
                            if (!db) return;
                            await deleteDoc(doc(db, "favorites", fav.id));
                            await setDoc(doc(db, "webcam_likes", String(fav.webcamId)), {
                              webcamId: fav.webcamId,
                              count: increment(-1)
                            }, { merge: true });
                          }}
                          className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-all"
                          title="Rimuovi"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Registration & Login Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                    {authMode === 'register' ? 'Crea un Account' : 'Accedi al tuo Account'}
                  </h2>
                  <p className="text-[10px] text-slate-400">Salva i tuoi 'Mi Piace' e le webcam preferite</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  setAuthError(null);
                  setAuthSuccessMessage(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950/50 p-1 gap-1">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setAuthError(null);
                  setAuthSuccessMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  authMode === 'register'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Registrati</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setAuthError(null);
                  setAuthSuccessMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  authMode === 'login'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Accedi</span>
              </button>
            </div>

            {/* Modal Body / Form */}
            <div className="p-5 space-y-4">
              
              {authError && (
                <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-xs text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{authError}</span>
                </div>
              )}

              {authSuccessMessage && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{authSuccessMessage}</span>
                </div>
              )}

              {/* Google Sign-In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={authLoading}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2.5 disabled:opacity-50 border border-slate-200 active:scale-[0.99]"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Continua con Google</span>
              </button>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-slate-800 w-full"></div>
                <span className="bg-slate-900 px-3 text-[10px] uppercase tracking-wider text-slate-500 font-bold shrink-0">
                  oppure con email
                </span>
                <div className="border-t border-slate-800 w-full"></div>
              </div>

              <form onSubmit={authMode === 'register' ? handleRegister : handleLogin} className="space-y-3">
                {authMode === 'register' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Nome / Username
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Il tuo nome (es. Marco)"
                        value={authDisplayName}
                        onChange={(e) => setAuthDisplayName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Indirizzo Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      placeholder="email@esempio.com"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="Almeno 6 caratteri"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 mt-2"
                >
                  {authLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : authMode === 'register' ? (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Crea Account Gratis</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Accedi Ora</span>
                    </>
                  )}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setShowAuthModal(false)}
                    className="text-[11px] text-slate-500 hover:text-slate-300 underline font-medium transition-colors"
                  >
                    Continua come ospite (limitato)
                  </button>
                </div>

              </form>
            </div>
          </div>
        </div>
      )}

      {/* Admin Control Panel Modal */}
      <AdminPanelModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        currentUserEmail={currentUser?.email || null}
      />

    </div>
  );
}
