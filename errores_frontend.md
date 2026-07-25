# Registro de Errores y Lecciones Aprendidas — Frontend (`rassa_front`)

Este documento compila todos los errores técnicos, problemas de dependencias, fallos en pruebas y advertencias de calidad que surgieron durante el ciclo de vida de la rama `feat/Auth+Registro`. Su propósito es servir como referencia de control de calidad para evitar cometer los mismos errores en futuros desarrollos del frontend.

---

## Índice de Categorías

1. [Lógica de Negocio y Validación](#1-lógica-de-negocio-y-validación)
2. [Tipado y Compilación (TypeScript)](#2-tipado-y-compilación-typescript)
3. [Estilo y Calidad de Código (ESLint & Prettier)](#3-estilo-y-calidad-de-código-eslint--prettier)
4. [Entorno de Ejecución y Gestión de Dependencias](#4-entorno-de-ejecución-y-gestión-de-dependencias)
5. [Pruebas Unitarias (Jest)](#5-pruebas-unitarias-jest)

---

## 1. Lógica de Negocio y Validación

### 1.1 Condición de carrera en registro concurrente (Double Tap)

- **Descripción:** El estado de registro (`isRegistering`) se controlaba mediante un estado local de React. Al realizar múltiples pulsaciones rápidas consecutivas sobre el botón de envío, el estado asíncrono de React no se actualizaba lo suficientemente rápido, permitiendo que múltiples peticiones HTTP de registro se enviaran en paralelo.
- **Impacto:** Creación de usuarios duplicados en el backend y comportamiento inconsistente en la interfaz.
- **Solución:** Se implementó una referencia mutable (`useRef`) con `isRegisteringRef`. Esto asegura una lectura síncrona instantánea en memoria (`isRegisteringRef.current = true`) bloqueando inmediatamente cualquier clic subsiguiente antes de la re-renderización.
- **Lección:** Para flujos críticos (como compras, registros o pagos), siempre utiliza referencias mutables (`useRef`) o desactiva físicamente el botón en el primer evento de pulsación.

### 1.2 Validación incorrecta de fecha de nacimiento (`validateBirthdate`)

- **Descripción:** La validación permitía registrar a usuarios con fechas de nacimiento futuras u omitir la restricción de mayoría de edad.
- **Impacto:** Inconsistencia de datos en la base de datos y violación de políticas de usuario.
- **Solución:** Se reestructuró la validación en `validation.ts` para calcular de manera estricta la edad comparándola contra la fecha actual del sistema, requiriendo un mínimo de 18 años.
- **Lección:** No confíes en que los componentes de selección de fechas limiten la entrada; implementa siempre validaciones numéricas e históricas robustas en el helper de validación.

### 1.3 Inconsistencia en mensaje de error de teléfono

- **Descripción:** El validador y las pruebas esperaban mensajes de error ligeramente diferentes al validar longitudes de números telefónicos.
- **Impacto:** Fallos en las pruebas unitarias y falta de consistencia en los textos de cara al usuario.
- **Solución:** Se unificó a un único mensaje estandarizado: `'El teléfono debe tener 10 dígitos (nacional) o 12 dígitos (internacional).'`.
- **Lección:** Centraliza los mensajes de error en constantes de validación en lugar de definirlos de manera ad-hoc.

### 1.4 Fallback incorrecto para `fk_localidad` (HTTP 500)

- **Descripción:** Si el usuario no seleccionaba localidad, el frontend enviaba un valor por defecto de `0` (`fk_localidad ?? 0`).
- **Impacto:** Error de llave foránea (Foreign Key constraint) en la base de datos PostgreSQL del backend, provocando respuestas `500 Internal Server Error`.
- **Solución:** Se removió el fallback de `0`, y se añadió una validación estricta que impide enviar el formulario si `fk_localidad` es `null`.
- **Lección:** Nunca utilices identificadores inválidos (como `0` o `-1`) como fallbacks para llaves foráneas. Si el valor es requerido, bloquea el formulario; si es opcional, envía `null`.

### 1.5 Silenciado de errores en bloques `catch` (`changePassword` y `register`)

- **Descripción:** Al capturar errores de red en el Auth Provider, se registraba el error pero no se propagaba de vuelta al componente llamador.
- **Impacto:** La pantalla de interfaz de usuario no se enteraba de que la operación había fallado, por lo que no mostraba el toast de error y asumía un éxito falso.
- **Solución:** Se añadió un `throw error;` explícito al final de los catch blocks en `AuthContext.tsx`.
- **Lección:** Asegúrate de propagar siempre las excepciones hacia la capa superior de la UI si la pantalla necesita reaccionar visualmente ante un fallo.

---

## 2. Tipado y Compilación (TypeScript)

### 2.1 Error `TS6133` por código muerto / función no utilizada

- **Descripción:** La función `parseLoginError` quedó declarada en `AuthContext.tsx` tras unificar la lógica de manejo de excepciones en `parseAuthError`, pero no se leía en ningún sitio.
- **Impacto:** Error de compilación estricta de TypeScript (`noUnusedLocals`), impidiendo construir la aplicación para producción.
- **Solución:** Se removió por completo la función obsoleta.
- **Lección:** Si refactorizas y unificas funciones, elimina siempre el código sobrante. No dejes funciones "por si acaso" a menos que estén exportadas o prefijadas con guion bajo (`_`) si la configuración lo permite.

### 2.2 Error `no-explicit-any` en declaradores de Navigator

- **Descripción:** Los objetos de navegación stack y tab (`BuyerTab`, `FarmerTab`, etc.) se inicializaron usando `<any>` como tipo genérico.
- **Impacto:** Error de ESLint bloqueante (`@typescript-eslint/no-explicit-any`).
- **Solución:** Se quitaron los parámetros genéricos explícitos para permitir que la librería infiera automáticamente el tipo base `ParamListBase`.
- **Lección:** Evita el uso de `any`. Si una librería provee tipado por defecto al omitir genéricos, confía en la inferencia por defecto o importa su tipo base (ej. `ParamListBase`).

---

## 3. Estilo y Calidad de Código (ESLint & Prettier)

### 3.1 Estilos inline estáticos (`react-native/no-color-literals` y `no-inline-styles`)

- **Descripción:** Uso de propiedades `style={{ marginBottom: 16 }}` estáticas directamente sobre componentes de UI como `SegmentedButtons`.
- **Impacto:** Advertencias en el linter y desvío de los estándares estéticos definidos en `DESIGN.md`.
- **Solución:** Se extrajeron los estilos inline reemplazándolos con clases de NativeWind o envolviendo el elemento en un contenedor `<View className="mb-4">`.
- **Lección:** Prioriza siempre clases de Tailwind/NativeWind para mantener el diseño cohesivo y evitar que el linter se queje de estilos embebidos estáticos.

### 3.2 Errores de formato en archivos Markdown

- **Descripción:** El comando de formato general (`bun run format`) formateó por completo archivos de documentación como `.agents/AGENTS.md` y `README.md`.
- **Impacto:** Cambios masivos e indeseados de espacios en Git en archivos ajenos a la feature.
- **Solución:** Se restauraron los archivos markdown con `git restore` y se recomendó configurar el archivo `.prettierignore`.
- **Lección:** Excluye de forma definitiva documentación, reportes o carpetas del sistema que no deban formatearse automáticamente usando `.prettierignore`.

### 3.3 Complejidad cognitiva alta en manejador de excepciones

- **Descripción:** La función `extractApiError` contenía demasiada lógica de desestructuración, chequeo de tipos y parsing de HTML, superando el límite de complejidad cognitiva de 15 de SonarJS.
- **Impacto:** Fallo de linting de calidad de código de SonarJS.
- **Solución:** Se extrajo el parser de texto HTML a una función independiente llamada `parseHtmlOrStringError`.
- **Lección:** Mantén tus funciones enfocadas. Si una función maneja múltiples validaciones y transformaciones de datos, divídela en sub-funciones utilitarias.

---

## 4. Entorno de Ejecución y Gestión de Dependencias

### 4.1 Desincronización del Lockfile (`frozen-lockfile` error)

- **Descripción:** Se realizaron cambios directos sobre el archivo `package.json` pero no se ejecutó el instalador localmente para actualizar el lockfile, resultando en que la integración continua (CI) arrojara un error al correr en modo estricto.
- **Impacto:** Fallo inmediato del pipeline de compilación de GitHub.
- **Solución:** Correr `bun install` de forma local para sincronizar `package.json` y `bun.lock`, y posteriormente confirmar los cambios en Git.
- **Lección:** Siempre que agregues, elimines o modifiques una versión de dependencia en `package.json`, ejecuta `bun install` inmediatamente antes de realizar un commit.

### 4.2 Pérdida de paquetes nativos de React Native (Babel/Worklets error)

- **Descripción:** Al instalar dependencias usando el gestor nativo `npm`, se limpiaron dependencias requeridas como `react-native-worklets` y `react-native-reanimated`.
- **Impacto:** Error de compilación de Babel y caída de la aplicación móvil al iniciar.
- **Solución:** Usar exclusivamente el instalador oficial del monorepo (`bun install`), el cual tiene configurado en `bunfig.toml` el enlazador (`linker=hoisted`) adecuado para Expo y React Native.
- **Lección:** Nunca mezcles gestores de paquetes. En este repositorio, la única herramienta oficial de instalación de paquetes es **Bun**.

---

## 5. Pruebas Unitarias (Jest)

### 5.1 Fuga de temporizadores y falta de cleanup en tests (`ProfileScreen.test.tsx`)

- **Descripción:** Las pruebas ejecutaban repetidamente el componente bajo prueba sin limpiar adecuadamente llamadas pendientes asíncronas de temporizadores (`setTimeout`), causando fallos en los hooks de ciclo de vida del test.
- **Impacto:** Fallo intermitente en la ejecución de la suite de pruebas unitarias.
- **Solución:** Se estructuró correctamente la limpieza de mocks y llamadas pendientes utilizando `jest.runOnlyPendingTimers()` y limpiezas globales en `afterEach`.
- **Lección:** Cuando pruebes componentes que utilicen efectos con tiempos de espera, toasts automáticos o debouncers, limpia siempre los timers asíncronos en el ciclo de limpieza del test.
