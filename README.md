# Rassa — Mobile App

App mobile para e-commerce donde agricultores venden sus productos directamente. Construida con Expo (React Native).

## Stack

- **Expo SDK 54** (React Native)
- **React Navigation** (navegación)
- **TanStack Query** (server state)
- **Axios** (HTTP client)
- **NativeWind** (Tailwind para RN)
- **React Native Paper** (UI components)

## Requisitos

- Node.js 18 o superior
- Expo Go (instalada en tu celular)
- [Bun](https://bun.sh) (package manager)

## Instalación

```bash
# 1. Clonar el repo (si no lo hiciste)
git clone <repo-url>
cd Rassa

# 2. Instalar dependencias
bun install
```

### ⚠️ Notas de Instalación y Hooks Locales (Lefthook)

El proyecto utiliza nuevas dependencias nativas (`@react-native-community/datetimepicker`, `@react-native-community/netinfo`, `react-native-reanimated` y `react-native-worklets-core`) e integra **Lefthook** para validaciones previas al commit.

Si experimentás errores durante la instalación (por ejemplo, si no tenés `bun` o `bunx` instalados globalmente en tu sistema de manera nativa), podés instalar y compilar el árbol de dependencias usando `npm` ignorando temporalmente los scripts de ciclo de vida:

```bash
npm install --legacy-peer-deps --ignore-scripts
```

Si los Git hooks locales te impiden realizar commits debido a la falta de Bun en tu PATH, podés confirmarlos omitiendo las validaciones:

```bash
git commit -m "tu mensaje" --no-verify
```

## Ejecutar

```bash
# Iniciar servidor de desarrollo
bun run start

# Web
bun run web
```

Escaneá el QR con **Expo Go** en tu celular para ver la app al instante.

> Si querés correr en un emulador Android, apretá `a` en la terminal. Para iOS simulador, `i` (solo Mac).

## Configuración

Crear un archivo `.env` en la raíz:

```env
EXPO_PUBLIC_API_URL=http://localhost:8000/api
```

Si estás probando desde un celular físico, cambiá `localhost` por la IP de tu máquina:

```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:8000/api
```

## Estructura

```
Rassa/
├── index.js                     # Entry point (registerRootComponent)
├── App.tsx                      # Root component
├── src/
│   ├── navigation/              # Navegación por rol
│   ├── screens/
│   │   ├── auth/                # Login / Register
│   │   ├── buyer/               # Pantallas de comprador
│   │   ├── farmer/              # Pantallas de agricultor
│   │   ├── admin/               # Panel admin
│   │   └── common/              # Splash, etc.
│   ├── components/ui/           # Componentes reutilizables
│   ├── services/api.ts          # Axios instance con JWT
│   ├── store/AuthContext.tsx    # Estado de autenticación
│   ├── hooks/                   # Custom hooks
│   ├── types/                   # Tipos compartidos
│   └── constants/               # Colores, temas
├── babel.config.js              # Babel (NativeWind)
├── metro.config.js              # Metro bundler (NativeWind)
├── tailwind.config.js           # Tailwind CSS
├── tsconfig.json                # TypeScript
├── bunfig.toml                  # Bun config
├── package.json
└── app.json
```

## Comandos útiles

```bash
# TypeScript check
bun run typecheck

# Limpiar caché de Expo
bunx expo start -c
```
