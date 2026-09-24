# Plan de Implementación: Selector de Tema Claro / Oscuro / Sistema

**Fecha y Hora:** 2026-09-24 10:36  
**Proyecto:** LabelLove Desktop Web  
**Objetivo:** Implementar un botón y selector para alternar entre Modo Claro, Modo Oscuro y Modo Sistema (automático según preferencias del sistema operativo), con persistencia en `localStorage`, actualización reactiva y diseño estético de alta calidad.

---

## 1. Alcance y Requisitos

1. **Modos Soportados:**
   - **Modo Claro (`light`)**: Paleta nítida, profesional, con fondo de aplicación gris pizarra suave (`#f1f5f9`), superficies blancas puras (`#ffffff`), textos oscuros de alto contraste (`#0f172a`, `#475569`), bordes sutiles y lienzo de dibujo Slate 200 con cuadrícula de puntos contrastante.
   - **Modo Oscuro (`dark`)**: Paleta existente, profunda y elegante de LabelLove (`#0c0f17`, `#141824`, `#1a2030`), acentos índigo y cyan, y alto contraste para baja iluminación.
   - **Modo Sistema (`system`)**: Detecta automáticamente `prefers-color-scheme: dark` o `light` del sistema operativo del usuario. Reacciona en tiempo real si el usuario cambia el tema del sistema.

2. **Control en la Barra Superior (TopBar):**
   - Ubicado en la sección derecha de la barra superior (`topbar-right`), junto al botón de imprimir y los controles de zoom.
   - Botón con icono dinámico (☀️ / 🌙 / 💻), texto descriptivo del modo activo y menú desplegable refinado.
   - Opciones con icono, título, descripción y marca de verificación `✓` en el modo seleccionado.

3. **Persistencia y Reactividad:**
   - Almacena la preferencia del usuario en `localStorage` (`labellove_theme_preference`).
   - Escucha cambios del sistema con `window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ...)`.
   - Re-renderiza reglas métricas (`canvas.renderRulers()`) con colores adaptados para mantener legibilidad perfecta.

4. **Variables y Tokens de Diseño (`styles/theme.css` y `styles/canvas.css`):**
   - Definición de tokens `:root, [data-theme="dark"]` y `[data-theme="light"]`.
   - Ajuste de selectores con colores fijos en `components.css` y `canvas.css` para que utilicen variables semánticas.

---

## 2. Plan de Trabajo

- [ ] **Paso 1: Variables de diseño en `styles/theme.css`**
  - Añadir reglas completas para `[data-theme="light"]` y `:root, [data-theme="dark"]`.
  - Crear variables para la mesa de trabajo (`--bg-canvas-viewport`, `--canvas-grid-dot`, `--canvas-scrollbar-track`).
- [ ] **Paso 2: Ajuste de estilos en `styles/canvas.css` y `styles/components.css`**
  - Reemplazar colores fijos de fondo (`#080a10`, `#090d16`, `#121620`, etc.) por sus variables semánticas.
  - Añadir soporte para el menú desplegable del tema y el botón (`.theme-toggle-btn`, `.theme-dropdown-menu`, etc.).
- [ ] **Paso 3: Estructura HTML en `index.html`**
  - Añadir el botón desplegable `#btnThemeToggle` y su menú `#themeDropdown` en `topbar-right`.
- [ ] **Paso 4: Módulo / Funcionalidad de Gestión de Tema en JavaScript**
  - Crear e integrar `initThemeManager()` en `js/app.js`:
    - Lectura de preferencia en `localStorage`.
    - Detección de `matchMedia`.
    - Aplicación del atributo `data-theme` en `document.documentElement`.
    - Actualización de etiquetas e iconos del botón.
    - Sincronización de reglas en el lienzo.
- [ ] **Paso 5: Pruebas y Validación**
  - Validar sintaxis JS.
  - Verificar renderizado con Chrome headless.
  - Redactar Walkthrough en `docs/2026-09-24_HH-mm_walkthrough.md`.
