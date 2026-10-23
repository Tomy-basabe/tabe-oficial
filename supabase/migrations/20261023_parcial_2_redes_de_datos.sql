-- ===========================================================================
-- CUESTIONARIO COMPLETO: Parcial 2 - Redes de Datos (46 Preguntas y Respuestas)
-- Ejecuta este script directamente en el SQL Editor de Supabase
-- ===========================================================================
DO $$
DECLARE
  v_user_id UUID;
  v_subject_id UUID;
  v_deck_id UUID;
  v_question_id UUID;
BEGIN
  -- 1. Obtener el ID del usuario actual o el primer usuario registrado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  END IF;

  -- 2. Buscar si existe la materia 'Redes de Datos' (o crear vínculo)
  SELECT id INTO v_subject_id FROM public.subjects WHERE (user_id = v_user_id OR user_id IS NULL) AND nombre ILIKE '%Redes de Datos%' LIMIT 1;

  -- 3. Crear el Cuestionario en quiz_decks (o actualizarlo si ya existe)
  SELECT id INTO v_deck_id FROM public.quiz_decks WHERE user_id = v_user_id AND nombre ILIKE '%Parcial 2 - Redes de Datos%' LIMIT 1;
  IF v_deck_id IS NULL THEN
    INSERT INTO public.quiz_decks (id, user_id, nombre, descripcion, subject_id, total_questions)
    VALUES (gen_random_uuid(), v_user_id, 'Parcial 2 - Redes de Datos', 'Cuestionario completo con las 46 preguntas teóricas del segundo parcial de Redes de Datos.', v_subject_id, 46)
    RETURNING id INTO v_deck_id;
  ELSE
    -- Limpiar preguntas anteriores para regeneración limpia
    DELETE FROM public.quiz_questions WHERE deck_id = v_deck_id;
    UPDATE public.quiz_decks SET total_questions = 46, subject_id = COALESCE(v_subject_id, subject_id) WHERE id = v_deck_id;
  END IF;

  -- Pregunta 1
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'Respecto a SSL/TLS y el cifrado de segmentos TCP, ¿cuál de las siguientes afirmaciones es correcta?', 'SSL es una capa entre aplicación y transporte que se encarga de compresión y encriptación. Cifra la carga útil, pero no el encabezado, así que un atacante puede ver datos como las IP.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Cifra por completo la carga útil de los segmentos; solo es legible el encabezado.', true),
    (gen_random_uuid(), v_question_id, 'Cifra por completo los segmentos (encabezado y carga útil), nadie que capture el tráfico puede leerlos.', false),
    (gen_random_uuid(), v_question_id, 'Cifra el encabezado pero deja la carga útil en claro.', false),
    (gen_random_uuid(), v_question_id, 'Solo comprime los datos, no realiza cifrado.', false);

  -- Pregunta 2
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '¿Por qué HTTP no persistente se clasifica como un protocolo "sin estado" (stateless)?', 'HTTP es sin estado porque el servidor no guarda información de los clientes ni de los mensajes, procesando cada solicitud de manera independiente.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero: El servidor no guarda información de los clientes ni de los mensajes previos (no tiene memoria de estado).', true),
    (gen_random_uuid(), v_question_id, 'Falso: El servidor guarda el historial de peticiones del cliente en memoria persistente.', false);

  -- Pregunta 3
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '¿Cuáles de los siguientes son protocolos estándar utilizados en la arquitectura de correo electrónico?', 'Los protocolos estándar de correo son SMTP (transferencia y envío), IMAP (acceso y gestión en servidor) y POP3 (descarga y acceso). SMI y SNMP corresponden a gestión de red.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'IMAP, SMTP y POP3', true),
    (gen_random_uuid(), v_question_id, 'SMI, HTTPS y SNMP', false),
    (gen_random_uuid(), v_question_id, 'IMAP, SMI y HTTPS', false),
    (gen_random_uuid(), v_question_id, 'SMTP, POP3 y SNMP', false);

  -- Pregunta 4
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'Si se intenta realizar una transacción POP3 mediante `telnet pop3.yahoo.com 143`, ¿la conexión a dicho servicio es correcta?', 'Falso: POP3 utiliza el puerto 110 por defecto. El puerto 143 corresponde al protocolo IMAP.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 5
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'En las aplicaciones modernas de chat y mensajería (WhatsApp, Telegram, Slack), ¿qué soporte de canales ofrecen?', 'WhatsApp, Telegram o Slack soportan tanto chats privados entre dos partes como múltiples canales grupales y comunidades.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Tienen soporte para múltiples canales de chat (grupales/servidores) y mensajería privada.', true),
    (gen_random_uuid(), v_question_id, 'Tienen exclusivamente canales únicos y mensajería privada uno a uno.', false),
    (gen_random_uuid(), v_question_id, 'Solo permiten difusión unidireccional sin canales privados.', false),
    (gen_random_uuid(), v_question_id, 'No soportan mensajería privada.', false);

  -- Pregunta 6
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '¿Cuál es la relación de un socket como puerta de enlace entre el proceso de aplicación y la capa de transporte?', 'El socket sirve como interfaz con cualquier protocolo de transporte de extremo a extremo (como TCP o UDP), no exclusivamente con TCP.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Comunica el proceso de aplicación con el protocolo de transporte de extremo a extremo (sea TCP o UDP).', true),
    (gen_random_uuid(), v_question_id, 'Comunica exclusivamente con el protocolo TCP.', false),
    (gen_random_uuid(), v_question_id, 'Es un protocolo de enrutamiento interno.', false),
    (gen_random_uuid(), v_question_id, 'Solo opera con protocolos de enlace de datos.', false);

  -- Pregunta 7
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '¿Cuáles son las estructuras de red paradigmáticas en el desarrollo de aplicaciones distribuidas?', 'En Cliente-Servidor el servidor está siempre activo con IP fija y conocida. En P2P cada par actúa como cliente y servidor simultáneamente.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Cliente-Servidor y Peer-to-Peer (P2P)', true),
    (gen_random_uuid(), v_question_id, 'Hilos y Maestro-Esclavo', false),
    (gen_random_uuid(), v_question_id, 'Cliente-Servidor y Hilos', false),
    (gen_random_uuid(), v_question_id, 'Maestro-Esclavo y P2P', false);

  -- Pregunta 8
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'Se afirma que HTTP es fundamentalmente un protocolo de tipo "pull". ¿Esta afirmación es correcta?', 'Verdadero: En el modelo pull el cliente solicita activamente la información cargada en el servidor web cuando la necesita.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 9
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'En una sesión FTP, si un cliente transfiere 4 archivos, ¿cuántas conexiones TCP totales se establecen?', 'FTP utiliza 1 conexión de control fija que dura toda la sesión y 1 conexión de datos independiente por cada archivo transferido: 1 + 4 = 5 conexiones TCP.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, '5 conexiones (1 de control + 4 de datos)', true),
    (gen_random_uuid(), v_question_id, '4 conexiones', false),
    (gen_random_uuid(), v_question_id, '3 conexiones', false),
    (gen_random_uuid(), v_question_id, '1 conexión', false),
    (gen_random_uuid(), v_question_id, '2 conexiones', false);

  -- Pregunta 10
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'Los servidores FTP se caracterizan por conexiones rápidas, uso de comandos estandarizados, capacidad de subida/bajada y compatibilidad con cualquier SO.', 'Verdadero: FTP es un protocolo de estándar abierto multiplataforma diseñado específicamente para transferir archivos mediante comandos de control y flujo de datos.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 11
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '¿Cómo se controla de manera integral la congestión en las redes de datos?', 'Existen mecanismos de control de congestión terminal a terminal y asistido por la red, combinados con regulación de tasa, control de flujo y algoritmos de gestión de colas.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Se controla mediante asignación de ancho de banda, regulación de la tasa de transmisión y cuestiones de medios inalámbricos.', true),
    (gen_random_uuid(), v_question_id, 'Se controla solamente mediante la asignación estática de ancho de banda.', false),
    (gen_random_uuid(), v_question_id, 'Solo se controla descartando paquetes en los conmutadores.', false),
    (gen_random_uuid(), v_question_id, 'No requiere mecanismos activos de regulación.', false);

  -- Pregunta 12
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '¿Qué capas del modelo de red intervienen en la problemática y control de la congestión?', 'La congestión se sufre en la capa de red (colas de enrutadores saturadas), mientras que la capa de transporte (como TCP) es la que reacciona reduciendo la carga ofrecida.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Son dos: Transporte (controla la carga ofrecida) y Red (donde se experimenta la congestión en los routers).', true),
    (gen_random_uuid(), v_question_id, 'Hay solamente una capa responsable: la de transporte.', false),
    (gen_random_uuid(), v_question_id, 'Únicamente la capa de enlace de datos.', false),
    (gen_random_uuid(), v_question_id, 'Solo la capa de aplicación.', false);

  -- Pregunta 13
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'Sobre Weighted Fair Queuing (WFQ) en capa de enlace: ¿funciona como un Round Robin con prioridad absoluta estricta?', 'Falso: WFQ asigna un peso wᵢ a cada clase y le otorga una fracción proporcional wᵢ/Σwⱼ de servicio, repartiendo el ancho de banda proporcionalmente sin conceder prioridad absoluta.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 14
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'En un servicio orientado a la conexión, ¿cuáles son las primitivas que invoca el CLIENTE?', 'Listen y Accept corresponden al servidor pasivo. El cliente ejecuta Connect para iniciar la conexión, luego Send/Receive y finalmente Disconnect.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Connect, Send, Receive, Disconnect', true),
    (gen_random_uuid(), v_question_id, 'Listen, Receive, Send, Disconnect', false),
    (gen_random_uuid(), v_question_id, 'Listen, Connect, Accept', false),
    (gen_random_uuid(), v_question_id, 'Bind, Listen, Accept', false);

  -- Pregunta 15
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'En un servicio orientado a la conexión, ¿cuáles son las primitivas que invoca el SERVIDOR?', 'El servidor se configura a la escucha con Listen y recibe solicitudes con Accept/Receive, además de Send y Disconnect. Connect es propia del cliente.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Listen, Accept/Receive, Send, Disconnect', true),
    (gen_random_uuid(), v_question_id, 'Connect, Send, Receive', false),
    (gen_random_uuid(), v_question_id, 'Solo Connect y Disconnect', false),
    (gen_random_uuid(), v_question_id, 'Send exclusivamente', false);

  -- Pregunta 16
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '¿Cómo se clasifican teóricamente los algoritmos de enrutamiento según Kurose-Ross?', 'Verdadero: Globales (visión total de topología) vs descentralizados (vecinos); estáticos (cambios lentos) vs dinámicos (reacción rápida); sensibles o insensibles a la carga de tráfico.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Globales vs. descentralizados, estáticos vs. dinámicos, y sensibles vs. insensibles a la carga.', true),
    (gen_random_uuid(), v_question_id, 'Únicamente cliente vs. servidor y punto a punto.', false),
    (gen_random_uuid(), v_question_id, 'Solo orientados a conexión y no orientados a conexión.', false),
    (gen_random_uuid(), v_question_id, 'De capa física y de capa de aplicación.', false);

  -- Pregunta 17
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '¿Cuáles son las familias de algoritmos de enrutamiento efectivamente implementadas en Internet?', 'En la práctica de Internet se utilizan dos familias principales: estado de enlaces (Link-State, como OSPF) y vector de distancias (Distance Vector, como BGP/RIP).', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Estado de enlaces (global dinámico) y vector de distancias (descentralizado dinámico).', true),
    (gen_random_uuid(), v_question_id, 'Todos los modelos teóricos posibles de manera indistinta.', false),
    (gen_random_uuid(), v_question_id, 'Únicamente algoritmos estáticos basados en tablas fijas.', false),
    (gen_random_uuid(), v_question_id, 'Algoritmos de flooding exclusivamente.', false);

  -- Pregunta 18
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'En una red de datagramas (como IP), ¿con qué dirección obligatoria debe marcarse cada paquete para su encaminamiento?', 'La dirección de destino es el elemento mínimo e indispensable para que los enrutadores tomen decisiones de reenvío en cada salto.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Dirección del sistema terminal de destino.', true),
    (gen_random_uuid(), v_question_id, 'Dirección del sistema terminal de origen exclusivamente.', false),
    (gen_random_uuid(), v_question_id, 'Identificador de circuito virtual local.', false),
    (gen_random_uuid(), v_question_id, 'Número de secuencia del puerto.', false);

  -- Pregunta 19
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '¿En qué entidades de la red se implementan los protocolos de la capa de transporte (TCP y UDP)?', 'La capa de transporte es de extremo a extremo y reside exclusivamente en los sistemas terminales (hosts). Los routers intermedios operan hasta la capa de red (capa 3).', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Únicamente en los sistemas terminales (hosts clientes y servidores).', true),
    (gen_random_uuid(), v_question_id, 'En todos los routers y conmutadores intermedios.', false),
    (gen_random_uuid(), v_question_id, 'Exclusivamente en los switches de capa de enlace.', false),
    (gen_random_uuid(), v_question_id, 'En los servidores DNS centrales únicamente.', false);

  -- Pregunta 20
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '¿Cuál es la función del protocolo ICMP en la capa de red?', 'ICMP es usado por hosts y routers para comunicar información de nivel de red: mensajes de error y utilidades de diagnóstico como ping (echo request/reply).', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Intercambia información de diagnóstico y control entre elementos de red (reporte de errores como host inalcanzable y echo request/reply).', true),
    (gen_random_uuid(), v_question_id, 'Enruta paquetes de datos de usuario a alta velocidad sustituyendo a IP.', false),
    (gen_random_uuid(), v_question_id, 'Establece circuitos virtuales permanentes.', false),
    (gen_random_uuid(), v_question_id, 'Realiza compresión de carga útil en el transporte.', false);

  -- Pregunta 21
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'Respecto a la diferencia conceptual entre Reenvío (Forwarding) y Enrutamiento (Routing):', 'El enrutamiento (plano de control) calcula rutas de origen a destino. El reenvío (plano de datos) transfiere localmente el paquete al puerto de salida según la tabla de reenvío.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Reenvío traslada paquetes del enlace de entrada al de salida apropiado; Enrutamiento determina la ruta global calculada por algoritmos.', true),
    (gen_random_uuid(), v_question_id, 'Enrutamiento es la acción local de mover un paquete de la interfaz de entrada a la de salida.', false),
    (gen_random_uuid(), v_question_id, 'Son términos completamente sinónimos e intercambiables.', false),
    (gen_random_uuid(), v_question_id, 'El reenvío calcula caminos de costo mínimo.', false);

  -- Pregunta 22
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '¿Cuáles de los siguientes campos forman parte del encabezado de un segmento TCP?', 'Las direcciones IP pertenecen al encabezado de la capa de red (IP), mientras que puertos, número de secuencia y ACK pertenecen al encabezado TCP.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Número de secuencia, Número de puerto de origen, y Número de acuse de recibo (ACK).', true),
    (gen_random_uuid(), v_question_id, 'Dirección IP de origen y Dirección IP de destino.', false),
    (gen_random_uuid(), v_question_id, 'Dirección MAC de origen y MAC de destino.', false),
    (gen_random_uuid(), v_question_id, 'TTL y Longitud total del datagrama.', false);

  -- Pregunta 23
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'En la API de sockets Berkeley, ¿qué acción realiza la primitiva `bind`?', '`socket()` crea el endpoint. `bind()` le asocia la dirección IP y el número de puerto local al socket.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Asocia una dirección y puerto local con un socket ya creado.', true),
    (gen_random_uuid(), v_question_id, 'Crea un nuevo punto final de comunicación.', false),
    (gen_random_uuid(), v_question_id, 'Envía datos a través de la conexión activa.', false),
    (gen_random_uuid(), v_question_id, 'Cierra la conexión existente.', false);

  -- Pregunta 24
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'Internet opera como una red de datagramas sin conexión a nivel de red, mientras que ATM y Frame Relay emplean circuitos virtuales orientados a conexión.', 'Verdadero: El protocolo IP de Internet no establece conexión previa por circuito, a diferencia de ATM y Frame Relay basados en circuitos virtuales.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 25
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'En el modelo cliente-servidor, ¿un proceso servidor solicita y recibe servicios de un proceso cliente?', 'Falso: Es el proceso cliente el que solicita y recibe los servicios provistos por el servidor.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 26
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'OSPF es un protocolo de enrutamiento inter-dominio (exterior/inter-AS).', 'Falso: OSPF es un protocolo intra-AS (interior). El protocolo de enrutamiento exterior/inter-AS de Internet es BGP.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 27
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '¿Cuáles son las 3 fases secuenciales en la operación de una red de circuitos virtuales?', 'Los circuitos virtuales requieren primero configuración/establecimiento (setup), luego transferencia de datos y finalmente liberación/terminación (teardown).', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Configuración del CV, Transferencia de datos, y Terminación del CV.', true),
    (gen_random_uuid(), v_question_id, 'Determinación del camino, Encaminamiento, y Llamada.', false),
    (gen_random_uuid(), v_question_id, 'Envío sin conexión, Acuse de recibo, y Cierre.', false),
    (gen_random_uuid(), v_question_id, 'Handshake SYN, Datos, y Handshake FIN.', false);

  -- Pregunta 28
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'El bloqueo de cabeza de línea (HOL blocking) es un protocolo de capa de red que demora paquetes.', 'Falso: HOL blocking es un fenómeno de contención en las colas de entrada de los enrutadores/conmutadores, no un protocolo.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 29
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'La capa de red de TCP/IP (IP) ofrece únicamente un servicio orientado a la conexión.', 'Falso: IP es un protocolo de datagramas no orientado a conexión (connectionless).', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 30
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'En la arquitectura Cliente-Servidor, ¿el tiempo de distribución de archivos disminuye a medida que aumenta el número de pares/clientes?', 'Falso: En cliente-servidor el servidor debe enviar una copia a cada cliente, saturando su ancho de banda de subida; el tiempo disminuye con más pares en redes P2P.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 31
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '¿Qué tipo de servicio ofrece la capa de red de Internet (IP)?', 'IP provee un servicio de mejor esfuerzo: hace su mejor intento por entregar datagramas, pero no garantiza entrega, orden ni latencia.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Servicio de mejor esfuerzo (best-effort): no garantiza temporización, orden ni entrega.', true),
    (gen_random_uuid(), v_question_id, 'Servicio confiable con temporización y orden garantizados.', false),
    (gen_random_uuid(), v_question_id, 'Servicio de circuito virtual con ancho de banda reservado.', false),
    (gen_random_uuid(), v_question_id, 'Servicio orientado a conexión con control de flujo estricto.', false);

  -- Pregunta 32
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'La arquitectura TCP/IP provee un protocolo de transporte de extremo a extremo, no orientado a conexión y no confiable llamado UDP.', 'Verdadero: UDP (User Datagram Protocol) es no orientado a conexión y no confiable, a diferencia de TCP.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 33
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'El sistema DNS permite resolver la dirección IP a partir de un nombre de host, y también obtener el nombre de host a partir de una IP (resolución inversa).', 'Verdadero: DNS realiza resolución directa (nombre a IP con registros A/AAAA) y resolución inversa (IP a nombre con registros PTR).', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 34
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'En gestión de redes, ¿cuáles son las áreas funcionales estándar (modelo FCAPS)?', 'El estándar ISO/FCAPS define cinco áreas funcionales: Fault, Configuration, Accounting, Performance, Security.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Gestión de Fallos, Configuración, Cuentas/Contabilidad, Rendimiento y Seguridad.', true),
    (gen_random_uuid(), v_question_id, 'Detección de fallos, monitorización de hosts, tráfico y cambios de tablas (estas son herramientas).', false),
    (gen_random_uuid(), v_question_id, 'Gestión de correos y servidores web únicamente.', false),
    (gen_random_uuid(), v_question_id, 'Capa física y capa de enlace exclusivamente.', false);

  -- Pregunta 35
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'En sistemas criptográficos: el cifrado simétrico emplea claves idénticas y secretas, mientras que el asimétrico (clave pública) usa un par de claves donde una es pública y la otra privada.', 'Verdadero: En criptografía simétrica la clave secreta es compartida; en clave pública, la clave pública es conocida por todos y la privada solo por su propietario.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 36
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'En aplicaciones cliente-servidor ejecutadas en modo Localhost, ¿el proceso cliente y el proceso servidor se ejecutan sobre la misma computadora física?', 'Verdadero: En modo localhost (interfaz de loopback 127.0.0.1) ambos extremos residen en la misma máquina.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 37
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '¿Cuáles son las dos grandes categorías de algoritmos de cifrado simétrico?', 'Los algoritmos de cifrado simétrico se dividen en cifrados de bloque (operan sobre bloques fijos de bits, como AES/DES) y cifrados de flujo (cifran bit a bit o byte a byte).', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Cifrado de bloque y cifrado de flujo.', true),
    (gen_random_uuid(), v_question_id, 'Cifrado simétrico y cifrado cuántico.', false),
    (gen_random_uuid(), v_question_id, 'Cifrado de paquete y cifrado de cabecera.', false),
    (gen_random_uuid(), v_question_id, 'Cifrado público y cifrado privado.', false);

  -- Pregunta 38
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '¿El texto ''en claro'' (plaintext) es el resultado de cifrar un mensaje con un algoritmo criptográfico?', 'Falso: El texto en claro es el mensaje original sin procesar. El resultado de cifrar se denomina texto cifrado (ciphertext).', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 39
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '¿Por qué 3DES (Triple DES) es un algoritmo de clave simétrica más seguro que DES estándar?', 'DES es vulnerable a fuerza bruta debido a sus claves de 56 bits. 3DES aplica tres operaciones consecutivas aumentando el espacio de búsqueda de claves.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Aplica el algoritmo DES tres veces consecutivas con claves independientes, aumentando significativamente la longitud efectiva de la clave.', true),
    (gen_random_uuid(), v_question_id, 'Cifra 2 veces con 3 claves distintas.', false),
    (gen_random_uuid(), v_question_id, 'Es un algoritmo asimétrico de clave pública.', false),
    (gen_random_uuid(), v_question_id, 'No utiliza claves criptográficas.', false);

  -- Pregunta 40
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '¿Cuál es la función del protocolo SNMP en comparación con SMI?', 'SMI define las reglas formales de sintaxis para los objetos; SNMP es el protocolo de aplicación que intercambia dichos datos entre administradores y agentes.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'SNMP transmite comandos e información entre la estación gestora y el agente en el dispositivo; SMI es el lenguaje de definición de datos de la MIB.', true),
    (gen_random_uuid(), v_question_id, 'SNMP es el lenguaje de definición y SMI el protocolo de transporte.', false),
    (gen_random_uuid(), v_question_id, 'SNMP cifra paquetes de transporte TCP.', false),
    (gen_random_uuid(), v_question_id, 'SNMP sustituye a ICMP en la capa de red.', false);

  -- Pregunta 41
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'Los objetos gestionados en un dispositivo de red tienen atributos de información formalmente recopilados en una MIB y accesibles a través de agentes.', 'Verdadero: La MIB (Management Information Base) es la base de datos jerárquica de variables y objetos gestionados en cada equipo de red.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 42
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '¿Cuál es el rol de una Autoridad de Certificación (CA) en la infraestructura de clave pública (PKI)?', 'Verdadero: La CA es un tercero de confianza que certifica que una clave pública pertenece a la entidad nombrada en el certificado.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Valida la identidad de las entidades y emite certificados digitales que asocian dicha identidad con su clave pública, firmándolos digitalmente.', true),
    (gen_random_uuid(), v_question_id, 'Almacena las contraseñas privadas de los usuarios de internet.', false),
    (gen_random_uuid(), v_question_id, 'Enruta paquetes de forma segura en los routers centrales.', false),
    (gen_random_uuid(), v_question_id, 'Asigna direcciones IP privadas a los hosts.', false);

  -- Pregunta 43
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '¿Cualquier usuario o empresa puede registrar y crear sus propias variables en la MIB bajo la rama `private/enterprises`?', 'Verdadero: La rama `iso.org.dod.internet.private.enterprises` (1.3.6.1.4.1) está asignada por IANA para que cada fabricante defina sus variables MIB propietarias.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 44
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'En una firma digital: una vez transmitido el mensaje firmado, ¿el emisor no puede repudiar la autoría de su contenido?', 'Verdadero: Dado que la firma digital se genera con la clave privada exclusiva del emisor, proporciona autenticidad de origen y garantía de no repudio.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 45
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'En el esquema básico de firma digital, ¿la firma permite que el transmisor verifique la identidad del receptor?', 'Falso: La firma digital autentica al transmisor frente al receptor, demostrando quién originó el mensaje, no la identidad de quien lo recibe.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 46
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '¿Cuál es el protocolo de transporte preferido y el puerto por defecto utilizado por SNMP para comunicarse con los agentes?', 'SNMP opera habitualmente sobre UDP en el puerto 161 (para consultas y comandos al agente) y puerto 162 (para traps enviadas por el agente al gestor).', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Transporte UDP y puerto 161.', true),
    (gen_random_uuid(), v_question_id, 'Transporte TCP y puerto 161.', false),
    (gen_random_uuid(), v_question_id, 'Transporte UDP y puerto 25.', false),
    (gen_random_uuid(), v_question_id, 'Transporte TCP y puerto 80.', false);

  RAISE NOTICE 'Cuestionario Parcial 2 - Redes de Datos creado exitosamente con 46 preguntas para el usuario % con ID de cuestionario %', v_user_id, v_deck_id;
END $$;