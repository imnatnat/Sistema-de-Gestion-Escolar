Sistema de Gestión Escolar

Análisis, Diseño, Diagrama E/R, Requerimientos, Diccionario de Datos y Español Estructurado — Equipo 2

1. Análisis

El Sistema de Gestión Escolar tiene como objetivo digitalizar y centralizar la administración de la información académica de una institución educativa, permitiendo que alumnos, profesores y personal administrativo interactúen con sus datos de forma autónoma, sin necesidad de intervención directa del equipo de desarrollo. El sistema gestiona seis módulos principales: Alumnos, Profesores, Materias, Inscripciones, Calificaciones y Usuarios.

Actualmente, procesos como la inscripción a materias, la asignación de profesores a grupos y el registro de calificaciones suelen depender de hojas de cálculo dispersas o de trámites manuales, lo que genera errores de captura, duplicidad de información y falta de trazabilidad. El sistema propuesto centraliza esta información en una única base de datos y expone dicha información a cada tipo de usuario según su rol.

1.1 Objetivo

Diseñar y documentar un sistema que permita administrar de forma segura y autónoma los procesos de inscripción, asignación docente y evaluación académica, garantizando que cualquier usuario final pueda operarlo sin instrucción previa del programador.

1.2 Alcance

Registro y autenticación de usuarios por correo electrónico, con roles diferenciados (Alumno, Profesor, Administrador).

Alta, baja y consulta de alumnos, profesores y materias.

Inscripción de alumnos a materias dentro de un periodo escolar.

Asignación de profesores a los grupos de cada materia.

Captura y consulta de calificaciones parciales y finales.

El proyecto entregable de la materia de POO corresponde únicamente a la documentación (análisis, diseño y especificación); no incluye la construcción del sistema funcional.

1.3 Actores del sistema

Administrador: gestiona catálogos generales (materias, periodos) y supervisa la operación del sistema.

Profesor: consulta sus grupos asignados y captura calificaciones.

Alumno: consulta su información personal, se inscribe a materias y revisa sus calificaciones.

2. Diseño

2.1 Enunciado

Se requiere diseñar un sistema que permita gestionar de forma centralizada la información escolar de una institución educativa. El sistema debe permitir que un usuario cree una cuenta validada mediante autenticación por correo electrónico y que, a partir de su rol, acceda únicamente a la información que le corresponde: un alumno podrá ver sus materias, profesores y calificaciones; un profesor podrá ver los grupos que imparte y capturar calificaciones; un administrador podrá gestionar los catálogos generales del sistema.

2.2 Roles

Administrador — Rol con mayor nivel de privilegios; da de alta materias y periodos escolares, y supervisa usuarios.

Profesor — Rol asociado a un Usuario; visualiza los grupos e inscripciones donde imparte clase y captura calificaciones de sus alumnos.

Alumno — Rol asociado a un Usuario; consulta su kardex, se inscribe a materias disponibles y revisa sus calificaciones.

2.3 Base de datos

La base de datos se implementará en Supabase (PostgreSQL administrado), aprovechando su módulo de autenticación (Supabase Auth) para el registro y login por correo electrónico, y su capa de seguridad a nivel de fila (Row Level Security) para restringir el acceso a la información según el rol del usuario. El control de versiones del proyecto y del esquema de base de datos se llevará en GitHub, y el desarrollo se realizará en Visual Studio Code.

La base de datos está compuesta por las siguientes seis tablas:

usuarios — cuenta de acceso y rol de cada persona (vinculada a Supabase Auth).

alumnos — datos académicos del alumno, referenciando a un usuario.

profesores — datos académicos del profesor, referenciando a un usuario.

materias — catálogo de materias ofertadas.

inscripciones — tabla asociativa entre alumnos, materias y el profesor que imparte el grupo.

calificaciones — calificaciones parciales y final ligadas a una inscripción.

2.4 Diagrama Entidad-Relación

El diagrama siguiente muestra las entidades del sistema, sus atributos principales (llave primaria PK y llave foránea FK) y la cardinalidad de sus relaciones.

Usuario se relaciona 1:1 con Alumno y 1:1 con Profesor (un usuario tiene exactamente un perfil académico asociado, según su rol). Alumno y Materia se relacionan M:M a través de la tabla asociativa Inscripción, la cual además referencia al Profesor que imparte ese grupo (1:M entre Profesor e Inscripción). Cada Inscripción tiene, a su vez, una relación 1:1 con Calificación.

3. Requerimientos

A continuación se listan los requerimientos generales identificados para el sistema, derivados del análisis previo y del requerimiento clave establecido por la materia: el producto final debe poder utilizarse sin instrucción del programador, permitiendo que el usuario cree una cuenta con autenticación por correo y acceda a sus datos, materias y profesores.

3.1 Requerimientos Funcionales

RF-01: El sistema debe permitir crear una cuenta de usuario mediante correo electrónico y contraseña.

RF-02: El sistema debe autenticar al usuario y dirigirlo a la vista correspondiente según su rol (Alumno, Profesor o Administrador).

RF-03: El sistema debe permitir al administrador dar de alta, editar y eliminar materias.

RF-04: El sistema debe permitir al alumno consultar su información personal y su carga académica.

RF-05: El sistema debe permitir al alumno inscribirse a una materia disponible dentro del periodo escolar activo.

RF-06: El sistema debe permitir al profesor consultar la lista de alumnos inscritos en sus grupos.

RF-07: El sistema debe permitir al profesor capturar y modificar calificaciones parciales y finales.

RF-08: El sistema debe permitir al alumno consultar sus calificaciones registradas.

RF-09: El sistema debe validar que un alumno no pueda inscribirse dos veces a la misma materia en el mismo periodo.

RF-10: El sistema debe registrar la fecha y hora de cada inscripción y de cada captura de calificación.

3.2 Requerimientos No Funcionales

RNF-01: Disponibilidad — el sistema debe estar disponible en línea, sin requerir instalación local para el usuario final.

RNF-02: Seguridad — las contraseñas deben almacenarse cifradas y el acceso a los datos debe restringirse por rol mediante Row Level Security en Supabase.

RNF-03: Usabilidad — la interfaz debe poder utilizarse sin capacitación previa ni instrucción del programador.

RNF-04: Portabilidad — el sistema debe ser accesible desde navegador, sin depender de un sistema operativo específico.

RNF-05: Mantenibilidad — el código fuente debe versionarse en GitHub para permitir trabajo colaborativo y trazabilidad de cambios.

RNF-06: Rendimiento — las consultas de horario, calificaciones e inscripción deben responder en un tiempo razonable (menor a 3 segundos) bajo condiciones normales de uso.

RNF-07: Escalabilidad — el diseño de base de datos debe permitir agregar nuevas materias, periodos y usuarios sin rediseñar el esquema.

4. Diccionario de Datos

El diccionario de datos describe las características lógicas de los campos utilizados en el sistema: nombre, tipo, descripción, si acepta valores nulos y su función como llave.

4.1 Tabla: usuarios

4.2 Tabla: alumnos

4.3 Tabla: profesores

4.4 Tabla: materias

4.5 Tabla: inscripciones

4.6 Tabla: calificaciones

5. Español Estructurado

El español estructurado describe, en lenguaje natural pero con estructura lógica de programación, los procesos clave del sistema.

5.1 Proceso: Registro y autenticación de usuario

INICIO

LEER correo, contraseña, rol_seleccionado

SI correo ya existe en la base de datos ENTONCES

MOSTRAR "El correo ya está registrado"

SINO

CIFRAR contraseña

CREAR registro en tabla usuarios (correo, contraseña_hash, rol_seleccionado)

SI rol_seleccionado = "alumno" ENTONCES

CREAR registro en tabla alumnos vinculado al usuario

SINO SI rol_seleccionado = "profesor" ENTONCES

CREAR registro en tabla profesores vinculado al usuario

FIN SI

MOSTRAR "Cuenta creada exitosamente"

FIN SI

FIN

5.2 Proceso: Inscripción de alumno a materia

INICIO

LEER matricula, id_materia, periodo

BUSCAR grupo disponible para id_materia en periodo

SI NO existe grupo disponible ENTONCES

MOSTRAR "No hay grupos disponibles para esta materia"

SINO

SI alumno ya está inscrito en esa materia y periodo ENTONCES

MOSTRAR "Ya estás inscrito en esta materia"

SINO

CREAR registro en tabla inscripciones (matricula, id_materia, id_profesor, periodo)

MOSTRAR "Inscripción realizada con éxito"

FIN SI

FIN SI

FIN

5.3 Proceso: Captura de calificación

INICIO

LEER id_inscripcion, tipo_evaluacion, valor

SI usuario autenticado NO es el profesor asignado a la inscripción ENTONCES

MOSTRAR "No tienes permiso para calificar este grupo"

SINO

SI valor < 0 O valor > 100 ENTONCES

MOSTRAR "Calificación fuera de rango"

SINO

ACTUALIZAR tabla calificaciones (id_inscripcion, tipo_evaluacion = valor)

MOSTRAR "Calificación guardada"

FIN SI

FIN SI

FIN



| Campo | Tipo | Descripción | Nulo | Llave |

| --- | --- | --- | --- | --- |

| id_usuario | UUID | Identificador único del usuario (generado por Supabase Auth) | No | PK |

| correo | VARCHAR(150) | Correo electrónico usado para autenticación | No | — |

| contraseña_hash | VARCHAR(255) | Contraseña cifrada (gestionada por Supabase Auth) | No | — |

| rol | VARCHAR(20) | Rol del usuario: alumno, profesor o administrador | No | — |

| fecha_registro | TIMESTAMP | Fecha y hora de creación de la cuenta | No | — |



| Campo | Tipo | Descripción | Nulo | Llave |

| --- | --- | --- | --- | --- |

| matricula | VARCHAR(10) | Identificador único del alumno | No | PK |

| id_usuario | UUID | Referencia a la cuenta de usuario asociada | No | FK |

| nombre_completo | VARCHAR(150) | Nombre completo del alumno | No | — |

| carrera | VARCHAR(100) | Carrera en la que está inscrito | No | — |

| semestre | INT | Semestre actual del alumno | No | — |



| Campo | Tipo | Descripción | Nulo | Llave |

| --- | --- | --- | --- | --- |

| id_profesor | UUID | Identificador único del profesor | No | PK |

| id_usuario | UUID | Referencia a la cuenta de usuario asociada | No | FK |

| nombre_completo | VARCHAR(150) | Nombre completo del profesor | No | — |

| especialidad | VARCHAR(100) | Área o especialidad académica | Sí | — |



| Campo | Tipo | Descripción | Nulo | Llave |

| --- | --- | --- | --- | --- |

| id_materia | UUID | Identificador único de la materia | No | PK |

| nombre | VARCHAR(150) | Nombre de la materia | No | — |

| clave | VARCHAR(10) | Clave oficial de la materia | No | — |

| creditos | INT | Número de créditos de la materia | No | — |

| semestre | INT | Semestre al que pertenece la materia | No | — |



| Campo | Tipo | Descripción | Nulo | Llave |

| --- | --- | --- | --- | --- |

| id_inscripcion | UUID | Identificador único de la inscripción | No | PK |

| matricula | VARCHAR(10) | Alumno inscrito | No | FK |

| id_materia | UUID | Materia en la que se inscribe | No | FK |

| id_profesor | UUID | Profesor que imparte el grupo | No | FK |

| periodo | VARCHAR(20) | Periodo escolar (ej. Ago-Dic 2026) | No | — |



| Campo | Tipo | Descripción | Nulo | Llave |

| --- | --- | --- | --- | --- |

| id_calificacion | UUID | Identificador único del registro de calificación | No | PK |

| id_inscripcion | UUID | Inscripción a la que pertenece la calificación | No | FK |

| parcial_1 | DECIMAL(4,1) | Calificación del primer parcial | Sí | — |

| parcial_2 | DECIMAL(4,1) | Calificación del segundo parcial | Sí | — |

| parcial_3 | DECIMAL(4,1) | Calificación del tercer parcial | Sí | — |

| final | DECIMAL(4,1) | Calificación final de la materia | Sí | — |
