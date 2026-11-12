import { lazy, StrictMode, Suspense } from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './i18n.tsx';
import './index.css';

const Analytics = lazy(() => import('@vercel/analytics/react').then(m => ({ default: m.Analytics })));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
    <Suspense fallback={null}>
      <Analytics />
    </Suspense>
  </StrictMode>,
);
