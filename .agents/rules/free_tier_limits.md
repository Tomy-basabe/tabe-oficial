---
trigger: always_on
description: Reglas estrictas para no exceder los límites gratuitos mensuales de Vercel y Supabase.
---

# Regla de Preservación de Límites Gratuitos (Vercel y Supabase)

El proyecto opera bajo planes gratuitos y **NUNCA DEBE EXCEDERSE** de las cuotas mensuales establecidas. Toda decisión arquitectónica, de código y de despliegue debe optimizar el consumo de recursos.

---

## 1. Límites de Vercel (Hobby / Plan Gratuito)
- **Deployment Storage: 10 GB máx.** *(Nivel Crítico Actual: ~8.18 GB / 10 GB)*
  * **PROHIBIDO hacer múltiples deploys seguidos:** Agrupar siempre todos los cambios de una tarea en un **único commit y un único push**.
  * **Validación previa:** Probar siempre localmente (`npm run build`) antes de hacer push para evitar despliegues fallidos o reintentos que consuman almacenamiento de build.
  * **Optimización de Assets:** Mantener el bundle liviano, code-splitting eficiente y jamás subir archivos pesados al repositorio de frontend.
- **Fast Data Transfer (Ancho de Banda): 100 GB / mes** *(Actual: ~12.84 GB)*
  * Utilizar compresión adecuada y evitar descargas masivas o redundantes desde el CDN de Vercel.
- **Function Invocations: 1.000.000 / mes**
- **Fluid Active CPU: 4 horas / mes** *(Actual: ~11 min)*
- **CDN Request CPU Duration: 1 hora / mes**

---

## 2. Límites de Supabase (Free Tier)
- **Tamaño de la Base de Datos: 500 MB máx.** *(Nivel Optimizado Actual: ~49 MB)*
  * **PROHIBIDO guardar archivos binarios o Base64 en PostgreSQL:** Todos los archivos, imágenes y PDFs deben almacenarse exclusivamente en Supabase Storage (`library-files` o `notion-images`), guardando en la BD únicamente la referencia / URL pública.
  * **Prevención de Bloat en TOAST (Editores de Documentos / JSONB):**
    - En editores con contenido JSONB (Notion, TipTap, apuntes), queda **ESTRICTAMENTE PROHIBIDO** hacer `update` remoto continuo a la BD con intervalos menores a 25 segundos o debounces menores a 2.5 segundos.
    - El guardado debe ser inmediato a nivel local (`sessionStorage` / memoria) y diferido/debounced hacia PostgreSQL para evitar la acumulación masiva de tuplas muertas (*dead tuples*) en las tablas TOAST.
  * **Prevención de Acumulación en `auth.refresh_tokens`:**
    - Prohibido implementar polling o llamadas recurrentes a `refreshSession()`.
    - La base cuenta con el cron diario `daily-purge-revoked-auth-tokens` (`0 3 * * *`) que purga tokens con `revoked = true` de más de 3 días. No deshabilitar esta rutina.
  * **Mantenimiento Periódico:** Ante crecimientos inexplicables de disco sin incremento de filas, verificar el tamaño de TOAST y ejecutar `VACUUM (FULL, ANALYZE)` sobre la tabla afectada.
  * Mantener queries optimizadas con índices adecuados para evitar bloating de tablas.
- **Almacenamiento de Archivos (Storage): 1 GB máx.** *(Actual: ~0.40 GB)*
  * Establecer compresión en PDFs e imágenes antes de almacenar.
  * Limpieza periódica de archivos huérfanos o temporales.
- **Salida de Datos (Egress): 5 GB / mes** *(Actual: ~0.11 GB)*
  * No ejecutar `select('*')` en tablas con columnas extensas; seleccionar siempre únicamente las columnas necesarias.
- **Usuarios Activos Mensuales (MAU): 50.000 máx.**
- **Ingesta de Registros (Logs): 1 GB / mes**
  * Evitar logging excesivo en bucles o funciones edge de alta frecuencia.

---

## 3. Protocolo Obligatorio para el Asistente
1. Antes de cualquier `git push`, validar compilación local completa (`npm run build`).
2. Realizar un único despliegue por instrucción/requerimiento.
3. Ante cualquier nueva feature que involucre subida de datos o invocación de funciones, verificar previamente el impacto en cuotas de almacenamiento y CPU.
4. Mantener actualizado el grafo de conocimiento local (`python -m graphify update .`) tras cada modificación.
