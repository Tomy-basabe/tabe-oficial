# Regla de Evaluación y Gestión de Skills

Para mantener el consumo de tokens y créditos al mínimo estricto y preservar el foco cognitivo del agente:

1. **Filtro Previo Obligatorio para Nuevas Skills:**
   - Ante cualquier solicitud para agregar, cargar o instalar una nueva skill, el agente DEBE analizar críticamente su valor real antes de aceptarla o escribirla a disco.
   - Si la skill es:
     - Innecesaria para el stack (ej. Big Data, lenguajes no usados, nubes ajenas).
     - Redundante o inferior a una herramienta/regla que ya existe en el proyecto (ej. reglas de `ponytail`, `frontend-senior`, linters nativos).
     - Sobrecarga innecesaria de contexto para tareas triviales.
   - **Acción:** El agente debe advertirle al usuario de forma clara y directa por qué no conviene implementarla y NO instalarla/guardarla a menos que el usuario lo ordene explícitamente tras la advertencia.

2. **Principio de Mínimo Contexto:**
   - Menos skills activas = menor overhead de tokens en cada mensaje = mayor velocidad, menor costo y cero distracciones.
