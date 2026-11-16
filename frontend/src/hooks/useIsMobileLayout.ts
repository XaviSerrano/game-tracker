import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

const MOBILE_VIEWPORT_QUERY = '(max-width: 767px)';

export const useIsMobileLayout = () => {
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_VIEWPORT_QUERY).matches
  );

  useEffect(() => {
    const mobileViewport = window.matchMedia(MOBILE_VIEWPORT_QUERY);
    const updateMobileViewport = (event: MediaQueryListEvent) => setIsMobileViewport(event.matches);

    setIsMobileViewport(mobileViewport.matches);
    mobileViewport.addEventListener('change', updateMobileViewport);
    return () => mobileViewport.removeEventListener('change', updateMobileViewport);
  }, []);

  return Capacitor.isNativePlatform() || isMobileViewport;
};
