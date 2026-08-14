# Rutinapp 💪

Aplicación móvil para gestionar tus rutinas de ejercicio y seguirlas en el gimnasio. Crea rutinas con series, repeticiones y descansos, organízalas en una agenda semanal y entrena con un temporizador de descanso integrado.

Desarrollada con [Expo](https://expo.dev) (React Native) y TypeScript.

## ✨ Características

- **Entrenador de sesiones** — Sigue tu rutina ejercicio a ejercicio con control de progreso por series, repeticiones y barra de avance de la sesión.
- **Temporizador de descanso** — Cuenta regresiva entre series con sonido, vibración y opción de saltar el descanso.
- **Editor de rutinas** — Crea, guarda, carga y elimina múltiples rutinas. Cada ejercicio configura nombre, series, repeticiones y descanso.
- **Agenda semanal** — Asigna una rutina o actividad (p. ej. "Jiu Jitsu") a cada día de la semana, marca días de descanso, define hora de inicio y añade notas.
- **Recordatorios** — Notificaciones semanales programadas según tu agenda para avisarte de tus entrenamientos. Al tocar un recordatorio se carga la rutina del día automáticamente.
- **Carga automática** — Al abrir la app se detecta el plan del día y se ofrece cargar la rutina correspondiente.
- **Compartir rutinas** — Exporta tus rutinas como archivo (WhatsApp, email) o enlace `rutinapp://`, e importa rutinas recibidas con vista previa y confirmación.
- **Persistencia local** — Todos los datos se guardan en el dispositivo con AsyncStorage (sin cuenta ni servidor).
- **Tema oscuro** — Interfaz oscura con animaciones fluidas (React Native Reanimated).

## 🚀 Puesta en marcha

### Requisitos

- [Node.js](https://nodejs.org/) (LTS)
- [Expo Go](https://expo.dev/go) en tu teléfono, o un emulador de Android/iOS

### Instalación

```bash
# Instala las dependencias
npm install

# Inicia el servidor de desarrollo con túnel
npm start
```

Escanea el código QR con Expo Go o usa las opciones del terminal para abrir la app en Android, iOS o web.

### Scripts disponibles

| Script              | Descripción                                        |
| ------------------- | -------------------------------------------------- |
| `npm start`         | Inicia Expo con túnel                              |
| `npm run android`   | Inicia en un emulador/ dispositivo Android         |
| `npm run ios`       | Inicia en el simulador de iOS                      |
| `npm run web`       | Inicia en el navegador                             |
| `npm run dev`       | Inicia con el *development client*                 |
| `npm run dev:android` | Inicia con el *development client* en Android    |
| `npm run dev:ios`   | Inicia con el *development client* en iOS          |
| `npm run lint`      | Ejecuta ESLint                                     |

> ⚠️ Las notificaciones y el sonido del temporizador funcionan en dispositivos físicos. En la web no se programan recordatorios.

## 📱 Cómo usarla

1. **Rutina** — Añade ejercicios, configura series/repeticiones/descanso y guárdala con un nombre.
2. **Agenda** — Toca un día de la semana para asignarle una rutina guardada o una actividad libre, o márcalo como descanso.
3. **Entrenar** — Abre la pestaña de entrenamiento: la app sugiere la rutina del día. Completa cada serie y el temporizador de descanso arranca automáticamente.

## 🧱 Estructura del proyecto

```
rutinapp/
├── src/
│   ├── app/               # Rutas (expo-router)
│   │   ├── index.tsx      # Pestaña Entrenar
│   │   ├── explore.tsx    # Pestaña Rutina
│   │   ├── schedule.tsx   # Pestaña Agenda
│   │   └── _layout.tsx    # Layout raíz (provider + tabs)
│   ├── components/        # Componentes de UI reutilizables
│   ├── constants/         # Tema, colores y espaciados
│   ├── context/           # Estado global y persistencia (AsyncStorage)
│   ├── hooks/             # Hooks personalizados (temporizador, notificaciones, tema)
│   ├── notifications/     # Lógica de recordatorios de agenda
│   ├── services/          # Servicio de notificaciones
│   ├── types/             # Tipos de dominio (ejercicios, rutinas, agenda)
│   └── utils/             # Utilidades de formato de fecha/hora
├── android/               # Proyecto nativo de Android (dev client)
├── app.json               # Configuración de Expo
├── eas.json               # Configuración de builds EAS
└── package.json
```

## 🛠️ Stack tecnológico

- [Expo SDK 54](https://expo.dev) + [React Native 0.81](https://reactnative.dev/)
- [expo-router](https://docs.expo.dev/router/introduction) con *native tabs* y rutas tipadas
- [TypeScript](https://www.typescriptlang.org/)
- [React 19](https://react.dev/) con React Compiler
- [react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/) para animaciones
- [expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications) para recordatorios
- [expo-audio](https://docs.expo.dev/versions/latest/sdk/audio) para efectos de sonido
- [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) para persistencia local
- [EAS Build](https://docs.expo.dev/build/introduction) para generar los binarios

## 📦 Builds

La configuración de [EAS Build](https://docs.expo.dev/build/introduction) (`eas.json`) incluye tres perfiles:

- `development` — *development client* (APK)
- `preview` — APK de distribución interna
- `production` — App bundle para publicar

```bash
eas build --profile preview --platform android
```

## 📄 Licencia

Este proyecto se distribuye bajo la [licencia MIT](LICENSE).
