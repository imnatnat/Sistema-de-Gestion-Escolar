import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/app/ui/page-header";

export const dynamic = "force-dynamic";

const componentes = [
  { tipo: "actividad_1", nombre: "Act. 1" },
  { tipo: "actividad_2", nombre: "Act. 2" },
  { tipo: "actividad_3", nombre: "Act. 3" },
  { tipo: "actividad_4", nombre: "Act. 4" },
  { tipo: "actividad_5", nombre: "Act. 5" },
  { tipo: "medio_curso", nombre: "Medio curso" },
  { tipo: "ordinario", nombre: "Ordinario" },
  { tipo: "extraordinario", nombre: "Extraordinario" },
] as const;

function formatoCalificacion(valor: number | null | undefined) {
  return valor === null || valor === undefined ? "—" : Number(valor).toFixed(2);
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

  const { data: usuario, error: errorRol } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId)
    .maybeSingle();

  if (errorRol || usuario?.rol !== "estudiante") {
    redirect("/inicio");
  }

  const { data: estudiante, error: errorEstudiante } = await supabase
    .from("estudiantes")
    .select("aprobado, matricula")
    .eq("id_usuario", userId)
    .maybeSingle();

  if (errorEstudiante) {
    return <main className="p-8">No se pudo cargar tu información.</main>;
  }

  if (!estudiante?.aprobado) {
    redirect("/pendiente-aprobacion");
  }

  const { data: inscripciones, error: errorInscripciones } = await supabase
    .from("inscripciones")
    .select("id_inscripcion, id_grupo")
    .eq("id_usuario", userId);

  if (errorInscripciones) {
    return <main className="p-8">No se pudieron cargar tus materias.</main>;
  }

  const listaInscripciones = inscripciones ?? [];
  const idsInscripciones = listaInscripciones.map(
    (item) => item.id_inscripcion,
  );
  const idsGrupos = [
    ...new Set(listaInscripciones.map((item) => item.id_grupo)),
  ];

  const { data: grupos, error: errorGrupos } =
    idsGrupos.length > 0
      ? await supabase
          .from("grupos")
          .select("id_grupo, id_materia, periodo")
          .in("id_grupo", idsGrupos)
      : { data: [], error: null };

  const gruposLista = grupos ?? [];
  const idsMaterias = [...new Set(gruposLista.map((item) => item.id_materia))];

  const { data: materias, error: errorMaterias } =
    idsMaterias.length > 0
      ? await supabase
          .from("materias")
          .select("id_materia, nombre, clave")
          .in("id_materia", idsMaterias)
      : { data: [], error: null };

  const { data: oportunidades, error: errorOportunidades } =
    idsInscripciones.length > 0
      ? await supabase
          .from("oportunidades_calificacion")
          .select(
            "id_oportunidad, id_inscripcion, numero_op, id_configuracion, estado, calificacion_final",
          )
          .in("id_inscripcion", idsInscripciones)
          .order("numero_op", { ascending: true })
      : { data: [], error: null };

  const oportunidadesLista = oportunidades ?? [];
  const idsOportunidades = oportunidadesLista.map(
    (item) => item.id_oportunidad,
  );

  const { data: calificaciones, error: errorCalificaciones } =
    idsOportunidades.length > 0
      ? await supabase
          .from("calificaciones_componentes")
          .select("id_oportunidad, tipo_componente, calificacion")
          .in("id_oportunidad", idsOportunidades)
      : { data: [], error: null };
  console.log("IDs de oportunidades:", idsOportunidades);
  console.log("Calificaciones del estudiante:", calificaciones);
  console.log("Error de calificaciones:", errorCalificaciones);

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
      <main className="p-8">
        <p role="alert">
          No se pudieron cargar todas tus calificaciones. Inténtalo nuevamente.
        </p>
      </main>
    );
  }

  const grupoPorId = new Map(
    gruposLista.map((grupo) => [grupo.id_grupo, grupo]),
  );

  const materiaPorId = new Map(
    (materias ?? []).map((materia) => [materia.id_materia, materia]),
  );

  const calificacionesPorOportunidad = new Map<string, Map<string, number>>();

  for (const calificacion of calificaciones ?? []) {
    const notas =
      calificacionesPorOportunidad.get(calificacion.id_oportunidad) ??
      new Map<string, number>();

    notas.set(calificacion.tipo_componente, Number(calificacion.calificacion));

    calificacionesPorOportunidad.set(calificacion.id_oportunidad, notas);
  }

  const porcentajesPorConfiguracion = new Map<string, Map<string, number>>();

  for (const componente of configuraciones ?? []) {
    const porcentajes =
      porcentajesPorConfiguracion.get(componente.id_configuracion) ??
      new Map<string, number>();

    porcentajes.set(componente.tipo_componente, Number(componente.porcentaje));

    porcentajesPorConfiguracion.set(componente.id_configuracion, porcentajes);
  }

  const filas = listaInscripciones.flatMap((inscripcion) => {
    const grupo = grupoPorId.get(inscripcion.id_grupo);
    const materia = grupo ? materiaPorId.get(grupo.id_materia) : undefined;

    const historial = oportunidadesLista.filter(
      (item) => item.id_inscripcion === inscripcion.id_inscripcion,
    );

    return historial.map((oportunidad) => {
      const notas =
        calificacionesPorOportunidad.get(oportunidad.id_oportunidad) ??
        new Map<string, number>();

      const porcentajes = oportunidad.id_configuracion
        ? (porcentajesPorConfiguracion.get(oportunidad.id_configuracion) ??
          new Map<string, number>())
        : new Map<string, number>();

      const esRegular = [1, 3, 5].includes(oportunidad.numero_op);
      const esExtraordinaria = [2, 4, 6].includes(oportunidad.numero_op);

      return {
        id: oportunidad.id_oportunidad,
        materia: materia?.nombre ?? "Materia no disponible",
        clave: materia?.clave ?? "—",
        periodo: grupo?.periodo ?? "—",
        oportunidad: oportunidad.numero_op,
        estado: oportunidad.estado,
        final: oportunidad.calificacion_final,
        notas,
        porcentajes,
        esRegular,
        esExtraordinaria,
      };
    });
  });

  return (
    <main className="mx-auto w-full max-w-[1600px] flex-1 space-y-6 p-6 sm:p-8">
      <PageHeader
        eyebrow="Portal del estudiante"
        title="Mis calificaciones"
        description="Consulta tus actividades, exámenes y resultados por oportunidad."
      />

      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-5">
          <div>
            <h2 className="font-semibold text-[#252525]">
              Registro de calificaciones
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Matrícula: {estudiante.matricula ?? "No disponible"}
            </p>
          </div>

          <span className="text-sm text-gray-500">
            {filas.length} {filas.length === 1 ? "registro" : "registros"}
          </span>
        </div>

        {listaInscripciones.length === 0 ? (
          <div className="p-8 text-center">
            <h3 className="font-medium">
              Todavía no tienes materias inscritas
            </h3>
            <Link
              href="/estudiante/materias"
              className="mt-3 inline-block text-sm underline"
            >
              Consultar materias
            </Link>
          </div>
        ) : filas.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Tus materias todavía no tienen oportunidades de evaluación.
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1250px] border-collapse text-sm">
              <thead>
                <tr className="bg-[#f7f7f5] text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="sticky left-0 z-20 border-b border-r bg-[#f7f7f5] px-4 py-3">
                    Materia
                  </th>
                  <th className="border-b px-3 py-3">Periodo</th>
                  <th className="border-b px-3 py-3">OP.</th>
                  {componentes.map((componente) => (
                    <th
                      key={componente.tipo}
                      className="border-b px-3 py-3 text-center"
                    >
                      {componente.nombre}
                    </th>
                  ))}
                  <th className="border-b px-3 py-3 text-center">Final</th>
                  <th className="border-b px-4 py-3">Estado</th>
                </tr>
              </thead>

              <tbody>
                {filas.map((fila) => (
                  <tr
                    key={fila.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="sticky left-0 z-10 border-r border-gray-100 bg-white px-4 py-3">
                      <div className="font-medium text-[#252525]">
                        {fila.materia}
                      </div>
                      <div className="mt-1 text-xs text-gray-400">
                        {fila.clave}
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-gray-600">
                      {fila.periodo}
                    </td>

                    <td className="px-3 py-3 font-semibold">
                      OP{fila.oportunidad}
                    </td>

                    {componentes.map((componente) => {
                      const tipo = componente.tipo;
                      const esExtra = tipo === "extraordinario";

                      const aplica = fila.esRegular
                        ? !esExtra && (fila.porcentajes.get(tipo) ?? 0) > 0
                        : fila.esExtraordinaria && esExtra;

                      const valor = fila.notas.get(tipo);

                      return (
                        <td
                          key={tipo}
                          className="whitespace-nowrap px-3 py-3 text-center tabular-nums"
                        >
                          {!aplica ? (
                            <span className="text-gray-300">—</span>
                          ) : (
                            <div>
                              <span
                                className={
                                  valor === undefined
                                    ? "text-gray-400"
                                    : "font-medium text-gray-800"
                                }
                              >
                                {formatoCalificacion(valor)}
                              </span>

                              {fila.esRegular && (
                                <div className="mt-1 text-[10px] text-gray-400">
                                  {fila.porcentajes.get(tipo)?.toFixed(2)}%
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}

                    <td className="px-3 py-3 text-center font-semibold tabular-nums">
                      {formatoCalificacion(fila.final)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          fila.estado === "aprobada"
                            ? "bg-green-50 text-green-700"
                            : fila.estado === "no_aprobada"
                              ? "bg-red-50 text-red-700"
                              : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {formatoEstado(fila.estado)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-gray-200 bg-[#fafaf9] px-5 py-3">
          <p className="text-xs text-gray-500">
            Las calificaciones pendientes se muestran como —. Las oportunidades
            anteriores permanecen disponibles para consulta.
          </p>
        </div>
      </section>
    </main>
  );
}
