# Proyecto Rassa — Documento Maestro de Contexto y Guía de Revisión

Este documento unifica todo el contexto del ecosistema de **Rassa** (Backend y Frontend), definiendo la arquitectura general, reglas del equipo, restricciones de seguridad y el protocolo de revisión de Pull Requests.

---

## 🌐 1. Contexto General del Proyecto Rassa

**Rassa** es una plataforma colaborativa diseñada para conectar directamente a productores locales (agricultores) con compradores, eliminando intermediarios y optimizando la cadena de suministro agropecuaria.

### Roles de Usuario en el Sistema

1. **Administrador:** Encargado de gestionar catálogos (categorías de productos, unidades de medida), usuarios, permisos y auditorías.
2. **Agricultor / Vendedor:** Gestiona su inventario, publica productos semanales, establece precios y coordina entregas.
3. **Cliente / Comprador:** Explora el catálogo, realiza pedidos y gestiona pagos de forma digital.

### Arquitectura de Software

- **Backend (`rassa_back`):** Construido sobre Django 5 y Django REST Framework. Sigue un patrón modular de "Blueprints" donde cada funcionalidad reside dentro de `rassa/blueprints/{modulo}/` (que encapsula serializers, views y urls propios). La base de datos es PostgreSQL y contiene tablas legadas (legacy) que requieren retrocompatibilidad (por ejemplo, sincronizar campos nuevos como `nombre` en la unidad con campos legacy como `tipo`).
- **Frontend (`rassa_front`):** Desarrollado en React Native con Expo y TypeScript. Utiliza clases de NativeWind (Tailwind CSS para React Native) para el diseño, React Query para el estado del servidor y PaperProvider. Sigue una arquitectura limpia estructurada por capas estrictas:
  `screens` ➔ `features` ➔ `components` ➔ `hooks` ➔ `services` ➔ `api`

---

## 👥 2. Roles de Trabajo y Restricciones Críticas (AI)

- **Tu Rol (Usuario):** Sos Revisor de Código (Reviewer). Evaluás la calidad del código, el cumplimiento de las guías y la detección de bugs para aprobar o rechazar los PRs de los compañeros (equipo de 3 desarrolladores).
- **Mi Rol (AI):** Revisor Técnico de Apoyo. Analizo las ramas, ejecuto pruebas de estática, identifico fallos y genero reportes de revisión estructurados.

### 🚫 Restricciones Críticas de la AI (No violar nunca):

1. **REGLA DE EDICIÓN CRÍTICA:** Nunca debo realizar cambios, modificaciones o ediciones en ningún archivo de código del proyecto (archivos fuente, configuración de la aplicación, dependencias, etc.). Mi rol se limita estrictamente a la lectura de archivos para su análisis y la redacción de reportes.
2. **⚠️ REGLA DE CONTROL DE VERSIONES CRÍTICA (ESTRICTA):** NUNCA DEBO EJECUTAR EL COMANDO `git merge` NI FUSIONAR RAMAS EN EL REPOSITORIO DE MANERA AUTÓNOMA, BAJO NINGUNA CIRCUNSTANCIA (INCLUYENDO SIMULACIONES, DRY-RUNS O PRUEBAS DE CONFLICTOS LOCALES). Esta acción queda reservada EXCLUSIVAMENTE para cuando el usuario lo ordene de manera explícita, directa y literal en el chat.
3. **REGLA DE CONFIRMACIÓN OBLIGATORIA:** Antes de realizar cualquier acción significativa en el sistema (como instalar paquetes, ejecutar herramientas, autenticar CLI, publicar revisiones o realizar chequeos en segundo plano), debo detallar claramente al usuario qué es lo que voy a hacer y solicitar su confirmación explícita antes de proceder.
4. **REGLA DE EJECUCIÓN DEL PROYECTO:** Siempre que vayamos a revisar un PR, debo levantar/ejecutar el proyecto en la rama correspondiente a dicho PR (tanto backend como frontend si aplica) para que puedas visualizar la interfaz y comprobar la presencia de fallos visuales de forma manual.
5. **⚠️ REGLA DE ENVÍO DE REVISIONES Y COMENTARIOS EN GITHUB (ESTRICTISIMA):** BAJO NINGUNA CIRCUNSTANCIA debo enviar o publicar comentarios, revisiones (APPROVED, REQUEST CHANGES, COMMENT) o interactuar con la API del repositorio para subir información en GitHub sin que me hayas dado una confirmación de envío literal y explícita (como "dale", "enviá", "publicá", "hacelo") a una pregunta directa. Aunque me des detalles de qué escribir o sugerencias sobre el contenido, NUNCA debo publicar nada en GitHub de forma autónoma.

---

## 📱 3. Guía de Revisión — Frontend (rassa_front)

### Convenciones de Estilos y Diseño (Estricto)

- **Cero Colores Hardcodeados:** Todos los colores deben importarse desde `@/constants/colors.ts`. Cualquier literal hexadecimal o de color en clases Tailwind/NativeWind es motivo de rechazo (regla de ESLint `no-color-literals`).
- **Cero Estilos Inline:** Se debe priorizar el uso de clases NativeWind. Los estilos inline (`style={{...}}`) están desaconsejados a menos que sean dinámicos.
- **Interactividad y Gestos:** Los contenedores flotantes o absolutos (como Toasts, Modales, Banners) que requieran clics deben usar `pointer-events-box-none` en lugar de `pointer-events-none` en React Native para evitar bloquear toques en sus elementos interactivos hijos.

### TypeScript y Tipado Estricto (Estricto)

- **Null-Checks obligatorios (`noUncheckedIndexedAccess`):** Al acceder a arrays por índice (`array[i]`), el tipo de retorno es `T | undefined`. Se debe validar la existencia antes de su uso.
- **Evitar runtime crash:** Al usar métodos como `.toLocaleLowerCase()` o `.trim()` sobre propiedades provenientes de la base de datos (por ejemplo, `u.nombre`), se debe usar obligatoriamente encadenamiento opcional: `u.nombre?.toLocaleLowerCase()`.
- **Exact Optional Property Types:** Si una propiedad es opcional (`prop?: T`), significa que se debe omitir o pasar el tipo exacto, no pasar `undefined`.

### Estructura, Arquitectura e Imports (Estricto)

- **Dirección de Capas:** Está prohibido importar capas superiores desde inferiores (enforzado por ESLint).
- **Path Aliases Obligatorios:** Usar `@/` o `~/` en lugar de paths relativos largos (ej. `../../components`).
- **Orden de Imports (Perfectionist):** Debe respetarse el orden estricto de ESLint: Builtins ➔ React ➔ Expo ➔ Librerías Externas ➔ Internas (`@/`, `~/`) ➔ Relativas. Con separación por líneas vacías entre grupos.
- **Complejidad Cognitiva:** El límite máximo tolerable por función es 15 (regla de ESLint `sonarjs`).

### Git y Tamaño del PR

- **Formato de Rama:** `tipo/descripcion-corta-en-ingles` (ej. `feat/categories-crud`). Todo en minúsculas.
- **Nombre de PR y Commits:** Usar Conventional Commits (`tipo(alcance): descripcion`) en imperativo y en inglés (ej: `feat(admin): add toast...`).
- **Tamaño del PR:**
  - 🟢 **50 - 200 líneas:** Ideal.
  - 🟡 **200 - 400 líneas:** Aceptable.
  - 🔴 **400 - 800 líneas:** Grande.
  - ⛔ **800+ líneas:** OBLIGATORIO rechazar y solicitar subdivisión.

### Seguridad

- **Cero Datos Sensibles:** No se permiten contraseñas, API keys o tokens hardcodeados.
- **Uso de SecureStore:** Los secretos y tokens de autenticación JWT deben guardarse en `SecureStore` (NO en `AsyncStorage`).

---

## 💻 4. Guía de Revisión — Backend (rassa_back)

### Arquitectura y Código

- **Estructura Modular (Blueprints):** El backend se organiza por módulos dentro de `rassa/blueprints/{modulo}/`.
- **Idiomas de Mensajes:** Los serializers expuestos a la API deben devolver los mensajes de error de validación en **español**.
- **Modelos Legacy:** Al modificar tablas heredadas (ej. `unidad`), mantener la sincronización y compatibilidad con campos legacy (como mapear `nombre` al campo legacy `tipo` en el serializer de Unidad).

### Convenciones de Control de Versiones

- **Nombres de Rama:** Deben usar el formato `tipo/descripcion-corta-en-ingles` (todo en minúsculas, máx 4 palabras, sin issues ni espacios).
- **Conventional Commits:** Seguir la regla `tipo(alcance): descripcion` usando verbos en imperativo e inglés (ej. `feat(auth): add login`).

---

## 📁 5. Configuración Local y Rutas del Sistema

### Rutas Absolutas de Repositorios (Local)

- **Frontend:** `c:\Users\gjeru\OneDrive\Documentos\GitHub\rassa_front`
- **Backend:** `c:\Users\gjeru\OneDrive\Documentos\GitHub\rassa_back`

### Base de Datos Local (PostgreSQL)

- **Motor:** PostgreSQL 16
- **Puerto:** `5433`
- **Nombre de BD:** `rassa`
- **Usuario:** `postgres`
- **Contraseña:** `12345` (o `123456`)

### Herramientas de Integración (CLI)

- **GitHub CLI (`gh`):** Instala en `C:\Program Files\GitHub CLI\gh.exe` y autenticada con token PAT (`read:org`, `repo`, etc.).

---

## 🔄 6. Historial de Cambios y Revisiones

### PR #14 de adri0837 (Frontend - Rama `feat/categories-units-crud`)

- **Estado:** ✅ `APPROVED` (Aprobado en GitHub el 13 de Julio de 2026).
- **Detalle de revisiones:**
  - **Revisión 1 (13-Jul-2026):** Solicitados fixes de nulos, interacción Toast, validación de abreviaturas y visualización de errores. (Resueltos con éxito por el desarrollador).
  - **Revisión 2 (13-Jul-2026):** Solicitados cambios pendientes de visualización de inactivos y colores hardcodeados. (Resueltos con éxito por el desarrollador).
  - **Revisión 3 (13-Jul-2026):** Verificada la implementación completa de la papelera (`TrashListScreen`, `CategoryTrashScreen`, `UnitTrashScreen`) conectando con los nuevos endpoints de la API, y la centralización de constantes de color. PR aprobado de manera exitosa.

### PR #41 de ArmandoEliasf (Backend - Rama `feat/categories-units-crud` / PR #41)

- **Estado:** ✅ `APPROVED` (Aprobado en GitHub el 13 de Julio de 2026).
- **Detalle de la revisión:**
  - **Revisión 1 (13-Jul-2026):** Verificados los endpoints de papelera (`/trash/`), restauración (`/restore/`) y borrado permanente (`/permanent/`). Todo el flujo funciona correctamente con seguridad RBAC (Admin-only para escritura) y 20 nuevos tests pasaron con éxito.

### PR #13 de IonizedTomcat (Frontend - Rama `app-navigation-onboarding`)

- **Estado:** 🔍 `UNDER MANUAL REVIEW` (En revisión manual del usuario el 15 de Julio de 2026).
- **Detalle de la revisión:**
  - **Revisión 1 (13-Jul-2026):** Solicitados los siguientes cambios:
    1. _Regresión de PaperProvider:_ Mantener `<PaperProvider>` en `App.tsx` para evitar que fallen los diálogos y componentes del CRUD.
    2. _Colores Hardcodeados:_ Mover los valores de color hexadecimal a `colors.ts` (Navbar, OnboardingScreen, RoleErrorScreen, LoginScreen).
    3. _Persistencia del Modo Oscuro:_ Guardar la preferencia del tema visual localmente (AsyncStorage) para mantenerla al recargar la app.
  - **Revisión 2 (15-Jul-2026):** Verificadas las correcciones iniciales de tema y colores. Solicitadas correcciones de consistencia estética y navegación del Administrador tras su mezcla con `main`:
    1. _Redundancias en AdminPanelScreen:_ Remover el header verde y el botón inferior redundante de cerrar sesión, integrándolo con el nuevo `Navbar`.
    2. _Vincular rutas CRUD:_ Registrar `CategoryListScreen`, `UnitListScreen` y sus respectivas papeleras en `AppNavigator.tsx` para asegurar que las opciones del panel respondan a la navegación.
  - **Revisión 3 (15-Jul-2026):** Aprobación descartada. Solicitados cambios técnicos:
    1. _Flags comingSoon en simultáneo:_ Desactivar el flag `comingSoon` tanto en `CategoryListScreen.tsx` como en `UnitListScreen.tsx` simultáneamente, ya que al activar uno se revirtió accidentalmente el otro.
    2. _Overlay de Carga en Login:_ Quitar `isLoading: true` global del método `login` de `AuthContext.tsx` para evitar que se desmonte el login y se limpien los campos, y en su lugar implementar un overlay a pantalla completa en `LoginScreen.tsx` cuando `isSubmitting` sea `true`.

### PR #11 de ObedAlPa (Frontend & Backend - Rama `feat/Auth+Registro` / PR #11)

- **Estado:** ✅ `APPROVED` (Fusión y resolución de conflictos completadas el 16 de Julio de 2026).
- **Detalle de la revisión:**
  - **Revisión 1 (16-Jul-2026):** Verificada la implementación completa de la actualización de perfiles, registro de usuarios por administrador y autorregistro, con validaciones en español, control de expiración de sesión y persistencia local. Corregido el bloqueo de compilación de Babel por dependencias nativas faltantes (`react-native-worklets` y `react-native-reanimated`) que se limpiaban al instalar con npm. Sincronizada la base de datos local y el backend en la misma rama.
  - **Resolución de Conflictos y Fusión (16-Jul-2026):** Se integró localmente con `main`. Se resolvieron conflictos en 14 archivos, entre ellos `AddProductScreen.tsx` (estilo en español), `AppNavigator.tsx` (corrección de tipos no utilizados TS6196), `AuthContext.tsx` y su test `AuthContext.test.tsx` (unificación del parser de excepciones de red robusto `parseAuthError` y corrección de condiciones de carrera mediante `waitForLoading` en Jest). Todas las pruebas (191/191) pasan al 100%.

---

## 📋 7. Estructura Obligatoria para Reportes de Revisión

Cada vez que analice un PR, el veredicto debe estructurarse de la siguiente manera para facilitar su copia y uso:

```markdown
# Estado de la Revisión: [Aprobado (APPROVED) / Cambios Requeridos (REQUEST CHANGES)]

## 📝 Resumen del PR

<!-- Breve resumen de qué introduce el PR -->

## ❌ Cambios Requeridos / Mejoras Pendientes

- **Archivo:** `path/to/file`
- **Problema:** [Descripción técnica del bug, falla de seguridad o estilo]
- **Solución requerida:** [Ejemplo o indicación clara de cómo resolverlo]

## ✅ Checklist de Cumplimiento

- [ ] Pasa typecheck, lint y format.
- [ ] Sin colores ni estilos hardcodeados.
- [ ] Sin console.logs o debuggers olvidados.
- [ ] Conflictos resueltos contra main.
```
