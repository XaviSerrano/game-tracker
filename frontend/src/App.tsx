import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Gamepad2,
  Compass,
  Library as LibIcon,
  List,
  BarChart2,
  User as UserIcon,
  LogOut,
  ChevronRight,
  RefreshCw,
  Sparkles
} from 'lucide-react';

import { User } from './types.ts';
import { Onboarding } from './components/Onboarding.tsx';
import { HomeFeed } from './components/HomeFeed.tsx';
import { Discover } from './components/Discover.tsx';
import { GameDetails } from './components/GameDetails.tsx';
import { Library } from './components/Library.tsx';
import { CustomLists } from './components/CustomLists.tsx';
import { UserProfile } from './components/UserProfile.tsx';
import { StatsDashboard } from './components/StatsDashboard.tsx';

type MainTab = 'feed' | 'discover' | 'library' | 'lists' | 'stats' | 'profile';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MainTab>('feed');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Sub-navigation targets
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Load state from local storage or verify session
  const verifySession = async () => {
    setLoading(true);
    const storedToken = localStorage.getItem('gt_token');
    if (storedToken) {
      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${storedToken}`
          }
        });
        if (res.ok) {
          const userData = await res.json();
          setCurrentUser(userData);
          setToken(storedToken);
        } else {
          localStorage.removeItem('gt_token');
        }
      } catch (err) {
        console.error("Session verification failed:", err);
      }
    }

    // Prefetch all community users for onboarding switches or profile rendering
    try {
      const usersRes = await fetch('/api/social/feed?scope=all');
      if (usersRes.ok) {
        // Can also fetch from general community list, let's load all seeded users
        const usersListRes = await fetch('/api/games'); // helper to ping server. We know seed users exist.
        // Let's resolve with preseeded profiles manually or through a clean local query if server was launched
        const mockGamers: User[] = [
          { id: "user_alex", username: "alex_gamer", email: "alex@gametracker.com", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=alex", bio: "RPG & Soulsborne fanatic. Playing games since 1998, always chasing the 100% completion.", createdAt: "" },
          { id: "user_sam", username: "vance_retro", email: "sam@gametracker.com", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=sam", bio: "Retro gaming collector. Chrono Trigger is the undisputed GOAT. CRTs are mandatory.", createdAt: "" },
          { id: "user_lucia", username: "lucia_indie", email: "lucia@gametracker.com", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=lucia", bio: "Indie games advocate. Pixel art, cozy farm simulators, and rogue-lites make my day.", createdAt: "" },
          { id: "user_marcos", username: "marcos_rpg", email: "marcos@gametracker.com", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=marcos", bio: "JRPG player & completionist. Elden Ring was brilliant, but Chrono Trigger is art.", createdAt: "" }
        ];
        setAllUsers(mockGamers);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verifySession();
  }, []);

  const handleLoginSuccess = (user: User, userToken: string) => {
    setCurrentUser(user);
    setToken(userToken);
    localStorage.setItem('gt_token', userToken);
    setActiveTab('feed');
    setSelectedGameId(null);
    setSelectedUserId(null);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('gt_token');
    setSelectedGameId(null);
    setSelectedUserId(null);
  };

  const handleSwapAccount = async (targetEmail: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: targetEmail })
      });
      if (res.ok) {
        const data = await res.json();
        handleLoginSuccess(data.user, data.token);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNavigation = (tab: MainTab) => {
    setActiveTab(tab);
    setSelectedGameId(null);
    setSelectedUserId(null);
  };

  // Subnavigation shortcuts
  const handleSelectGame = (gameId: number) => {
    setSelectedGameId(gameId);
    setSelectedUserId(null);
  };

  const handleSelectUser = (uId: string) => {
    setSelectedUserId(uId);
    setSelectedGameId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Gamepad2 className="w-10 h-10 text-blue-500 animate-bounce mx-auto" />
          <p className="text-xs text-slate-500 font-mono tracking-widest animate-pulse">CARGANDO GAMETRACKER...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || !token) {
    return <Onboarding onLogin={handleLoginSuccess} preseededUsers={allUsers} />;
  }

  const renderActiveView = () => {
    if (selectedGameId !== null) {
      return (
        <GameDetails
          gameId={selectedGameId}
          currentUser={currentUser}
          token={token}
          onBack={() => setSelectedGameId(null)}
          onSelectUser={handleSelectUser}
        />
      );
    }

    if (selectedUserId !== null) {
      return (
        <UserProfile
          userId={selectedUserId}
          currentUser={currentUser}
          onUpdateCurrentUser={setCurrentUser}
          token={token}
          onSelectGame={handleSelectGame}
        />
      );
    }

    switch (activeTab) {
      case 'feed':
        return (
          <HomeFeed
            currentUser={currentUser}
            onSelectGame={handleSelectGame}
            onSelectUser={handleSelectUser}
            users={allUsers}
            token={token}
          />
        );
      case 'discover':
        return <Discover onSelectGame={handleSelectGame} />;
      case 'library':
        return <Library userId={currentUser.id} onSelectGame={handleSelectGame} token={token} />;
      case 'lists':
        return (
          <CustomLists
            currentUser={currentUser}
            onSelectGame={handleSelectGame}
            onSelectUser={handleSelectUser}
            token={token}
          />
        );
      case 'stats':
        return <StatsDashboard userId={currentUser.id} token={token} />;
      case 'profile':
        return (
          <UserProfile
            userId={currentUser.id}
            currentUser={currentUser}
            onUpdateCurrentUser={setCurrentUser}
            token={token}
            onSelectGame={handleSelectGame}
          />
        );
      default:
        return null;
    }
  };

  const navItems = [
    { id: 'feed', label: 'Inicio', icon: Compass },
    { id: 'discover', label: 'Descubrir', icon: Sparkles },
    { id: 'library', label: 'Biblioteca', icon: LibIcon },
    { id: 'lists', label: 'Listas', icon: List },
    { id: 'stats', label: 'Estadísticas', icon: BarChart2 },
    { id: 'profile', label: 'Mi Perfil', icon: UserIcon },
  ] as const;

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-200 flex flex-col md:flex-row font-sans">
      
      {/* 1. DESKTOP SIDEBAR SHELL */}
      <aside className="hidden md:flex flex-col justify-between w-64 bg-[#0f121d] border-r border-slate-850 p-5 shrink-0 fixed top-0 bottom-0 left-0 z-20">
        <div className="space-y-6">
          {/* Logo brand */}
          <div className="flex items-center gap-2.5 px-2">
            <div className="p-1.5 bg-blue-600/25 rounded-lg border border-blue-500/20 text-blue-500">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg font-display tracking-tight text-white select-none">
              GameTracker
            </span>
          </div>

          {/* User profile brief */}
          <div className="p-3 bg-[#07090e]/60 border border-slate-850/65 rounded-xl space-y-3">
            <div className="flex items-center gap-2.5">
              <img
                src={currentUser.avatar}
                alt={currentUser.username}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full border border-slate-800"
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">@{currentUser.username}</p>
                <p className="text-[10px] text-slate-500 truncate">Miembro activo</p>
              </div>
            </div>

            {/* Persona Switch dropdown */}
            <div className="space-y-1">
              <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest pl-1">Alternar cuenta</label>
              <select
                onChange={(e) => handleSwapAccount(e.target.value)}
                value={currentUser.email}
                className="w-full bg-[#07090e] border border-slate-800 rounded-lg p-1 px-1.5 text-[10px] text-slate-400 outline-none hover:border-slate-700 transition"
              >
                {allUsers.map(u => (
                  <option key={u.id} value={u.email}>@{u.username}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map(item => {
              const active = activeTab === item.id && selectedGameId === null && selectedUserId === null;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition duration-150 cursor-pointer ${active ? 'bg-blue-600 text-white border-blue-500Shadow' : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {active && <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer actions */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/10 rounded-xl transition cursor-pointer"
        >
          <LogOut className="w-4.5 h-4.5" /> Cerrar Sesión
        </button>
      </aside>

      {/* 2. MOBILE HEADER & NAVIGATION */}
      <header className="md:hidden flex items-center justify-between bg-[#0f121d] border-b border-slate-850 px-4 py-3 sticky top-0 left-0 right-0 z-30">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-blue-500" />
          <h1 className="font-bold text-sm font-display tracking-tight text-white">GameTracker</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Quick profile edit link */}
          <button
            onClick={() => handleNavigation('profile')}
            className="p-1 rounded-full border border-slate-800"
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.username}
              referrerPolicy="no-referrer"
              className="w-6 h-6 rounded-full"
            />
          </button>
          <button
            onClick={handleLogout}
            className="p-1.5 text-red-400"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </header>

      {/* 3. CORE VIEWPORT CONTAINER */}
      <main className="flex-1 p-4 md:p-8 md:pl-72 min-w-0 max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + (selectedGameId || '') + (selectedUserId || '')}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.18 }}
          >
            {renderActiveView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 4. MOBILE BOTTOM NAV RAIL */}
      <nav className="md:hidden flex items-center justify-around bg-[#0f121d] border-t border-slate-850 fixed bottom-0 left-0 right-0 h-16 px-2 py-1 z-30">
        {navItems.map(item => {
          const active = activeTab === item.id && selectedGameId === null && selectedUserId === null;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.id)}
              className={`flex flex-col items-center gap-1 p-1 transition cursor-pointer text-center relative ${active ? 'text-blue-500' : 'text-slate-500 hover:text-slate-350'}`}
            >
              <Icon className="w-4.5 h-4.5" />
              <span className="text-[9px] font-bold tracking-tight">{item.label}</span>
              {active && (
                <span className="absolute bottom-[-4px] w-4 h-0.5 bg-blue-500 rounded-full"></span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
