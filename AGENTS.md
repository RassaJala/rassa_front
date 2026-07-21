# AGENTS.md — rassa

Monorepo: **mobile** (Expo SDK 54 / RN 0.81 / root `package.json`), **web** (`web/`, React 19 + Vite 6, separate `package.json`), **shared packages** (`packages/api`, `packages/design-tokens`). Bun 1.3 is the package manager (`bunfig.toml`: `linker=hoisted`, `ignoreScripts=true`). `back/` is a separate Django project — never touch or import from here.

## Commands (root)

| command                                | what                                                        |
| -------------------------------------- | ----------------------------------------------------------- |
| `bun run start`                        | expo dev server                                             |
| `bun run typecheck`                    | `tsc --noEmit`                                              |
| `bun run lint`                         | `eslint -c config/eslint.config.ts .`                       |
| `bun run lint:fix`                     | —fix variant                                                |
| `bun run format`                       | `prettier --config config/prettier.config.mjs --write .`    |
| `bun run format:check`                 | --check (CI uses this, not fix)                             |
| `bun run dev:web`                      | vite dev server on `:5173` (alias: `cd web && bun run dev`) |
| `bun run test`                         | jest                                                        |
| `cd packages/api && bun run typecheck` | (same for `packages/design-tokens`)                         |

**CI order** (`.github/workflows/ci.yml`): `typecheck → lint → format:check`. Tests exist but are **not run in CI**.

## TypeScript strictness

`tsconfig.json` extends `expo/tsconfig.base` with:

- `noUncheckedIndexedAccess` — `array[i]` returns `T \| undefined`
- `exactOptionalPropertyTypes` — `prop?: T` means omit or T, never `prop: T \| undefined`
- `noUnusedLocals` / `noUnusedParameters` — prefix unused params with `_`
- `noImplicitReturns`
- `noFallthroughCasesInSwitch`
- `noImplicitOverride`

Path aliases: `@/*` and `~/*` → `./src/*`.

## Architecture layers (enforced by `eslint-plugin-boundaries`)

```
screens → features → components → hooks → services → api
```

A lower layer cannot import a higher one. Cross-cutting logic goes in `hooks/` or `services/`. `features/` is defined in boundaries config but does not exist yet.

## ESLint quirks (config at `config/eslint.config.ts`)

- **Perfectionist sort-imports**: order is `builtin → react → expo → external → internal (@/~) → relative`. Newline between groups. Violations fail CI.
- `react-native/no-color-literals: error` — use `src/constants/colors.ts` (or brand palette from `tailwind.config.js`).
- `react-native/no-inline-styles: warn` — NativeWind classes are preferred; codebase uses both (inline styles get a warning).
- `unused-imports/no-unused-imports: error` — TS `no-unused-vars` is delegated to this plugin.
- `sonarjs/cognitive-complexity` capped at 15.
- `@typescript-eslint/no-explicit-any: error`, `no-unsafe-*` family on, `explicit-module-boundary-types` required.
- `unicorn/filename-case: off` — PascalCase for RN components is fine.
- Config files (`eslint.config.ts`, `metro.config.js`, `babel.config.js`, etc.) excluded from linting.
- Lint ignores `web/` and `packages/` entirely — those have their own validation.
- `promise/always-return` and `promise/catch-or-return` are errors — no dangling promises.

## NativeWind 4 chain

Four files must stay connected for Tailwind classes to work in mobile:

1. `tailwind.config.js` — `content` paths, `presets: [require('nativewind/preset')]`, dark mode via `class`, custom brand color palette.
2. `metro.config.js` — `withNativeWind(config, { input: './src/styles/global.css' })`.
3. `babel.config.js` — includes `'nativewind/babel'` preset.
4. `src/styles/global.css` — `@tailwind base/components/utilities`, imported at top of `App.tsx`.

Also: `nativewind-env.d.ts` with `/// <reference types="nativewind/types" />` and `noPropertyAccessFromIndexSignature: false` in tsconfig (NativeWind uses dot notation on dynamic style dicts).

## Auth / JWT

`src/services/api.ts` creates the Axios instance. Base URL resolves from `EXPO_PUBLIC_API_URL` env var (default `http://localhost:8000/api`). On web, always localhost; on native, uses env var (so physical devices can reach the backend). Enforces HTTPS in production.

- JWT attached via request interceptor from `SecureStore` (native) or `sessionStorage` (web).
- 401 responses trigger a coalesced token refresh (single-flight); auth endpoints (`/token/`, `/token/refresh/`) clear tokens instead.
- Axios retry configured: up to 3 retries with exponential backoff, for server errors (500+) and network errors, **not** for POST requests.

## Storage

`src/services/storage.ts` wraps `expo-secure-store` (native) and `window.sessionStorage` (web). Key exports: `ACCESS_TOKEN_KEY`, `REFRESH_TOKEN_KEY`, `ONBOARDING_KEY`.

## Routing

`src/navigation/AppNavigator.tsx` — React Navigation 7 with `NativeStackNavigator` + `BottomTabNavigator` per role. Roles route to different navigators:

- `farmer` → FarmerNavigator (MyProducts, AddProduct + Profile stack)
- `seller` → SellerTabs (Home, Sales, Notifications, Perfil)
- `admin` → AdminScreens (AdminTabs with nested Family screens + Profile)
- `buyer` → BuyerNavigator (Home/Carrito/Notificaciones tabs + ProductDetail + Profile)
- unauthenticated → AuthStack (Login, Register)
- loading → SplashScreen (5s timeout → RoleErrorScreen)

## App entrypoint

`index.js` → `registerRootComponent(App)`. `App.tsx` composes: `QueryClientProvider` → `ThemeProvider` → `PaperProvider` → `AuthProvider` → `ErrorBoundary` → `NavigationContainer` → `AppNavigator`. Sentry captures query errors.

## Web app (`web/`)

Separate app with its own `package.json`, `tsconfig.json`, `vite.config.ts`. Uses:

- React 19 + Vite 6 (`@vitejs/plugin-react`)
- React Router DOM 7 (not React Navigation)
- TanStack Query 5 + Axios
- Tailwind CSS 3 (PostCSS, no NativeWind)
- Vite proxy: `/api` → `http://localhost:8000`
- Alias: `@`/`~` → `./src`

Commands: `bun run dev` (from `web/` or `bun run dev:web` from root), `bun run build`, `bun run preview`.

## Packaged shared libraries

- `packages/api` (`@rassa/api`): Axios-based API client library. Build: `tsc --noEmit && tsc --project tsconfig.build.json`.
- `packages/design-tokens` (`@rassa/design-tokens`): Design tokens (colors, spacing, typography). Same build pattern.

Both produce `dist/`. Not published externally. Excluded from root typecheck and lint.

## Git hooks (lefthook)

`lefthook.yml`:

- **commit-msg**: `bunx commitlint --config config/commitlint.config.ts`
- **pre-commit** (parallel, read-only — no `--fix`, no stash): prettier --check on staged, eslint on staged, tsc --noEmit

Commit format: `type(scope): desc` — types: feat/fix/docs/style/refactor/perf/test/build/ci/chore/revert. Subject: lowercase, no period. Max 100 chars header.

## Style conventions

- **Prettier** (config at `config/prettier.config.mjs`): single quotes, trailing commas (all), 80 printWidth, LF endings, `prettier-plugin-tailwindcss` for automatic class sorting.
- **EditorConfig**: indent 2 spaces, LF, UTF-8, trim trailing whitespace.
- **VS Code** auto-formats on save with Prettier, auto-fixes ESLint + organizes/removes imports.
- Colors from `tailwind.config.js` brand palette (`brand-green-*`, `brand-red-coral`, `rassa-*`). Dark mode via `class` strategy + `ThemeContext`/`useColorScheme`.

## Key files not to break

| file                              | why                                        |
| --------------------------------- | ------------------------------------------ |
| `tailwind.config.js`              | brand palette, NativeWind preset           |
| `metro.config.js`                 | NativeWind integration                     |
| `babel.config.js`                 | NativeWind babel preset                    |
| `config/eslint.config.ts`         | all lint rules, boundaries, import sorting |
| `config/prettier.config.mjs`      | formatter config                           |
| `config/commitlint.config.ts`     | commit message validation                  |
| `src/services/api.ts`             | Axios instance with JWT interceptor        |
| `src/services/storage.ts`         | token storage (SecureStore/sessionStorage) |
| `src/navigation/AppNavigator.tsx` | role-based routing                         |
| `App.tsx`                         | provider composition order                 |

## Screen directory structure

```
src/screens/
  auth/       LoginScreen, RegisterScreen
  buyer/      HomeScreen, ProductDetailScreen
  farmer/     MyProductsScreen, AddProductScreen
  admin/      AdminPanelScreen, AdminProductsScreen, CategoryListScreen, etc.
  seller/     HomeSellerScreen, SalesScreen, ProfileSellerScreen
  families/   FamilyListScreen, FamilyFormScreen, FamilyDetailScreen
  common/     SplashScreen, OnboardingScreen, ProfileScreen, CarritoScreen, NotificationsScreen
```

## Notable

- `src/components/CrudListScreen.tsx` and `TrashListScreen.tsx` are generic reusable CRUD screens (segmented control: list/new, inline form, bottom sheet confirm).
- `src/utils/apiError.ts` has `extractFieldErrors` for per-field validation error display.
- Reanimated 4 + worklets for animations.
- No tests run in CI. Jest config uses `jest-expo` preset with module name mapping for `@/~` aliases.
