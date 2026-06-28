# Guía de Contribución

## Convenciones de commits

Siguiendo [Conventional Commits](https://www.conventionalcommits.org/).

### Formato

```
<tipo>(<ambio>): <descripción corta>

[opcional: cuerpo con detalles]
```

### Tipos

| Tipo       | Uso                                                | Ejemplo                                                  |
| ---------- | -------------------------------------------------- | -------------------------------------------------------- |
| `fix`      | Corrección de bug o error de config                | `fix: corregir babel plugin incompatible con Babel 7.29` |
| `feat`     | Nueva funcionalidad                                | `feat: agregar pantalla de perfil de usuario`            |
| `chore`    | Tareas de mantenimiento sin cambio funcional       | `chore: actualizar dependencias`                         |
| `docs`     | Documentación                                      | `docs: actualizar README con estructura actual`          |
| `refactor` | Reestructurar código sin cambiar comportamiento    | `refactor: extraer lógica de auth a custom hook`         |
| `style`    | Formato, espacios, punto y coma (no afecta lógica) | `style: aplicar formato Prettier`                        |
| `test`     | Agregar o corregir tests                           | `test: agregar test para LoginScreen`                    |
| `ci`       | Integración continua, CI/CD                        | `ci: agregar workflow de lint en PR`                     |
| `perf`     | Mejoras de rendimiento                             | `perf: memoizar componente HomeScreen`                   |

### Reglas

- **Idioma**: Spanish o English (mantener consistencia en el proyecto)
- **Máx 72 caracteres** en la línea del título
- **Minúsculas** después de los dos puntos
- **Sin punto** al final del título
- **Cuerpo opcional**: explicar el _por qué_, no el _qué_

### Ejemplos

```
fix: eliminar plugin expo-router de app.json

expo-router estaba referenciado como plugin pero no está instalado.
El proyecto usa react-navigation, no expo-router.
```

```
feat: agregar pantalla de registro de productos

- Formulario con validación
- Categorías predefinidas
- Subir imagen desde galería
```

```
chore: agregar bunfig.toml con configuración de Bun
```

---

## Ramas

### Naming

| Tipo    | Prefijo  | Ejemplo              |
| ------- | -------- | -------------------- |
| Fix     | `fix/`   | `fix/config-babel`   |
| Feature | `feat/`  | `feat/login-screen`  |
| Chore   | `chore/` | `chore/update-deps`  |
| Docs    | `docs/`  | `docs/readme-update` |

### Flujo

```bash
# 1. Crear rama desde main
git checkout main
git pull
git checkout -b fix/nombre-descriptivo

# 2. Trabajar y commitear
git add archivo1 archivo2
git commit -m "fix: descripción del cambio"

# 3. Push
git push -u origin fix/nombre-descriptivo

# 4. Crear PR
gh pr create --base main --head fix/nombre-descriptivo \
  --title "fix: título descriptivo" \
  --body "## Descripción del cambio..."
```

---

## Pull Requests

### Formato del PR

```markdown
## Resumen

Descripción breve de qué hace este PR.

## Cambios incluidos

### tipo: descripción corta

- Detalle 1
- Detalle 2

### tipo: descripción corta

- Detalle 1

## Nota

Observaciones relevantes (si las hay).
```

### Reglas

- **Un PR = un concernimiento** (config, feature, fix, etc.)
- **Commits atómicos**: cada commit debe ser un cambio lógico independiente
- **Excluir archivos** que no correspondan al scope del PR
- **Describir el por qué**, no solo el qué

---

## Excluir archivos de un commit

```bash
# Solo agregar archivos específicos
git add <archivo>

# Excluir un archivo específico del stage
git reset HEAD -- <archivo>
```

---

## Verificar antes de commitear

```bash
# Ver qué está staged
git status

# Ver el diff de lo staged
git diff --cached

# Ver diff de un archivo específico
git diff --cached -- App.tsx

# Ver el diff sin el lockfile (para revisar solo código)
git diff --cached -- ':!bun.lock'
```
