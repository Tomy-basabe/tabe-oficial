-- ===========================================================================
-- CUESTIONARIO COMPLETO: cuestionario alberto TypeScript (59 Preguntas)
-- Materia: Desarrollo de Software
-- Incluye todos los incisos (a, b, c, d, e) de las 20 preguntas del examen
-- ===========================================================================
DO $$
DECLARE
  v_user_id UUID;
  v_subject_id UUID;
  v_deck_id UUID;
  v_question_id UUID;
BEGIN
  -- 1. Obtener usuario actual o primer usuario registrado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  END IF;

  -- 2. Buscar o vincular con la materia 'Desarrollo de Software'
  SELECT id INTO v_subject_id FROM public.subjects 
  WHERE (user_id = v_user_id OR user_id IS NULL) 
    AND (nombre ILIKE '%Desarrollo de Software%' OR nombre ILIKE '%Software%')
  LIMIT 1;

  -- Si no existe la materia, buscar cualquier materia o dejar NULL
  IF v_subject_id IS NULL THEN
    SELECT id INTO v_subject_id FROM public.subjects WHERE user_id = v_user_id LIMIT 1;
  END IF;

  -- 3. Crear o actualizar el cuestionario en quiz_decks
  SELECT id INTO v_deck_id FROM public.quiz_decks 
  WHERE user_id = v_user_id AND nombre ILIKE 'cuestionario alberto TypeScript' 
  LIMIT 1;

  IF v_deck_id IS NULL THEN
    INSERT INTO public.quiz_decks (id, user_id, nombre, descripcion, subject_id, total_questions)
    VALUES (
      gen_random_uuid(), 
      v_user_id, 
      'cuestionario alberto TypeScript', 
      'Cuestionario exhaustivo de TypeScript para Desarrollo de Software con las 59 preguntas e incisos completos del examen (código, tipos, discriminantes, generics, herencia y runtime).', 
      v_subject_id, 
      59
    )
    RETURNING id INTO v_deck_id;
  ELSE
    DELETE FROM public.quiz_questions WHERE deck_id = v_deck_id;
    UPDATE public.quiz_decks 
    SET total_questions = 59, subject_id = COALESCE(v_subject_id, subject_id) 
    WHERE id = v_deck_id;
  END IF;

  -- ==========================================
  -- PREGUNTA 1: Carrito de Compras & Reduce
  -- ==========================================
  -- P1.a
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P1.a - Carrito Food Store] Dado el código con filter (stock >= cantidad) y reduce sumando precio * cantidad iniciando en 0:\n\n```ts\ninterface Producto { id: number; nombre: string; precio: number; stock: number; }\ninterface ItemCarrito { producto: Producto; cantidad: number; }\nconst carrito: ItemCarrito[] = [\n  { producto: { id: 1, nombre: "Hamburguesa", precio: 4500, stock: 10 }, cantidad: 2 },\n  { producto: { id: 2, nombre: "Papas", precio: 2000, stock: 0 }, cantidad: 1 },\n  { producto: { id: 3, nombre: "Gaseosa", precio: 1500, stock: 5 }, cantidad: 3 },\n];\nconst total = carrito\n  .filter(i => i.producto.stock >= i.cantidad)\n  .reduce((acc, i) => acc + i.producto.precio * i.cantidad, 0);\nconsole.log(total);\n```\n¿Qué valor imprime el programa en consola?', 
  'filter descarta Papas (stock 0 < cantidad 1) y conserva Hamburguesa (2 x 4500 = 9000) y Gaseosa (3 x 1500 = 4500). El acumulador reduce suma 9000 + 4500 = 13500.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, '13500', true),
    (gen_random_uuid(), v_question_id, '15500', false),
    (gen_random_uuid(), v_question_id, '11000', false),
    (gen_random_uuid(), v_question_id, '8000', false);

  -- P1.b
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P1.b - Carrito Food Store] ¿Qué tipo de dato infiere el compilador de TypeScript para la variable "total"?', 
  'El valor inicial del acumulador (, 0) le indica al compilador que el tipo acumulado e inferido de retorno es number.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'number', true),
    (gen_random_uuid(), v_question_id, 'any', false),
    (gen_random_uuid(), v_question_id, 'ItemCarrito', false),
    (gen_random_uuid(), v_question_id, 'undefined', false);

  -- P1.c
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P1.c - Carrito Food Store] Si en la llamada a .reduce() se elimina el valor inicial ", 0", ¿el código compila?', 
  'No compila. Sin el valor inicial 0, reduce usa el primer elemento (ItemCarrito) como acumulador inicial, y TypeScript rechaza sumar un ItemCarrito con un number (error TS2365).', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'No', true),
    (gen_random_uuid(), v_question_id, 'Sí', false);

  -- ==========================================
  -- PREGUNTA 2: Formas de Pago & Uniones
  -- ==========================================
  -- P2.a
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P2.a - Checkout Formas de Pago] Dada la función:\n\n```ts\ntype Pago = \n  | { forma: "EFECTIVO"; montoEntregado: number }\n  | { forma: "TARJETA"; cuotas: number }\n  | { forma: "MERCADOPAGO"; preferenciaId: string };\n\nfunction importeFinal(p: Pago, total: number): number {\n  switch (p.forma) {\n    case "EFECTIVO":   return total * 90 / 100;\n    case "TARJETA":   return p.cuotas > 3 ? total * 115 / 100 : total;\n    case "MERCADOPAGO": return total;\n  }\n}\nconsole.log(importeFinal({ forma: "TARJETA", cuotas: 6 }, 10000));\nconsole.log(importeFinal({ forma: "EFECTIVO", montoEntregado: 20000 }, 10000));\n```\n¿Cuál es la PRIMERA línea que imprime el programa?', 
  'Para TARJETA con cuotas = 6 (> 3), se cobra recargo del 15%: 10000 * 115 / 100 = 11500.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, '11500', true),
    (gen_random_uuid(), v_question_id, '10000', false),
    (gen_random_uuid(), v_question_id, '9000', false),
    (gen_random_uuid(), v_question_id, '12000', false);

  -- P2.b
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P2.b - Checkout Formas de Pago] ¿Cuál es la SEGUNDA línea que imprime el programa?', 
  'Para EFECTIVO se aplica el 10% de descuento: 10000 * 90 / 100 = 9000.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, '9000', true),
    (gen_random_uuid(), v_question_id, '10000', false),
    (gen_random_uuid(), v_question_id, '18000', false),
    (gen_random_uuid(), v_question_id, '11500', false);

  -- P2.c
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P2.c - Checkout Formas de Pago] Si dentro del case "TARJETA" se intentara acceder a "p.preferenciaId", ¿compila?', 
  'No compila. En el case "TARJETA", TypeScript hace estrechamiento (narrowing) y sabe que p solo contiene "cuotas", no "preferenciaId".', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'No', true),
    (gen_random_uuid(), v_question_id, 'Sí', false);

  -- P2.d
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P2.d - Checkout Formas de Pago] La propiedad compartida (en este caso "forma") que permite el estrechamiento seguro de la unión se denomina:', 
  '"forma" es la propiedad discriminante (tag literal) que permite a TypeScript identificar inequívocamente cada variante.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'discriminante', true),
    (gen_random_uuid(), v_question_id, 'interfaz base', false),
    (gen_random_uuid(), v_question_id, 'alias genérico', false),
    (gen_random_uuid(), v_question_id, 'clave foránea', false);

  -- ==========================================
  -- PREGUNTA 3: Exhaustive Checking con Never
  -- ==========================================
  -- P3.a
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P3.a - Exhaustiveness Checking] Dada la función de avance de pedidos:\n\n```ts\ntype EstadoPedido = "PENDIENTE" | "CONFIRMADO" | "EN_PREPARACION" | "ENVIADO" | "ENTREGADO" | "CANCELADO";\nfunction siguiente(e: EstadoPedido): EstadoPedido | null {\n  switch (e) {\n    case "PENDIENTE":   return "CONFIRMADO";\n    case "CONFIRMADO":   return "EN_PREPARACION";\n    case "EN_PREPARACION": return "ENVIADO";\n    case "ENVIADO":   return "ENTREGADO";\n    case "ENTREGADO":   return null;\n    default:\n      const control: never = e;\n      return control;\n  }\n}\n```\n¿El código compila?', 
  'No compila. Se omitió el caso "CANCELADO". Por lo tanto, en el default e tiene tipo "CANCELADO", el cual no es asignable a never.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'No', true),
    (gen_random_uuid(), v_question_id, 'Sí', false);

  -- P3.b
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P3.b - Exhaustiveness Checking] ¿Qué tipo tiene la variable "e" dentro de la rama "default" en el código anterior?', 
  'Al haber evaluado 5 de los 6 estados de la unión en los case precedentes, el compilador estrecha e exactamente a "CANCELADO".', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, '"CANCELADO"', true),
    (gen_random_uuid(), v_question_id, 'never', false),
    (gen_random_uuid(), v_question_id, 'any', false),
    (gen_random_uuid(), v_question_id, 'EstadoPedido', false);

  -- P3.c
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P3.c - Exhaustiveness Checking] ¿Cuál es la principal ventaja arquitectónica de este patrón con "control: never"?', 
  'Garantiza control exhaustivo en tiempo de compilación: si en el futuro se agrega un nuevo estado a la unión, TypeScript marcará un error si el desarrollador olvida contemplarlo en el switch.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Avisa en tiempo de compilación si falta manejar algún estado de la unión', true),
    (gen_random_uuid(), v_question_id, 'Obliga a que todos los case devuelvan valores del mismo tipo que el parámetro', false),
    (gen_random_uuid(), v_question_id, 'Mejora la velocidad de ejecución en el motor V8', false),
    (gen_random_uuid(), v_question_id, 'Evita el uso de bloques if/else', false);

  -- ==========================================
  -- PREGUNTA 4: Partial y Omit en PATCH
  -- ==========================================
  -- P4.a
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P4.a - Endpoint PATCH] Dado el código de actualización de productos:\n\n```ts\ninterface Producto {\n  id: number; nombre: string; precio: number; stock: number; disponible: boolean;\n}\ntype ProductoUpdate = Partial<Omit<Producto, "id">>;\nfunction actualizar(p: Producto, cambios: ProductoUpdate): Producto {\n  return { ...p, ...cambios };\n}\nconst original: Producto = { id: 7, nombre: "Pizza", precio: 8000, stock: 4, disponible: true };\nconst editado = actualizar(original, { precio: 9500, stock: 0 });\nconsole.log(editado.precio + editado.stock, editado.id, original.precio);\n```\n¿Cuál es la salida impresa por console.log?', 
  'editado.precio (9500) + editado.stock (0) = 9500. editado.id se mantiene en 7. original.precio sigue inmutable en 8000. Por lo tanto imprime: 9500 7 8000.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, '9500 7 8000', true),
    (gen_random_uuid(), v_question_id, '9500 7 9500', false),
    (gen_random_uuid(), v_question_id, '8004 7 8000', false),
    (gen_random_uuid(), v_question_id, '9500 undefined 8000', false);

  -- P4.b
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P4.b - Endpoint PATCH] ¿Compila la llamada: actualizar(original, { id: 99 })?', 
  'No compila. Omit<Producto, "id"> elimina la propiedad "id" del tipo, por lo que pasar un literal con "id" genera error de exceso de propiedades.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'No', true),
    (gen_random_uuid(), v_question_id, 'Sí', false);

  -- P4.c
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P4.c - Endpoint PATCH] ¿Compila la llamada: actualizar(original, {})?', 
  'Sí compila. Partial hace que todas las propiedades restantes sean opcionales, por lo que un objeto vacío es un argumento válido.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Sí', true),
    (gen_random_uuid(), v_question_id, 'No', false);

  -- ==========================================
  -- PREGUNTA 5: exactOptionalPropertyTypes
  -- ==========================================
  -- P5.a
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P5.a - Partial & undefined] Dado el código con "strict": true:\n\n```ts\ninterface Producto { id: number; nombre: string; precio: number; }\ntype ProductoUpdate = Partial<Omit<Producto, "id">>;\nfunction actualizar(p: Producto, cambios: ProductoUpdate): Producto {\n  return { ...p, ...cambios };\n}\nconst original: Producto = { id: 1, nombre: "Empanada", precio: 1200 };\nconst r = actualizar(original, { nombre: undefined });\nconsole.log(typeof r.nombre);\n```\n¿El código compila con "strict": true?', 
  'Sí compila. Por defecto, en TypeScript las propiedades opcionales admiten que el valor sea undefined a menos que esté activada la flag exactOptionalPropertyTypes.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Sí', true),
    (gen_random_uuid(), v_question_id, 'No', false);

  -- P5.b
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P5.b - Partial & undefined] En ejecución, ¿qué valor imprime console.log(typeof r.nombre)?', 
  'El spread operator { ...p, ...cambios } sobreescribe nombre con undefined. typeof undefined es "undefined".', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'undefined', true),
    (gen_random_uuid(), v_question_id, 'string', false),
    (gen_random_uuid(), v_question_id, 'object', false),
    (gen_random_uuid(), v_question_id, 'null', false);

  -- P5.c
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P5.c - Partial & undefined] ¿Qué opción del compilador en tsconfig.json debe activarse para que TypeScript rechace explícitamente { nombre: undefined }?', 
  'exactOptionalPropertyTypes distingue entre una propiedad omitida y una asignada explícitamente a undefined.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'exactOptionalPropertyTypes', true),
    (gen_random_uuid(), v_question_id, 'noImplicitReturns', false),
    (gen_random_uuid(), v_question_id, 'noUncheckedIndexedAccess', false),
    (gen_random_uuid(), v_question_id, 'strictNullChecks', false);

  -- ==========================================
  -- PREGUNTA 6: Record y Conteo por Categoría
  -- ==========================================
  -- P6.a
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P6.a - Utility Type Record] Dado el código:\n\n```ts\ntype Categoria = "HAMBURGUESAS" | "PIZZAS" | "BEBIDAS";\ninterface Producto { nombre: string; categoria: Categoria; }\nconst productos: Producto[] = [\n  { nombre: "Clásica", categoria: "HAMBURGUESAS" },\n  { nombre: "Muzza", categoria: "PIZZAS" },\n  { nombre: "Napolitana", categoria: "PIZZAS" },\n  { nombre: "Agua", categoria: "BEBIDAS" },\n  { nombre: "Fugazzeta", categoria: "PIZZAS" },\n];\nconst conteo: Record<Categoria, number> = { HAMBURGUESAS: 0, PIZZAS: 0, BEBIDAS: 0 };\nfor (const p of productos) conteo[p.categoria]++;\nconsole.log(conteo.PIZZAS, Object.keys(conteo).length);\n```\n¿Cuál es la salida impresa?', 
  'Hay 3 pizzas (Muzza, Napolitana, Fugazzeta). El objeto conteo tiene exactamente las 3 claves de Categoria: imprime "3 3".', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, '3 3', true),
    (gen_random_uuid(), v_question_id, '3 5', false),
    (gen_random_uuid(), v_question_id, '2 3', false),
    (gen_random_uuid(), v_question_id, '5 3', false);

  -- P6.b
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P6.b - Utility Type Record] Si en la inicialización de "conteo" se omite "BEBIDAS: 0", ¿el código compila?', 
  'No compila. Record<Categoria, number> exige que todas las claves de la unión estén presentes.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'No', true),
    (gen_random_uuid(), v_question_id, 'Sí', false);

  -- P6.c
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P6.c - Utility Type Record] ¿Compila la instrucción: conteo["POSTRES"] = 1; ?', 
  'No compila. "POSTRES" no pertenece a la unión Categoria.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'No', true),
    (gen_random_uuid(), v_question_id, 'Sí', false);

  -- ==========================================
  -- PREGUNTA 7: Predicado de Tipo (x is Sesion)
  -- ==========================================
  -- P7.a
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P7.a - Predicado de Tipo] Dado el validador de sesiones:\n\n```ts\ntype Rol = "ADMIN" | "CLIENTE";\ninterface Sesion { email: string; rol: Rol; }\nfunction esSesion(x: unknown): x is Sesion {\n  return typeof x === "object" && x !== null && typeof (x as Sesion).email === "string" && ((x as Sesion).rol === "ADMIN" || (x as Sesion).rol === "CLIENTE");\n}\nconst crudos = [\n  \'{"email":"ana@fs.com","rol":"ADMIN"}\',\n  \'{"email":"leo@fs.com","rol":"SUPER"}\',\n  \'null\',\n  \'{"email":42,"rol":"CLIENTE"}\',\n  \'{"email":"sol@fs.com","rol":"CLIENTE","extra":true}\',\n];\nconst validas = crudos.map(s => JSON.parse(s)).filter(esSesion);\nconsole.log(validas.length);\n```\n¿Qué valor imprime validas.length?', 
  'Solo 2 objetos cumplen: ana (ADMIN) y sol (CLIENTE con propiedad extra permitida). SUPER se descarta por rol inválido, null por x !== null y 42 por no ser string.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, '2', true),
    (gen_random_uuid(), v_question_id, '3', false),
    (gen_random_uuid(), v_question_id, '1', false),
    (gen_random_uuid(), v_question_id, '4', false);

  -- P7.b
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P7.b - Predicado de Tipo] ¿Qué tipo infiere TypeScript para la constante "validas"?', 
  'El uso del type predicate "x is Sesion" en filter le permite al compilador estrechar el arreglo resultante a Sesion[].', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Sesion[]', true),
    (gen_random_uuid(), v_question_id, 'unknown[]', false),
    (gen_random_uuid(), v_question_id, 'any[]', false),
    (gen_random_uuid(), v_question_id, 'object[]', false);

  -- P7.c
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P7.c - Predicado de Tipo] ¿Por qué es indispensable comprobar explícitamente "x !== null" en la guarda de tipo?', 
  'En JavaScript, por una histórica peculiaridad del lenguaje, typeof null devuelve "object". Sin esa comprobación, el código lanzaría error al intentar acceder a propiedades de null.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Porque typeof null es "object"', true),
    (gen_random_uuid(), v_question_id, 'Porque null no es falsy', false),
    (gen_random_uuid(), v_question_id, 'Porque TypeScript infiere null como undefined', false),
    (gen_random_uuid(), v_question_id, 'Porque JSON.parse lanza excepción con null', false);

  -- ==========================================
  -- PREGUNTA 8: Función Genérica agruparPor
  -- ==========================================
  -- P8.a
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P8.a - Generics] Dada la función:\n\n```ts\nfunction agruparPor<T, K extends keyof T>(items: T[], clave: K): Map<T[K], T[]> {\n  const m = new Map<T[K], T[]>();\n  for (const it of items) {\n    const k = it[clave];\n    m.set(k, [...(m.get(k) ?? []), it]);\n  }\n  return m;\n}\ninterface Pedido { id: number; estado: string; total: number; }\nconst pedidos: Pedido[] = [\n  { id: 1, estado: "PENDIENTE", total: 5000 },\n  { id: 2, estado: "ENTREGADO", total: 12000 },\n  { id: 3, estado: "PENDIENTE", total: 3000 },\n  { id: 4, estado: "CANCELADO", total: 7000 },\n];\nconst g = agruparPor(pedidos, "estado");\nconsole.log(g.size, g.get("PENDIENTE")?.length, g.get("ENVIADO")?.length);\n```\n¿Cuál es el PRIMER valor impreso (g.size)?', 
  'Existen tres estados distintos en los pedidos: "PENDIENTE", "ENTREGADO" y "CANCELADO". Por lo tanto g.size es 3.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, '3', true),
    (gen_random_uuid(), v_question_id, '4', false),
    (gen_random_uuid(), v_question_id, '2', false),
    (gen_random_uuid(), v_question_id, '1', false);

  -- P8.b
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P8.b - Generics] ¿Cuál es el SEGUNDO valor impreso (g.get("PENDIENTE")?.length)?', 
  'Hay 2 pedidos con estado "PENDIENTE" (id 1 e id 3). Imprime 2.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, '2', true),
    (gen_random_uuid(), v_question_id, '3', false),
    (gen_random_uuid(), v_question_id, '1', false),
    (gen_random_uuid(), v_question_id, '0', false);

  -- P8.c
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P8.c - Generics] ¿Cuál es el TERCER valor impreso (g.get("ENVIADO")?.length)?', 
  'La clave "ENVIADO" no existe en el Map, por lo que g.get("ENVIADO") devuelve undefined y el operador opcional ?.length evalúa a undefined.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'undefined', true),
    (gen_random_uuid(), v_question_id, '0', false),
    (gen_random_uuid(), v_question_id, 'null', false),
    (gen_random_uuid(), v_question_id, 'NaN', false);

  -- P8.d
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P8.d - Generics] ¿Compila la invocación: agruparPor(pedidos, "fecha")?', 
  'No compila. La restricción genérica "K extends keyof T" valida que "fecha" no es una clave de la interfaz Pedido.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'No', true),
    (gen_random_uuid(), v_question_id, 'Sí', false);

  -- P8.e
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P8.e - Generics] ¿Qué tipo de dato tiene inferido la variable "g"?', 
  'T es Pedido, K es "estado", y Pedido["estado"] es string. Por ende el tipo es Map<string, Pedido[]>.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Map<string, Pedido[]>', true),
    (gen_random_uuid(), v_question_id, 'Record<string, Pedido>', false),
    (gen_random_uuid(), v_question_id, 'Map<any, any>', false),
    (gen_random_uuid(), v_question_id, 'Array<Map<string, Pedido>>', false);

  -- ==========================================
  -- PREGUNTA 9: as const y Tipos Derivados
  -- ==========================================
  -- P9.a
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P9.a - as const Assertion] Dado el código:\n\n```ts\nconst ESTADOS = ["PENDIENTE", "CONFIRMADO", "ENTREGADO"] as const;\ntype Estado = typeof ESTADOS[number];\nfunction esEstado(s: string): s is Estado {\n  return (ESTADOS as readonly string[]).includes(s);\n}\nconsole.log(ESTADOS.length, esEstado("ENVIADO"), esEstado("CONFIRMADO"));\n```\n¿Cuál es la salida de console.log?', 
  'ESTADOS.length es 3. "ENVIADO" no está (false). "CONFIRMADO" sí está (true). Imprime: 3 false true.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, '3 false true', true),
    (gen_random_uuid(), v_question_id, '3 false false', false),
    (gen_random_uuid(), v_question_id, '3 true true', false),
    (gen_random_uuid(), v_question_id, '3 true false', false);

  -- P9.b
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P9.b - as const Assertion] El tipo derivado "Estado" equivale exactamente a:', 
  'typeof ESTADOS[number] indexa la tupla constante de literales produciendo la unión "PENDIENTE" | "CONFIRMADO" | "ENTREGADO".', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, '"PENDIENTE" | "CONFIRMADO" | "ENTREGADO"', true),
    (gen_random_uuid(), v_question_id, 'string', false),
    (gen_random_uuid(), v_question_id, 'string[]', false),
    (gen_random_uuid(), v_question_id, 'readonly string[]', false);

  -- P9.c
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P9.c - as const Assertion] ¿Compila la instrucción: ESTADOS.push("ENVIADO"); ?', 
  'No compila. "as const" congela el arreglo como tupla de solo lectura (readonly), bloqueando métodos mutables como push().', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'No', true),
    (gen_random_uuid(), v_question_id, 'Sí', false);

  -- ==========================================
  -- PREGUNTA 10: Clases Abstractas y Modificadores
  -- ==========================================
  -- P10.a
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P10.a - Clases y Herencia] Dada la jerarquía:\n\n```ts\nabstract class Usuario {\n  constructor(public readonly email: string, protected intentos: number = 0) {}\n  abstract puede(accion: string): boolean;\n  registrarFallo(): number { return ++this.intentos; }\n}\nclass Cliente extends Usuario {\n  puede(accion: string) { return accion === "COMPRAR" || accion === "VER_PEDIDOS"; }\n}\nclass Admin extends Usuario {\n  puede(_accion: string) { return true; }\n}\nconst usuarios: Usuario[] = [\n  new Cliente("a@fs.com"),\n  new Admin("b@fs.com", 2),\n  new Cliente("c@fs.com", 1),\n];\nconst habilitados = usuarios.filter(u => u.puede("EDITAR_PRODUCTO")).length;\nconst fallos = usuarios.map(u => u.registrarFallo()).reduce((a, b) => a + b, 0);\nconsole.log(habilitados, fallos);\n```\n¿Cuál es la salida de console.log?', 
  'Solo Admin puede EDITAR_PRODUCTO (habilitados = 1). registrarFallo incrementa los intentos: cliente1 (0->1), admin (2->3), cliente2 (1->2). La suma da 1 + 3 + 2 = 6. Imprime "1 6".', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, '1 6', true),
    (gen_random_uuid(), v_question_id, '3 6', false),
    (gen_random_uuid(), v_question_id, '1 3', false),
    (gen_random_uuid(), v_question_id, '0 6', false);

  -- P10.b
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P10.b - Clases y Herencia] De las siguientes instrucciones, ¿cuál es la ÚNICA que compila sin errores?', 
  'email es público (public readonly) por lo que puede ser leído. "intentos" es protected (no accesible desde fuera) y "new Usuario()" no compila porque las clases abstractas no pueden instanciarse.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'console.log(usuarios[0].email);', true),
    (gen_random_uuid(), v_question_id, 'console.log(usuarios[0].intentos);', false),
    (gen_random_uuid(), v_question_id, 'usuarios[0].email = "nuevo@fs.com";', false),
    (gen_random_uuid(), v_question_id, 'const u = new Usuario("d@fs.com");', false);

  -- ==========================================
  -- PREGUNTA 11: Nullish Coalescing vs OR Lógico
  -- ==========================================
  -- P11.a
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P11.a - Operadores ?? vs ||] Dado el código:\n\n```ts\ninterface Direccion { calle: string; numero?: number; }\ninterface Cliente { nombre: string; direccion?: Direccion; descuento?: number; }\nconst clientes: Cliente[] = [\n  { nombre: "Ana", direccion: { calle: "San Martín", numero: 0 }, descuento: 0 },\n  { nombre: "Leo" },\n];\nfor (const c of clientes) {\n  console.log(c.direccion?.numero ?? -1, c.descuento || 10, c.descuento ?? 10);\n}\n```\n¿Qué imprime la PRIMERA iteración (cliente Ana)?', 
  'numero es 0 (no es null/undefined) -> imprime 0. descuento es 0: || lo considera falsy y toma 10, mientras que ?? preserva el 0 válido. Imprime: 0 10 0.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, '0 10 0', true),
    (gen_random_uuid(), v_question_id, '0 0 0', false),
    (gen_random_uuid(), v_question_id, '-1 10 0', false),
    (gen_random_uuid(), v_question_id, '0 10 10', false);

  -- P11.b
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P11.b - Operadores ?? vs ||] ¿Qué imprime la SEGUNDA iteración (cliente Leo)?', 
  'direccion es undefined (toma -1 con ??). descuento es undefined: || da 10 y ?? da 10. Imprime: -1 10 10.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, '-1 10 10', true),
    (gen_random_uuid(), v_question_id, '-1 0 10', false),
    (gen_random_uuid(), v_question_id, '0 10 10', false),
    (gen_random_uuid(), v_question_id, '-1 0 0', false);

  -- P11.c
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P11.c - Operadores ?? vs ||] Para aplicar un valor por defecto sin pisar un número legítimo que sea 0 (como descuentos o numeración), ¿qué operador debe utilizarse?', 
  '?? (Nullish Coalescing) solo actúa ante null o undefined, evitando pisar valores válidos como 0, false o "" a diferencia del operador ||.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, '??', true),
    (gen_random_uuid(), v_question_id, '||', false),
    (gen_random_uuid(), v_question_id, '&&', false),
    (gen_random_uuid(), v_question_id, '?:', false);

  -- ==========================================
  -- PREGUNTA 12: Promise.allSettled y TS 5.5
  -- ==========================================
  -- P12.a
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P12.a - Asincronismo y Promesas] Dado el código con db { 1: stock 5, 2: stock 0, 3: stock 8 }:\n\n```ts\nconst r = await Promise.allSettled([obtener(1), obtener(4), obtener(3)]);\nconst ok = r.filter((x): x is PromiseFulfilledResult<Producto> => x.status === "fulfilled");\nconsole.log(ok.length, ok.reduce((a, x) => a + x.value.stock, 0));\n```\n¿Qué imprime la primera línea?', 
  'obtener(4) falla, pero obtener(1) y obtener(3) se resuelven con éxito (ok.length = 2). La suma de stock es 5 + 8 = 13. Imprime: "2 13".', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, '2 13', true),
    (gen_random_uuid(), v_question_id, '3 13', false),
    (gen_random_uuid(), v_question_id, '2 5', false),
    (gen_random_uuid(), v_question_id, '1 5', false);

  -- P12.b
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P12.b - Asincronismo y Promesas] Al ejecutarse el bloque:\n\n```ts\ntry {\n  await Promise.all([obtener(2), obtener(9)]);\n  console.log("todo ok");\n} catch (e) {\n  console.log(e instanceof Error ? e.message : "?");\n}\n```\n¿Qué mensaje imprime en consola?', 
  'Promise.all rechaza inmediatamente cuando una promesa falla. El producto 9 no existe en db y lanza Error("Producto 9 inexistente").', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Producto 9 inexistente', true),
    (gen_random_uuid(), v_question_id, 'todo ok', false),
    (gen_random_uuid(), v_question_id, 'Producto 2 inexistente', false),
    (gen_random_uuid(), v_question_id, '?', false);

  -- P12.c
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P12.c - TS 5.5 Inferred Type Predicates] Con TypeScript 5.5 o posterior, si el filtro se escribe solo como:\n`x => x.status === "fulfilled"` (sin el predicado explícito "is"), ¿compila el acceso a `x.value` dentro del reduce?', 
  'Sí compila. A partir de TS 5.5, el compilador infiere automáticamente funciones flecha de retorno booleano como type predicates cuando comprueban propiedades discriminantes.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Sí', true),
    (gen_random_uuid(), v_question_id, 'No', false);

  -- P12.d
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P12.d - TS 5.5 Inferred Type Predicates] Si en cambio se usara `r.filter(Boolean)`, ¿compila el acceso a `x.value`?', 
  'No compila. filter(Boolean) solo descarta valores falsy (null, undefined, 0, false), pero todos los objetos de PromiseSettledResult son truthy, por lo que no discrimina fulfilled de rejected.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'No', true),
    (gen_random_uuid(), v_question_id, 'Sí', false);

  -- ==========================================
  -- PREGUNTA 13: Mapped Types
  -- ==========================================
  -- P13.a
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P13.a - Mapped Types] Dado el validador de formulario:\n\n```ts\ninterface ProductoForm { nombre: string; precio: number; stock: number; }\ntype Errores<T> = { [K in keyof T]?: string };\nfunction validar(f: ProductoForm): Errores<ProductoForm> {\n  const e: Errores<ProductoForm> = {};\n  if (f.nombre.trim().length < 3) e.nombre = "Muy corto";\n  if (f.precio <= 0) e.precio = "Debe ser positivo";\n  if (!Number.isInteger(f.stock)) e.stock = "Debe ser entero";\n  return e;\n}\nconst errores = validar({ nombre: " Té ", precio: 0, stock: 3 });\nconsole.log(Object.keys(errores).length, errores.stock ?? "OK");\n```\n¿Cuál es la salida de console.log?', 
  '" Té ".trim() tiene 2 letras (< 3: error en nombre). precio es 0 (error en precio). stock es 3 (entero: sin error). Hay 2 claves y errores.stock es undefined -> imprime "2 OK".', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, '2 OK', true),
    (gen_random_uuid(), v_question_id, '3 OK', false),
    (gen_random_uuid(), v_question_id, '2 Debe ser entero', false),
    (gen_random_uuid(), v_question_id, '0 OK', false);

  -- P13.b
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P13.b - Mapped Types] ¿Compila la asignación: errores.descuento = "x"; ?', 
  'No compila. "descuento" no existe en las propiedades de ProductoForm y por ende no está en Errores<ProductoForm>.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'No', true),
    (gen_random_uuid(), v_question_id, 'Sí', false);

  -- P13.c
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P13.c - Mapped Types] Si a ProductoForm se le añade la propiedad "categoriaId: number", ¿qué ocurre con el tipo Errores<ProductoForm>?', 
  'Los mapped types iteran dinámicamente con [K in keyof T], incorporando de inmediato categoriaId?: string de forma automática.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Incorpora categoriaId automáticamente', true),
    (gen_random_uuid(), v_question_id, 'Requiere regenerar la interfaz con Partial', false),
    (gen_random_uuid(), v_question_id, 'Lanza un error de tipado cíclico', false),
    (gen_random_uuid(), v_question_id, 'Solo admite propiedades de tipo string', false);

  -- ==========================================
  -- PREGUNTA 14: Excess Property Checking
  -- ==========================================
  -- P14.a
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P14.a - Excess Property Checks] Dado el código:\n\n```ts\ninterface Producto { id: number; nombre: string; precio: number; }\nfunction mostrar(p: Producto): string { return `${p.nombre}: $${p.precio}`; }\nconst lomo = { id: 1, nombre: "Lomo", precio: 9000, stock: 3, oferta: true };\nconsole.log(mostrar(lomo));   // línea A\n// console.log(mostrar({ id: 2, nombre: "Café", precio: 1200, stock: 1 })); // línea B\n```\n¿Compila la línea A?', 
  'Sí compila. TypeScript utiliza tipado estructural. Dado que la variable lomo ya está declarada previamente, cumple la forma requerida por Producto a pesar de tener propiedades adicionales.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Sí', true),
    (gen_random_uuid(), v_question_id, 'No', false);

  -- P14.b
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P14.b - Excess Property Checks] Si se descomenta la línea B pasando el objeto inline directo a mostrar(), ¿compila?', 
  'No compila. TypeScript aplica la comprobación de exceso de propiedades ("excess property check") únicamente sobre literales de objeto frescos pasados de forma directa.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'No', true),
    (gen_random_uuid(), v_question_id, 'Sí', false);

  -- P14.c
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P14.c - Excess Property Checks] ¿Qué imprime la llamada de la línea A?', 
  'Imprime "Lomo: $9000" interpolando las propiedades correspondientes.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Lomo: $9000', true),
    (gen_random_uuid(), v_question_id, 'Lomo: $9000 (stock 3)', false),
    (gen_random_uuid(), v_question_id, 'undefined: $undefined', false),
    (gen_random_uuid(), v_question_id, '[object Object]', false);

  -- ==========================================
  -- PREGUNTA 15: Sobrecarga de Funciones
  -- ==========================================
  -- P15.a
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P15.a - Function Overloading] Dado el catálogo:\n\n```ts\ninterface Producto { id: number; nombre: string; }\nconst catalogo: Producto[] = [\n  { id: 1, nombre: "Pizza Muzza" },\n  { id: 2, nombre: "Pizza Napolitana" },\n  { id: 3, nombre: "Empanada" },\n];\nfunction buscar(clave: number): Producto | undefined;\nfunction buscar(clave: string): Producto[];\nfunction buscar(clave: number | string): Producto | Producto[] | undefined {\n  return typeof clave === "number"\n    ? catalogo.find(p => p.id === clave)\n    : catalogo.filter(p => p.nombre.toLowerCase().includes(clave.toLowerCase()));\n}\nconsole.log(buscar("PIZZA").length, buscar(5)?.nombre ?? "sin resultado");\n```\n¿Cuál es la salida de console.log?', 
  'buscar("PIZZA") retorna 2 pizzas (length = 2). buscar(5) no existe (devuelve undefined), por lo que el operador ?? toma "sin resultado". Imprime "2 sin resultado".', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, '2 sin resultado', true),
    (gen_random_uuid(), v_question_id, '2 null', false),
    (gen_random_uuid(), v_question_id, '2 undefined', false),
    (gen_random_uuid(), v_question_id, '1 sin resultado', false);

  -- P15.b
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P15.b - Function Overloading] ¿Compila la expresión: buscar(2).length ?', 
  'No compila. La sobrecarga que recibe un number retorna "Producto | undefined", y la interfaz Producto no tiene la propiedad "length" (además de que podría ser undefined).', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'No', true),
    (gen_random_uuid(), v_question_id, 'Sí', false);

  -- P15.c
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P15.c - Function Overloading] ¿Qué tipo de retorno infiere el compilador para la llamada: buscar("emp")?', 
  'Al coincidir con la sobrecarga con argumento string, la firma pública define que el retorno es Producto[].', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Producto[]', true),
    (gen_random_uuid(), v_question_id, 'Producto | undefined', false),
    (gen_random_uuid(), v_question_id, 'Producto', false),
    (gen_random_uuid(), v_question_id, 'any', false);

  -- ==========================================
  -- PREGUNTA 16: Enums y Reverse Mapping
  -- ==========================================
  -- P16.a
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P16.a - Enums Numéricos] Dado el enum:\n\n```ts\nenum Prioridad { BAJA = 1, MEDIA, ALTA }\nconsole.log(Prioridad.ALTA, Prioridad[2], Object.keys(Prioridad).length);\n```\n¿Cuál es el PRIMER valor impreso (Prioridad.ALTA)?', 
  'BAJA = 1, MEDIA = 2, ALTA = 3. Imprime 3.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, '3', true),
    (gen_random_uuid(), v_question_id, '2', false),
    (gen_random_uuid(), v_question_id, '"ALTA"', false),
    (gen_random_uuid(), v_question_id, '0', false);

  -- P16.b
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P16.b - Enums Numéricos] ¿Cuál es el SEGUNDO valor impreso (Prioridad[2])?', 
  'Los enums numéricos generan mapeo inverso bidireccional (reverse mapping) en JavaScript. Prioridad[2] devuelve "MEDIA".', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'MEDIA', true),
    (gen_random_uuid(), v_question_id, '2', false),
    (gen_random_uuid(), v_question_id, 'BAJA', false),
    (gen_random_uuid(), v_question_id, 'undefined', false);

  -- P16.c
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P16.c - Enums Numéricos] ¿Cuál es el TERCER valor impreso (Object.keys(Prioridad).length)?', 
  'El objeto generado contiene 6 claves en runtime: las 3 claves de texto ("BAJA", "MEDIA", "ALTA") más las 3 inversas ("1", "2", "3"). Imprime 6.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, '6', true),
    (gen_random_uuid(), v_question_id, '3', false),
    (gen_random_uuid(), v_question_id, '0', false),
    (gen_random_uuid(), v_question_id, '2', false);

  -- P16.d
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P16.d - Enums Numéricos] Si se reemplazara el enum por una unión de literales (`type Prioridad = "BAJA" | "MEDIA" | "ALTA"`), ¿se genera algún objeto en el código JavaScript compilado?', 
  'No. Las uniones de tipos y alias son construcciones puramente de tipo que se borran por completo (type erasure) durante la transpilación a JavaScript.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'No', true),
    (gen_random_uuid(), v_question_id, 'Sí', false);

  -- ==========================================
  -- PREGUNTA 17: Generic Repository & Restricciones
  -- ==========================================
  -- P17.a
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P17.a - Generic Repository] Dado el repositorio:\n\n```ts\nclass Repositorio<T extends { id: number }> {\n  private items = new Map<number, T>();\n  guardar(item: T): void { this.items.set(item.id, item); }\n  buscar(id: number): T | undefined { return this.items.get(id); }\n  get cantidad(): number { return this.items.size; }\n}\ninterface Categoria { id: number; nombre: string; }\nconst repo = new Repositorio<Categoria>();\nrepo.guardar({ id: 1, nombre: "Pizzas" });\nrepo.guardar({ id: 2, nombre: "Bebidas" });\nrepo.guardar({ id: 1, nombre: "Pizzas artesanales" });\nconsole.log(repo.cantidad, repo.buscar(1)?.nombre);\n```\n¿Cuál es la salida impresa?', 
  'Map.set sobrescribe la clave 1 con "Pizzas artesanales". Quedan 2 categorías (id 1 e id 2). Imprime: "2 Pizzas artesanales".', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, '2 Pizzas artesanales', true),
    (gen_random_uuid(), v_question_id, '3 Pizzas', false),
    (gen_random_uuid(), v_question_id, '2 Pizzas', false),
    (gen_random_uuid(), v_question_id, '3 Pizzas artesanales', false);

  -- P17.b
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P17.b - Generic Repository] ¿Compila la instanciación: new Repositorio<string>() ?', 
  'No compila. La restricción "T extends { id: number }" exige que el tipo genérico sea un objeto con propiedad numérica id.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'No', true),
    (gen_random_uuid(), v_question_id, 'Sí', false);

  -- P17.c
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P17.c - Generic Repository] ¿Compila la asignación: repo.cantidad = 10; ?', 
  'No compila. "cantidad" es un getter de solo lectura sin setter definido.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'No', true),
    (gen_random_uuid(), v_question_id, 'Sí', false);

  -- ==========================================
  -- PREGUNTA 18: Template Literal Types
  -- ==========================================
  -- P18.a
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P18.a - Template Literal Types] Dado el sistema de permisos:\n\n```ts\ntype Recurso = "productos" | "pedidos" | "usuarios";\ntype Accion = "leer" | "escribir";\ntype Permiso = `${Recurso}:${Accion}`;\nconst permisosCliente: Permiso[] = ["productos:leer", "pedidos:leer", "pedidos:escribir"];\nconst escribe = permisosCliente.filter(p => p.endsWith(":escribir")).length;\nconsole.log(escribe);\n```\n¿Cuántos valores de string distintos admite el tipo Permiso?', 
  'El template literal type calcula el producto cartesiano de ambas uniones: 3 recursos x 2 acciones = 6 cadenas posibles.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, '6', true),
    (gen_random_uuid(), v_question_id, '5', false),
    (gen_random_uuid(), v_question_id, '3', false),
    (gen_random_uuid(), v_question_id, '9', false);

  -- P18.b
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P18.b - Template Literal Types] ¿Qué imprime console.log(escribe)?', 
  'Solo "pedidos:escribir" termina con ":escribir". Imprime 1.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, '1', true),
    (gen_random_uuid(), v_question_id, '2', false),
    (gen_random_uuid(), v_question_id, '3', false),
    (gen_random_uuid(), v_question_id, '0', false);

  -- P18.c
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P18.c - Template Literal Types] ¿Compila la asignación: const p: Permiso = "categorias:leer"; ?', 
  'No compila. "categorias" no forma parte de la unión Recurso.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'No', true),
    (gen_random_uuid(), v_question_id, 'Sí', false);

  -- ==========================================
  -- PREGUNTA 19: Readonly vs Object.freeze
  -- ==========================================
  -- P19.a
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P19.a - Mutabilidad y Readonly] Dado el código:\n\n```ts\ninterface Config { costoEnvio: number; minimoCompra: number; }\nconst cfg: Readonly<Config> = { costoEnvio: 1500, minimoCompra: 10000 };\nconst mutable = cfg as Config;\nmutable.costoEnvio = 0;\nconsole.log(cfg.costoEnvio);\n```\n¿Qué valor imprime console.log(cfg.costoEnvio) en tiempo de ejecución?', 
  'En JavaScript los objetos se manejan por referencia. Al mutar la propiedad mediante mutable, el objeto real en memoria cambia su valor a 0. Readonly no existe en runtime.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, '0', true),
    (gen_random_uuid(), v_question_id, '1500', false),
    (gen_random_uuid(), v_question_id, 'undefined', false),
    (gen_random_uuid(), v_question_id, 'NaN', false);

  -- P19.b
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P19.b - Mutabilidad y Readonly] ¿Compila directamente la instrucción: cfg.costoEnvio = 0; ?', 
  'No compila. Readonly<T> bloquea la asignación en tiempo de compilación a través de esa referencia específica.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'No', true),
    (gen_random_uuid(), v_question_id, 'Sí', false);

  -- P19.c
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P19.c - Mutabilidad y Readonly] Para impedir la modificación de las propiedades del objeto también en TIEMPO DE EJECUCIÓN (JavaScript runtime), ¿qué función nativa debe utilizarse?', 
  'Object.freeze(cfg) congela el objeto a nivel del motor de ejecución de JavaScript, impidiendo que sus propiedades sean alteradas.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'Object.freeze(cfg)', true),
    (gen_random_uuid(), v_question_id, 'as const', false),
    (gen_random_uuid(), v_question_id, 'Object.seal(cfg)', false),
    (gen_random_uuid(), v_question_id, 'cfg.lock()', false);

  -- ==========================================
  -- PREGUNTA 20: Discriminante Booleano en API
  -- ==========================================
  -- P20.a
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P20.a - Respuesta HTTP Genérica] Dado el procesador de respuestas API:\n\n```ts\ntype Respuesta<T> = \n  | { ok: true; data: T }\n  | { ok: false; error: string; codigo: number };\n\nfunction procesar(r: Respuesta<number[]>): number {\n  if (!r.ok) return r.codigo >= 500 ? -2 : -1;\n  return r.data.length;\n}\nconst respuestas: Respuesta<number[]>[] = [\n  { ok: true, data: [10, 20, 30] },\n  { ok: false, error: "No autorizado", codigo: 401 },\n  { ok: false, error: "Servidor caído", codigo: 503 },\n  { ok: true, data: [] },\n];\nconsole.log(respuestas.map(procesar).join(","));\n```\n¿Qué cadena de texto imprime console.log?', 
  '1: data.length = 3. 2: codigo 401 (< 500) -> -1. 3: codigo 503 (>= 500) -> -2. 4: data.length = 0. Imprime: "3,-1,-2,0".', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, '3,-1,-2,0', true),
    (gen_random_uuid(), v_question_id, '3,-1,-1,0', false),
    (gen_random_uuid(), v_question_id, '3,-2,-2,0', false),
    (gen_random_uuid(), v_question_id, '3,401,503,0', false);

  -- P20.b
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P20.b - Respuesta HTTP Genérica] Si la primera línea de la función procesar fuera directamente `return r.data.length;` (sin el guard if (!r.ok)), ¿el código compila?', 
  'No compila. En la variante con ok: false la propiedad "data" no existe en el tipo.', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'No', true),
    (gen_random_uuid(), v_question_id, 'Sí', false);

  -- P20.c
  INSERT INTO public.quiz_questions (id, deck_id, user_id, pregunta, explicacion, is_multi_select)
  VALUES (gen_random_uuid(), v_deck_id, v_user_id, 
  '[P20.c - Respuesta HTTP Genérica] ¿Compila la declaración: `const x: Respuesta<string> = { ok: true, error: "x", codigo: 1 };` ?', 
  'No compila. Al tener ok: true, TypeScript exige obligatoriamente la propiedad "data" y rechaza "error" y "codigo".', false)
  RETURNING id INTO v_question_id;
  INSERT INTO public.quiz_options (id, question_id, texto, es_correcta) VALUES
    (gen_random_uuid(), v_question_id, 'No', true),
    (gen_random_uuid(), v_question_id, 'Sí', false);

END $$;
