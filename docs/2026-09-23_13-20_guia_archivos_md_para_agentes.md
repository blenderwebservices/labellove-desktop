# Guía de Archivos Markdown (`.md`) para Agentes y Asistentes de IA

Esta guía recopila los diferentes tipos de archivos Markdown (`.md`) que puedes incorporar en tus proyectos para guiar a los asistentes de codificación (Antigravity, Claude Code, Cursor, Copilot, Windsurf y agentes autónomos), maximizando la calidad del código, evitando alucinaciones y estandarizando flujos de trabajo.

---

## 🧭 Mapa General de Archivos

```
tu-proyecto/
├── AGENTS.md                         # Directivas universales para agentes
├── GEMINI.md                         # Reglas específicas de Antigravity / Gemini
├── ARCHITECTURE.md                   # Diagrama del sistema y mapa de dependencias
├── CODING_STANDARDS.md               # Convenciones de estilo, tipado y buenas prácticas
├── DOMAIN.md                         # Glosario y modelo de negocio (lenguaje ubicuo)
├── TESTING.md                        # Guía de pruebas y comandos de verificación
├── .agents/
│   ├── rules/
│   │   ├── frontend.md               # Reglas modulares solo para frontend
│   │   └── security.md               # Reglas de seguridad y manejo de secretos
│   └── skills/
│       └── create-component/
│           └── SKILL.md              # Procedimiento paso a paso reutilizable
└── docs/
    ├── adr/                          # Architectural Decision Records (ADRs)
    │   └── 0001-uso-de-vanilla-css.md
    ├── YYYY-MM-DD_HH-mm_implementation_plan.md
    └── YYYY-MM-DD_HH-mm_walkthrough.md
```

---

## 1. Archivos de Control Directo para Agentes (Directives & Rules)

Estos archivos son leídos **automáticamente** por las herramientas de IA al iniciar una sesión o al interactuar con el árbol de archivos.

### `AGENTS.md` (o `GEMINI.md`)
- **Propósito:** El punto de entrada principal para definir la personalidad, restricciones no negociables y convenciones del proyecto.
- **Herramientas que lo usan:** Antigravity IDE, agy CLI, y herramientas compatibles con el estándar abierto de agentes.
- **Qué debe contener:**
  - Stack tecnológico exacto y versiones.
  - Reglas de oro (ej. "Nunca uses librerías pesadas para iconos", "No modifiques archivos fuera del workspace").
  - Formato obligatorio para commits, planes y documentación.

### `.agents/rules/*.md` (Reglas Modulares por Ámbito)
- **Propósito:** Evitar sobrecargar el contexto del modelo con un archivo gigante. Permite crear reglas específicas que se activan solo cuando el agente toca ciertas rutas o extensiones.
- **Ejemplo de encabezado:**
  ```markdown
  ---
  trigger:
    glob: "js/**/*.js"
  ---
  # Reglas de JavaScript
  - Usa siempre ES Modules (`import/export`).
  - No agregues dependencias externas sin aprobación.
  - Prefiere APIs nativas modernas del navegador (Fetch, Web Components, Canvas).
  ```

### Archivos Multi-Herramienta (Ecosistema Cruzado)
Si en tu equipo trabajan con distintos editores, puedes mantener archivos equivalentes o referenciarlos:
- `CLAUDE.md`: Instrucciones y comandos de prueba para **Claude Code CLI**.
- `.github/copilot-instructions.md`: Contexto personalizado para **GitHub Copilot**.
- `.cursorrules` / `.cursor/rules/*.mdc`: Reglas contextuales para **Cursor**.

---

## 2. Habilidades Procedimentales (`.agents/skills/<nombre>/SKILL.md`)

Las **Skills** son manuales de procedimientos paso a paso (*runbooks*) que el agente consulta bajo demanda cuando necesita ejecutar una tarea compleja o repetitiva.

- **Ubicación:** `.agents/skills/<nombre-skill>/SKILL.md`
- **Casos de uso ideales:**
  - Cómo crear un nuevo componente visual siguiendo el sistema de diseño.
  - Cómo generar una migración de base de datos o endpoint de API.
  - Procedimiento de release o empaquetado para producción.
- **Estructura básica:**
  ```markdown
  ---
  name: create-label-template
  description: Procedimiento para crear y registrar una nueva plantilla en LabelLove
  ---
  # Cómo crear una nueva plantilla
  1. Define las dimensiones en milímetros en `js/templates.js`.
  2. Registra el sustrato por defecto (thermal, kraft o gloss).
  3. Agrega los elementos iniciales con coordenadas relativas.
  4. Ejecuta `node --check js/templates.js` para verificar la sintaxis.
  ```

---

## 3. Archivos de Contexto Técnico y Arquitectura

Un agente rinde drásticamente mejor cuando comprende el "cuadro completo" del sistema en lugar de solo archivos aislados.

### `ARCHITECTURE.md`
- **Propósito:** Describir cómo se conectan los módulos y cómo viajan los datos.
- **Contenido clave:**
  - Diagrama de flujo de datos (Mermaid).
  - Jerarquía de componentes o capas (Controladores -> Servicios -> Almacén de datos).
  - Puntos de extensión (dónde agregar nuevos formatos, plugins o drivers).

### `CODING_STANDARDS.md` (o `STYLEGUIDE.md`)
- **Propósito:** Alinear al modelo con tus preferencias de código sin necesidad de corregirlo en cada turno.
- **Contenido clave:**
  - Convenciones de nombres (`camelCase`, `kebab-case`, sufijos para eventos o hooks).
  - Manejo de errores (¿lanzas excepciones o retornas objetos `{ ok: false, error }`?).
  - Patrones prohibidos (ej. "Evitar `any` en TypeScript", "No usar `innerHTML` sin sanitizar").

### `TECH_STACK.md`
- **Propósito:** Establecer una lista blanca y negra de tecnologías.
- **Contenido clave:**
  - Librerías permitidas (ej. `JsBarcode`, `QRCode.js`).
  - Librerías **prohibidas** (ej. "No instalar React, lodash o jQuery").
  - Versiones mínimas de runtime (Node.js 20+, PHP 8.3+, navegadores compatibles).

---

## 4. Archivos de Negocio y Dominio

Evitan que el modelo use terminología genérica o asuma conceptos erróneos de la industria.

### `DOMAIN.md` / `GLOSSARY.md` (Lenguaje Ubicuo)
- **Propósito:** Definir los términos clave del negocio.
- **Ejemplo para LabelLove:**
  - **Sustrato:** El material físico donde se imprime (térmico directo, kraft, vinilo).
  - **Mils:** Milésimas de pulgada, unidad de medida del código de barras.
  - **Record Scrubber:** Control de interfaz que avanza registro por registro en la base de datos.
  - **ZPL II:** Lenguaje nativo de programación de impresoras térmicas Zebra.

### Architectural Decision Records (`docs/adr/*.md`)
- **Propósito:** Registrar **por qué** se tomó una decisión arquitectónica en el pasado para que la IA no intente "refactorizarla" creyendo que es un descuido.
- **Estructura común:**
  - **Contexto:** ¿Qué problema teníamos?
  - **Decisión:** ¿Qué elegimos? (Ej. Usar Vanilla CSS en lugar de Tailwind).
  - **Consecuencias:** Beneficios y desventajas aceptadas.

---

## 5. Archivos de Calidad y Operaciones

### `TESTING.md`
- **Propósito:** Indicarle al agente exactamente qué comandos ejecutar para verificar que no rompió nada antes de entregar su trabajo.
- **Contenido clave:**
  - Comando de tests unitarios: `npm test` o `php artisan test`.
  - Verificación estática: `node --check js/*.js` o `npm run lint`.
  - Pasos de verificación manual en navegador.

### `SECURITY.md`
- **Propósito:** Restricciones de seguridad críticas.
- **Contenido clave:**
  - "Nunca leas ni muestres valores de variables de entorno `.env` en los artefactos".
  - "Todos los datos inyectados en SVG deben ser escapados para prevenir XSS".

---

## 📊 Matriz Recomendada de Implementación

| Nivel del Proyecto | Archivos Recomendados | Beneficio Inmediato |
| :--- | :--- | :--- |
| **Básico / Prototipo** | `AGENTS.md` + `docs/` con timestamp | El agente respeta convenciones de nombrado y formato sin desviarse. |
| **Intermedio / Proyecto Activo** | + `ARCHITECTURE.md` + `TESTING.md` | Entiende cómo modularizar el código y prueba sus propios cambios. |
| **Avanzado / Equipo o Producción** | + `.agents/skills/` + `DOMAIN.md` + `docs/adr/` | Autonomía guiada: la IA puede ejecutar tareas complejas respetando la historia y reglas del negocio. |
