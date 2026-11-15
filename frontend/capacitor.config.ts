import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'space.gametracker.app',
  appName: 'GameTracker',
  webDir: 'dist',
  android: {
    loggingBehavior: 'none'
  }
};

export default config;
