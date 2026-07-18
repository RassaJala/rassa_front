# RASSA-JALA

E-commerce donde agricultores venden sus productos directamente. App **móvil** (Expo React Native) + **web** (React + Vite).

## Stack

### Móvil (React Native / Expo)
- **Expo SDK 54** (React Native 0.81)
- **React Navigation 7** (Stack + Bottom Tabs)
- **TanStack Query 5** (server state)
- **Axios** (HTTP client)
- **NativeWind** (Tailwind para RN)
- **React Native Paper** (UI components)

### Web (React + Vite)
- **React 18** + **Vite**
- **React Router DOM 6**
- **TanStack Query 5**
- **Axios** (HTTP client)
- **CSS custom** (sin librería de componentes)

## Requisitos

- Node.js 18 o superior
- [Bun](https://bun.sh) (package manager)
- Expo Go (para mobile) o un navegador (para web)

## Instalación

```bash
git clone <repo-url>
cd Rassa
bun install
```

## Ejecutar

```bash
# ── Móvil (Expo) ──
bun run start          # Inicia Metro bundler, escaneá QR con Expo Go

# ── Web (Vite) ──
bun run dev:web        # Inicia servidor de desarrollo en http://localhost:5173
# o
cd web && bun run dev  # Mismo resultado

# ── TypeScript check (ambos proyectos) ──
bun run typecheck
```

### Móvil
Escaneá el QR con **Expo Go** en tu celular. También podés apretar `a` para emulador Android o `i` para iOS simulator (solo Mac).

### Web
Abrí `http://localhost:5173` en el navegador. Las rutas disponibles son:
- `/login` — Inicio de sesión
- `/register` — Registro
- `/admin` — Panel de administración (dashboard, productos, categorías, unidades)
- `/agricultor/*` — Panel de agricultor
- `/vendedor/*` — Panel de vendedor

## Configuración

Crear un archivo `.env` en la raíz:

```env
EXPO_PUBLIC_API_URL=http://localhost:8000/api
```

Para mobile desde celular físico, usar la IP de tu máquina:

```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:8000/api
```

## Estructura del proyecto

```
Rassa/
├── App.tsx                     # Entry point móvil
├── src/                        # Código fuente móvil
│   ├── components/             # Componentes compartidos (CrudListScreen, TrashListScreen)
│   ├── navigation/             # React Navigation stacks + tabs
│   ├── screens/
│   │   ├── admin/              # Panel, productos, categorías, unidades
│   │   ├── auth/               # Login, Register
│   │   ├── buyer/              # Pantallas de comprador
│   │   ├── farmer/             # Pantallas de agricultor
│   │   ├── seller/             # Pantallas de vendedor
│   │   └── common/             # Splash, carrito, notificaciones, perfil
│   ├── services/               # API, almacenamiento
│   ├── store/                  # AuthContext, ThemeContext
│   ├── types/                  # Tipos TypeScript
│   └── utils/                  # Utilidades (apiError, etc.)
├── web/                        # Código fuente web
│   └── src/
│       ├── components/layout/  # Sidebar, Topbar, DashboardLayout, AuthLayout
│       ├── components/ui/      # Button, Input, Badge, Card
│       ├── routes/             # Páginas (auth, admin, farmer, seller)
│       └── providers/          # Auth, Theme, Query
├── packages/                   # Paquetes compartidos (diseño, API)
├── ARCHITECTURE.md             # Documentación de arquitectura
└── README.md
```

## Comandos útiles

```bash
bun run typecheck     # TypeScript check (móvil + web)
bun run start         # Servidor Expo (móvil)
bun run dev:web       # Servidor Vite (web)
cd web && bun run dev # Alternativa para web
```

## Convenciones

- **Commits**: conventional commits (`feat:`, `fix:`, `refactor:`, etc.)
- **Branch naming**: `feature/`, `fix/`, `redesign-` seguido de descripción
- **Tipado**: estricto con `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes`
- **Estilos**: inline styles con variables del theme (sin utility classes)
- **Ver archivo `ARCHITECTURE.md`** para detalles de arquitectura y patrones de diseño
