# RASSA-JALA — Arquitectura

## Estructura del proyecto

```
rassa/
├── App.tsx                         # Entry point móvil (Expo)
├── src/                            # Código fuente móvil (React Native)
│   ├── __tests__/                  # Tests (Jest + React Native Testing Library)
│   ├── components/                 # Componentes compartidos
│   │   ├── CrudListScreen.tsx      # CRUD genérico con segmented control
│   │   ├── TrashListScreen.tsx     # Papelera de items desactivados
│   │   ├── CatalogSelector.tsx     # Selector de municipio/localidad (diálogos)
│   │   ├── RegistrationFormFields.tsx # Campos de formulario de registro
│   │   ├── DatePickerModal.tsx     # Modal de selección de fecha
│   │   ├── ProfileDrawer.tsx       # Drawer de perfil
│   │   ├── StatCard.tsx            # Tarjeta de estadística
│   │   ├── Toast.tsx               # Notificación toast
│   │   ├── Navbar.tsx              # Barra de navegación
│   │   ├── LogoutButton.tsx        # Botón de cerrar sesión
│   │   ├── ErrorBoundary.tsx       # Error boundary global
│   │   ├── Profile/                # Tabs de perfil (vista, edición, contraseña)
│   │   └── UserManagement/         # Subcomponentes de gestión de usuarios
│   ├── constants/                  # Constantes globales
│   │   ├── colors.ts              # Paleta de colores (adm*, brand)
│   │   ├── brandColors.ts         # Exportaciones nombradas de brand
│   │   └── roles.ts               # Definición de roles
│   ├── hooks/                      # Custom hooks
│   │   ├── useRegistrationForm.ts  # Lógica compartida de formulario de registro
│   │   ├── useCatalogs.ts          # Fetch de municipios/localidades
│   │   ├── useFormattedDate.ts     # Formateo de fechas
│   │   └── useMediaQuery.ts        # Detección de breakpoints
│   ├── navigation/                 # Navegación (React Navigation)
│   │   ├── AppNavigator.tsx        # Stack + Bottom tabs por rol
│   │   └── RoleErrorScreen.tsx     # Pantalla de error por rol no autorizado
│   ├── screens/                    # Pantallas agrupadas por rol
│   │   ├── admin/                  # Admin: panel, productos, categorías, unidades, usuarios
│   │   ├── auth/                   # Login, Register
│   │   ├── buyer/                  # Comprador: inicio, detalle producto
│   │   ├── farmer/                 # Agricultor: mis productos, agregar
│   │   ├── seller/                 # Vendedor: inicio, ventas, perfil
│   │   └── common/                 # Compartidas: splash, carrito, notificaciones, perfil, onboarding
│   ├── services/                   # API, almacenamiento
│   │   ├── api.ts                 # Axios instance con JWT interceptor
│   │   ├── storage.ts             # AsyncStorage wrapper
│   │   └── mock/                  # Datos mock para dashboard
│   ├── store/                      # Contextos (Auth, Theme)
│   ├── styles/                     # Estilos globales
│   │   └── global.css             # Tailwind imports (NativeWind)
│   ├── types/                      # Tipos TypeScript
│   └── utils/                      # Utilidades (validation, apiError, etc.)
├── web/                            # Código fuente web (React + Vite)
│   └── src/
│       ├── components/
│       │   ├── layout/             # Sidebar, Topbar, DashboardLayout, AuthLayout, DataTable
│       │   ├── ui/                 # Button, Input, Badge, Card, Toast, EmptyState, LoadingSpinner
│       │   └── guards/             # ProtectedRoute (auth guard)
│       ├── constants/              # colors.ts (paleta web)
│       ├── hooks/                  # useAuth, useMediaQuery
│       ├── providers/              # AuthProvider, ThemeProvider, QueryProvider
│       ├── routes/                 # Páginas (auth, admin/*, farmer/*, seller/*, buyer/*)
│       ├── services/               # api.ts (Axios con JWT)
│       └── types/                  # Tipos TypeScript
├── ARCHITECTURE.md                 # Este archivo
├── AGENTS.md                       # Configuración para AI agents
├── DESIGN.md                       # Guía de diseño
└── CONTRIBUTING.md                 # Guía de contribución
```

## Stack tecnológico

### Móvil (React Native / Expo)

- **Framework**: Expo SDK 54 + React Native 0.81
- **Navegación**: React Navigation 7 (NativeStack + BottomTabs)
- **Estado servidor**: TanStack Query 5
- **Estado local**: React Context (Auth, Theme)
- **UI**: React Native Paper (diálogos, botones) + componentes custom inline
- **HTTP**: Axios con interceptor JWT
- **Testing**: Jest + React Native Testing Library
- **Linting**: ESLint (flat config) + Prettier

### Web (React + Vite)

- **Framework**: React 18 + Vite
- **Navegación**: React Router DOM 6
- **Estado servidor**: TanStack Query 5
- **Estado local**: React Context (Auth, Theme)
- **UI**: Componentes custom (Button, Input, Badge, Card) + inline styles con theme
- **HTTP**: Axios con interceptor JWT

## Roles de usuario

| Rol | Ruta web | Tabs en móvil |
| --- | --- | --- |
| admin | /admin/* | Panel, Productos, Usuarios (Lista/Nuevo), Categorías, Unidades |
| agricultor | /agricultor/* | Mis Productos, Agregar |
| vendedor | /vendedor/* | Inicio, Ventas, Perfil |
| comprador | /comprador/* (web) / móvil | Inicio, Carrito, Notificaciones, Perfil |

## Paleta de colores

Definida en `src/constants/colors.ts` (móvil) y `web/src/constants/colors.ts` (web).

| Token | Light | Dark | Uso |
| --- | --- | --- | --- |
| admBg | #F5F7F0 | #1A211B | Fondo de pantalla |
| admSurface | #FFFFFF | #263028 | Superficies (cards, inputs) |
| admFg | #2D3328 | #E8EAE4 | Texto principal |
| admMuted | #5E6B5E | #9DA89D | Texto secundario |
| admBorder | #E2E6DF | #353D35 | Bordes |
| admBrand | #24563C | #4A8A63 | Color primario (brand) |
| admActiveBg | rgba(36,86,60,0.07) | rgba(74,138,99,0.12) | Fondo de item activo/seleccionado |
| admSegBg | #E8ECE4 | #353D35 | Fondo de segmented control |
| brandRedCoral | #DE393A | — | Botones de acción principal, errores |
| brandGreenForest | #3A6D56 | — | Links, acentos verdes |

## Patrones de diseño

### Tema (claro/oscuro)

- **Móvil**: `ThemeContext` con `useColorScheme` de React Native (sigue al OS automáticamente)
- **Web**: `ThemeProvider` con `prefers-color-scheme` + localStorage
- Los colores se resuelven con inline ternarios: `isDark ? colors.admXxxD : colors.admXxxL`
- Los colores viven en `colors.ts`, se importan y se desestructuran al inicio del componente

### CRUD (móvil)

- `CrudListScreen` es un componente genérico reutilizable para entidades con `nombre` y `estado`
- Usa **segmented control** (Lista/Nuevo) para alternar entre vista de lista y formulario
- Formulario inline (no modal)
- `TrashListScreen` maneja la papelera de items desactivados con restore/eliminar permanente
- Errores con icono + texto en color coral

### Registro de usuarios

- `RegistrationFormFields` es un componente compartido entre RegisterScreen (auth), UserFormScreen (admin) y UserManagementScreen (admin)
- Recibe un objeto `FormColors` con los tokens de color para mantener consistencia visual
- Selector de género y selector de rol usan el mismo patrón visual (botones segmentados inline)
- `useRegistrationForm` es un hook compartido que encapsula toda la lógica del formulario

### CRUD (web)

- Cada página (Productos, Categorías, Unidades, etc.) es independiente con estado local
- Patrón de tabs: Lista / Agregar
- `DataTable` es un componente reutilizable con sorting, search y paginación
- Modal de confirmación para eliminación
- Botones de acción: toggle, editar, eliminar

## Reglas de estilo

- Inline styles con variables de theme (`isDark ? colors.admXxxD : colors.admXxxL`)
- NativeWind se usa en componentes legacy (`TrashListScreen`, `LoginScreen`) pero el patrón nuevo es inline styles
- Web usa inline styles con `React.CSSProperties` para consistencia con el patrón móvil
- Colores siempre desde `colors.ts`, nunca hardcodeados (excepto rgba en constantes de theme)
- Tipado estricto (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- No hay `ThemeColors` ni `themeColors()` — se eliminaron. Usar inline ternarios directamente
