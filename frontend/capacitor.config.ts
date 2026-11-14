import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.syntaxslayers.floodtwin',
  appName: 'FloodTwin Field',
  webDir: 'dist',

  server: {
    androidScheme: 'http',
    cleartext: true,
  },
};

export default config;