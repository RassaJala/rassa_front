# AGENTS.md — rassa-monorepo/front

## What this is

Expo SDK 54 (React Native 0.81) mobile app for farm-to-buyer e-commerce. Bun is the package manager. The back/ sibling directory is a separate Django project — do not modify or reference it from here.

## Commands

bun install # install deps (bunfig.toml sets linker=hoisted, ignoreScripts=true)
bun run start # expo dev server (scan QR with Expo Go)
bun run typecheck # tsc --noEmit (strict mode — catches real errors)
bun run lint # eslint (flat config in config/eslint.config.ts)
bun run lint:fix # eslint --fix
bun run format # prettier --write .
bun run format:check # prettier --check .
CI order (.github/workflows/ci.yml): typecheck → lint → format:check. There are no tests configured — test scripts do not exist.

## TypeScript strictness

tsconfig.json enables strict flags that will break common patterns:

noUncheckedIndexedAccess — array[i] returns T | undefined; always null-check.
exactOptionalPropertyTypes — prop?: T means "omit or exact T", not "omit or undefined".
noUnusedLocals / noUnusedParameters — unused symbols are errors (prefix with _ to suppress).
noImplicitReturns — every code path must return.

## Path aliases

@/* and ~/* both resolve to src/. Use them — do not use relative ../../ chains.

## Architecture layers (enforced by ESLint boundaries)

Dependency flow is unidirectional:

screens → features → components → hooks → services → api
A lower layer cannot import a higher layer. The eslint-plugin-boundaries rule will error on violations. If you need cross-cutting logic, place it in hooks/ or services/.

features/ is defined in boundaries but does not exist yet — use it when you need feature-specific logic that screens/ should not contain.

## ESLint quirks

Config lives in config/eslint.config.ts (not root). Key gotchas:

Perfectionist sort-imports is enforced: groups are builtin → react → expo → external → internal (@/, ~/) → relative. Newline between groups. Match this order or CI fails.
react-native/no-color-literals: error — never hardcode colors; use src/constants/colors.ts.
react-native/no-inline-styles: warn — prefer NativeWind classes.
unused-imports/no-unused-imports: error — dead imports are caught; the TS no-unused-vars rule is off (delegated).
Cognitive complexity limit is 15 (sonarjs).
unicorn/filename-case is off — React Native PascalCase components are fine.

## NativeWind (Tailwind for RN)

NativeWind 4 requires three config files to be wired together. Do not break this chain:

tailwind.config.js — content paths and nativewind/preset.
metro.config.js — withNativeWind(config, { input: "./src/styles/global.css" }).
babel.config.js — includes "nativewind/babel" preset.
src/styles/global.css — imported at top of App.tsx.
If Tailwind classes stop working, check these four files first.

## Prettier

Config in config/prettier.config.mjs. Key settings: single quotes, trailing commas (all), 80 char width, LF line endings, prettier-plugin-tailwindcss for automatic class sorting.

## Git hooks (Lefthook)

lefthook.yml runs:

commit-msg: commitlint (conventional commits, max 100 char header).
pre-commit: lint-staged → prettier + eslint --fix + tsc on staged .ts/.tsx files.
Commit format: type(scope): description — types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert. See CONTRIBUTING.md for examples.

## API / networking

src/services/api.ts creates an Axios instance pointing to EXPO_PUBLIC_API_URL (defaults to http://localhost:8000/api). It attaches JWT from AsyncStorage and clears tokens on 401. All API calls should go through this instance.

## Screen structure

src/screens/
auth/ # LoginScreen, RegisterScreen
buyer/ # HomeScreen, ProductDetailScreen
farmer/ # MyProductsScreen, AddProductScreen
admin/ # AdminPanelScreen

## Communication guidelines

- When applying changes, do NOT show code snippets in responses — write changes directly to files.
- Keep final responses concise, clear, and focused on natural language summaries of what was modified and verified.
