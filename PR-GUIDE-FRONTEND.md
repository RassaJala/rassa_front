---
project: rassa_front
repository: https://github.com/ObedAlPa/rassa_front
stack: React Native 0.81, Expo SDK 54, TypeScript, NativeWind (Tailwind for RN)
package_manager: bun
base_branch: main
branch_prefixes:
  - feat/
  - fix/
  - refactor/
  - test/
  - docs/
  - chore/
  - hotfix/
commands:
  install: 'bun install'
  dev: 'bun run start'
  typecheck: 'bun run typecheck'
  lint: 'bun run lint'
  lint_fix: 'bun run lint:fix'
  format: 'bun run format'
  format_check: 'bun run format:check'
  test: 'npx jest'
ci_order: 'typecheck → lint → format:check'
path_aliases:
  '@/*': 'src/'
  '~/*': 'src/'
architecture_layers: 'screens → features → components → hooks → services → api'
---

# PR Guide — Frontend (rassa_front)

## INSTRUCCIONES PARA IA

Cuando un desarrollador solicite crear un PR para **rassa_front**, este documento es la referencia **obligatoria**. Lee cada sección y aplícala al contexto del PR.

**Flujo de uso:**

1. El desarrollador describe qué quiere hacer
2. Tú lees este documento completo
3. Aplicas las reglas de naming, commits, PR template y checklist
4. Generas la rama, commits y PR siguiendo este formato

---

## 1. Nombre de Rama

### Formato

```
tipo/descripcion-corta-en-ingles
```

### Reglas

- **Sin espacios** — guiones (`-`) para separar palabras
- **Todo en minúsculas** — sin excepciones
- **Máximo 4 palabras** — ser conciso pero descriptivo
- **Nunca** incluir números de issue en la rama
- **Nunca** usar nombres genéricos: `update`, `fix`, `test`, `changes`

### Ejemplos Correctos

```
feat/user-login-screen
fix/token-expiration-crash
refactor/auth-service-abstraction
test/auth-context-coverage
docs/api-endpoints
chore/eslint-prettier-setup
```

### Ejemplos Incorrectos

```
fix-branch-2                          ← genérico
feat/issue-42-add-login               ← issue number no va aquí
Test Branch                           ← mayúsculas y espacios
WIP                                   ← trabajo en progreso
```

---

## 2. Nombre del PR

### Formato

```
tipo(alcance): descripción corta en inglés, imperative mood
```

### Reglas

- **Imperative mood**: "add", "fix", "resolve", "remove" — NUNCA "added", "fixed"
- **Máximo 72 caracteres**
- **Minúscula** después del paréntesis
- **Sin punto** al final
- Referencia a issue al final: `(#issue-number)`

### Ejemplos

```
feat(auth): add JWT login with refresh token (#12)
fix(auth): resolve token expiration race condition
refactor(storage): extract reusable storage abstraction
test(auth): add unit tests for AuthContext provider
```

---

## 3. Commits

### Convención

```
tipo(alcance): descripción corta

[Opcional: contexto adicional]
```

### Reglas

| Regla                        | Detalle                           |
| ---------------------------- | --------------------------------- |
| Un commit = Un cambio lógico | No mezclar feat + fix             |
| Descripción clara            | Explicar QUÉ y POR QUÉ            |
| Sin código basura            | No `console.log()`, `debugger`    |
| Compila                      | Cada commit debe pasar typecheck  |
| Tamaño ideal                 | 50-200 líneas, máx tolerable ~400 |

### Tipos Permitidos (Conventional Commits)

| Tipo       | Uso                                      |
| ---------- | ---------------------------------------- |
| `feat`     | Nueva funcionalidad                      |
| `fix`      | Corrección de bug                        |
| `refactor` | Reestructurar sin cambiar comportamiento |
| `test`     | Agregar o mejorar tests                  |
| `docs`     | Documentación                            |
| `chore`    | Tareas de mantenimiento                  |
| `style`    | Formato (no afecta lógica)               |
| `ci`       | Integración continua                     |
| `perf`     | Mejoras de rendimiento                   |

### Ejemplo de Historial Limpio

```
a1b2c3d feat(auth): add login screen with form validation
b2c3d4e feat(auth): implement JWT token storage with SecureStore
c3d4e5f feat(auth): add token refresh interceptor to API client
d4e5f6g test(auth): add unit tests for AuthContext provider
```

---

## 4. Template del PR (Obligatorio)

Todo PR **DEBE** incluir esta descripción:

```markdown
## 📌 Descripción

<!-- 2-3 oraciones: QUÉ hace este PR y POR QUÉ es necesario -->

## 🔄 Tipo de Cambio

- [ ] 🐛 Bug fix
- [ ] ✨ Feature
- [ ] ♻️ Refactor
- [ ] 📝 Docs
- [ ] 🧪 Test
- [ ] 🔧 Chore

## 📂 Archivos Modificados

| Archivo   | Qué cambió  | Por qué |
| --------- | ----------- | ------- |
| `src/...` | Descripción | Razón   |

## 🧪 Cómo Probarlo

1. [Paso para verificar]
2. [Resultado esperado]

## 📸 Screenshots

<!-- Solo si aplica — cambios en UI -->

## ✅ Checklist

- [ ] `bun run typecheck` pasa sin errores
- [ ] `bun run lint` pasa sin errores
- [ ] `bun run format:check` pasa
- [ ] No hay `console.log()` o `debugger` olvidados
- [ ] Rama actualizada con main (sin conflictos)
- [ ] Path aliases usados (`@/` o `~/`) en vez de rutas relativas
- [ ] Sin colores hardcodeados (usar `src/constants/colors.ts`)
- [ ] Sin inline styles (usar NativeWind classes)
- [ ] Imports ordenados según ESLint (builtin → react → expo → external → internal → relative)
```

---

## 5. Verificación Antes de Abrir PR

### CI Order (obligatorio)

```bash
# 1. Typecheck
bun run typecheck

# 2. Lint
bun run lint

# 3. Format check
bun run format:check

# 4. Tests (si existen)
npx jest
```

### REGLA INQUEBRANTABLE

**No solicitar review si:**

- ❌ `typecheck` falla
- ❌ `lint` tiene errores
- ❌ `format:check` falla
- ❌ Hay conflictos sin resolver
- ❌ CI está rojo

---

## 6. Reglas de Código Frontend

### TypeScript Strictness

El proyecto usa TypeScript estricto. Reglas que NUNCA se deben romper:

| Regla                        | Implicación                                                   |
| ---------------------------- | ------------------------------------------------------------- |
| `noUncheckedIndexedAccess`   | `array[i]` retorna `T \| undefined` — siempre null-check      |
| `exactOptionalPropertyTypes` | `prop?: T` significa "omit o T exacto", no "omit o undefined" |
| `noUnusedLocals`             | Variables sin usar = error (prefijar con `_` para suprimir)   |
| `noUnusedParameters`         | Parámetros sin usar = error (prefijar con `_`)                |
| `noImplicitReturns`          | Todo camino debe retornar                                     |

### Path Aliases (Obligatorios)

```typescript
// ✅ Correcto
import { Button } from '@/components/Button';
import { useAuth } from '~/hooks/useAuth';

// ❌ Incorrecto
import { Button } from '../../components/Button';
```

### Architecture Layers (enforced by ESLint)

```
screens → features → components → hooks → services → api
```

Una capa **inferior** NO puede importar una capa **superior**. Si necesitas lógica cross-cutting, usar `hooks/` o `services/`.

### NativeWind (Tailwind for RN)

- **NO** usar inline styles
- **NO** hardcodear colores — usar `src/constants/colors.ts`
- Usar classes de NativeWind para estilos
- Si Tailwind no funciona, verificar: `tailwind.config.js`, `metro.config.js`, `babel.config.js`, `src/styles/global.css`

### ESLint Gotchas

- **Perfectionist sort-imports** enforced: builtin → react → expo → external → internal (`@/`, `~/`) → relative. Nueva línea entre grupos.
- `no-color-literals: error` — nunca colores hardcodeados
- `no-inline-styles: warn` — preferir NativeWind
- `unused-imports: error` — imports muertos son errores
- Cognitive complexity limit: 15 (sonarjs)

---

## 7. Seguridad

### Datos Sensibles

- [ ] No hardcodear contraseñas, tokens, API keys
- [ ] No commitear `.env`, `credentials.json`, `*.pem`, `*.key`
- [ ] No commitear `node_modules/`
- [ ] Verificar `.gitignore` completo

### Autenticación

- [ ] Tokens en SecureStore (NO AsyncStorage para secrets)
- [ ] JWT interceptor configurado en `src/services/api.ts`
- [ ] Manejo de 401 (clear tokens) implementado

---

## 8. Tamaño del PR

| Tamaño       | Líneas  | Veredicto                 |
| ------------ | ------- | ------------------------- |
| 🟢 Ideal     | 50-200  | Review rápida             |
| 🟡 Aceptable | 200-400 | Justificar en descripción |
| 🔴 Grande    | 400-800 | Dividir si es posible     |
| ⛔ Problema  | 800+    | OBLIGATORIO dividir       |

**Un PR = Una cosa.** No mezclar feat + fix + refactor.

---

## 9. Responder a Review

### Flujo

1. Leer TODOS los comentarios
2. Hacer cambios en commits nuevos (NO amend)
3. Responder cada comentario:
   - ✅ `Done` — cambio aplicado
   - 💬 `Done — ajusté porque [razón]` — con variación
   - 🤔 `Prefiero no cambiar porque [razón]` — discrepar
4. Push commits nuevos
5. Comentar: "Changes applied, ready for re-review ✅"

**Nunca:**

- Ignorar comentarios
- Hacer squash de fixes
- Pedir re-review sin responder todo

---

## 10. Ejemplo de PR Completo

### Rama

```
feat/login-jwt-auth
```

### Título

```
feat(auth): add JWT login with refresh token and role-based navigation
```

### Commits

```
a1b2c3d feat(auth): add login screen with form validation
b2c3d4e feat(auth): implement JWT token storage with SecureStore
c3d4e5f feat(auth): add token refresh interceptor to API client
d4e5f6g feat(auth): add role-based navigation routing
e5f6g7h test(auth): add unit tests for AuthContext provider
```

### Descripción

```markdown
## 📌 Descripción

Implementación completa de autenticación JWT con login, refresh token,
y navegación basada en roles (Admin, Agricultor, Vendedor, Cliente).

## 🔄 Tipo de Cambio

- [x] ✨ Feature

## 📂 Archivos Modificados

| Archivo                              | Qué cambió                           | Por qué                     |
| ------------------------------------ | ------------------------------------ | --------------------------- |
| `src/screens/auth/LoginScreen.tsx`   | Pantalla de login con formulario     | Acceso de usuarios          |
| `src/services/api.ts`                | Interceptor JWT + refresh            | Manejo de tokens            |
| `src/services/storage.ts`            | Abstracción SecureStore/AsyncStorage | Multi-plataforma            |
| `src/store/AuthContext.tsx`          | Context de autenticación             | Estado global de auth       |
| `src/navigation/AppNavigator.tsx`    | Navegación por roles                 | Routing según permisos      |
| `src/__tests__/AuthContext.test.tsx` | Tests unitarios                      | Cobertura de lógica crítica |

## 🧪 Cómo Probarlo

1. Ejecutar `bun run start` y escanear QR
2. Ingren con `admin@rassa.com` / `admin123`
3. Verificar que redirige a AdminPanelScreen
4. Cerrar sesión y verificar retorno a LoginScreen

## ✅ Checklist

- [x] `bun run typecheck` pasa
- [x] `bun run lint` pasa
- [x] `bun run format:check` pasa
- [x] No hay console.log olvidados
- [x] Rama actualizada con main
- [x] Path aliases usados (@/)
- [x] Sin colores hardcodeados
- [x] Sin inline styles
```

---

## 📌 Resumen

| #   | Requisito                              | Obligatorio |
| --- | -------------------------------------- | :---------: |
| 1   | Rama `tipo/descripcion`                |     ✅      |
| 2   | PR con título imperative mood          |     ✅      |
| 3   | Commits atómicos y descriptivos        |     ✅      |
| 4   | Template completo en descripción       |     ✅      |
| 5   | CI pasando antes de pedir review       |     ✅      |
| 6   | Responder TODOS los comments           |     ✅      |
| 7   | TypeScript strict respetado            |     ✅      |
| 8   | Path aliases (@/, ~/)                  |     ✅      |
| 9   | Sin colores/inline styles hardcodeados |     ✅      |
| 10  | PR con scope acotado                   |     ✅      |
