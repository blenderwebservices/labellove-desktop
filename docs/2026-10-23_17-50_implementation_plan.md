# Plan de Implementación: Guía de Despliegue en Plesk en README.md

**Fecha:** 2026-10-23 17:50  
**Proyecto:** LabelLove Desktop  
**Objetivo:** Agregar una sección detallada y didáctica en `README.md` que explique paso a paso cómo desplegar la aplicación en servidores administrados con Plesk, considerando la arquitectura Zero-Build del proyecto.

---

## 1. Contexto y Análisis

1. **Arquitectura Zero-Build / ES Modules Nativos:**
   - LabelLove no cuenta (ni requiere) con un archivo `package.json`, `npm run build` o compiladores como Webpack/Vite.
   - Ejecutar `npm install` o `npm run build` en servidores o en local falla deliberadamente con `ENOENT: no such file or directory, open 'package.json'`.
   - Por ende, el despliegue en Plesk consiste en servir los archivos estáticos directamente (`index.html`, `js/`, `styles/`, etc.).

2. **Requisitos de la sección en README.md:**
   - **Aclaración crítica sobre Zero-Build:** Evitar la confusión de intentar ejecutar `npm run build` en Plesk.
   - **Método 1 (Recomendado): Despliegue continuo con Git en Plesk:**
     - Configuración del repositorio remoto.
     - Document Root (`httpdocs`).
     - Acciones adicionales de despliegue (dejarlas vacías o explicar por qué no lleva comandos de build).
   - **Método 2: Subida directa mediante Administrador de Archivos (File Manager) o SFTP:**
     - Archivos requeridos (`index.html`, `js/`, `styles/`, etc.).
   - **Configuraciones recomendadas en Plesk:**
     - Certificado SSL/TLS Let's Encrypt y forzado de HTTPS (indispensable para APIs del navegador como File System Access API y Clipboard).
     - Configuración de tipos MIME para JavaScript Modules (`.js`).
     - Compresión gzip/brotli y caché de estáticos en Nginx/Apache.
   - **Verificación y Troubleshooting:**
     - Chequeo de consola del navegador y permisos de archivos (`chmod 755/644`).

---

## 2. Plan de Cambios

1. **Modificación de `README.md`:**
   - Insertar la nueva sección `## 🌐 Despliegue en Producción (Plesk Hosting)` inmediatamente después de la sección `## 🚀 Puesta en Marcha y Uso Local`.
   - Formatear con pasos claros, tablas o bloques de advertencia `[!NOTE]` y `[!IMPORTANT]`, acorde a las convenciones de markdown del proyecto.
   - Actualizar el índice o referencias si aplica.

2. **Generación del Reporte de Entrega (Walkthrough):**
   - Crear `docs/2026-10-23_17-50_walkthrough.md` documentando la adición, explicando el razonamiento técnico y el resultado final.
