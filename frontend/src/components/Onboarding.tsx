import React, { useState } from 'react';
import { LogIn, UserPlus, Gamepad2, Compass } from 'lucide-react';
import { User } from '../types.ts';

interface OnboardingProps {
  onLogin: (user: User, token: string) => void;
  preseededUsers: User[];
}

export const Onboarding: React.FC<OnboardingProps> = ({ onLogin, preseededUsers }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('https://api.dicebear.com/7.x/pixel-art/svg?seed=merlin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (userEmail: string) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: userEmail })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Fallo de inicio de sesión');
      }
      onLogin(data.user, data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim()) {
      setError('Por favor rellena los campos necesarios.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, bio, avatar })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al registrarse');
      }
      onLogin(data.user, data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] flex flex-col items-center justify-center p-4 selection:bg-blue-600 selection:text-white">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-[#0f121d] border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-blue-600/20 text-blue-500 rounded-2xl mb-3 border border-blue-500/30">
            <Gamepad2 className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-white mb-1">
            GameTracker
          </h1>
          <p className="text-slate-400 text-sm text-center">
            Organiza tus videojuegos, sigue tus progresos y descubre recomendaciones con tus amigos
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-500/30 text-red-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Action Toggle Tab */}
        <div className="flex bg-[#07090e] p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${!isRegister ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Compass className="w-3.5 h-3.5" /> Entrar como...
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(''); }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${isRegister ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Crear cuenta
          </button>
        </div>

        {/* Login selector */}
        {!isRegister ? (
          <div>
            <div className="mb-6">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block mb-3">
                Entrar rápido (Simulación Red Social)
              </span>
              <div className="grid grid-cols-2 gap-3">
                {preseededUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleSignIn(user.email)}
                    disabled={loading}
                    className="p-3 bg-[#07090e] border border-slate-800/80 hover:border-blue-600/50 rounded-xl transition text-left group"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <img
                        src={user.avatar}
                        alt={user.username}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full border border-slate-800 group-hover:border-blue-500/30"
                      />
                      <div className="truncate">
                        <p className="text-xs font-bold text-white group-hover:text-blue-400 transition truncate">
                          @{user.username}
                        </p>
                        <p className="text-[9px] text-slate-500 truncate capitalize">
                          {user.username.split('_')[1] || 'gamer'}
                        </p>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-2 h-7">
                      {user.bio}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-4 text-xs text-slate-600">O ingresa manualmente</span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSignIn(email); }} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  placeholder="ejemplo@correo.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#07090e] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 transition outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                {loading ? 'Entrando...' : 'Iniciar Sesión'}
              </button>
            </form>
          </div>
        ) : (
          /* Register Form */
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Nombre de Usuario
              </label>
              <input
                type="text"
                placeholder="ej. ezio_auditore"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#07090e] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 transition outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Correo Electrónico
              </label>
              <input
                type="email"
                placeholder="ejemplo@correo.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#07090e] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 transition outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Biografía
              </label>
              <textarea
                placeholder="Cuéntanos un poco sobre tus gustos gamer..."
                value={bio}
                rows={2}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-[#07090e] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 transition outline-none resize-none"
              ></textarea>
            </div>

            {/* Avatar picker simulation */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Elige tu Pixel Avatar
              </label>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {['merlin', 'snickers', 'shadow', 'mittens', 'king', 'coco', 'leo'].map(seed => {
                  const url = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}`;
                  return (
                    <button
                      key={seed}
                      type="button"
                      onClick={() => setAvatar(url)}
                      className={`flex-shrink-0 p-1 rounded-full border-2 transition ${avatar === url ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800'}`}
                    >
                      <img
                        src={url}
                        alt={seed}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-full"
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              {loading ? 'Registrando...' : 'Crear mi Diario Gamer'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
