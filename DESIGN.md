# RASSA-JALA — Sistema de Diseño

## Filosofía

Diseño limpio, orgánico y profesional que evoca el campo y la frescura de los productos. 
Verde como color principal, coral como acento, formas redondeadas y tarjetas con bordes sutiles.

## Colores

### Modo claro
| Token | Hex | OKLCH | Uso |
|-------|-----|-------|-----|
| `--brand` | `#24563C` | `oklch(42% 0.14 148)` | Verde principal, links, íconos activos |
| `--coral` | `#DE393A` | `oklch(60% 0.17 18)` | Acento, botones primarios, errores |
| `--pumpkin` | `#F2A900` | `oklch(68% 0.16 65)` | Advertencias, inactivo |
| `--bg` | `#F5F7F0` | `oklch(97% 0.006 130)` | Fondo de pantalla |
| `--surface` | `#FFFFFF` | `oklch(100% 0 0)` | Tarjetas, paneles, inputs |
| `--fg` | `#2D3328` | `oklch(22% 0.025 150)` | Texto principal |
| `--muted` | `#5E6B5E` | `oklch(40% 0.025 145)` | Texto secundario, etiquetas |
| `--border` | `#E2E6DF` | `oklch(90% 0.012 140)` | Bordes de tarjetas e inputs |
| `--danger` | `#DE393A` | `oklch(55% 0.20 25)` | Acciones destructivas |
| `--success` | `oklch(55% 0.15 150)` | — | Estados exitosos |
| `--warn` | `oklch(72% 0.17 75)` | — | Advertencias |

### Modo oscuro
| Token | Hex | Uso |
|-------|-----|-----|
| `--bg` | `#1A211B` | Fondo de pantalla |
| `--surface` | `#263028` | Tarjetas, paneles, inputs |
| `--fg` | `#E8EAE4` | Texto principal |
| `--muted` | `#9DA89D` | Texto secundario |
| `--border` | `#353D35` | Bordes |
| `--brand` | `#4A8A63` | Verde principal |

## Tipografía

- **Familia**: `-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif`
- **Tamaños**: 11px (etiquetas uppercase), 13px (secundario), 14px (base), 15px (inputs), 16px (cards), 20-24px (títulos), 28px (page header)
- **Pesos**: 500 (regular), 600 (semibold), 700 (bold)

## Componentes

### Tarjetas (Cards)
- `border-radius: 16px`
- `border: 1px solid var(--border)`
- `padding: 16px`
- Sin sombra (el borde es suficiente)

### Botones
| Variante | Estilo |
|----------|--------|
| Primario (coral) | `background: var(--coral); color: #fff; border-radius: 10-16px` |
| Ghost | `border: 1.5px solid var(--border); background: transparent` |
| Danger | `border: 1.5px solid var(--danger); color: var(--danger)` |
| Icon button | `36×36px (móvil) / 32×32px (web); border-radius: 8-10px; border: 1px solid var(--border)` |

### Inputs
- `height: 44-46px` (móvil) / `height: 44-52px` (web)
- `border: 1.5px solid var(--border)`
- `border-radius: 10-12px` (móvil) / `14px` (web login)
- `font-size: 15-16px`
- Focus: `border-color: var(--brand)`
- Error: `border-color: var(--danger)`
- Labels en uppercase 12-13px, letter-spacing 0.08em

### Tablas (web)
- Cabecera con fondo `var(--bg)` y texto uppercase 11px
- Filas con `border-bottom: 1px solid var(--border)`
- Hover sutil en filas
- Celdas con padding 12-14px 20px

### Tabs (Segmented Control)
- Fondo gris claro, padding 3px, border-radius 12px
- Tab activo: fondo surface, sin sombra
- Tab inactivo: transparente

## Diálogos / Modales

### Bottom Sheet (móvil)
- Slide desde abajo con `animationType="slide"`
- `border-radius: 24px 24px 0 0`
- Overlay semitransparente
- Botones: primario (rojo) + ghost (cancelar)

### Modal (web)
- Fixed overlay con `backdrop-filter: blur(4px)`
- Content: `border-radius: 20px`, max-width 440px
- Botones: danger outline + ghost

## Navegación

### Móvil (React Navigation)
- Bottom tabs para admin: Inicio, Productos, Categorías, Unidades
- Stack para papeleras (hijos de tabs, sin botón en barra)
- Transiciones nativas

### Web
- Sidebar fija 260px con brand + nav + footer
- Topbar sticky con search, notificaciones, theme toggle, logout
- Contenido scrollable

## Responsive

### Web breakpoints
- `<= 768px`: sidebar oculta, topbar más angosto, form grid 1 columna
- `<= 1024px`: stats grid 2 columnas, panels apilados

### Móvil
- Diseño adaptativo por naturaleza (React Native)
- SafeAreaView para notches
- KeyboardAvoidingView para formularios

## Animaciones
- Transiciones suaves en cambio de tema (0.4s)
- Sin animaciones decorativas (reduced-motion: reduce)
- Bottom sheets con slide nativo
- Modales con fade/slide
