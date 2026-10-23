-- ===========================================================================
-- CUESTIONARIO COMPLETO: Parcial 2 - Redes de Datos (70 Preguntas y Respuestas)
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

  -- 2. Buscar si existe la materia 'Redes de Datos'
  SELECT id INTO v_subject_id FROM public.subjects WHERE (user_id = v_user_id OR user_id IS NULL) AND nombre ILIKE '%Redes de Datos%' LIMIT 1;

  -- 3. Crear el Cuestionario en quiz_decks (o actualizarlo si ya existe)
  SELECT id INTO v_deck_id FROM public.quiz_decks WHERE user_id = v_user_id AND nombre ILIKE '%Parcial 2 - Redes de Datos%' LIMIT 1;
  IF v_deck_id IS NULL THEN
    INSERT INTO public.quiz_decks (id, user_id, nombre, descripcion, subject_id, total_questions)
    VALUES (gen_random_uuid(), v_user_id, 'Parcial 2 - Redes de Datos', 'Cuestionario oficial completo con las 70 preguntas del segundo parcial de Redes de Datos.', v_subject_id, 70)
    RETURNING id INTO v_deck_id;
  ELSE
    DELETE FROM public.quiz_questions WHERE deck_id = v_deck_id;
    UPDATE public.quiz_decks SET total_questions = 70, subject_id = COALESCE(v_subject_id, subject_id) WHERE id = v_deck_id;
  END IF;

  -- Pregunta 1
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) Una conexión SSL cifra por completo la carga útil de los segmentos de una conexión TCP, haciendo que únicamente pueda ser legible la información de encabezado de los segmentos intercambiados por ambos extremos de la conexión', 'SSL es una capa entre aplicación y transporte que maneja compresión y encriptación (Tanenbaum, p. 813).', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 2
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'Una conexión SSL cifra por completo los segmentos de una conexión TCP, haciendo que los segmentos intercambiados por ambos extremos de la conexión no puedan ser leídos por alguien que capture esa información', 'Cifra solo la carga útil, no el encabezado. Un atacante podría ver las IP, pero no el contenido.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 3
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) HTTP-No Persistente es un protocolo “SIN estado”', 'El servidor no guarda información de clientes ni mensajes: no tiene memoria de estado.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 4
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'Marque los protocolos de correo electrónico', 'Son SMTP, IMAP y POP3 (TP 7). HTTP sirve para acceder al correo, pero HTTPS no figura.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'IMAP', false),
    (gen_random_uuid(), v_question_id, 'SMI', false),
    (gen_random_uuid(), v_question_id, 'SMTP', false),
    (gen_random_uuid(), v_question_id, 'POP3', true),
    (gen_random_uuid(), v_question_id, 'HTTPS', false),
    (gen_random_uuid(), v_question_id, 'SNMP', false);

  -- Pregunta 5
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) Una transacción POP3 con el servidor pop3.yahoo.com se puede probar ejecutando desde el usuario cliente el siguiente comando: telnet pop3.yahoo.com 143', 'POP3 usa el puerto 110. El 143 es de IMAP.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 6
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) Una aplicación de Chat o Mensajería tiene exclusivamente soporte para canales únicos de chat y mensajería privada', 'WhatsApp, Telegram o Slack soportan chats privados y canales grupales.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 7
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) Una aplicación de Chat o Mensajería tiene soporte para múltiples canales de chat y mensajería privada', 'Ver pregunta 6.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 8
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) Un socket es una puerta entre el proceso de aplicación y exclusivamente con TCP, de extremo a extremo', 'Sirve con cualquier protocolo de transporte.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 9
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) Un socket es una puerta entre el proceso de aplicación y el protocolo de transporte de extremo a extremo', '', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 10
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'Marque las posibles estructuras de aplicaciones', 'Cliente-servidor: servidor siempre activo con IP fija y conocida. P2P: cada par es cliente y servidor a la vez.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Hilos', false),
    (gen_random_uuid(), v_question_id, 'Cliente-Servidor', false),
    (gen_random_uuid(), v_question_id, 'Maestro-Esclavo', false),
    (gen_random_uuid(), v_question_id, 'Peer-to-Peer/P2P', true);

  -- Pregunta 11
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) HTTP es principalmente un protocolo pull (protocolo de extracción)', 'Alguien carga la información en un servidor web y los usuarios la extraen cuando quieren (Kurose-Ross, p. 120).', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 12
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'Indicar cuántas conexiones se abren entre un cliente y un servidor para efectuar la transferencia de 4 archivos mediante el protocolo FTP, mientras transcurre una sesión entre ellos', 'FTP usa 1 conexión de control durante toda la sesión y 1 conexión de datos por archivo: 1 + 4 = 5.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, '1 conexión TCP', false),
    (gen_random_uuid(), v_question_id, '4 conexiones TCP', false),
    (gen_random_uuid(), v_question_id, '3 conexiones TCP', false),
    (gen_random_uuid(), v_question_id, '5 conexiones TCP', true),
    (gen_random_uuid(), v_question_id, '2 conexiones TCP', false);

  -- Pregunta 13
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) Son características de los servidores FTP: realizar conexiones rápidas a través de un cliente; soportar comandos FTP; poder subir y bajar archivos a través de un cliente; funciona en cualquier Sistema Operativo', 'El PDF no trae justificación (“buscar dónde justificar”).', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 14
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) La congestión se puede controlar solamente mediante la asignación de ancho de banda deseable', 'Hay control terminal a terminal y asistido por la red, además de ajuste de tasa, control de flujo, gestión de colas, etc.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 15
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) La congestión se puede controlar mediante la asignación de ancho de banda deseable, la regulación de la tasa de transmisión y con cuestiones inherentes a los medios inalámbricos', 'Asignar ancho de banda evita saturación, TCP regula la tasa dinámicamente y existen técnicas adaptadas a medios inalámbricos.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 16
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) La política de planificación Encolamiento Justo Ponderado (WFQ) se lleva a cabo en los dispositivos de capa de enlace en 2 etapas: los paquetes son clasificados al llegar y enviados a una cola según su marca; en la segunda etapa se atienden las colas mediante Round Robin, con una determinada prioridad según la clase', 'WFQ se diferencia del turno rotatorio: a cada clase se le asigna un peso wᵢ y recibe una fracción wᵢ/Σwⱼ del servicio. El peso reparte proporcionalmente, no da prioridad absoluta (Kurose, p. 652).', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 17
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'Marque las primitivas que las aplicaciones cliente puede llamar para transportar datos en un servicio simple orientado a la conexión', 'Listen bloquea al servidor. El cliente hace Connect, luego Send/Receive y Disconnect (Botta, p. 101).', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Disconnect', false),
    (gen_random_uuid(), v_question_id, 'Receive', false),
    (gen_random_uuid(), v_question_id, 'Send', false),
    (gen_random_uuid(), v_question_id, 'Connect', true),
    (gen_random_uuid(), v_question_id, 'Listen', false);

  -- Pregunta 18
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'Marque las primitivas que las aplicaciones Servidor pueden llamar para transportar datos en un servicio simple orientado a la conexión', '', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Send', false),
    (gen_random_uuid(), v_question_id, 'Disconnect', false),
    (gen_random_uuid(), v_question_id, 'Connect', false),
    (gen_random_uuid(), v_question_id, 'Listen', false),
    (gen_random_uuid(), v_question_id, 'Receive', true);

  -- Pregunta 19
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) Una forma de clasificar los algoritmos de ruteo (o enrutamiento) es en función de las siguientes características: globales o descentralizados; estáticos o dinámicos; sensibles a la carga o insensibles a la carga', 'Global: todos los routers conocen la topología completa. Descentralizado: solo conocen a sus vecinos. Estático: rutas cambian lento. Dinámico: cambian rápido. Sensible a la carga: ajusta rutas según el tráfico (Kurose, p. 384).', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 20
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) En internet suelen usarse tan sólo dos tipos de algoritmos de ruteo (o enrutamiento): un algoritmo de estado de enlaces global dinámico, y un algoritmo de vector de distancias descentralizado dinámico', 'Kurose, p. 400.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 21
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) En internet suelen usarse tan sólo estos tipos de algoritmos de ruteo (o enrutamiento): globales o descentralizados; estáticos o dinámicos; sensibles a la carga o insensibles a la carga', 'Esos son los tipos que existen, pero en internet solo se usan estado de enlaces y vector de distancias (ver 20).', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 22
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) En una red de datagramas, cada vez que un sistema terminal desea enviar un paquete marca el paquete con la dirección del sistema terminal de origen y luego introduce el paquete en la interfase de la red de salida de ese sistema terminal', 'Lo mínimo necesario es la dirección de destino; la de origen podría no estar. (El PDF aclara: “creo pero que alguien confirme”).', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 23
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) En una red de datagramas, cada vez que un sistema terminal desea enviar un paquete marca el paquete con la dirección del sistema terminal de destino y luego introduce el paquete en la interfase de la red de salida de ese sistema terminal', 'Ver 22.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 24
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) En los (Conmutadores o Switches) están implementados los protocolos de la capa de transporte de TCP/IP', 'Están en los sistemas terminales (hosts), no en routers ni switches.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 25
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) La función del protocolo de mensajes de control de internet (ICMP) es intercambiar mensajes con información de control entre los distintos elementos de la capa de red de internet. Este protocolo está implementado en la capa de red y la función es informar a los elementos de la red acerca del funcionamiento de la misma, no cumplen ninguna función de control sobre la red', 'Lo usan hosts y routers para comunicar información de nivel de red: reporte de errores (host, red, puerto o protocolo inalcanzable) y echo request/reply (ping).', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 26
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) Reenvío o forwarding es el proceso que se lleva a cabo cuando un paquete llega al enlace de entrada de un router, éste tiene que pasar el paquete al enlace de salida apropiado', 'Cada router tiene una tabla de reenvío que determina a qué puerto de salida va cada paquete.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 27
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'Seleccione al menos tres campos que estén incluidos en el encabezado de un segmento TCP (marcar la opción incorrecta descuenta puntos)', 'Las IP están en el encabezado IP, no en el TCP.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Número de secuencia', false),
    (gen_random_uuid(), v_question_id, 'Dirección IP de origen', false),
    (gen_random_uuid(), v_question_id, 'Número de puerto de origen', false),
    (gen_random_uuid(), v_question_id, 'Dirección IP destino', false),
    (gen_random_uuid(), v_question_id, 'Número de acuse de recibo', true);

  -- Pregunta 28
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) Hay dos capas que son responsables del Control de Congestión; la Capa de Transporte que controla la carga ofrecida y la capa de Red que experimenta la congestión', 'La capa de red puede o no dar soporte (terminal a terminal vs. asistido por la red).', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 29
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) El enrutamiento, routing o ruteo es cuando la capa de red tiene que determinar la ruta o camino que deben seguir los paquetes a medida que fluyen de un emisor a un receptor. Los algoritmos que calculan estas rutas se conocen como algoritmos de enrutamiento', '', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 30
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) Es cuando la capa de red tiene que determinar la ruta o camino que deben seguir los paquetes a medida que fluyen de un emisor a un receptor. Los algoritmos que calculan estas rutas se conocen como algoritmos de reenvío de paquetes', 'Se llaman algoritmos de enrutamiento (ver 29).', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 31
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) Enrutamiento, routing o ruteo es cuando un paquete llega al enlace de entrada de un router, éste tiene que pasar el paquete al enlace de salida apropiado', 'Esa definición corresponde a reenvío o forwarding.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 32
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) Cuando el paquete llega al enrutador, el algoritmo de enrutamiento, routing o ruteo, inspecciona en la cabecera del paquete entrante el puerto de salida y luego envía ese paquete por la interfase o puerto de salida especificado en esa cabecera', 'El algoritmo de enrutamiento calcula rutas de costo mínimo; quien envía por el puerto de salida es el reenvío.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 33
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) La primitiva “Socket” de socket Berkeley, crea un nuevo punto final en la comunicación', 'Tanenbaum, p. 487.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 34
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) Internet es una red de datagramas sin conexión. Muchas arquitecturas de red alternativas: ATM y frame relay, son redes de circuitos virtuales, y por tanto, utilizan conexiones en la capa de red. Estas conexiones de la capa de red se denominan circuitos virtuales (VC) y son las tecnologías de la capa de red orientadas a la conexión', 'Nota del PDF: el libro no dice “sin conexión”, pero en el PDF figura como verdadero.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 35
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) Un programa o proceso servidor solicita y recibe servicios de un programa o proceso cliente', 'Es el cliente quien solicita y recibe servicios del servidor.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 36
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) OSPF es un protocolo de enrutamiento exterior (inter-AS) utilizado para intercambiar rutas entre sistemas autónomos (AS)', 'OSPF es de enrutamiento interno. El que cumple esa definición es BGP.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 37
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) Son Fases del CV (circuito virtual): configuración del circuito virtual, transferencia de datos, terminación del circuito virtual', 'Kurose, p. 308.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 38
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) Son Fases de un CV (circuito virtual): determinación del camino, encaminamiento, establecimiento de la llamada', 'Ver 37.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 39
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) El bloqueo HOL es un protocolo implementado en la capa de red y se manifiesta como una demora que experimenta algún paquete que está en una cola de un puerto de entrada a la espera de ser despachado hacia el puerto de salida', 'HOL es un fenómeno, no un protocolo: un paquete espera porque otro en la cabeza de la cola bloquea el puerto de salida.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 40
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) El modelo TCP/IP, la capa de red ofrece sólo un servicio que es orientado a la conexión', 'Ofrece servicios con conexión y sin conexión.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 41
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) La primitiva “Bind” de socket Berkeley, asocia una dirección local con un socket', 'Tanenbaum, p. 487.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 42
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) La primitiva “Bind” de socket Berkeley, crea un nuevo punto final en la comunicación', 'Eso lo hace “Socket”.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 43
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) La primitiva “Bind” de socket Berkeley, envía datos a través de la conexión', 'Eso lo hace “Send”.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 44
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) En los Hosts Clientes están implementados los protocolos de la capa de transporte de TCP/IP', 'Están en los sistemas terminales, no en los routers.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 45
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) En los Hosts Servidores están implementados los protocolos de la capa de transporte de TCP/IP', 'Misma justificación que 44.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 46
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) En la arquitectura cliente-servidor el tiempo de distribución de archivos disminuye a medida que el número de pares aumenta', 'En cliente-servidor el servidor envía una copia a cada host y se satura. Lo que se reduce con más pares es P2P.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 47
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) La capa de red de Internet ofrece un servicio confiable único en donde la temporización es relativa entre paquetes y está garantizada, también está garantizada la recepción de los paquetes en el orden que fueron transmitidos y por último se garantiza la entrega de cada paquete transmitido', 'IP es un servicio no fiable, de mejor esfuerzo: no garantiza temporización, orden, entrega ni integridad.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 48
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) La capa de red de Internet ofrece un servicio único que se conoce como “servicio de mejor esfuerzo”. La temporización es relativa entre paquetes y no está garantizada, tampoco está garantizada la recepción de los paquetes en el orden que fueron transmitidos y por último tampoco se garantiza la entrega de cada paquete transmitido', '', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 49
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) En el modelo TCP/IP la capa de transporte tiene un protocolo Extremo a extremo, No orientado a la Conexión y No confiable', 'Ese es UDP. La capa de transporte tiene UDP (sin conexión, no fiable) y TCP (orientado a la conexión, fiable).', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 50
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) El sistema de nombres de dominio (DNS) puede utilizarse para encontrar la dirección IP correspondiente a un determinado nombre, como también para encontrar el nombre de host para una determinada dirección IP', 'De un nombre se obtienen una o varias IP, y de una IP uno o varios nombres.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 51
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) Hay solamente una capa responsable del Control de Congestión, la capa de transporte que controla la carga ofrecida', 'Son responsables las capas de red y transporte.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 52
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '(V o F) En los (Enrutadores o Routers) están implementados los protocolos de la capa de transporte de TCP/IP', 'Los routers trabajan en la capa 3 (red).', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 53
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'En la gestión de redes se definen las siguientes áreas: gestión de tráfico, gestión de usuarios, gestión del control de red, gestión de mantenimiento, gestión de estadísticas de dispositivos', 'Las áreas son: rendimiento, fallos, configuración, cuentas y seguridad (TP 9).', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 54
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'En la gestión de redes se definen las siguientes áreas: detección de fallos, monitorización de los hosts, monitorización del tráfico, detección de cambios rápidos en las tablas de enrutamiento, monitorización de los SiA, detección de intrusiones', 'Eso son herramientas de gestión de redes, no áreas.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 55
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'Las herramientas de gestión de red son: detección de fallos, monitorización de los hosts, monitorización del tráfico, detección de cambios rápidos en las tablas de enrutamiento, monitorización de los SiA, detección de intrusiones', 'Kurose, p. 736.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 56
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'En los sistemas de clave simétrica, las claves para cifrar y descifrar son idénticas y deben mantenerse en secreto por ambas partes. En los sistemas de clave pública, se emplea una pareja de claves. Una de las claves es conocida por sólo una de las partes, la otra es conocida por las dos partes', 'Kurose, p. 657.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 57
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'Las aplicaciones internet cliente-servidor que se ejecutan en modo Localhost, un programa cliente se ejecuta en una computadora y el programa servidor en la misma', 'Visto en el parcial anterior.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 58
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'Nombre los dos tipos de cifrado simétrico (dos palabras separadas por guión y sin espacio)', '', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'bloque-flujo', true),
    (gen_random_uuid(), v_question_id, 'Otra alternativa', false);

  -- Pregunta 59
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'Texto “en claro o texto plano” (cleartext o plaintext) es el resultado de cifrar un mensaje de texto legible utilizando un algoritmo de cifrado', 'El texto en claro es el mensaje original. El resultado de cifrar es el texto cifrado.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 60
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '3DES es un Estándar de Encriptación de Datos más seguro que DES porque cifra 3 veces con 2 claves distintas', '3DES ejecuta DES tres veces con tres claves distintas (de 56 bits).', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 61
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '3DES es un Estándar de encriptación de datos más seguro que DES porque cifra 2 veces con 3 claves distintas', 'Ver 60.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 62
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, '3DES es un algoritmo de cifrado de (o llave) clave simétrica', '3DES es cifrado de bloque, y el cifrado de bloque es una técnica simétrica.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 63
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'Cualquier usuario o empresa puede crear sus propias variables en la base de datos MIB bajo la rama private', '', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero X (deducción mía: la rama private/enterprises existe para eso)', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 64
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'Protocolo SNMP es un lenguaje de definición de datos para los objetos de la MIB', 'SNMP transmite información y comandos entre la entidad gestora y el agente (TP 9). El lenguaje de definición de datos es SMI.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso', true);

  -- Pregunta 65
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'En la firma digital, una vez enviado el mensaje, el transmisor no puede repudiar (negar) el contenido del mensaje', '', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero X (deducción mía: el hash va cifrado con la clave privada del emisor)', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 66
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'En la firma Digital, el transmisor puede verificar la identidad del receptor', '', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso X (deducción mía: la firma digital autentica al emisor, no al receptor)', true);

  -- Pregunta 67
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'En la gestión de redes, los objetos gestionados tienen asociados distintos elementos de información que se recopilan en una Base de información de gestión (MIB) mediante agentes que corren en los objetos gestionados', 'Cada objeto tiene nombre, OID, semántica y sintaxis, y se agrupan en MIBs (TP 9).', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 68
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'El protocolo de transporte preferido para los mensajes SNMP es TCP (es decir, los mensajes SNMP son transportados como la carga útil en un segmento TCP) y el número de puerto preferido para SNMP es el puerto 161', '', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', false),
    (gen_random_uuid(), v_question_id, 'Falso X (deducción mía: SNMP usa preferentemente UDP; el puerto 161 es correcto, pero el transporte no)', true);

  -- Pregunta 69
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'El protocolo SNMP se utiliza para transmitir información y comandos entre una entidad gestora y un agente que se ejecuta en un dispositivo de red gestionado, en representación de esa entidad', 'TP 9.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  -- Pregunta 70
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 'La autoridad de certificación (CA) efectúa el trabajo de validar las identidades y emitir los certificados. Una CA desempeña los siguientes papeles: verifica que una entidad (una persona, un router, etc.) es quien dice ser; y una vez verificada la identidad, genera un certificado que asocia con esa entidad su correspondiente clave pública', 'El certificado contiene la clave pública y la identificación del propietario, y está firmado digitalmente por la CA.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Verdadero', true),
    (gen_random_uuid(), v_question_id, 'Falso', false);

  RAISE NOTICE 'Cuestionario Parcial 2 - Redes de Datos creado exitosamente con 70 preguntas para el usuario % con ID de cuestionario %', v_user_id, v_deck_id;
END $$;