import React, { useState, useEffect } from "react";
import { 
  X, 
  Key, 
  Users, 
  Megaphone, 
  Settings, 
  Plus, 
  Trash2, 
  Check, 
  Copy, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Save, 
  RefreshCw,
  Search,
  UserCheck,
  UserX,
  CreditCard,
  Crown,
  ExternalLink,
  Sliders,
  AlertTriangle,
  Info,
  CheckCircle2,
  Server
} from "lucide-react";
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot 
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Banner, UserProfile, AppSettings } from "../types";

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail: string | null;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail
}) => {
  const [activeTab, setActiveTab] = useState<'api_keys' | 'users' | 'banners' | 'settings'>('api_keys');

  // API Keys state
  const [windyKey, setWindyKey] = useState("");
  const [weatherKey, setWeatherKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});
  const [apiSaveSuccess, setApiSaveSuccess] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  // Users & Subscriptions state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const [newUserPlan, setNewUserPlan] = useState<'free' | 'pro' | 'vip'>('pro');

  // Banners state
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(false);
  const [newBannerTitle, setNewBannerTitle] = useState("");
  const [newBannerSubtitle, setNewBannerSubtitle] = useState("");
  const [newBannerImageUrl, setNewBannerImageUrl] = useState("");
  const [newBannerLinkUrl, setNewBannerLinkUrl] = useState("");
  const [newBannerPosition, setNewBannerPosition] = useState<'header' | 'under_player' | 'sidebar'>('under_player');
  const [showAddBanner, setShowAddBanner] = useState(false);

  // Settings & Announcement state
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementActive, setAnnouncementActive] = useState(false);
  const [announcementType, setAnnouncementType] = useState<'info' | 'warning' | 'success'>('info');
  const [requireLoginForCams, setRequireLoginForCams] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Load Settings from Firestore
  useEffect(() => {
    if (!isOpen) return;

    const settingsRef = doc(db, "app_settings", "config");
    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as AppSettings;
        setWindyKey(data.windyApiKey || "");
        setWeatherKey(data.openWeatherApiKey || "");
        setGeminiKey(data.geminiApiKey || "");
        setAnnouncementText(data.announcementText || "");
        setAnnouncementActive(!!data.announcementActive);
        setAnnouncementType(data.announcementType || "info");
        setRequireLoginForCams(!!data.requireLoginForCams);
      }
    });

    return () => unsubscribe();
  }, [isOpen]);

  // Load Users from Firestore
  useEffect(() => {
    if (!isOpen) return;
    setLoadingUsers(true);

    const usersRef = collection(db, "user_profiles");
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const userList: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        userList.push({ id: docSnap.id, ...docSnap.data() } as UserProfile);
      });
      
      // If current user isn't in list yet, create a default profile item for demo
      if (currentUserEmail && !userList.some(u => u.email.toLowerCase() === currentUserEmail.toLowerCase())) {
        const currentProfile: UserProfile = {
          id: "current_user_admin",
          userId: "admin_uid",
          email: currentUserEmail,
          displayName: currentUserEmail.split('@')[0],
          role: "admin",
          plan: "vip",
          status: "active",
          updatedAt: new Date().toISOString()
        };
        userList.unshift(currentProfile);
      }
      setUsers(userList);
      setLoadingUsers(false);
    }, (err) => {
      console.warn("Error fetching users:", err);
      setLoadingUsers(false);
    });

    return () => unsubscribe();
  }, [isOpen, currentUserEmail]);

  // Load Banners from Firestore
  useEffect(() => {
    if (!isOpen) return;
    setLoadingBanners(true);

    const bannersRef = collection(db, "banners");
    const unsubscribe = onSnapshot(bannersRef, (snapshot) => {
      const bannerList: Banner[] = [];
      snapshot.forEach((docSnap) => {
        bannerList.push({ id: docSnap.id, ...docSnap.data() } as Banner);
      });
      setBanners(bannerList);
      setLoadingBanners(false);
    }, (err) => {
      console.warn("Error fetching banners:", err);
      setLoadingBanners(false);
    });

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  // Save API Keys to Firestore
  const handleSaveApiKeys = async () => {
    setSavingSettings(true);
    try {
      await setDoc(doc(db, "app_settings", "config"), {
        windyApiKey: windyKey.trim(),
        openWeatherApiKey: weatherKey.trim(),
        geminiApiKey: geminiKey.trim(),
        announcementText,
        announcementActive,
        announcementType,
        requireLoginForCams,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setApiSaveSuccess(true);
      setTimeout(() => setApiSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving API keys:", err);
    } finally {
      setSavingSettings(false);
    }
  };

  // Save General Settings
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await setDoc(doc(db, "app_settings", "config"), {
        announcementText: announcementText.trim(),
        announcementActive,
        announcementType,
        requireLoginForCams,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving settings:", err);
    } finally {
      setSavingSettings(false);
    }
  };

  // Add User / Subscriber
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim()) return;

    try {
      await addDoc(collection(db, "user_profiles"), {
        userId: `user_${Date.now()}`,
        email: newUserEmail.trim().toLowerCase(),
        displayName: newUserName.trim() || newUserEmail.split('@')[0],
        role: newUserRole,
        plan: newUserPlan,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      setNewUserEmail("");
      setNewUserName("");
      setShowAddUserModal(false);
    } catch (err) {
      console.error("Error adding user:", err);
    }
  };

  // Toggle User Status or Plan
  const handleUpdateUserPlan = async (userId: string, newPlan: 'free' | 'pro' | 'vip') => {
    try {
      const userDocRef = doc(db, "user_profiles", userId);
      await updateDoc(userDocRef, {
        plan: newPlan,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error updating user plan:", err);
    }
  };

  const handleUpdateUserStatus = async (userId: string, newStatus: 'active' | 'suspended') => {
    try {
      const userDocRef = doc(db, "user_profiles", userId);
      await updateDoc(userDocRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error updating user status:", err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo utente/iscrizione?")) return;
    try {
      await deleteDoc(doc(db, "user_profiles", userId));
    } catch (err) {
      console.error("Error deleting user:", err);
    }
  };

  // Add Banner
  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBannerTitle.trim()) return;

    try {
      await addDoc(collection(db, "banners"), {
        title: newBannerTitle.trim(),
        subtitle: newBannerSubtitle.trim(),
        imageUrl: newBannerImageUrl.trim(),
        linkUrl: newBannerLinkUrl.trim(),
        position: newBannerPosition,
        active: true,
        type: newBannerImageUrl ? 'image' : 'text',
        createdAt: new Date().toISOString()
      });

      setNewBannerTitle("");
      setNewBannerSubtitle("");
      setNewBannerImageUrl("");
      setNewBannerLinkUrl("");
      setShowAddBanner(false);
    } catch (err) {
      console.error("Error adding banner:", err);
    }
  };

  const handleToggleBannerActive = async (bannerId: string, currentActive: boolean) => {
    try {
      await updateDoc(doc(db, "banners", bannerId), {
        active: !currentActive
      });
    } catch (err) {
      console.error("Error toggling banner:", err);
    }
  };

  const handleDeleteBanner = async (bannerId: string) => {
    if (!window.confirm("Eliminare questo banner pubblicitario?")) return;
    try {
      await deleteDoc(doc(db, "banners", bannerId));
    } catch (err) {
      console.error("Error deleting banner:", err);
    }
  };

  // Copy VPS .env snippet
  const copyEnvSnippet = () => {
    const text = `PORT=3300\nNODE_ENV=production\nWINDY_API_KEY=${windyKey || 'tua_key'}\nOPENWEATHERMAP_API_KEY=${weatherKey || 'tua_key'}\nGEMINI_API_KEY=${geminiKey || 'tua_key'}`;
    navigator.clipboard.writeText(text);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2500);
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.displayName.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Pannello Amministratore
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase rounded-full border border-emerald-500/30">
                  ADMIN LIVE
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Gestisci chiavi API, abbonati, banner promozionali e impostazioni di sistema
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content Area (Sidebar + Body) */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          
          {/* Navigation Sidebar */}
          <div className="w-full md:w-64 bg-slate-950/50 border-b md:border-b-0 md:border-r border-slate-800 p-3 shrink-0 flex md:flex-col gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('api_keys')}
              className={`flex-1 md:flex-none flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left whitespace-nowrap ${
                activeTab === 'api_keys'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Key className="w-4 h-4 shrink-0" />
              <span>Chiavi API & VPS</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 md:flex-none flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left whitespace-nowrap ${
                activeTab === 'users'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <div className="flex items-center justify-between w-full">
                <span>Iscrizioni & Utenti</span>
                <span className="ml-1 px-1.5 py-0.2 bg-slate-800 text-slate-300 text-[10px] rounded-full">
                  {users.length}
                </span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('banners')}
              className={`flex-1 md:flex-none flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left whitespace-nowrap ${
                activeTab === 'banners'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Megaphone className="w-4 h-4 shrink-0" />
              <div className="flex items-center justify-between w-full">
                <span>Banner & Ads</span>
                <span className="ml-1 px-1.5 py-0.2 bg-slate-800 text-slate-300 text-[10px] rounded-full">
                  {banners.length}
                </span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 md:flex-none flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Annunci & App</span>
            </button>
          </div>

          {/* Tab View Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            
            {/* TAB 1: API KEYS & SERVER CONFIG */}
            {activeTab === 'api_keys' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Key className="w-4 h-4 text-blue-400" />
                    Gestione Chiavi API Servizi Esterni
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configura o aggiorna le chiavi API per Windy Webcams, OpenWeatherMap e Gemini AI.
                  </p>
                </div>

                {apiSaveSuccess && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Chiavi API salvate con successo nel database Firestore!</span>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Windy Webcams Key */}
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                        <span>Windy Webcams API Key</span>
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] rounded-md font-semibold">
                          Live Streams
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowKeys(prev => ({ ...prev, windy: !prev.windy }))}
                        className="text-slate-400 hover:text-white text-xs flex items-center gap-1"
                      >
                        {showKeys.windy ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showKeys.windy ? 'Nascondi' : 'Mostra'}</span>
                      </button>
                    </div>
                    <input
                      type={showKeys.windy ? "text" : "password"}
                      value={windyKey}
                      onChange={(e) => setWindyKey(e.target.value)}
                      placeholder="es. 4K2x...2a9f"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-[11px] text-slate-500">
                      Richiesta per recuperare la lista delle live webcam e i flussi video HD da Windy.
                    </p>
                  </div>

                  {/* OpenWeatherMap Key */}
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                        <span>OpenWeatherMap API Key</span>
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] rounded-md font-semibold">
                          Meteo Live
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowKeys(prev => ({ ...prev, weather: !prev.weather }))}
                        className="text-slate-400 hover:text-white text-xs flex items-center gap-1"
                      >
                        {showKeys.weather ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showKeys.weather ? 'Nascondi' : 'Mostra'}</span>
                      </button>
                    </div>
                    <input
                      type={showKeys.weather ? "text" : "password"}
                      value={weatherKey}
                      onChange={(e) => setWeatherKey(e.target.value)}
                      placeholder="es. a1b2c3d4e5f6..."
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-[11px] text-slate-500">
                      Utilizzata per recuperare temperatura, vento e condizioni meteo in tempo reale.
                    </p>
                  </div>

                  {/* Gemini AI Key */}
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                        <span>Google Gemini AI API Key</span>
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] rounded-md font-semibold">
                          IA meteo
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowKeys(prev => ({ ...prev, gemini: !prev.gemini }))}
                        className="text-slate-400 hover:text-white text-xs flex items-center gap-1"
                      >
                        {showKeys.gemini ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showKeys.gemini ? 'Nascondi' : 'Mostra'}</span>
                      </button>
                    </div>
                    <input
                      type={showKeys.gemini ? "text" : "password"}
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      placeholder="es. AIzaSy..."
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-[11px] text-slate-500">
                      Per generare report meteorologici intelligenti, consigli di viaggio ed estratti AI.
                    </p>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleSaveApiKeys}
                      disabled={savingSettings}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>Salva Chiavi API</span>
                    </button>
                  </div>
                </div>

                {/* VPS Deployment Helper Box */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                      <Server className="w-4 h-4 text-emerald-400" />
                      <span>Configurazione `.env` per Hostinger VPS</span>
                    </div>
                    <button
                      onClick={copyEnvSnippet}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      {copiedEnv ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedEnv ? 'Copiato!' : 'Copia Snippet .env'}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-900 text-[11px] font-mono text-slate-300 rounded-lg overflow-x-auto border border-slate-800/80 leading-relaxed">
{`PORT=3300
NODE_ENV=production
WINDY_API_KEY=${windyKey || 'tua_windy_key'}
OPENWEATHERMAP_API_KEY=${weatherKey || 'tua_openweather_key'}
GEMINI_API_KEY=${geminiKey || 'tua_gemini_key'}`}
                  </pre>
                  <p className="text-[11px] text-slate-500">
                    Incolla questo blocco nel file <code className="text-slate-300 font-mono">.env</code> nella cartella <code className="text-slate-300 font-mono">/var/www/live-webcams</code> della tua VPS e riavvia il container con <code className="text-slate-300 font-mono">docker compose restart</code>.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: USERS & SUBSCRIPTIONS */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      Gestione Iscrizioni e Piani Utenti
                    </h3>
                    <p className="text-xs text-slate-400">
                      Visualizza abbonati, modifica ruoli (Admin/User) e piani di abbonamento (Gratuito, PRO, VIP).
                    </p>
                  </div>

                  <button
                    onClick={() => setShowAddUserModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 shrink-0 self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Aggiungi Abbonato</span>
                  </button>
                </div>

                {/* Overview Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Totale Iscritti</span>
                    <span className="text-lg font-extrabold text-white">{users.length}</span>
                  </div>
                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Abbonati PRO</span>
                    <span className="text-lg font-extrabold text-emerald-400">{users.filter(u => u.plan === 'pro').length}</span>
                  </div>
                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">Membri VIP</span>
                    <span className="text-lg font-extrabold text-purple-400">{users.filter(u => u.plan === 'vip').length}</span>
                  </div>
                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">Amministratori</span>
                    <span className="text-lg font-extrabold text-amber-400">{users.filter(u => u.role === 'admin').length}</span>
                  </div>
                </div>

                {/* Filter & Search bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Cerca iscritto per email o nome..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Users Table */}
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Utente / Email</th>
                          <th className="px-4 py-3">Ruolo</th>
                          <th className="px-4 py-3">Piano Abbonamento</th>
                          <th className="px-4 py-3">Stato</th>
                          <th className="px-4 py-3 text-right">Azioni</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-slate-500 text-xs">
                              Nessun utente trovato.
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-900/50 transition-colors">
                              <td className="px-4 py-3">
                                <div className="font-bold text-white">{u.displayName || u.email.split('@')[0]}</div>
                                <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                              </td>
                              <td className="px-4 py-3">
                                {u.role === 'admin' ? (
                                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded-md border border-amber-500/30 flex items-center gap-1 w-fit">
                                    <Crown className="w-3 h-3" /> Admin
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-semibold rounded-md w-fit inline-block">
                                    Utente
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  value={u.plan || 'free'}
                                  onChange={(e) => handleUpdateUserPlan(u.id, e.target.value as any)}
                                  className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500 font-medium"
                                >
                                  <option value="free">Gratuito (€0)</option>
                                  <option value="pro">PRO Weather (€4.99/m)</option>
                                  <option value="vip">VIP Cams (€9.99/m)</option>
                                </select>
                              </td>
                              <td className="px-4 py-3">
                                {u.status === 'suspended' ? (
                                  <span className="px-2 py-0.5 bg-red-500/20 text-red-300 text-[10px] font-bold rounded-md border border-red-500/30">
                                    Sospeso
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-md border border-emerald-500/30">
                                    Attivo
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right space-x-1.5">
                                <button
                                  onClick={() => handleUpdateUserStatus(u.id, u.status === 'suspended' ? 'active' : 'suspended')}
                                  title={u.status === 'suspended' ? 'Attiva' : 'Sospendi'}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                                >
                                  {u.status === 'suspended' ? <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> : <UserX className="w-3.5 h-3.5 text-amber-400" />}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  title="Elimina"
                                  className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-400 hover:text-white transition-colors border border-red-500/30"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Add User Modal Dialog */}
                {showAddUserModal && (
                  <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4">
                    <form onSubmit={handleAddUser} className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 text-slate-100 shadow-2xl">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-400" />
                          Aggiungi Nuovo Abbonato / Utente
                        </h4>
                        <button
                          type="button"
                          onClick={() => setShowAddUserModal(false)}
                          className="text-slate-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                          Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          placeholder="utente@esempio.com"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                          Nome
                        </label>
                        <input
                          type="text"
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          placeholder="Nome e cognome"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                            Ruolo
                          </label>
                          <select
                            value={newUserRole}
                            onChange={(e) => setNewUserRole(e.target.value as any)}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                          >
                            <option value="user">Utente Standard</option>
                            <option value="admin">Amministratore</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                            Piano Abbonamento
                          </label>
                          <select
                            value={newUserPlan}
                            onChange={(e) => setNewUserPlan(e.target.value as any)}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                          >
                            <option value="free">Gratuito</option>
                            <option value="pro">PRO Weather</option>
                            <option value="vip">VIP Cams</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => setShowAddUserModal(false)}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs"
                        >
                          Annulla
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/30"
                        >
                          Crea Abbonamento
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: BANNERS & PROMOTIONS */}
            {activeTab === 'banners' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-blue-400" />
                      Gestione Banner e Pubblicità
                    </h3>
                    <p className="text-xs text-slate-400">
                      Aggiungi e gestisci i banner promozionali o inserzioni pubblicitarie visualizzati nell'app.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowAddBanner(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 shrink-0 self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nuovo Banner</span>
                  </button>
                </div>

                {/* Banner List */}
                {banners.length === 0 ? (
                  <div className="p-8 bg-slate-950 border border-slate-800 rounded-xl text-center space-y-2">
                    <Megaphone className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400 font-medium">Nessun banner promozionale attivo.</p>
                    <p className="text-[11px] text-slate-500">
                      Clicca su "Nuovo Banner" per creare annunci pubblicitari o avvisi visibili sotto il player delle webcam.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {banners.map((b) => (
                      <div 
                        key={b.id} 
                        className={`p-4 rounded-xl border transition-all ${
                          b.active 
                            ? 'bg-slate-950 border-slate-800' 
                            : 'bg-slate-950/40 border-slate-800/40 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-bold rounded-md uppercase tracking-wider">
                              Posizione: {b.position}
                            </span>
                            <h4 className="text-sm font-bold text-white mt-1">{b.title}</h4>
                            {b.subtitle && <p className="text-xs text-slate-400 mt-0.5">{b.subtitle}</p>}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleToggleBannerActive(b.id, b.active)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                                b.active 
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {b.active ? 'ATTIVO' : 'DISATTIVO'}
                            </button>
                            <button
                              onClick={() => handleDeleteBanner(b.id)}
                              className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-400 hover:text-white transition-colors border border-red-500/30"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {b.imageUrl && (
                          <div className="mt-2 rounded-lg overflow-hidden border border-slate-800 max-h-32 bg-slate-900">
                            <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" />
                          </div>
                        )}

                        {b.linkUrl && (
                          <a 
                            href={b.linkUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="mt-3 text-[11px] text-blue-400 hover:underline flex items-center gap-1 font-mono truncate"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span>{b.linkUrl}</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Create Banner Modal */}
                {showAddBanner && (
                  <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4">
                    <form onSubmit={handleAddBanner} className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 text-slate-100 shadow-2xl">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <Megaphone className="w-4 h-4 text-blue-400" />
                          Crea Nuovo Banner Promozionale
                        </h4>
                        <button
                          type="button"
                          onClick={() => setShowAddBanner(false)}
                          className="text-slate-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                          Titolo Banner / Sponsor *
                        </label>
                        <input
                          type="text"
                          required
                          value={newBannerTitle}
                          onChange={(e) => setNewBannerTitle(e.target.value)}
                          placeholder="es. Offerta Hotel e Skipass Cortina"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                          Sottotitolo / Descrizione o Call to Action
                        </label>
                        <input
                          type="text"
                          value={newBannerSubtitle}
                          onChange={(e) => setNewBannerSubtitle(e.target.value)}
                          placeholder="es. Sconto del 20% prenotando direttamente dal sito"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                          URL Immagine Banner (Opzionale)
                        </label>
                        <input
                          type="url"
                          value={newBannerImageUrl}
                          onChange={(e) => setNewBannerImageUrl(e.target.value)}
                          placeholder="https://immagini.esempio.com/banner.jpg"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                          Link Destinazione (Opzionale)
                        </label>
                        <input
                          type="url"
                          value={newBannerLinkUrl}
                          onChange={(e) => setNewBannerLinkUrl(e.target.value)}
                          placeholder="https://www.sito-partner.com"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                          Posizione del Banner
                        </label>
                        <select
                          value={newBannerPosition}
                          onChange={(e) => setNewBannerPosition(e.target.value as any)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                        >
                          <option value="under_player">Sotto il Player della Webcam (Scelta Consigliata)</option>
                          <option value="header">In alto (Header Bar)</option>
                          <option value="sidebar">Barra Laterale (Sidebar)</option>
                        </select>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => setShowAddBanner(false)}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs"
                        >
                          Annulla
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/30"
                        >
                          Pubblica Banner
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: SYSTEM ANNOUNCEMENTS & APP SETTINGS */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-blue-400" />
                    Annunci di Sistema e Controllo Funzionalità
                  </h3>
                  <p className="text-xs text-slate-400">
                    Mostra un messaggio d'avviso visibile a tutti gli utenti in cima all'applicazione o modifica i requisiti di accesso.
                  </p>
                </div>

                {settingsSuccess && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Impostazioni aggiornate con successo!</span>
                  </div>
                )}

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-amber-400" />
                      <span>Barra Annuncio di Sistema (Banner Iniziale)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setAnnouncementActive(!announcementActive)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        announcementActive 
                          ? 'bg-emerald-500 text-slate-950' 
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {announcementActive ? 'ATTIVA' : 'DISATTIVATA'}
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      Testo Annuncio
                    </label>
                    <input
                      type="text"
                      value={announcementText}
                      onChange={(e) => setAnnouncementText(e.target.value)}
                      placeholder="es. Nuove webcam in diretta streaming 4K aggiunte per Roma e Milano!"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      Stile Avviso
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setAnnouncementType('info')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                          announcementType === 'info'
                            ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        Informativo (Blu)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnnouncementType('warning')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                          announcementType === 'warning'
                            ? 'bg-amber-600/30 border-amber-500 text-amber-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        Avviso (Giallo)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnnouncementType('success')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                          announcementType === 'success'
                            ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        Promozione (Verde)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Richiedi Registrazione per vedere Live Cam HD</span>
                      <span className="text-[11px] text-slate-500">Se attivo, gli ospiti dovranno accedere con Email o Google per lo streaming video.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={requireLoginForCams}
                      onChange={(e) => setRequireLoginForCams(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-800 text-blue-600 focus:ring-blue-500 bg-slate-900"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>Salva Impostazioni App</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
