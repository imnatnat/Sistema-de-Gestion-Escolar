import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import {
  guardarCalificacionOportunidadAction,
  cerrarOportunidadCalificacionAction,
} from "./actions";

type PageProps = {
  searchParams: Promise<{ estado?: string }>;
};

const mensajes: Record<string, string> = {
  "calificacion-guardada": "La calificación se guardó correctamente.",
  "oportunidad-cerrada": "La oportunidad se cerró correctamente.",
  "solicitud-invalida": "La solicitud no es válida.",
  "datos-invalidos": "La calificación debe estar entre 0 y 100.",
  "no-se-pudo-cerrar":
    "No se pudo cerrar la oportunidad. Verifica que todos los componentes requeridos tengan calificación y que la configuración sea válida.",
  error: "Ocurrió un error. Inténtalo nuevamente.",
};

const componentes = [
  { tipo: "activity_1", nombre: "Actividad 1" },
  { tipo: "activity_2", nombre: "Actividad 2" },
  { tipo: "activity_3", nombre: "Actividad 3" },
  { tipo: "activity_4", nombre: "Actividad 4" },
  { tipo: "activity_5", nombre: "Actividad 5" },
  { tipo: "medio_curso", nombre: "Medio curso" },
  { tipo: "ordinario", nombre: "Ordinario" },
  { tipo: "extraordinario", nombre: "Extraordinario" },
] as const;

function formatoCalificacion(valor: number | null) {
  return valor === null ? "—" : Number(valor).toFixed(2);
}

export default async function ProfesorGruposPage({ searchParams }: PageProps) {
  const { supabase, userId } = await requireUser();
  const { estado } = await searchParams;

  const { data: usuario, error: errorRol } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId)
    .maybeSingle();

  if (errorRol || usuario?.rol !== "profesor") {
    redirect("/inicio");
  }

  // 1. Obtener grupos del profesor.
  const { data: grupos, error: errorGrupos } = await supabase
    .from("grupos")
    .select("id_grupo, id_materia, periodo, horario, cupo_maximo")
    .eq("id_profesor", userId)
    .order("periodo", { ascending: false });

  if (errorGrupos) {
    console.error("Error cargando grupos:", errorGrupos.code);
    return (
      <main className="mx-auto max-w-7xl p-6">
        <h1 className="text-2xl font-semibold">Mis grupos</h1>
        <p className="mt-4 rounded-lg border p-4" role="alert">
          No se pudieron cargar tus grupos.
        </p>
      </main>
    );
  }

  const gruposLista = grupos ?? [];
  const idsGrupos = gruposLista.map((grupo) => grupo.id_grupo);

  // 2. Obtener materias.
  const { data: materias, error: errorMaterias } = await supabase
    .from("materias")
    .select("id_materia, nombre, clave");

  if (errorMaterias) {
    console.error("Error cargando materias:", errorMaterias.code);
  }

  // 3. Obtener inscripciones de los grupos del profesor.
  const { data: inscripciones, error: errorInscripciones } =
    idsGrupos.length > 0
      ? await supabase
          .from("inscripciones")
          .select("id_inscripcion, id_usuario, id_grupo")
          .in("id_grupo", idsGrupos)
      : { data: [], error: null };

  if (errorInscripciones) {
    console.error("Error cargando inscripciones:", errorInscripciones.code);
  }

  const inscripcionesLista = inscripciones ?? [];
  const idsUsuarios = [
    ...new Set(inscripcionesLista.map((item) => item.id_usuario)),
  ];
  const idsInscripciones = inscripcionesLista.map(
    (item) => item.id_inscripcion,
  );

  // 4. Obtener datos de los estudiantes.
  const { data: estudiantes, error: errorEstudiantes } =
    idsUsuarios.length > 0
      ? await supabase
          .from("estudiantes")
          .select("id_usuario, matricula, nombre_completo")
          .in("id_usuario", idsUsuarios)
      : { data: [], error: null };

  if (errorEstudiantes) {
    console.error("Error cargando estudiantes:", errorEstudiantes.code);
  }

  // 5. Obtener oportunidades de calificación.
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
  const idsOportunidades = oportunidadesLista.map(
    (item) => item.id_oportunidad,
  );

  // 6. Obtener calificaciones de los componentes.
  const { data: calificacionesComponentes, error: errorComponentes } =
    idsOportunidades.length > 0
      ? await supabase
          .from("calificaciones_componentes")
          .select(
            "id_oportunidad, tipo_componente, calificacion, actualizado_en",
          )
          .in("id_oportunidad", idsOportunidades)
      : { data: [], error: null };

  if (errorComponentes) {
    console.error("Error cargando calificaciones:", errorComponentes.code);
  }

  // 7. Obtener porcentajes de las configuraciones utilizadas.
  const idsConfiguraciones = [
    ...new Set(
      oportunidadesLista
        .map((item) => item.id_configuracion)
        .filter((id): id is string => id !== null),
    ),
  ];

  const { data: componentesConfiguracion, error: errorConfiguracion } =
    idsConfiguraciones.length > 0
      ? await supabase
          .from("componentes_configuracion")
          .select("id_configuracion, tipo_componente, porcentaje")
          .in("id_configuracion", idsConfiguraciones)
      : { data: [], error: null };

  if (errorConfiguracion) {
    console.error("Error cargando configuraciones:", errorConfiguracion.code);
  }

  if (
    errorInscripciones ||
    errorEstudiantes ||
    errorOportunidades ||
    errorComponentes ||
    errorConfiguracion
  ) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <h1 className="text-2xl font-semibold">Mis grupos</h1>
        <p className="mt-4 rounded-lg border p-4" role="alert">
          No se pudieron cargar todos los datos de evaluación. Verifica los
          permisos de lectura de Supabase.
        </p>
      </main>
    );
  }

  // 8. Crear mapas para relacionar los registros.
  const materiasPorId = new Map(
    (materias ?? []).map((materia) => [materia.id_materia, materia]),
  );

  const estudiantesPorId = new Map(
    (estudiantes ?? []).map((estudiante) => [
      estudiante.id_usuario,
      estudiante,
    ]),
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

  for (const calificacion of calificacionesComponentes ?? []) {
    const lista =
      calificacionesPorOportunidad.get(calificacion.id_oportunidad) ??
      new Map<string, number>();

    lista.set(calificacion.tipo_componente, Number(calificacion.calificacion));

    calificacionesPorOportunidad.set(calificacion.id_oportunidad, lista);
  }

  const porcentajesPorConfiguracion = new Map<string, Map<string, number>>();

  for (const componente of componentesConfiguracion ?? []) {
    const lista =
      porcentajesPorConfiguracion.get(componente.id_configuracion) ??
      new Map<string, number>();

    lista.set(componente.tipo_componente, Number(componente.porcentaje));

    porcentajesPorConfiguracion.set(componente.id_configuracion, lista);
  }

  const esExito =
    estado === "calificacion-guardada" || estado === "oportunidad-cerrada";

  return (
    <main className="mx-auto max-w-[1600px] space-y-6 p-6 sm:p-8">
      <header>
        <Link
          href="/inicio"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Volver al inicio
        </Link>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          Mis grupos
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Consulta a tus estudiantes, registra sus calificaciones y administra
          sus oportunidades.
        </p>
      </header>

      {estado && mensajes[estado] && (
        <p
          role="status"
          className={`rounded-lg border p-3 text-sm ${
            esExito
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {mensajes[estado]}
        </p>
      )}

      {gruposLista.length === 0 ? (
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="font-semibold">Todavía no tienes grupos asignados</h2>
          <p className="mt-2 text-sm text-gray-500">
            Cuando el administrador te asigne un grupo, aparecerá aquí.
          </p>
        </section>
      ) : (
        <div className="space-y-8">
          {gruposLista.map((grupo) => {
            const materia = materiasPorId.get(grupo.id_materia);

            const inscripcionesGrupo = inscripcionesLista.filter(
              (item) => item.id_grupo === grupo.id_grupo,
            );

            return (
              <section
                key={grupo.id_grupo}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white"
              >
                <div className="border-b border-gray-200 p-5">
                  <h2 className="text-lg font-semibold">
                    {materia
                      ? `${materia.clave} — ${materia.nombre}`
                      : "Materia no disponible"}
                  </h2>

                  <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500">
                    <p>Periodo: {grupo.periodo}</p>
                    <p>Horario: {grupo.horario}</p>
                    <p>
                      Inscritos: {inscripcionesGrupo.length} /{" "}
                      {grupo.cupo_maximo}
                    </p>
                  </div>
                </div>

                {inscripcionesGrupo.length === 0 ? (
                  <p className="p-5 text-sm text-gray-500">
                    No hay estudiantes inscritos en este grupo.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1450px] border-collapse text-left text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500">
                        <tr>
                          <th className="border-b px-4 py-3 font-medium">
                            Matrícula
                          </th>
                          <th className="border-b px-4 py-3 font-medium">
                            Estudiante
                          </th>
                          <th className="border-b px-4 py-3 font-medium">
                            OP.
                          </th>

                          {componentes.map((componente) => (
                            <th
                              key={componente.tipo}
                              className="border-b px-3 py-3 text-center font-medium"
                            >
                              {componente.nombre}
                            </th>
                          ))}

                          <th className="border-b px-4 py-3 text-center font-medium">
                            Final
                          </th>
                          <th className="border-b px-4 py-3 text-center font-medium">
                            Acción
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100">
                        {inscripcionesGrupo.map((inscripcion) => {
                          const estudiante = estudiantesPorId.get(
                            inscripcion.id_usuario,
                          );

                          const historial =
                            oportunidadesPorInscripcion.get(
                              inscripcion.id_inscripcion,
                            ) ?? [];

                          const oportunidadActual = historial.find(
                            (item) => item.estado === "en_curso",
                          );

                          const ultimaOportunidad =
                            historial.length > 0
                              ? historial[historial.length - 1]
                              : null;

                          const oportunidadVisible =
                            oportunidadActual ?? ultimaOportunidad;

                          const numeroOp =
                            oportunidadVisible?.numero_op ?? null;

                          const esOportunidadRegular =
                            numeroOp !== null && [1, 3, 5].includes(numeroOp);

                          const esExtraordinaria =
                            numeroOp !== null && [2, 4, 6].includes(numeroOp);

                          const calificaciones = oportunidadActual
                            ? (calificacionesPorOportunidad.get(
                                oportunidadActual.id_oportunidad,
                              ) ?? new Map<string, number>())
                            : new Map<string, number>();

                          const porcentajes =
                            oportunidadActual?.id_configuracion
                              ? (porcentajesPorConfiguracion.get(
                                  oportunidadActual.id_configuracion,
                                ) ?? new Map<string, number>())
                              : new Map<string, number>();

                          const ultimaCalificacion =
                            ultimaOportunidad?.calificacion_final ?? null;

                          const aprobado = historial.some(
                            (item) => item.estado === "aprobada",
                          );

                          const sinOportunidad = historial.length === 0;

                          return (
                            <tr
                              key={inscripcion.id_inscripcion}
                              className="align-middle hover:bg-gray-50/70"
                            >
                              <td className="px-4 py-3 font-medium text-gray-700">
                                {estudiante?.matricula ?? "—"}
                              </td>

                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-900">
                                  {estudiante?.nombre_completo ??
                                    "Estudiante no disponible"}
                                </div>
                                <div className="mt-1 text-xs text-gray-500">
                                  {aprobado
                                    ? "Aprobado"
                                    : oportunidadActual
                                      ? "En evaluación"
                                      : sinOportunidad
                                        ? "Sin oportunidad"
                                        : "Oportunidad concluida"}
                                </div>
                              </td>

                              <td className="px-4 py-3 font-semibold text-gray-700">
                                {numeroOp ? `OP${numeroOp}` : "—"}
                              </td>

                              {componentes.map((componente) => {
                                const tipo = componente.tipo;
                                const esExtra = tipo === "extraordinario";

                                const aplica =
                                  oportunidadActual !== null &&
                                  (esOportunidadRegular
                                    ? !esExtra &&
                                      (porcentajes.get(tipo) ?? 0) > 0
                                    : esExtraordinaria && esExtra);

                                const valor = calificaciones.get(tipo);

                                return (
                                  <td
                                    key={tipo}
                                    className="px-2 py-3 text-center"
                                  >
                                    {aplica && oportunidadActual ? (
                                      <form
                                        action={
                                          guardarCalificacionOportunidadAction
                                        }
                                        className="flex items-center justify-center gap-1"
                                      >
                                        <input
                                          type="hidden"
                                          name="id_oportunidad"
                                          value={
                                            oportunidadActual.id_oportunidad
                                          }
                                        />
                                        <input
                                          type="hidden"
                                          name="tipo_componente"
                                          value={tipo}
                                        />

                                        <input
                                          type="number"
                                          name="calificacion"
                                          min="0"
                                          max="100"
                                          step="0.01"
                                          required
                                          defaultValue={valor ?? ""}
                                          aria-label={`${componente.nombre} de ${estudiante?.nombre_completo ?? "estudiante"}`}
                                          className="w-[76px] rounded-md border border-gray-200 px-2 py-2 text-center text-sm outline-none focus:border-gray-500"
                                        />

                                        <button
                                          type="submit"
                                          aria-label={`Guardar ${componente.nombre}`}
                                          title="Guardar calificación"
                                          className="rounded-md border border-gray-200 px-2 py-2 text-gray-600 hover:bg-gray-100"
                                        >
                                          Guardar
                                        </button>
                                      </form>
                                    ) : (
                                      <span className="text-gray-300">
                                        {valor !== undefined
                                          ? formatoCalificacion(valor)
                                          : "—"}
                                      </span>
                                    )}
                                  </td>
                                );
                              })}

                              <td className="px-4 py-3 text-center font-semibold">
                                {aprobado || !oportunidadActual
                                  ? formatoCalificacion(ultimaCalificacion)
                                  : "—"}
                              </td>

                              <td className="px-4 py-3 text-center">
                                {oportunidadActual ? (
                                  <form
                                    action={cerrarOportunidadCalificacionAction}
                                  >
                                    <input
                                      type="hidden"
                                      name="id_oportunidad"
                                      value={oportunidadActual.id_oportunidad}
                                    />

                                    <button
                                      type="submit"
                                      className="whitespace-nowrap rounded-md border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
                                    >
                                      Cerrar OP{numeroOp}
                                    </button>
                                  </form>
                                ) : aprobado ? (
                                  <span className="text-xs font-medium text-green-700">
                                    Aprobado
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">
                                    Sin acción
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="border-t border-gray-200 bg-gray-50 px-5 py-3">
                  <p className="text-xs text-gray-500">
                    Las calificaciones se guardan individualmente. Al cerrar una
                    oportunidad se calcula la calificación final y, si es menor
                    a 70, se genera automáticamente la siguiente oportunidad.
                  </p>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
