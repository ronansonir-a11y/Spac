import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'space.aether6.game',
  appName: 'AETHER-6',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    backgroundColor: '#03070d',
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
