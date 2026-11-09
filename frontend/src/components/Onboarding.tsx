import React, { useEffect, useState } from 'react';
import { ArrowLeft, Compass, Eye, EyeOff, Gamepad2, KeyRound, LogIn, Mail, UserPlus } from 'lucide-react';
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

interface PasswordInputProps {
  id: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  className: string;
  confirmation?: boolean;
  autoComplete: 'current-password' | 'new-password';
}

const PasswordInput: React.FC<PasswordInputProps> = ({ id, placeholder, value, onChange, className, confirmation = false, autoComplete }) => {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const label = confirmation
    ? t(visible ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña')
    : t(visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        id={id}
        name={confirmation ? 'confirmPassword' : 'password'}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${className} pr-14 sm:pr-14`}
      />
      <button
        type="button"
        aria-label={label}
        aria-controls={id}
        title={label}
        onClick={() => setVisible(previous => !previous)}
        className="absolute right-0 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#e5b974]"
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
};

export const Onboarding: React.FC<OnboardingProps> = ({ onLogin, preseededUsers, notice }) => {
  const { t } = useLanguage();
  const fieldLabelClassName = 'mb-2 block text-base font-medium text-slate-300 sm:text-xs';
  const fieldClassName = 'w-full min-h-12 rounded-xl border border-slate-800 bg-[#07090e] px-3 py-3 text-base text-white placeholder:text-slate-500 outline-none transition focus:border-[#d9a352] focus:ring-2 focus:ring-[#d9a352]/20 sm:px-4 sm:py-2.5 sm:text-sm';
  const primaryButtonClassName = 'flex min-h-12 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#d9a352] px-4 py-3 text-sm font-semibold text-[#17120a] transition hover:bg-[#e5b974] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e5b974] disabled:cursor-not-allowed disabled:opacity-50 sm:py-2.5 sm:text-xs';
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
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
        body: JSON.stringify({ username, email, password, bio })
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
    <div className="relative flex min-h-dvh flex-col items-center justify-center p-4 antialiased selection:bg-[#d9a352]/40 selection:text-white">
      <div className="absolute right-4 top-4">
        <LanguageSelector compact />
      </div>
      <div className="pointer-events-none absolute left-1/4 top-1/4 h-72 w-72 rounded-full bg-[#d9a352]/10 blur-3xl"></div>
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-[#e5b974]/5 blur-3xl"></div>

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700/80 bg-[#0f121d] p-5 shadow-2xl sm:p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-3 rounded-2xl border border-[#d9a352]/25 bg-[#d9a352]/10 p-3 text-[#e5b974]">
            <Gamepad2 className="w-8 h-8" />
          </div>
          <h1 className="mb-1 text-balance text-3xl font-semibold font-display tracking-tight text-white">
            GameTracker
          </h1>
          <p className="max-w-[42ch] text-pretty text-center text-base text-slate-300 sm:text-sm">
            {t('Organiza tus videojuegos, sigue tus progresos y descubre recomendaciones con tus amigos')}
          </p>
        </div>

        {notice && (
          <div role="alert" className="mb-4 rounded-xl border border-blue-500/20 bg-blue-950/30 p-3 text-base text-blue-300 sm:text-xs">
            {notice}
          </div>
        )}

        {error && (
          <div role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-base text-red-400 sm:text-xs">
            {t(error)}
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 space-y-2 rounded-xl border border-blue-500/20 bg-blue-950/30 p-3 text-base text-blue-300 sm:text-xs">
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
          <div className="flex rounded-xl border border-slate-800 bg-[#07090e] p-1">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e5b974] sm:min-h-9 sm:text-xs ${!isRegister ? 'border border-[#d9a352]/20 bg-[#d9a352]/10 text-[#e5b974]' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Compass className="w-3.5 h-3.5" /> {t('Iniciar sesión')}
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e5b974] sm:min-h-9 sm:text-xs ${isRegister ? 'border border-[#d9a352]/20 bg-[#d9a352]/10 text-[#e5b974]' : 'text-slate-400 hover:text-slate-200'}`}
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
                <label htmlFor="login-email" className={fieldLabelClassName}>
                  {t('Correo Electrónico')}
                </label>
                <input
                  type="email"
                  id="login-email"
                  placeholder={t('ejemplo@correo.com')}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={fieldClassName}
                />
              </div>

              <div>
                <label htmlFor="login-password" className={fieldLabelClassName}>
                  {t('Contraseña')}
                </label>
                <PasswordInput
                  id="login-password"
                  placeholder={t('Tu contraseña')}
                  value={password}
                  onChange={setPassword}
                  autoComplete="current-password"
                  className={fieldClassName}
                />
              </div>

              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="cursor-pointer text-sm text-blue-400 transition hover:text-blue-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e5b974] sm:text-xs"
              >
                {t('¿Has olvidado tu contraseña?')}
              </button>

              <button
                type="submit"
                disabled={loading}
                className={primaryButtonClassName}
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
              <label htmlFor="register-username" className={fieldLabelClassName}>
                {t('Nombre de Usuario')}
              </label>
              <input
                type="text"
                id="register-username"
                placeholder={t('ej. ezio_auditore')}
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={fieldClassName}
              />
            </div>

            <div>
              <label htmlFor="register-email" className={fieldLabelClassName}>
                {t('Correo Electrónico')}
              </label>
              <input
                type="email"
                id="register-email"
                placeholder={t('ejemplo@correo.com')}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldClassName}
              />
            </div>

            <div>
              <label htmlFor="register-password" className={fieldLabelClassName}>
                {t('Contraseña')}
              </label>
              <PasswordInput
                id="register-password"
                placeholder={t('Mínimo 8 caracteres')}
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                className={fieldClassName}
              />
            </div>

            <div>
              <label htmlFor="register-confirm-password" className={fieldLabelClassName}>
                {t('Confirmar Contraseña')}
              </label>
              <PasswordInput
                id="register-confirm-password"
                placeholder={t('Repite tu contraseña')}
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
                confirmation
                className={fieldClassName}
              />
            </div>

            <div>
              <label htmlFor="register-bio" className={fieldLabelClassName}>
                {t('Biografía')}
              </label>
              <textarea
                id="register-bio"
                placeholder={t('Cuéntanos un poco sobre tus gustos gamer...')}
                value={bio}
                rows={2}
                onChange={(e) => setBio(e.target.value)}
                className={`${fieldClassName} min-h-24 resize-none`}
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={primaryButtonClassName}
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
              className="flex items-center gap-1 text-sm text-slate-400 transition hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e5b974] sm:text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> {t('Volver al login')}
            </button>

            <div>
              <label htmlFor="forgot-email" className={fieldLabelClassName}>
                {t('Correo Electrónico')}
              </label>
              <input
                type="email"
                id="forgot-email"
                placeholder={t('ejemplo@correo.com')}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldClassName}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={primaryButtonClassName}
            >
              <Mail className="w-4 h-4" />
              {loading ? t('Enviando enlace...') : t('Enviar enlace de recuperación')}
            </button>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-950/20 p-3 text-base text-blue-300 sm:text-xs">
              <KeyRound className="w-4 h-4" />
              <span>{t('El enlace de recuperación está activo. Define tu nueva contraseña.')}</span>
            </div>

            <div>
              <label htmlFor="reset-password" className={fieldLabelClassName}>
                {t('Nueva Contraseña')}
              </label>
              <PasswordInput
                id="reset-password"
                placeholder={t('Mínimo 8 caracteres')}
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                className={fieldClassName}
              />
            </div>

            <div>
              <label htmlFor="reset-confirm-password" className={fieldLabelClassName}>
                {t('Confirmar Nueva Contraseña')}
              </label>
              <PasswordInput
                id="reset-confirm-password"
                placeholder={t('Repite la nueva contraseña')}
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
                confirmation
                className={fieldClassName}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={primaryButtonClassName}
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
