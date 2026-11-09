import React, { useEffect, useState } from 'react';
import { ArrowLeft, Compass, Gamepad2, KeyRound, LogIn, Mail, UserPlus } from 'lucide-react';
import { User } from '../types.ts';
import { useLanguage } from '../i18n.tsx';
import { LanguageSelector } from './LanguageSelector.tsx';

interface OnboardingProps {
  onLogin: (user: User) => void;
  preseededUsers: User[];
  notice?: string;
}

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

const DEMO_ACCOUNT_PASSWORD = 'demo1234';

export const Onboarding: React.FC<OnboardingProps> = ({ onLogin, preseededUsers, notice }) => {
  const { t } = useLanguage();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('https://api.dicebear.com/7.x/pixel-art/svg?seed=merlin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [debugResetUrl, setDebugResetUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tokenFromUrl = new URLSearchParams(window.location.search).get('resetToken');
    if (tokenFromUrl) {
      setMode('reset');
      setResetToken(tokenFromUrl);
      setInfoMessage(t('Introduce tu nueva contraseña para completar la recuperación.'));
    }
  }, []);

  const clearMessages = () => {
    setError('');
    setInfoMessage('');
    setDebugResetUrl(null);
  };

  const switchMode = (nextMode: AuthMode) => {
    clearMessages();
    setMode(nextMode);
    if (nextMode !== 'reset') {
      setResetToken('');
      const url = new URL(window.location.href);
      if (url.searchParams.has('resetToken')) {
        url.searchParams.delete('resetToken');
        window.history.replaceState({}, '', url.toString());
      }
    }
  };

  const prefillDemoUser = (user: User) => {
    setEmail(user.email);
    setPassword(DEMO_ACCOUNT_PASSWORD);
    clearMessages();
    setInfoMessage(`${t('Cuenta demo seleccionada. Usa la contraseña')} ${DEMO_ACCOUNT_PASSWORD}.`);
  };

  const handleSignIn = async (userEmail: string, userPassword: string) => {
    clearMessages();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: userEmail, password: userPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Fallo de inicio de sesión');
      }
      onLogin(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password) {
      setError(t('Por favor rellena los campos necesarios.'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('Las contraseñas no coinciden.'));
      return;
    }

    clearMessages();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password, bio, avatar })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al registrarse');
      }
      onLogin(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError(t('Introduce tu email para recuperar la contraseña.'));
      return;
    }

    clearMessages();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo iniciar la recuperación.');
      }

      setInfoMessage(t(data.message || 'Te hemos enviado instrucciones para restablecer la contraseña.'));
      setDebugResetUrl(typeof data.debugResetUrl === 'string' ? data.debugResetUrl : null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError(t('Completa la nueva contraseña y su confirmación.'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('Las contraseñas no coinciden.'));
      return;
    }
    if (!resetToken) {
      setError(t('Falta el token de recuperación. Vuelve a solicitar el enlace.'));
      return;
    }

    clearMessages();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: resetToken, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo actualizar la contraseña.');
      }

      const url = new URL(window.location.href);
      url.searchParams.delete('resetToken');
      window.history.replaceState({}, '', url.toString());
      onLogin(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isRegister = mode === 'register';
  const isForgot = mode === 'forgot';
  const isReset = mode === 'reset';

  return (
    <div className="relative min-h-screen bg-[#07090e] flex flex-col items-center justify-center p-4 selection:bg-blue-600 selection:text-white">
      <div className="absolute right-4 top-4">
        <LanguageSelector compact />
      </div>
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
            {t('Organiza tus videojuegos, sigue tus progresos y descubre recomendaciones con tus amigos')}
          </p>
        </div>

        {notice && (
          <div role="alert" className="mb-4 p-3 bg-blue-950/30 border border-blue-500/20 text-blue-300 text-xs rounded-xl">
            {notice}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-500/30 text-red-400 text-xs rounded-xl">
            {t(error)}
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 p-3 bg-blue-950/30 border border-blue-500/20 text-blue-300 text-xs rounded-xl space-y-2">
            <p>{t(infoMessage)}</p>
            {debugResetUrl && (
              <a
                href={debugResetUrl}
                className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 underline break-all"
              >
                <Mail className="w-3.5 h-3.5" /> {t('Abrir enlace de recuperación (modo local)')}
              </a>
            )}
          </div>
        )}

        {!isForgot && !isReset && (
          <div className="flex bg-[#07090e] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${!isRegister ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Compass className="w-3.5 h-3.5" /> {t('Iniciar sesión')}
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${isRegister ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <UserPlus className="w-3.5 h-3.5" /> {t('Crear cuenta')}
            </button>
          </div>
        )}

        {mode === 'login' && (
          <div>

            <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSignIn(email, password); }} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  {t('Correo Electrónico')}
                </label>
                <input
                  type="email"
                  placeholder={t('ejemplo@correo.com')}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#07090e] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 transition outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  {t('Contraseña')}
                </label>
                <input
                  type="password"
                  placeholder={t('Tu contraseña')}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#07090e] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 transition outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="text-xs text-blue-400 hover:text-blue-300 transition cursor-pointer"
              >
                {t('¿Has olvidado tu contraseña?')}
              </button>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                {loading ? t('Entrando...') : t('Iniciar Sesión')}
              </button>
            </form>
          </div>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                {t('Nombre de Usuario')}
              </label>
              <input
                type="text"
                placeholder={t('ej. ezio_auditore')}
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#07090e] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 transition outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                {t('Correo Electrónico')}
              </label>
              <input
                type="email"
                placeholder={t('ejemplo@correo.com')}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#07090e] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 transition outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                {t('Contraseña')}
              </label>
              <input
                type="password"
                placeholder={t('Mínimo 8 caracteres')}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#07090e] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 transition outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                {t('Confirmar Contraseña')}
              </label>
              <input
                type="password"
                placeholder={t('Repite tu contraseña')}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#07090e] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 transition outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                {t('Biografía')}
              </label>
              <textarea
                placeholder={t('Cuéntanos un poco sobre tus gustos gamer...')}
                value={bio}
                rows={2}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-[#07090e] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 transition outline-none resize-none"
              ></textarea>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                {t('Elige tu Pixel Avatar')}
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
              {loading ? t('Registrando...') : t('Crear mi Diario Gamer')}
            </button>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="text-xs text-slate-400 hover:text-slate-200 transition flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> {t('Volver al login')}
            </button>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                {t('Correo Electrónico')}
              </label>
              <input
                type="email"
                placeholder={t('ejemplo@correo.com')}
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
              <Mail className="w-4 h-4" />
              {loading ? t('Enviando enlace...') : t('Enviar enlace de recuperación')}
            </button>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="flex items-center gap-2 text-blue-300 text-xs bg-blue-950/20 border border-blue-500/20 rounded-xl p-3">
              <KeyRound className="w-4 h-4" />
              <span>{t('El enlace de recuperación está activo. Define tu nueva contraseña.')}</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                {t('Nueva Contraseña')}
              </label>
              <input
                type="password"
                placeholder={t('Mínimo 8 caracteres')}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#07090e] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 transition outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                {t('Confirmar Nueva Contraseña')}
              </label>
              <input
                type="password"
                placeholder={t('Repite la nueva contraseña')}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#07090e] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 transition outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              {loading ? t('Actualizando...') : t('Guardar nueva contraseña')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
