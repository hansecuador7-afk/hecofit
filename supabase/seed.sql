-- Archivo generado automáticamente por scripts/generate-seed.mjs.
-- No editar a mano: los cambios se sobrescribirán al regenerar el seed.
-- Ejercicios incluidos: 42
-- Fecha de generación: 2026-11-13T03:37:19.753Z

insert into public.exercises (id, name, description, primary_muscle, secondary_muscles, equipment, instructions, image_url, difficulty) values
  ('00000000-0000-4000-8000-000000000001', 'Press banca con barra', 'Ejercicio compuesto de empuje horizontal que desarrolla la fuerza del pecho, con participación de tríceps y hombros.', 'chest', array['triceps', 'shoulders']::text[], 'barbell', 'Túmbate en el banco con los pies firmes en el suelo y agarra la barra algo más ancho que los hombros.
Baja la barra de forma controlada hasta rozar la parte media del pecho, con los codos a unos 45 grados del torso.
Empuja la barra hacia arriba sin bloquear los codos de golpe y mantén los omóplatos retraídos durante todo el recorrido.
Usa un compañero o topes de seguridad para entrenar con cargas altas.', null, 'intermediate'),
  ('00000000-0000-4000-8000-000000000002', 'Press inclinado con mancuernas', 'Press de banca inclinado que enfatiza la porción superior del pectoral y mejora la estabilidad de los hombros.', 'chest', array['shoulders', 'triceps']::text[], 'dumbbell', 'Ajusta el banco a unos 30-45 grados y siéntate con una mancuerna apoyada en cada muslo.
Recuéstate y coloca las mancuernas a la altura del pecho, con las palmas hacia delante.
Empuja hacia arriba hasta casi extender los codos y baja controlando el movimiento.
Evita arquear en exceso la espalda y mantén las muñecas alineadas con los antebrazos.', null, 'intermediate'),
  ('00000000-0000-4000-8000-000000000003', 'Aperturas en polea', 'Ejercicio de aislamiento para el pectoral que trabaja la aducción del brazo con tensión constante.', 'chest', array['shoulders']::text[], 'cable', 'Coloca las poleas a la altura de los hombros y sujeta los manerales con una ligera flexión de codos.
Lleva las manos hacia delante y hacia el centro, juntándolas frente al pecho.
Regresa de forma controlada hasta notar el estiramiento del pectoral sin forzar el hombro.
Mantén el torso estable y evita encoger los hombros durante el recorrido.', null, 'intermediate'),
  ('00000000-0000-4000-8000-000000000004', 'Fondos en paralelas', 'Ejercicio de empuje con peso corporal que trabaja el pecho y los tríceps, dependiendo de la inclinación del torso.', 'chest', array['triceps', 'shoulders']::text[], 'bodyweight', 'Sujeta las paralelas con los brazos extendidos y los hombros alejados de las orejas.
Inclina ligeramente el torso hacia delante y baja hasta que los codos formen unos 90 grados.
Empuja para volver arriba sin perder el control ni dejar caer los hombros.
Si no controlas el descenso, usa una banda o una máquina asistida.', null, 'intermediate'),
  ('00000000-0000-4000-8000-000000000005', 'Dominadas', 'Tracción vertical con peso corporal que desarrolla la espalda y la fuerza de agarre.', 'back', array['biceps', 'forearms']::text[], 'bodyweight', 'Cuelga de la barra con las palmas hacia delante y una apertura algo mayor que los hombros.
Inicia el movimiento llevando los omóplatos hacia abajo y hacia atrás.
Sube hasta pasar la barbilla por la barra y desciende de forma controlada hasta extender los brazos.
Evita balancearte; usa banda elástica si aún no completas repeticiones limpias.', null, 'intermediate'),
  ('00000000-0000-4000-8000-000000000006', 'Remo con barra', 'Remo horizontal con barra que fortalece la espalda media y mejora la postura.', 'back', array['biceps', 'forearms']::text[], 'barbell', 'Sujeta la barra con agarre prono y separa los pies a la anchura de las caderas.
Inclina el torso hacia delante manteniendo la espalda neutra y las rodillas ligeramente flexionadas.
Lleva la barra hacia el abdomen bajo apretando los omóplatos, sin balancear el torso.
Baja la barra controlando el movimiento y mantén el core activo.', null, 'intermediate'),
  ('00000000-0000-4000-8000-000000000007', 'Jalón al pecho en polea', 'Tracción vertical en polea que trabaja el dorsal ancho y resulta accesible para principiantes.', 'back', array['biceps']::text[], 'cable', 'Siéntate con los muslos sujetos por el soporte y agarra la barra con las palmas hacia delante.
Lleva la barra hacia la parte superior del pecho, llevando los codos hacia abajo y atrás.
Evita echar el torso muy atrás o tirar de la barra por detrás del cuello.
Sube la barra de forma controlada hasta estirar los brazos sin perder la postura.', null, 'beginner'),
  ('00000000-0000-4000-8000-000000000008', 'Remo con mancuerna a una mano', 'Remo unilateral que permite trabajar la espalda con recorrido amplio y corrige desequilibrios.', 'back', array['biceps', 'forearms']::text[], 'dumbbell', 'Apoya una mano y una rodilla en el banco, manteniendo la espalda plana.
Sujeta la mancuerna con la mano libre y llévala hacia la cadera con el codo pegado al cuerpo.
Aprieta el omóplato al final del recorrido y baja la mancuerna de forma controlada.
Evita rotar el torso o tirar con el hombro.', null, 'beginner'),
  ('00000000-0000-4000-8000-000000000009', 'Peso muerto convencional con barra', 'Levantamiento compuesto que implica toda la cadena posterior y es clave para la fuerza global.', 'back', array['hamstrings', 'glutes', 'forearms']::text[], 'barbell', 'Coloca la barra sobre la mitad del pie y agarra con las manos justo por fuera de las piernas.
Flexiona las caderas y las rodillas manteniendo la espalda neutra y el pecho arriba.
Empuja el suelo con los pies y extiende caderas y rodillas a la vez, con la barra pegada al cuerpo.
Baja la barra controlando el movimiento; no redondees la espalda ni uses un peso que no puedas estabilizar.', null, 'advanced'),
  ('00000000-0000-4000-8000-000000000010', 'Press militar con barra', 'Empuje vertical que desarrolla los hombros y la estabilidad del core.', 'shoulders', array['triceps', 'abs']::text[], 'barbell', 'De pie, con la barra apoyada en la parte delantera de los hombros y las manos algo más anchas que los hombros.
Aprieta glúteos y abdomen para bloquear el torso.
Empuja la barra por encima de la cabeza hasta extender los codos, sin arquear la zona lumbar.
Baja la barra con control hasta la altura de la barbilla o el pecho.', null, 'intermediate'),
  ('00000000-0000-4000-8000-000000000011', 'Elevaciones laterales con mancuernas', 'Aislamiento del deltoides lateral que mejora la amplitud y la estética de los hombros.', 'shoulders', array[]::text[], 'dumbbell', 'De pie, sujeta las mancuernas a los lados con una ligera flexión de codos.
Sube los brazos hacia los lados hasta la altura de los hombros, sin encoger el cuello.
Baja lentamente sin dejar que el impulso mueva las mancuernas.
Usa un peso que te permita mantener el control en todo el recorrido.', null, 'beginner'),
  ('00000000-0000-4000-8000-000000000012', 'Pájaros con mancuernas', 'Ejercicio para el deltoides posterior que ayuda a equilibrar el trabajo de empuje y mejorar la postura.', 'shoulders', array['back']::text[], 'dumbbell', 'Inclina el torso hacia delante con la espalda neutra y las mancuernas colgando.
Con los codos ligeramente flexionados, abre los brazos hacia los lados hasta la altura de los hombros.
Aprieta la parte posterior del hombro y vuelve de forma controlada.
Evita balancear el torso o subir los hombros hacia las orejas.', null, 'beginner'),
  ('00000000-0000-4000-8000-000000000013', 'Face pull en polea', 'Tracción horizontal en polea que trabaja el deltoides posterior y los rotadores externos.', 'shoulders', array['back']::text[], 'cable', 'Coloca la polea a la altura de la cara y sujeta la cuerda con las palmas enfrentadas.
Tira de la cuerda hacia la frente separando las manos al final del recorrido.
Mantén los codos altos y aprieta los omóplatos sin arquear la espalda.
Regresa lentamente y evita usar un peso que te obligue a inclinarte hacia atrás.', null, 'beginner'),
  ('00000000-0000-4000-8000-000000000014', 'Curl con barra', 'Flexión de codo clásica con barra que desarrolla la fuerza y el tamaño del bíceps.', 'biceps', array['forearms']::text[], 'barbell', 'De pie, sujeta la barra con agarre supino y los codos pegados al torso.
Flexiona los codos para subir la barra hacia los hombros sin mover los codos hacia delante.
Baja la barra de forma controlada hasta extender casi por completo los brazos.
Evita balancear el torso o soltar la barra con un movimiento brusco.', null, 'beginner'),
  ('00000000-0000-4000-8000-000000000015', 'Curl alterno con mancuernas', 'Curl unilateral que permite concentrarse en cada brazo y controlar la rotación de la muñeca.', 'biceps', array['forearms']::text[], 'dumbbell', 'De pie, con una mancuerna en cada mano y las palmas mirando hacia el cuerpo.
Flexiona un codo y gira la palma hacia arriba mientras subes la mancuerna.
Baja despacio hasta la posición inicial y repite con el otro brazo.
Mantén los codos cerca del torso y evita usar impulso.', null, 'beginner'),
  ('00000000-0000-4000-8000-000000000016', 'Curl martillo', 'Curl con agarre neutro que trabaja el bíceps y el braquial, aumentando el grosor del brazo.', 'biceps', array['forearms']::text[], 'dumbbell', 'Sujeta las mancuernas con las palmas enfrentadas y los brazos extendidos.
Sube las mancuernas manteniendo el agarre neutro y los codos quietos.
Baja de forma controlada hasta la extensión casi completa.
No balancees el cuerpo ni desplaces los codos hacia atrás.', null, 'beginner'),
  ('00000000-0000-4000-8000-000000000017', 'Press francés con barra Z', 'Extensión de tríceps tumbado que trabaja especialmente la porción larga del tríceps.', 'triceps', array[]::text[], 'barbell', 'Túmbate en un banco con la barra Z sujeta por encima del pecho y los brazos extendidos.
Flexiona los codos para llevar la barra hacia la frente o justo detrás de la cabeza.
Extiende los codos para volver a la posición inicial sin mover los brazos superiores.
Usa un peso moderado y pide ayuda para colocar la barra si entrenas pesado.', null, 'intermediate'),
  ('00000000-0000-4000-8000-000000000018', 'Extensión de tríceps en polea alta', 'Aislamiento de tríceps en polea con tensión constante y bajo impacto articular.', 'triceps', array[]::text[], 'cable', 'Colócate frente a la polea y sujeta la cuerda o la barra recta con los codos pegados al torso.
Extiende los codos hacia abajo hasta separar las manos al final del recorrido.
Vuelve de forma controlada sin dejar que los codos se abran hacia los lados.
Mantén el torso estable y evita inclinarte para empujar el peso.', null, 'beginner'),
  ('00000000-0000-4000-8000-000000000019', 'Fondos en banco', 'Ejercicio de empuje con peso corporal centrado en el tríceps y la parte anterior del hombro.', 'triceps', array['shoulders']::text[], 'bodyweight', 'Siéntate en el borde de un banco con las manos a los lados y los dedos mirando hacia delante.
Desliza el cuerpo fuera del banco y flexiona los codos hasta unos 90 grados.
Empuja con las palmas para volver arriba manteniendo la espalda cerca del banco.
No bajes más de lo que te permita la comodidad del hombro y mantén el pecho alto.', null, 'beginner'),
  ('00000000-0000-4000-8000-000000000020', 'Patada de tríceps con mancuerna', 'Extensión de codo unilateral que aísla el tríceps y mejora el control en la parte final del movimiento.', 'triceps', array[]::text[], 'dumbbell', 'Inclina el torso, apoya una mano en un banco y sujeta la mancuerna con la otra.
Sube el codo a la altura del torso y extiende el brazo hacia atrás hasta bloquearlo suavemente.
Vuelve a flexionar el codo sin mover el brazo superior.
Mantén la espalda plana y evita girar el torso.', null, 'beginner'),
  ('00000000-0000-4000-8000-000000000021', 'Curl de muñeca con barra', 'Ejercicio de aislamiento para los flexores de la muñeca y el agarre.', 'forearms', array[]::text[], 'barbell', 'Siéntate y apoya los antebrazos en los muslos con las palmas hacia arriba.
Deja que la barra ruede hasta los dedos y flexiona las muñecas para subirla.
Baja la barra de forma controlada manteniendo los antebrazos apoyados.
Usa un peso ligero y evita movimientos bruscos en la muñeca.', null, 'beginner'),
  ('00000000-0000-4000-8000-000000000022', 'Curl inverso con barra Z', 'Curl con agarre prono que trabaja los extensores del antebrazo y el braquiorradial.', 'forearms', array['biceps']::text[], 'barbell', 'Sujeta la barra Z con las palmas hacia abajo y los brazos extendidos.
Flexiona los codos manteniendo la muñeca neutra y los codos pegados al cuerpo.
Baja la barra controlando el movimiento hasta casi estirar los brazos.
Evita usar impulso y reduce el peso si la muñeca se desvía.', null, 'intermediate'),
  ('00000000-0000-4000-8000-000000000023', 'Plancha frontal', 'Ejercicio isométrico que fortalece el core y mejora la estabilidad de la columna.', 'abs', array['shoulders']::text[], 'bodyweight', 'Apoya los antebrazos y las puntas de los pies en el suelo, con los codos bajo los hombros.
Alinea la cabeza, la espalda y las caderas sin hundir la zona lumbar.
Aprieta abdomen y glúteos y mantén la posición respirando con normalidad.
Detén la serie si pierdes la alineación o sientes molestias en la espalda.', null, 'beginner'),
  ('00000000-0000-4000-8000-000000000024', 'Elevación de piernas colgado', 'Ejercicio abdominal avanzado que trabaja la flexión de cadera y el control del core.', 'abs', array['forearms']::text[], 'bodyweight', 'Cuelga de una barra con los brazos extendidos y los hombros activos.
Sube las piernas rectas o con las rodillas flexionadas hasta que los muslos superen la horizontal.
Baja lentamente evitando balancearte y manteniendo el abdomen contraído.
Si no controlas el balanceo, empieza con elevaciones de rodillas.', null, 'advanced'),
  ('00000000-0000-4000-8000-000000000025', 'Crunch en polea alta', 'Flexión de tronco en polea que permite añadir carga progresiva al trabajo abdominal.', 'abs', array[]::text[], 'cable', 'Arrodíllate frente a la polea alta y sujeta la cuerda a los lados de la cabeza.
Flexiona el tronco llevando los codos hacia los muslos, sin tirar del cuello.
Aprieta el abdomen y vuelve de forma controlada sin perder la curvatura natural.
Mantén las caderas estables y evita usar los brazos para mover el peso.', null, 'intermediate'),
  ('00000000-0000-4000-8000-000000000026', 'Sentadilla trasera con barra', 'Ejercicio compuesto básico para cuádriceps, glúteos e isquiotibiales que mejora la fuerza y la movilidad.', 'quads', array['glutes', 'hamstrings', 'abs']::text[], 'barbell', 'Coloca la barra sobre la espalda alta y separa los pies a la anchura de los hombros.
Desciende flexionando caderas y rodillas, manteniendo el pecho alto y las rodillas alineadas con los pies.
Baja hasta donde puedas mantener la espalda neutra y empuja el suelo para subir.
Usa topes de seguridad y no fuerces la profundidad si pierdes la técnica.', null, 'intermediate'),
  ('00000000-0000-4000-8000-000000000027', 'Prensa de piernas', 'Ejercicio guiado para cuádriceps y glúteos que permite trabajar con cargas altas y poca demanda de estabilidad.', 'quads', array['glutes', 'hamstrings']::text[], 'machine', 'Ajusta el respaldo y coloca los pies en la plataforma a la anchura de los hombros.
Baja la plataforma flexionando las rodillas hasta unos 90 grados sin despegar la zona lumbar.
Empuja con los talones y extiende las piernas sin bloquear las rodillas con fuerza.
No bajes tanto como para que la pelvis se despegue del asiento.', null, 'beginner'),
  ('00000000-0000-4000-8000-000000000028', 'Zancadas con mancuernas', 'Ejercicio unilateral que trabaja cuádriceps y glúteos y mejora el equilibrio.', 'quads', array['glutes', 'hamstrings']::text[], 'dumbbell', 'De pie, con una mancuerna en cada mano y los brazos a los lados.
Da un paso al frente y baja flexionando ambas rodillas hasta que la trasera casi toque el suelo.
Empuja con el pie delantero para volver a la posición inicial y alterna las piernas.
Mantén el torso erguido y la rodilla delantera alineada con el pie.', null, 'intermediate'),
  ('00000000-0000-4000-8000-000000000029', 'Sentadilla búlgara con mancuernas', 'Sentadilla unilateral con apoyo elevado que incrementa la demanda de cuádriceps y glúteos.', 'quads', array['glutes', 'hamstrings']::text[], 'dumbbell', 'Coloca el empeine del pie trasero sobre un banco y sujeta una mancuerna en cada mano.
Desciende flexionando la pierna delantera, manteniendo el torso estable y la rodilla alineada.
Baja hasta donde puedas controlar sin perder el equilibrio y empuja con el pie delantero.
Ajusta la distancia al banco para evitar molestias en la rodilla.', null, 'intermediate'),
  ('00000000-0000-4000-8000-000000000030', 'Peso muerto rumano con barra', 'Ejercicio de bisagra de cadera que desarrolla los isquiotibiales, los glúteos y la espalda baja.', 'hamstrings', array['glutes', 'back']::text[], 'barbell', 'Sujeta la barra con agarre prono y los pies a la anchura de las caderas.
Con las rodillas ligeramente flexionadas, lleva las caderas hacia atrás y baja la barra pegada a las piernas.
Detente cuando notes el estiramiento en los isquiotibiales, sin redondear la espalda.
Aprieta glúteos para volver a la posición erguida.', null, 'intermediate'),
  ('00000000-0000-4000-8000-000000000031', 'Curl femoral tumbado en máquina', 'Aislamiento de isquiotibiales que fortalece la flexión de rodilla y equilibra el trabajo de cuádriceps.', 'hamstrings', array[]::text[], 'machine', 'Túmbate en la máquina con el rodillo sobre los tobillos y las caderas apoyadas.
Flexiona las rodillas llevando los talones hacia los glúteos.
Aprieta los isquiotibiales arriba y baja de forma controlada sin dejar caer el peso.
Ajusta el respaldo para que la rodilla quede alineada con el eje de la máquina.', null, 'beginner'),
  ('00000000-0000-4000-8000-000000000032', 'Buenos días con barra', 'Ejercicio de bisagra de cadera con barra que refuerza isquiotibiales, glúteos y erectores espinales.', 'hamstrings', array['glutes', 'back']::text[], 'barbell', 'Coloca la barra sobre la espalda alta y separa los pies a la anchura de los hombros.
Con las rodillas ligeramente flexionadas, inclina el torso hacia delante llevando las caderas atrás.
Baja hasta notar el estiramiento de los isquiotibiales y vuelve apretando los glúteos.
Usa poco peso al principio y mantén la espalda neutra en todo momento.', null, 'intermediate'),
  ('00000000-0000-4000-8000-000000000033', 'Hip thrust con barra', 'Extensión de cadera con barra que trabaja los glúteos con gran tensión en el punto de máxima contracción.', 'glutes', array['hamstrings', 'quads']::text[], 'barbell', 'Siéntate en el suelo con la espalda alta apoyada en un banco y la barra sobre las caderas.
Coloca los pies a la anchura de los hombros y extiende las caderas hasta alinear rodillas, caderas y hombros.
Aprieta los glúteos arriba sin hiperextender la zona lumbar.
Baja de forma controlada y mantén el peso protegido con una almohadilla.', null, 'intermediate'),
  ('00000000-0000-4000-8000-000000000034', 'Abducción de cadera con banda', 'Ejercicio con banda que activa el glúteo medio y mejora la estabilidad de la cadera.', 'glutes', array[]::text[], 'band', 'Coloca una banda elástica por encima de las rodillas o en los tobillos y adopta una postura atlética.
Mantén las caderas ligeramente flexionadas y da pasos laterales cortos contra la resistencia.
Evita arrastrar los pies y mantén las rodillas alineadas con los dedos.
Controla el retorno y realiza el mismo número de pasos en ambos sentidos.', null, 'beginner'),
  ('00000000-0000-4000-8000-000000000035', 'Puente de glúteo', 'Extensión de cadera en el suelo que activa los glúteos y sirve como preparación para el hip thrust.', 'glutes', array['hamstrings']::text[], 'bodyweight', 'Túmbate boca arriba con las rodillas flexionadas y los pies apoyados cerca de los glúteos.
Empuja con los talones y eleva las caderas hasta formar una línea entre rodillas, caderas y hombros.
Aprieta los glúteos arriba y baja de forma controlada sin apoyar el peso en la zona lumbar.
Mantén el abdomen activo y evita abrir las rodillas.', null, 'beginner'),
  ('00000000-0000-4000-8000-000000000036', 'Peso muerto sumo con barra', 'Variante del peso muerto con pies abiertos que enfatiza glúteos y aductores.', 'glutes', array['hamstrings', 'quads', 'back']::text[], 'barbell', 'Coloca los pies más anchos que los hombros con las puntas ligeramente hacia fuera.
Agarra la barra entre las piernas y baja las caderas manteniendo el pecho alto.
Empuja el suelo separando las rodillas y extiende caderas y rodillas a la vez.
Mantén la barra cerca del cuerpo y no redondees la espalda al despegar.', null, 'intermediate'),
  ('00000000-0000-4000-8000-000000000037', 'Elevación de talones de pie en máquina', 'Aislamiento de pantorrillas en posición erguida que trabaja el gastrocnemio.', 'calves', array[]::text[], 'machine', 'Coloca los hombros bajo las almohadillas y los metatarsos en el borde de la plataforma.
Baja los talones hasta notar el estiramiento de la pantorrilla.
Sube lo máximo posible sobre los dedos y aprieta arriba durante un instante.
Baja de forma controlada sin rebotar y mantén las rodillas casi extendidas.', null, 'beginner'),
  ('00000000-0000-4000-8000-000000000038', 'Elevación de talones sentado', 'Ejercicio para pantorrillas en posición sentada que enfatiza el sóleo.', 'calves', array[]::text[], 'machine', 'Siéntate en la máquina con las almohadillas sobre los muslos y los metatarsos en la plataforma.
Baja los talones para estirar la pantorrilla y sube hasta la máxima extensión.
Mantén la pausa arriba y baja controlando el movimiento.
Evita rebotar o usar un recorrido parcial.', null, 'beginner'),
  ('00000000-0000-4000-8000-000000000039', 'Swing con kettlebell', 'Ejercicio balístico de cadera que trabaja glúteos, isquiotibiales y core con un componente cardiovascular.', 'full_body', array['glutes', 'hamstrings', 'abs']::text[], 'kettlebell', 'Coloca la kettlebell delante de los pies, flexiona las caderas y agárrala con ambas manos.
Balancea la kettlebell hacia atrás entre las piernas y extiende las caderas para llevarla hasta la altura del pecho.
Mantén los brazos relajados y la espalda neutra; el movimiento nace de la cadera, no de los hombros.
Controla el retorno y evita arquear la zona lumbar en la extensión.', null, 'intermediate'),
  ('00000000-0000-4000-8000-000000000040', 'Thrusters con mancuernas', 'Combinación de sentadilla y press vertical que entrena todo el cuerpo y eleva la frecuencia cardíaca.', 'full_body', array['quads', 'shoulders', 'triceps']::text[], 'dumbbell', 'Sujeta una mancuerna en cada hombro y coloca los pies a la anchura de los hombros.
Baja en sentadilla manteniendo el torso erguido y los codos altos.
Empuja con las piernas y, al extenderlas, lleva las mancuernas por encima de la cabeza.
Baja las mancuernas a los hombros y encadena la siguiente repetición con control.', null, 'intermediate'),
  ('00000000-0000-4000-8000-000000000041', 'Burpees', 'Ejercicio de cuerpo completo que combina flexión, salto y desplazamiento para mejorar la condición física.', 'full_body', array['chest', 'quads', 'shoulders']::text[], 'bodyweight', 'Desde de pie, baja en cuclillas y apoya las manos en el suelo.
Lleva los pies atrás hasta la posición de plancha, realiza una flexión si tu nivel lo permite y vuelve a traer los pies.
Salta hacia arriba con los brazos extendidos y aterriza con las rodillas ligeramente flexionadas.
Mantén el core activo y reduce el ritmo antes de perder la técnica.', null, 'intermediate'),
  ('00000000-0000-4000-8000-000000000042', 'Cargada y press con barra', 'Levantamiento compuesto avanzado que une una cargada de fuerza con un press por encima de la cabeza.', 'full_body', array['shoulders', 'glutes', 'hamstrings']::text[], 'barbell', 'Empieza con la barra en el suelo y agarra con las manos algo más anchas que los hombros.
Extiende caderas y rodillas para llevar la barra hasta los hombros, cogiéndola en la posición de rack.
Flexiona ligeramente las rodillas y empuja la barra por encima de la cabeza hasta bloquear los codos.
Baja la barra a los hombros y luego al suelo con control; usa un peso que puedas dominar.', null, 'advanced')
on conflict (id) do update set name = excluded.name, description = excluded.description, primary_muscle = excluded.primary_muscle, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, instructions = excluded.instructions, difficulty = excluded.difficulty;
