import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tabe.app',
  appName: 'TABE',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
