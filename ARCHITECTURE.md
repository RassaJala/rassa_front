# RASSA-JALA — Arquitectura

## Estructura del proyecto

```
rassa/
├── App.tsx                     # Entry point móvil (Expo)
├── src/                        # Código fuente móvil (React Native)
│   ├── components/             # Componentes compartidos
│   │   ├── CrudListScreen.tsx  # CRUD genérico con segmented control
│   │   └── TrashListScreen.tsx # Papelera de items desactivados
│   ├── navigation/             # Navegación (React Navigation)
│   │   └── AppNavigator.tsx    # Stack + Bottom tabs por rol
│   ├── screens/                # Pantallas agrupadas por rol
│   │   ├── admin/              # Admin: panel, productos, categorías, unidades
│   │   ├── auth/               # Login, Register
│   │   ├── buyer/              # Comprador
│   │   ├── farmer/             # Agricultor
│   │   ├── seller/             # Vendedor
│   │   └── common/             # Compartidas entre roles
│   ├── services/               # API, almacenamiento
│   ├── store/                  # Contextos (Auth, Theme)
│   ├── types/                  # Tipos TypeScript
│   └── utils/                  # Utilidades (apiError, etc.)
├── web/                        # Código fuente web (React + Vite)
│   └── src/
│       ├── components/
│       │   ├── layout/         # Sidebar, Topbar, DashboardLayout, AuthLayout
│       │   └── ui/             # Button, Input, Badge, Card, etc.
│       ├── routes/             # Páginas (auth, admin, farmer, seller)
│       └── providers/          # AuthProvider, ThemeProvider, QueryProvider
├── packages/                   # Paquetes compartidos (diseño, API)
├── ARCHITECTURE.md             # Este archivo
└── README.md                   # Instrucciones de uso
```

## Stack tecnológico

### Móvil (React Native / Expo)
- **Framework**: Expo SDK 54 + React Native 0.81
- **Navegación**: React Navigation 7 (NativeStack + BottomTabs)
- **Estado servidor**: TanStack Query 5
- **Estado local**: React Context (Auth, Theme)
- **UI**: React Native Paper + NativeWind (Tailwind)
- **HTTP**: Axios con interceptor JWT

### Web (React + Vite)
- **Framework**: React 18 + Vite
- **Navegación**: React Router DOM 6
- **Estado servidor**: TanStack Query 5
- **Estado local**: React Context (Auth, Theme)
- **UI**: CSS custom (sin librería de componentes)
- **HTTP**: Axios con interceptor JWT

## Roles de usuario

| Rol | Ruta web | Tab en móvil |
|-----|----------|-------------|
| admin | /admin/* | Panel, Productos, Categorías, Unidades |
| agricultor | /agricultor/* | Mis Productos, Agregar |
| vendedor | /vendedor/* | Ventas, Pedidos |
| comprador | (solo móvil) | Inicio, Carrito, Notificaciones |

## Patrones de diseño

### Tema (claro/oscuro)
- **Móvil**: `ThemeContext` con `useColorScheme` de React Native (sigue al OS automáticamente)
- **Web**: `ThemeProvider` con `prefers-color-scheme` + localStorage
- Ambos usan la misma paleta: verde brand (#24563C), coral (#DE393A), surface, bg, fg, muted

### CRUD (móvil)
- `CrudListScreen` es un componente genérico reutilizable
- Usa **segmented control** (Lista/Nuevo) en vez de FAB + diálogos
- Formulario inline (no modal)
- Bottom sheet para confirmar eliminación/desactivación
- Errores por campo con borde rojo en inputs

### CRUD (web)
- Cada página (Productos, Categorías, Unidades) es independiente con estado local
- Mismo patrón de tabs: 📋 Lista / ➕ Agregar
- Tabla con cabecera, buscador, badges de estado
- Modal de confirmación para eliminación
- Botones de acción: ⏸ toggle, ✏️ editar, 🗑️ eliminar

## Reglas de estilo
- Sin `className` de NativeWind en el móvil (usar inline styles con theme)
- Sin Tailwind utility classes en la web (usar inline styles con theme)
- Colores definidos como constantes dentro de cada componente
- Tipado estricto (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
