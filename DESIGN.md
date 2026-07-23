---
name: Rassa
description: Plataforma de e-commerce para productos del campo — compradores (mobile-first), agricultores (responsive), administradores (web-first). Mobile, tablet y desktop desde una misma base.
version: 1.0.0
tags:
  [
    ecommerce,
    marketplace,
    campo,
    mobile,
    web,
    tablet,
    responsive,
    expo,
    react-native,
  ]
---

## Design Philosophy

Rassa conecta el campo con la ciudad. El **logo corporativo** marca el camino: una ilustración botánica lineal con textura orgánica que evoca grabados antiguos mezclados con flat art contemporáneo. La interfaz debe heredar ese espíritu — colores tierra y orgánicos, contornos precisos, y una tipografía sans-serif condensada que contraste limpieza geométrica con calidez artesanal.

Priorizamos usabilidad sobre decoración. Cada pantalla tiene un propósito claro y un camino de acción único. El diseño es el medio, no el mensaje.

La plataforma es **responsive por rol**: el mismo código corre en mobile, tablet y web. Cada rol tiene un patrón de navegación que se adapta al tamaño de pantalla, no una app distinta por plataforma.

**Toda la paleta de colores de la interfaz deriva del logo.** Si un color no está en el logo, no pertenece a Rassa.

## Colors

La paleta de Rassa está definida por los colores del **logo corporativo** — pero la interfaz NO es el logo. Usamos los colores con estrategia: el 80%+ de la UI es neutra (blanco, grises), los colores del logo aparecen puntualmente con propósito claro.

NO usar `src/constants/colors.ts`. Los colores del logo ya están configurados en `tailwind.config.js` como colores custom bajo la clave `brand-*`.

```tsx
// ✅ Correcto — colores del logo via Tailwind
<View className="bg-white" />
<Button buttonColor="#DE393A" />  {/* coral — CTA principal */}
<Text className="text-brand-ink" />

// ❌ Incorrecto — colores inventados o fuera de marca
<View style={{ backgroundColor: "#16a34a" }} />
```

### Principio: Restrained Palette

La pantalla es > 80% neutros. Cada color de marca aparece **una sola vez con un propósito**. No se mezclan.

```
┌──────────────────────────────────────┐
│  HEADER: Forest #3A6D56              │ ← única zona de color de marca
├──────────────────────────────────────┤
│                                      │
│  [Comprar] ── Coral #DE393A          │ ← único color interactivo
│  $2.500/kg ── Orange #E46C38         │ ← único color de precio
│  Texto normal ── Ink #1D1D1D         │ ← todo en neutro
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │ ← fondo blanco/gris
│                                      │
└──────────────────────────────────────┘
```

### Paleta completa (solo 4 colores de marca)

| Rol                   | Color               | Hex       | Se usa exactamente en                                     |
| --------------------- | ------------------- | --------- | --------------------------------------------------------- |
| **Marca** — identidad | Forest (hojas)      | `#3A6D56` | Solo header y logo. Nada más.                             |
| **CTA** — acción      | Coral (tomate)      | `#DE393A` | Botones, links, tabs activos. Un solo lugar por pantalla. |
| **Cálido** — precios  | Naranja (zanahoria) | `#E46C38` | Precios, badge "Oferta", estrellas.                       |
| **Texto** — contraste | Ink (contorno)      | `#1D1D1D` | Texto principal, iconos.                                  |

No hay más. No hay sage, no hay olive, no hay acentos compitiendo.

### Neutros

| Uso                                   | Clase             | Hex       |
| ------------------------------------- | ----------------- | --------- |
| Fondo general                         | `bg-gray-50`      | `#f9fafb` |
| Superficies (cards, modales, sidebar) | `bg-white`        | `#ffffff` |
| Texto principal                       | `text-brand-ink`  | `#1D1D1D` |
| Texto secundario                      | `text-gray-500`   | `#6b7280` |
| Bordes y separadores                  | `border-gray-200` | `#e5e7eb` |
| Placeholder / disabled                | `text-gray-400`   | `#9ca3af` |

### Semánticos

| Uso                  | Clase                         | Hex       |
| -------------------- | ----------------------------- | --------- |
| Error / alerta       | `text-red-500` / `bg-red-500` | `#ef4444` |
| Éxito / confirmación | `text-brand-green-forest`     | `#3A6D56` |
| Advertencia          | `text-brand-orange`           | `#E46C38` |

### Reglas de uso (no negociables)

1. **Forest (#3A6D56) vive SOLO en el header y el logo.** No aparece en botones, no en badges, no en fondos, no en texto de cuerpo. Es el color de identidad, no de interacción.
2. **Coral (#DE393A) es el ÚNICO color de acción.** Botones, links, tabs activos. Un CTA por pantalla usa coral. No hay dos cosas coral en la misma vista.
3. **Orange (#E46C38) es SOLO para precios y ofertas.** Precios, badge "Oferta", estrellas de rating. No se usa para botones ni headers.
4. **Ink (#1D1D1D) es para texto.** Body, títulos, iconos. Reemplaza cualquier uso de `text-gray-900`.
5. **No hay fondos tintados.** No `bg-brand-green-sage`, no `bg-brand-green-olive`. Las superficies son blancas o grises. El color de marca no es fondo.
6. **Una pantalla de Rassa tiene máximo 1 color de marca visible.** Si el header es forest, los botones son coral. Nunca forest header + coral botón + orange precio en la misma línea visual. Bueno, el precio en orange está permitido porque es un valor, no un elemento de acción. Pero no agregues más.

## Dark Mode

El proyecto soporta **modo oscuro** completo. Se activa desde la configuración del dispositivo/sistema (`prefers-color-scheme: dark`) o manualmente desde la app.

Usamos el prefijo `dark:` de Tailwind/NativeWind para todas las variantes oscuras. React Native Paper se configura con un tema oscuro en el `Provider`.

### Mapeo de colores light → dark

Cada clase light tiene su contraparte `dark:`. **Siempre hay que escribir ambas**:

```tsx
// ✅ Correcto — cubre ambos modos
<View className="bg-white dark:bg-gray-900" />
<Text className="text-gray-900 dark:text-gray-100" />
```

| Uso                                     | Light                   | Dark                                       |
| --------------------------------------- | ----------------------- | ------------------------------------------ |
| Fondo general                           | `bg-gray-50`            | `dark:bg-gray-950`                         |
| Superficies (cards, modales, sidebar)   | `bg-white`              | `dark:bg-gray-900`                         |
| Superficie elevada (dropdowns, modales) | `bg-white`              | `dark:bg-gray-800`                         |
| Texto principal                         | `text-gray-900`         | `dark:text-gray-100`                       |
| Texto secundario                        | `text-gray-500`         | `dark:text-gray-400`                       |
| Texto placeholder / disabled            | `text-gray-400`         | `dark:text-gray-500`                       |
| Bordes y separadores                    | `border-gray-200`       | `dark:border-gray-800`                     |
| Header nav                              | `bg-brand-green-forest` | `dark:bg-brand-green-forest` (se mantiene) |
| Texto principal                         | `text-brand-ink`        | `dark:text-gray-100`                       |
| Action (tabs activos, links)            | `text-brand-coral`      | `dark:text-brand-coral` (se mantiene)      |
| Precios, estrellas, badges oferta       | `text-brand-orange`     | `dark:text-brand-orange` (se mantiene)     |

### Restrained Palette en dark mode

Las mismas reglas aplican: sin fondos tintados, superficies neutras, un color de marca visible por pantalla.

| Elemento         | Antes (vieja paleta)                   | Ahora (restrained)                          |
| ---------------- | -------------------------------------- | ------------------------------------------- |
| Category chips   | `bg-[#1A3329]` tinte verde             | `bg-gray-800` + `border-gray-700` neutro    |
| Product image bg | `bg-[#1A3329]` / `bg-[#451a03]` tintes | `bg-gray-800` neutro                        |
| Sidebar activo   | `bg-[#1A3329]` tinte verde             | solo `border-r-2 border-brand-green-forest` |
| Status badges    | `bg-[#1A3329]` / `bg-[#271a00]` tintes | `bg-gray-800` neutro, texto semántico       |
| Tab activo       | `text-brand-green-forest`              | `text-brand-coral`                          |
| Acciones y links | `text-brand-green-forest`              | `text-brand-coral`                          |

### Shadows en dark mode

En modo oscuro las sombras no se ven (fondo negro). Reemplazar con bordes sutiles:

```tsx
// ✅ Light: shadow — Dark: borde delgado
<View className="bg-white shadow-sm dark:border dark:border-gray-800 dark:bg-gray-900 dark:shadow-none" />
```

### Layout patterns en dark mode

Todos los snippets de layout en las secciones siguientes YA deben incluir `dark:`.
Como referencia rápida, los cambios son siempre los mismos:

```tsx
// Mobile
<ScrollView className="flex-1 bg-gray-50 dark:bg-gray-950">
  <View className="rounded-xl bg-white p-4 shadow-sm dark:border dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
    <Text className="text-gray-900 dark:text-gray-100">Contenido</Text>
    <Text className="text-gray-500 dark:text-gray-400">Metadato</Text>
  </View>
</ScrollView>
```

### Cómo activar NativeWind dark mode

NativeWind usa `class` strategy por defecto. El toggle se aplica así:

```tsx
// Toggle manual
import { useColorScheme } from "nativewind";

function App() {
  const { colorScheme, setColorScheme } = useColorScheme();
  // setColorScheme("dark") | setColorScheme("light") | setColorScheme("system")
}
```

Para Paper, configurar el tema en el `Provider`:

```tsx
import {
  MD3DarkTheme,
  MD3LightTheme,
  Provider as PaperProvider,
} from "react-native-paper";

const brandCoral = "#DE393A";
const theme =
  colorScheme === "dark"
    ? {
        ...MD3DarkTheme,
        colors: { ...MD3DarkTheme.colors, primary: brandCoral },
      }
    : {
        ...MD3LightTheme,
        colors: { ...MD3LightTheme.colors, primary: brandCoral },
      };

<PaperProvider theme={theme}>{/* app */}</PaperProvider>;
```

### Regla clave

**Siempre pensá en pares.** Si escribís `bg-white`, escribí `dark:bg-gray-900` al lado. No existe componente que sea solo light en Rassa. Si ves código sin contraparte dark, está incompleto.

## Responsive Breakpoints

El proyecto usa Expo + NativeWind, que corre en mobile, tablet y web con el mismo código. Los breakpoints determinan cómo se adapta cada componente:

| Rango            | Alias     | Target                     | Layout                                        |
| ---------------- | --------- | -------------------------- | --------------------------------------------- |
| `< 640px`        | `mobile`  | Phones                     | navegación bottom tabs, 1 columna, full-width |
| `640px - 1023px` | `tablet`  | Tablets portrait/landscape | sidebar colapsable, grid 2 columnas           |
| `≥ 1024px`       | `desktop` | Web desktop                | sidebar fija, grid 3+ columnas, tablas densas |

NativeWind expone estos breakpoints como `sm:`, `md:`, `lg:`:

```tsx
// ✅ Mobile: 1 columna — Desktop: 3 columnas
<View className="grid grid-cols-1 lg:grid-cols-3 gap-4" />

// ✅ Mobile: bottom tabs — Desktop: sidebar
<View className="lg:hidden">{/* bottom tabs */}</View>
<View className="hidden lg:flex">{/* sidebar */}</View>
```

## Navegación por Rol y Pantalla

Cada rol tiene un patrón de navegación distinto que se adapta al viewport:

| Rol            | Mobile (< 640px)     | Tablet (640-1023px)            | Desktop (≥ 1024px)              |
| -------------- | -------------------- | ------------------------------ | ------------------------------- |
| **Comprador**  | Bottom tabs          | Bottom tabs + split view       | Top nav compacta + grid         |
| **Agricultor** | Bottom tabs          | Sidebar colapsable + contenido | Sidebar fija + dashboard        |
| **Admin**      | Sidebar como overlay | Sidebar colapsable fija        | Sidebar fija expandida + tablas |

```tsx
// Patrón de navegación responsive (ej. para agricultor/admin)
function AppNavigator() {
  const isDesktop = useMediaQuery({ minWidth: 1024 });
  const isTablet = useMediaQuery({ minWidth: 640, maxWidth: 1023 });

  if (isDesktop) return <AdminLayout />; // sidebar fija
  if (isTablet) return <TabletLayout />; // sidebar colapsable
  return <MobileLayout />; // bottom tabs
}
```

## Typography

Usamos la jerarquía nativa de `react-native` con Tailwind. Sin fuentes personalizadas (por ahora).

| Elemento           | Clase                   | Tamaño | Peso         | Uso                         |
| ------------------ | ----------------------- | ------ | ------------ | --------------------------- |
| Título grande      | `text-3xl font-bold`    | 30px   | Bold         | Hero, landing, empty states |
| Título pantalla    | `text-2xl font-bold`    | 24px   | Bold         | Header de pantalla          |
| Título sección     | `text-xl font-semibold` | 20px   | Semibold     | Secciones internas          |
| Subtítulo          | `text-lg font-medium`   | 18px   | Medium       | Cards, listas               |
| Cuerpo             | `text-base`             | 16px   | Normal (400) | Párrafos, descripciones     |
| Cuerpo chico       | `text-sm`               | 14px   | Normal       | Metadatos, chips            |
| Etiqueta / caption | `text-xs`               | 12px   | Medium       | Badges, timestamps          |

Regla: **máximo 2 pesos distintos por pantalla**. Si estás usando `font-bold` + `font-semibold` + `font-medium` en la misma vista, simplificá.

### Brand name

El nombre **"RASSA"** en el logo usa una **sans-serif condensada, monolineal** (similar a Futura Condensed Medium, Oswald Light). Es una fuente geométrica de grosor uniforme y vértices afilados, que contrasta con la suavidad de la ilustración del logo. Para mantener coherencia visual cuando aparezca el brand en la UI:

```tsx
<Text
  className="text-2xl font-bold tracking-tight text-brand-green-forest"
  style={{ fontFamily: "sans-serif-condensed" }}
>
  RASSA
</Text>
```

En Android (donde no existe `sans-serif-condensed`), basta con `font-bold tracking-tight` que da un efecto similar.

## Spacing

Usamos la escala nativa de Tailwind. No inventar valores custom.

- **pantalla**: `p-4` (16px) márgenes laterales estándar
- **entre secciones**: `gap-6` (24px) o `space-y-6`
- **entre elementos relacionados**: `gap-3` (12px) o `gap-4` (16px)
- **dentro de cards**: `p-4` padding interno
- **touch targets**: mínimo 44x44px (`h-11 w-11` o mayor)

## Border Radius

| Uso             | Clase          | Valor  |
| --------------- | -------------- | ------ |
| Botones, inputs | `rounded-lg`   | 8px    |
| Cards, modales  | `rounded-xl`   | 12px   |
| Badges, chips   | `rounded-full` | 9999px |

## Shadows

Usar NativeWind `shadow-*` classes. Sin estilos de sombra en línea.

| Uso            | Clase       |
| -------------- | ----------- |
| Cards elevadas | `shadow-sm` |
| Modales, FABs  | `shadow-lg` |

## Components

Preferir **React Native Paper** para componentes interactivos complejos. Usar **NativeWind** solo para layout, espaciado y variaciones simples.

Paper corre en mobile, tablet y web — mismos componentes, mismo comportamiento.

| Componente      | Librería          | Notas                                                     |
| --------------- | ----------------- | --------------------------------------------------------- |
| Button          | Paper `Button`    | `mode="contained"` con `buttonColor` = `#DE393A` (coral)  |
| TextInput       | Paper `TextInput` | Siempre con `mode="outlined"`                             |
| Card            | Paper `Card`      | O View nativa con `bg-white rounded-xl shadow-sm p-4`     |
| Dialog / Modal  | Paper `Dialog`    | Consistencia cross-platform                               |
| Bottom tabs     | React Navigation  | Mobile: visible siempre. Web: ocultar con `lg:hidden`     |
| Sidebar         | View + NativeWind | Solo web/tablet. `hidden lg:flex` en desktop              |
| Data Table      | View + FlatList   | Web: columnas fijas. Mobile: cards horizontales           |
| List / FlatList | React Native      | `ItemSeparatorComponent` con `h-px bg-gray-200` en listas |
| Badge / Chip    | View + NativeWind | `bg-gray-100 rounded-full px-3 py-1`                      |

### Botones primarios (coral — acción principal)

```tsx
<Button mode="contained" buttonColor="#DE393A" className="rounded-lg">
  Comprar
</Button>
```

### Botones secundarios (coral outline)

```tsx
<Button
  mode="outlined"
  textColor="#DE393A"
  className="rounded-lg border-brand-red-coral"
>
  Ver detalles
</Button>
```

## Iconography

Usar `@expo/vector-icons` (MaterialCommunityIcons por defecto).

- Tamaño estándar: 24
- Iconos pequeños (badges, tabs): 20
- Color por defecto: `text-gray-500` (sigue la paleta semántica)

## Layout Patterns

### Mobile (< 640px) — 1 columna, full-width

```tsx
<ScrollView className="flex-1 bg-gray-50">
  <View className="gap-4 p-4">{/* contenido */}</View>
</ScrollView>
```

### Tablet (640px - 1023px) — sidebar colapsable + grid

```tsx
<View className="flex-1 flex-row bg-gray-50">
  {/* Sidebar colapsable — 64px cuando colapsa, 240px cuando expande */}
  <Sidebar
    collapsed={isCollapsed}
    className="border-r border-gray-200 bg-white"
  />

  {/* Contenido principal */}
  <ScrollView className="flex-1 p-6">
    <View className="grid grid-cols-2 gap-4">{/* cards */}</View>
  </ScrollView>
</View>
```

### Desktop (≥ 1024px) — sidebar fija + layout denso

```tsx
<View className="flex-1 flex-row bg-gray-50">
  {/* Sidebar fija 260px */}
  <View className="min-h-screen w-64 border-r border-gray-200 bg-white" />

  {/* Main */}
  <ScrollView className="flex-1 p-8">
    {/* Header de página */}
    <View className="mb-8 flex-row items-center justify-between">
      <Text className="text-2xl font-bold text-gray-900">Pedidos</Text>
      <Button mode="contained" buttonColor="#DE393A">
        + Nuevo
      </Button>
    </View>

    {/* Tabla de datos (admin) */}
    <View className="overflow-hidden rounded-xl bg-white shadow-sm">
      {/* table header + rows */}
    </View>

    {/* Grid 3 columnas (productos) */}
    <View className="mt-8 grid grid-cols-3 gap-6">{/* cards */}</View>
  </ScrollView>
</View>
```

### Pantallas con scroll

```tsx
<ScrollView className="flex-1 bg-gray-50 p-4">{/* contenido */}</ScrollView>
```

### Pantallas con lista

```tsx
<FlatList
  data={items}
  contentContainerStyle="p-4 gap-4"
  ItemSeparatorComponent={() => <View className="h-px bg-gray-200" />}
  renderItem={...}
/>
```

### Cards producto / item

```tsx
<View className="rounded-xl bg-white p-4 shadow-sm">{/* contenido */}</View>
```

### Data table (admin — web)

```tsx
<View className="overflow-hidden rounded-xl bg-white shadow-sm">
  {/* Header de la tabla */}
  <View className="flex-row border-b border-gray-200 bg-gray-50 px-6 py-3">
    <Text className="w-16 text-xs font-medium text-gray-500">ID</Text>
    <Text className="flex-1 text-xs font-medium text-gray-500">Producto</Text>
    <Text className="w-24 text-xs font-medium text-gray-500">Precio</Text>
    <Text className="w-20 text-xs font-medium text-gray-500">Stock</Text>
    <Text className="w-20 text-xs font-medium text-gray-500">Estado</Text>
  </View>
  {/* Filas */}
  {items.map((item) => (
    <View className="flex-row items-center border-b border-gray-100 px-6 py-4">
      <Text className="w-16 text-sm text-gray-900">{item.id}</Text>
      <Text className="flex-1 text-sm text-gray-900">{item.name}</Text>
      <Text className="w-24 text-sm text-gray-900">{item.price}</Text>
      <Text className="w-20 text-sm text-gray-500">{item.stock}</Text>
      <Badge status={item.status} />
    </View>
  ))}
</View>
```

### Sidebar (admin / agricultor web)

```tsx
<View className="min-h-screen w-64 border-r border-gray-200 bg-white pt-6">
  {/* Logo */}
  <Text className="mb-8 px-6 text-xl font-bold text-brand-green-forest">
    Rassa
  </Text>

  {/* Items */}
  {navItems.map((item) => {
    const active = item.key === currentRoute;
    return (
      <Pressable
        key={item.key}
        className={`flex-row items-center gap-3 px-6 py-3 ${
          active ? "border-r-2 border-brand-green-forest" : ""
        }`}
      >
        <Icon
          icon={item.icon}
          size={20}
          color={active ? "#3A6D56" : "#6b7280"}
        />
        <Text
          className={`text-sm ${active ? "font-medium text-brand-green-forest" : "text-gray-600"}`}
        >
          {item.label}
        </Text>
      </Pressable>
    );
  })}
</View>
```

## Motion & Animation

Sin animaciones exuberantes. Preferir:

- **Transiciones de pantalla**: usar la default de React Navigation (slide horizontal en stack)
- **Feedback táctil**: `Pressable` con `opacity-80` en estado presionado
- **Loading**: `<ActivityIndicator>` nativo o Paper, centrado en la vista
- Nada de animaciones decorativas sin propósito funcional.

## Reglas para desarrolladores

1. **Siempre NativeWind classes**: no mezclar `className` con `style={{}}` en el mismo componente. Si necesitás un valor dinámico, pasalo como clase condicional.
2. **No tocar `src/constants/colors.ts`**: la paleta vive en las clases Tailwind. Ese archivo va a eliminarse.
3. **No crear componentes UI propios si Paper ya lo tiene**: botón, input, dialog, card — usá Paper. Solo creá componente custom si no existe en Paper o necesitás composición específica.
4. **Touch targets**: todo elemento interactivo debe tener 44x44px mínimos en mobile. No pongas `<Text>` como botón sin padding suficiente.
5. **Colores de marca**: siempre los definidos en `tailwind.config.js` bajo `brand-*`. El verde `brand-green-forest` (#3A6D56) va en header, logo, brand name. El coral `brand-red-coral` (#DE393A) va en botones, links, precios. Si un color no está en la paleta del logo, no se usa. Consistencia > preferencia personal.
6. **Over-engineering**: no abstraer un componente hasta que se repite 3+ veces. Primero la versión concreta, después la genérica si hace falta.
7. **Responsive first**: escribí el layout para mobile primero, después usá `sm:` / `md:` / `lg:` para adaptarlo. No al revés.
8. **Ocultar/mostrar por breakpoint**: usá `hidden lg:flex` para elementos solo-desktop, `lg:hidden` para solo-mobile. No hagas renders condicionales con `useWindowDimensions` para ocultar/show — deja que CSS lo maneje.
9. **Navegación por rol**: no mezcles navegación de roles. Cada rol tiene su propio navigator que elige qué layout mostrar (bottom tabs vs sidebar). Usá el hook `useMediaQuery` o similar, no repitas lógica de layout en cada pantalla.
10. **Click targets en web**: en web los targets pueden ser más chicos (32x32 mín), pero mantené 44x44 en mobile. Usá `hidden lg:block` para elementos web-only.
11. **Dark mode es obligatorio**: no existe componente solo-light. Cada `bg-white`, `text-gray-900`, `border-gray-200` debe tener su contraparte `dark:`. Si no sabés qué valor usar, revisá la tabla de Dark Mode arriba.

---

## Nuevo diseño (2026) — Rediseño del panel de administración

Esta sección documenta los patrones introducidos durante el rediseño del panel de administración (rama `redesign-panel-completo`).

### Paleta actualizada

| Token       | Light     | Dark      | Uso                             |
| ----------- | --------- | --------- | ------------------------------- |
| `--brand`   | `#24563C` | `#4A8A63` | Verde principal, badges activos |
| `--coral`   | `#DE393A` | `#DE393A` | Botones primarios, acciones     |
| `--bg`      | `#F5F7F0` | `#1A211B` | Fondo de pantalla               |
| `--surface` | `#FFFFFF` | `#263028` | Tarjetas, paneles, inputs       |
| `--fg`      | `#2D3328` | `#E8EAE4` | Texto principal                 |
| `--muted`   | `#5E6B5E` | `#9DA89D` | Texto secundario                |
| `--border`  | `#E2E6DF` | `#353D35` | Bordes                          |

### Componentes del rediseño

#### Tarjetas (Cards)

- `border-radius: 16px`, `border: 1px solid`, `padding: 16px`
- Sin sombra (el borde es suficiente)

#### Botones de acción

- **Icon buttons**: 36×36px (móvil) / 32×32px (web), `border-radius: 8-10px`, `border: 1px solid`
- **Primario**: coral, `border-radius: 10-16px`
- **Ghost**: `border: 1.5px solid`, sin fondo

#### Inputs

- `height: 44-46px`, `border: 1.5px solid`, `border-radius: 10-12px`
- Focus: `border-color: var(--brand)`
- Error: `border-color: var(--danger)`
- Labels en uppercase 12-13px, `letter-spacing: 0.08em`

#### Tabs (Segmented Control)

- Fondo gris claro, `border-radius: 12px`, `padding: 3px`
- Tab activo: fondo surface, texto fg
- Tab inactivo: transparente, texto muted

#### Modales

- **Móvil**: Bottom sheet con slide desde abajo, `border-radius: 24px 24px 0 0`
- **Web**: Modal centrado con `backdrop-filter: blur(4px)`, `border-radius: 20px`

#### Tablas (web CRUD)

- Cabecera con fondo `var(--bg)`, texto uppercase 11px
- Filas con `border-bottom: 1px solid`
- Hover sutil en filas
- Celdas con padding 12-14px 20px
