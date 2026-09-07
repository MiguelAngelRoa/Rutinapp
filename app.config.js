const APP_VARIANT = process.env.APP_VARIANT ?? 'production';

const VARIANTS = {
  development: {
    name: 'RutinApp (Dev)',
    package: 'com.miguelangelroa.rutinapp.dev',
  },
  preview: {
    name: 'RutinApp (Preview)',
    package: 'com.miguelangelroa.rutinapp.preview',
  },
  production: {
    name: 'rutinapp',
    package: 'com.miguelangelroa.rutinapp',
  },
};

const variant = VARIANTS[APP_VARIANT] ?? VARIANTS.production;

export default {
  name: variant.name,
  slug: 'rutinapp',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'rutinapp',
  userInterfaceStyle: 'dark',
  ios: {
    icon: './assets/images/icon.png',
    infoPlist: {
      UIBackgroundModes: ['audio', 'fetch', 'remote-notification'],
      NSMotionUsageDescription:
        'Rutinapp cuenta tus pasos mientras corres para medir tu actividad.',
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#16161C',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    permissions: ['NOTIFICATIONS'],
    predictiveBackGestureEnabled: false,
    package: variant.package,
    intentFilters: [
      {
        action: 'VIEW',
        category: ['DEFAULT'],
        data: [
          {
            scheme: 'content',
            mimeType: 'application/x-rutinapp',
          },
        ],
      },
      {
        action: 'VIEW',
        category: ['DEFAULT'],
        data: [
          {
            scheme: 'content',
            mimeType: 'application/octet-stream',
            pathPattern: '.*\\.rutinapp',
          },
        ],
      },
      {
        action: 'VIEW',
        category: ['DEFAULT'],
        data: [
          {
            scheme: 'content',
            mimeType: 'application/json',
            pathPattern: '.*\\.rutinapp',
          },
        ],
      },
    ],
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    '@maplibre/maplibre-react-native',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#000000',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    'expo-audio',
    [
      'expo-notifications',
      {
        color: '#A3E635',
        icon: './assets/images/notification-icon.png',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Rutinapp usa tu ubicación para trazar tu ruta y medir la distancia de tus carreras.',
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          buildArchs: ['arm64-v8a'],
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: '42c97056-1f60-474f-9664-fa9d14bcc115',
    },
  },
};