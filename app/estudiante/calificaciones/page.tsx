import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";

const componentes = [
  { tipo: "actividad_1", nombre: "Actividad 1" },
  { tipo: "actividad_2", nombre: "Actividad 2" },
  { tipo: "actividad_3", nombre: "Actividad 3" },
  { tipo: "actividad_4", nombre: "Actividad 4" },
  { tipo: "actividad_5", nombre: "Actividad 5" },
  { tipo: "medio_curso", nombre: "Medio curso" },
  { tipo: "ordinario", nombre: "Ordinario" },
  { tipo: "extraordinario", nombre: "Extraordinario" },
] as const;

function formatoCalificacion(valor: number | null | undefined) {
  return valor === null || valor === undefined
    ? "Pendiente"
    : Number(valor).toFixed(2);
}

function formatoEstado(estado: string) {
  switch (estado) {
    case "en_curso":
      return "En evaluación";
    case "aprobada":
      return "Aprobada";
    case "no_aprobada":
      return "No aprobada";
    default:
      return "Sin información";
  }
}

export default async function CalificacionesEstudiantePage() {
  const { supabase, userId } = await requireUser();

  // 1. Verificar el rol del usuario.
  const { data: usuario, error: errorRol } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId)
    .maybeSingle();

  if (errorRol || usuario?.rol !== "estudiante") {
    redirect("/inicio");
  }

  // 2. Verificar aprobación del estudiante.
  const { data: estudiante, error: errorEstudiante } = await supabase
    .from("estudiantes")
    .select("aprobado")
    .eq("id_usuario", userId)
    .maybeSingle();

  if (errorEstudiante) {
    return (
      <main className="mx-auto w-full max-w-5xl p-8">
        No se pudo verificar la información del estudiante.
      </main>
    );
  }

  if (!estudiante?.aprobado) {
    redirect("/pendiente-aprobacion");
  }

  // 3. Obtener inscripciones del estudiante.
  const { data: inscripciones, error: errorInscripciones } = await supabase
    .from("inscripciones")
    .select("id_inscripcion, id_grupo")
    .eq("id_usuario", userId);

  if (errorInscripciones) {
    console.error("Error cargando inscripciones:", errorInscripciones.code);

    return (
      <main className="mx-auto w-full max-w-5xl p-8">
        <Link href="/inicio" className="underline">
          ← Volver al inicio
        </Link>
        <h1 className="mt-6 text-2xl font-semibold">Mis calificaciones</h1>
        <p className="mt-4">No se pudieron cargar tus inscripciones.</p>
      </main>
    );
  }

  const listaInscripciones = inscripciones ?? [];

  const idsInscripciones = listaInscripciones.map(
    (item) => item.id_inscripcion,
  );

  const idsGrupos = [
    ...new Set(listaInscripciones.map((item) => item.id_grupo)),
  ];

  // 4. Obtener grupos.
  const { data: grupos, error: errorGrupos } =
    idsGrupos.length > 0
      ? await supabase
          .from("grupos")
          .select("id_grupo, id_materia, periodo, horario")
          .in("id_grupo", idsGrupos)
      : { data: [], error: null };

  if (errorGrupos) {
    console.error("Error cargando grupos:", errorGrupos.code);
  }

  const gruposLista = grupos ?? [];

  // 5. Obtener materias.
  const idsMaterias = [
    ...new Set(gruposLista.map((grupo) => grupo.id_materia)),
  ];

  const { data: materias, error: errorMaterias } =
    idsMaterias.length > 0
      ? await supabase
          .from("materias")
          .select("id_materia, nombre, clave")
          .in("id_materia", idsMaterias)
      : { data: [], error: null };

  if (errorMaterias) {
    console.error("Error cargando materias:", errorMaterias.code);
  }

  // 6. Obtener oportunidades de evaluación.
  const { data: oportunidades, error: errorOportunidades } =
    idsInscripciones.length > 0
      ? await supabase
          .from("oportunidades_calificacion")
          .select(
            "id_oportunidad, id_inscripcion, numero_op, id_configuracion, estado, calificacion_final, iniciada_en, cerrada_en",
          )
          .in("id_inscripcion", idsInscripciones)
          .order("numero_op", { ascending: true })
      : { data: [], error: null };

  if (errorOportunidades) {
    console.error("Error cargando oportunidades:", errorOportunidades.code);
  }

  const oportunidadesLista = oportunidades ?? [];

  // 7. Obtener calificaciones de los componentes.
  const idsOportunidades = oportunidadesLista.map(
    (item) => item.id_oportunidad,
  );

  const { data: calificaciones, error: errorCalificaciones } =
    idsOportunidades.length > 0
      ? await supabase
          .from("calificaciones_componentes")
          .select(
            "id_oportunidad, tipo_componente, calificacion, actualizado_en",
          )
          .in("id_oportunidad", idsOportunidades)
      : { data: [], error: null };

  if (errorCalificaciones) {
    console.error("Error cargando calificaciones:", errorCalificaciones.code);
  }

  // 8. Obtener porcentajes de las configuraciones.
  const idsConfiguraciones = [
    ...new Set(
      oportunidadesLista
        .map((item) => item.id_configuracion)
        .filter((id): id is string => id !== null),
    ),
  ];

  const { data: configuraciones, error: errorConfiguraciones } =
    idsConfiguraciones.length > 0
      ? await supabase
          .from("componentes_configuracion")
          .select("id_configuracion, tipo_componente, porcentaje")
          .in("id_configuracion", idsConfiguraciones)
      : { data: [], error: null };

  if (
    errorGrupos ||
    errorMaterias ||
    errorOportunidades ||
    errorCalificaciones ||
    errorConfiguraciones
  ) {
    return (
      <main className="mx-auto w-full max-w-5xl p-8">
        <Link href="/inicio" className="underline">
          ← Volver al inicio
        </Link>
        <h1 className="mt-6 text-2xl font-semibold">Mis calificaciones</h1>
        <p className="mt-4 rounded-lg border p-4" role="alert">
          No se pudieron cargar todos los datos de evaluación. Inténtalo
          nuevamente.
        </p>
      </main>
    );
  }

  // 9. Crear mapas para relacionar los registros.
  const grupoPorId = new Map(
    gruposLista.map((grupo) => [grupo.id_grupo, grupo]),
  );

  const materiaPorId = new Map(
    (materias ?? []).map((materia) => [materia.id_materia, materia]),
  );

  const oportunidadesPorInscripcion = new Map<
    string,
    (typeof oportunidadesLista)[number][]
  >();

  for (const oportunidad of oportunidadesLista) {
    const lista =
      oportunidadesPorInscripcion.get(oportunidad.id_inscripcion) ?? [];

    oportunidadesPorInscripcion.set(oportunidad.id_inscripcion, [
      ...lista,
      oportunidad,
    ]);
  }

  const calificacionesPorOportunidad = new Map<string, Map<string, number>>();

  for (const calificacion of calificaciones ?? []) {
    const lista =
      calificacionesPorOportunidad.get(calificacion.id_oportunidad) ??
      new Map<string, number>();

    lista.set(calificacion.tipo_componente, Number(calificacion.calificacion));

    calificacionesPorOportunidad.set(calificacion.id_oportunidad, lista);
  }

  const porcentajesPorConfiguracion = new Map<string, Map<string, number>>();

  for (const componente of configuraciones ?? []) {
    const lista =
      porcentajesPorConfiguracion.get(componente.id_configuracion) ??
      new Map<string, number>();

    lista.set(componente.tipo_componente, Number(componente.porcentaje));

    porcentajesPorConfiguracion.set(componente.id_configuracion, lista);
  }

  // 10. Mostrar información del estudiante.
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 p-6 sm:p-8">
      <Link
        href="/inicio"
        className="text-sm text-gray-500 hover:text-gray-900"
      >
        ← Volver al inicio
      </Link>

      <header>
        <p className="text-sm text-gray-500">Sistema de Gestión Escolar</p>

        <h1 className="mt-2 text-3xl font-semibold">Mis calificaciones</h1>

        <p className="mt-2 text-sm text-gray-600">
          Consulta tus calificaciones y el avance de tus oportunidades de
          evaluación.
        </p>
      </header>

      {listaInscripciones.length === 0 ? (
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="font-semibold">
            Todavía no tienes materias inscritas
          </h2>

          <Link
            href="/estudiante/materias"
            className="mt-4 inline-block text-sm underline"
          >
            Consultar materias
          </Link>
        </section>
      ) : (
        <div className="space-y-6">
          {listaInscripciones.map((inscripcion) => {
            const grupo = grupoPorId.get(inscripcion.id_grupo);

            const materia = grupo
              ? materiaPorId.get(grupo.id_materia)
              : undefined;

            const historial =
              oportunidadesPorInscripcion.get(inscripcion.id_inscripcion) ?? [];

            const oportunidadActual = historial.find(
              (item) => item.estado === "en_curso",
            );

            const ultimaOportunidad =
              historial.length > 0 ? historial[historial.length - 1] : null;

            const oportunidadVisible = oportunidadActual ?? ultimaOportunidad;

            const aprobado = historial.some(
              (item) => item.estado === "aprobada",
            );

            return (
              <section
                key={inscripcion.id_inscripcion}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white"
              >
                <div className="border-b border-gray-200 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">
                        {materia?.nombre ?? "Materia no disponible"}
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        Clave: {materia?.clave ?? "No disponible"}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        aprobado
                          ? "bg-green-50 text-green-700"
                          : oportunidadActual
                            ? "bg-blue-50 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {aprobado
                        ? "Materia aprobada"
                        : oportunidadActual
                          ? "En evaluación"
                          : "Sin oportunidad activa"}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500">
                    <p>Periodo: {grupo?.periodo ?? "No disponible"}</p>
                    <p>Horario: {grupo?.horario ?? "No disponible"}</p>
                  </div>
                </div>

                {historial.length === 0 ? (
                  <p className="p-5 text-sm text-gray-500">
                    Todavía no tienes una oportunidad de evaluación registrada
                    para esta materia.
                  </p>
                ) : (
                  <div className="space-y-5 p-5">
                    {historial.map((oportunidad) => {
                      const notas =
                        calificacionesPorOportunidad.get(
                          oportunidad.id_oportunidad,
                        ) ?? new Map<string, number>();

                      const porcentajes = oportunidad.id_configuracion
                        ? (porcentajesPorConfiguracion.get(
                            oportunidad.id_configuracion,
                          ) ?? new Map<string, number>())
                        : new Map<string, number>();

                      const esRegular = [1, 3, 5].includes(
                        oportunidad.numero_op,
                      );

                      const esExtraordinaria = [2, 4, 6].includes(
                        oportunidad.numero_op,
                      );

                      return (
                        <div
                          key={oportunidad.id_oportunidad}
                          className="rounded-lg border border-gray-200 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h3 className="font-semibold">
                                Oportunidad {oportunidad.numero_op}
                              </h3>

                              <p className="mt-1 text-xs text-gray-500">
                                {formatoEstado(oportunidad.estado)}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-xs text-gray-500">
                                Calificación final
                              </p>

                              <p className="text-xl font-semibold">
                                {formatoCalificacion(
                                  oportunidad.calificacion_final,
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {componentes.map((componente) => {
                              const tipo = componente.tipo;

                              const esExtra = tipo === "extraordinario";

                              const aplica = esRegular
                                ? !esExtra && (porcentajes.get(tipo) ?? 0) > 0
                                : esExtraordinaria && esExtra;

                              if (!aplica) {
                                return null;
                              }

                              const valor = notas.get(tipo);

                              return (
                                <div
                                  key={tipo}
                                  className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                                >
                                  <p className="text-sm text-gray-500">
                                    {componente.nombre}
                                  </p>

                                  {esRegular && (
                                    <p className="mt-1 text-xs text-gray-400">
                                      {porcentajes.get(tipo)?.toFixed(2)}%
                                    </p>
                                  )}

                                  <p className="mt-2 font-semibold text-gray-900">
                                    {formatoCalificacion(valor)}
                                  </p>
                                </div>
                              );
                            })}
                          </div>

                          {oportunidad.cerrada_en && (
                            <p className="mt-3 text-xs text-gray-500">
                              Cerrada:{" "}
                              {new Date(oportunidad.cerrada_en).toLocaleString(
                                "es-MX",
                                {
                                  timeZone: "America/Monterrey",
                                },
                              )}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {oportunidadVisible && (
                  <div className="border-t border-gray-200 bg-gray-50 px-5 py-3">
                    <p className="text-xs text-gray-500">
                      {aprobado
                        ? "Has aprobado esta materia."
                        : oportunidadActual
                          ? `Actualmente estás cursando la oportunidad ${oportunidadActual.numero_op}.`
                          : "No tienes una oportunidad de evaluación en curso."}
                    </p>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
