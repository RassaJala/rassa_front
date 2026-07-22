# AGENTS.md — rassa_front

## What this is

Expo SDK 54 (React Native 0.81) mobile app + Vite/React 19 web app for farm-to-buyer e-commerce. **Bun** is the package manager (root `bunfig.toml`: `linker=hoisted`, `ignoreScripts=true`).

## Commands

```bash
bun install          # install deps
bun run start        # expo dev server (scan QR with Expo Go)
bun run typecheck    # tsc --noEmit (strict — catches real errors)
bun run lint         # eslint -c config/eslint.config.ts .
bun run lint:fix     # eslint --fix
bun run format       # prettier --write .
bun run format:check # prettier --check .
bun run test         # jest (tests in src/__tests__/)
bun run dev:web      # vite dev server (web/, port 5173)
```

**CI order** (enforced in `.github/workflows/ci.yml`): `typecheck → lint → format:check`. Tests are not in CI yet.

## TypeScript strictness

tsconfig.json enables strict flags that break common patterns:

- `noUncheckedIndexedAccess` — `array[i]` returns `T | undefined`; always null-check.
- `exactOptionalPropertyTypes` — `prop?: T` means "omit or exact T", not "omit or undefined".
- `noUnusedLocals` / `noUnusedParameters` — unused symbols are errors (prefix with `_`).
- `noImplicitReturns` — every code path must return.
- `noImplicitOverride` — inherited methods require explicit `override`.
- `noFallthroughCasesInSwitch` — switch without break/return/throw is error.
- `noPropertyAccessFromIndexSignature` is **off** — NativeWind uses dot notation with dynamic style dictionaries.

## Path aliases

`@/*` and `~/*` both resolve to `src/`. Use them — never relative `../../` chains. Jest also resolves these (see `jest.config.js` moduleNameMapper).

## Architecture layers (enforced by ESLint boundaries)

Dependency flow is unidirectional:

```
screens → features → components → hooks → services → api
```

A lower layer cannot import a higher layer. `eslint-plugin-boundaries` errors on violations. Cross-cutting logic goes in `hooks/` or `services/`.

- `features/` — defined in boundaries but **does not exist yet**.
- `api/` — defined in boundaries but **does not exist yet** (use `src/services/api.ts`).

## ESLint quirks

Config lives in `config/eslint.config.ts` (not root). ESLint uses `config/tsconfig.eslint.json` as its project tsconfig. Key gotchas:

- **Perfectionist `sort-imports`**: groups are builtin → react → expo → external → internal (`@/`, `~/`) → relative. Newline between groups. Match this order or lint fails.
- **`react-native/no-color-literals`**: error — never hardcode colors; use `src/constants/colors.ts` or Tailwind classes.
- **`react-native/no-inline-styles`**: warn — prefer NativeWind `className`.
- **`unused-imports/no-unused-imports`**: error — dead imports are caught; TS `no-unused-vars` is off (delegated).
- **`@typescript-eslint/no-explicit-any`**: error — `any` is banned.
- **`@typescript-eslint/no-unsafe-*`**: error — the `no-unsafe-member-access`, `no-unsafe-argument`, `no-unsafe-assignment`, `no-unsafe-call`, `no-unsafe-return` family catches implicit `any` usage.
- **`@typescript-eslint/no-non-null-assertion`**: error — no `!` assertions.
- **`@typescript-eslint/consistent-type-imports`**: error — always use `import type`.
- **`@typescript-eslint/no-floating-promises`**: error — always handle promises.
- **`@typescript-eslint/switch-exhaustiveness-check`**: error — switch must cover all cases.
- **`@typescript-eslint/no-import-type-side-effects`**: error — `import type` must not have side effects.
- Cognitive complexity limit is 15 (sonarjs).
- `unicorn/filename-case` is off — React Native PascalCase components are fine.
- Tests (`src/__tests__/`, `*.test.ts`, `*.test.tsx`) are excluded from ESLint.
- The ESLint config auto-excludes itself and other config files; VS Code sometimes lints it anyway (the `/* eslint-disable */` at the top prevents false positives).

## NativeWind (Tailwind for RN)

NativeWind 4 requires four files to be wired together. Do not break this chain:

1. `tailwind.config.js` — content paths and `nativewind/preset`.
2. `metro.config.js` — `withNativeWind(config, { input: "./src/styles/global.css" })`.
3. `babel.config.js` — includes `"nativewind/babel"` preset.
4. `src/styles/global.css` — imported in `App.tsx` (line 20).

If Tailwind classes stop working, check these four files first. Both mobile and web use `className` — the codebase has migrated away from inline styles.

## Prettier

Config in `config/prettier.config.mjs`. Key settings: single quotes, trailing commas (all), 80 char width, LF line endings, `prettier-plugin-tailwindcss` for automatic NativeWind class sorting.

## Git hooks (Lefthook)

`lefthook.yml` runs:

- **commit-msg**: commitlint (`config/commitlint.config.ts`, max 100 char header).
- **pre-commit**: prettier check + eslint check + tsc on staged files. **Read-only** — does not auto-fix. If it fails, run `bun run format && bun run lint:fix` manually.

Commit format: `type(scope): description` — types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert. See `CONTRIBUTING.md` for examples.

## API / networking

`src/services/api.ts` creates an Axios instance pointing to `EXPO_PUBLIC_API_URL` (defaults to `http://localhost:8000/api`). Features:

- JWT attached from storage on every request (platform-specific: `expo-secure-store` on native, `sessionStorage` on web via `src/services/storage.ts`).
- Single-flight token refresh on 401 (concurrent 401s coalesce into one refresh call).
- Auth endpoints (`/token/`, `/token/refresh/`) clear tokens on failure without retry.
- Retry with exponential backoff on network/5xx errors (non-POST only).
- Production guard: throws if baseURL is HTTP in production.
- On web, always uses `localhost:8000` regardless of `EXPO_PUBLIC_API_URL`.

All API calls should go through this instance.

## Screen structure

```
src/screens/
  admin/       # AdminPanelScreen, AdminDashboardScreen, AdminProductsScreen, AdminUsersScreen,
               # UserManagementScreen, Category*, Municipio*, Localidad*, Unit* CRUD screens (+ trash screens)
  auth/        # LoginScreen, RegisterScreen
  buyer/       # HomeScreen, ProductDetailScreen
  common/      # SplashScreen, ProfileScreen, OnboardingScreen, NotificationsScreen, CarritoScreen
  families/    # FamilyListScreen, FamilyDetailScreen, FamilyFormScreen
  farmer/      # MyProductsScreen, AddProductScreen, HomeFarmerScreen
  seller/      # HomeSellerScreen, SalesScreen, ProfileSellerScreen
```

## Monorepo layout

- **`web/`** — separate Vite + React 19 app (`bun run dev:web`). Excluded from root tsconfig. Has its own `package.json`, dependencies, and Tailwind config. Uses `react-router-dom`, `lucide-react`, and plain CSS (not NativeWind).
- **`packages/api/`** — `@rassa/api` shared API client package (published).
- **`packages/design-tokens/`** — `@rassa/design-tokens` package (published). Both are excluded from root tsconfig.

## State management

- `src/store/AuthContext.tsx` — authentication state (React Context).
- `src/store/ThemeContext.tsx` — dark/light mode theme.
- `@tanstack/react-query` — server state / data fetching (configured in `App.tsx` with retry + Sentry error tracking).

## Testing

- Tests live in `src/__tests__/` (18 test files).
- Run all: `bun run test`. Run single: `npx jest -t "test name"` or `npx jest src/__tests__/api.test.ts`.
- Setup file: `jest.setup.ts` — mocks Sentry, NativeEventEmitter, react-native-paper Portal, safe-area-context. Also sets up `@testing-library/jest-native/extend-expect` via `setupFilesAfterEnv` (gives `toHaveStyle`, `toHaveTextContent`, etc.).
- Coverage is collected by default (`collectCoverage: true`).
- `transformIgnorePatterns` is long — many RN/Expo packages need explicit transformation.

## Constants / theming

- `src/constants/colors.ts` — canonical color palette + `themeColors(isDark)` helper.
- `src/constants/brandColors.ts` — brand color re-exports (`BRAND_RED_CORAL`, `BRAND_GREEN_FOREST`, `BRAND_INK`).
- `src/constants/roles.ts` — role constants.
- Tailwind config (`tailwind.config.js`) extends `brand.*` and `rassa.*` color namespaces.

## Communication guidelines

- When applying changes, do NOT show code snippets in responses — write changes directly to files.
- Keep final responses concise, clear, and focused on natural language summaries of what was modified and verified.
