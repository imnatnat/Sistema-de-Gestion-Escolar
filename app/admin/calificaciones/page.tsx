import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { actualizarCalificacionAction } from "./actions";
import { Button } from "@/app/ui/button";
import { TextInput } from "@/app/ui/form-controls";
import { StatusMessage } from "@/app/ui/status-message";

type PageProps = {
  searchParams: Promise<{ estado?: string }>;
};

const mensajes: Record<string, string> = {
  actualizada: "La calificación se actualizó correctamente.",
  "solicitud-invalida": "La solicitud no es válida.",
  "datos-invalidos":
    "Revisa las calificaciones. Deben estar entre 0 y 100; la calificación final debe ser entera.",
  "no-encontrada": "El registro de calificación no existe.",
  "no-actualizada":
    "No se actualizó el registro. Verifica los permisos de la base de datos.",
  error: "No se pudo completar la operación. Inténtalo nuevamente.",
};

function formatearFecha(fecha: string | null | undefined) {
  if (!fecha) return "No disponible";

  return new Date(fecha).toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Monterrey",
  });
}

export default async function AdminCalificacionesPage({
  searchParams,
}: PageProps) {
  const { supabase, userId } = await requireUser();
  const { estado } = await searchParams;

  const { data: usuario, error: errorRol } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId)
    .maybeSingle();

  if (errorRol || usuario?.rol !== "administrador") {
    redirect("/inicio");
  }

  const [
    { data: calificaciones, error: errorCalificaciones },
    { data: inscripciones, error: errorInscripciones },
    { data: estudiantes, error: errorEstudiantes },
    { data: grupos, error: errorGrupos },
    { data: materias, error: errorMaterias },
    { data: profesores, error: errorProfesores },
  ] = await Promise.all([
    supabase
      .from("calificaciones")
      .select(
        "id_calificacion, id_inscripcion, medio_curso, ordinario, extraordinario, final, actualizado_en",
      )
      .order("actualizado_en", { ascending: false }),

    supabase
      .from("inscripciones")
      .select("id_inscripcion, id_usuario, id_grupo"),

    supabase
      .from("estudiantes")
      .select("id_usuario, matricula, nombre_completo"),

    supabase
      .from("grupos")
      .select("id_grupo, id_materia, id_profesor, periodo, horario"),

    supabase.from("materias").select("id_materia, nombre, clave"),

    supabase.from("profesores").select("id_usuario, nombre_completo"),
  ]);

  if (
    errorCalificaciones ||
    errorInscripciones ||
    errorEstudiantes ||
    errorGrupos ||
    errorMaterias ||
    errorProfesores
  ) {
    console.error("Error cargando calificaciones:", {
      calificaciones: errorCalificaciones?.code,
      inscripciones: errorInscripciones?.code,
      estudiantes: errorEstudiantes?.code,
      grupos: errorGrupos?.code,
      materias: errorMaterias?.code,
      profesores: errorProfesores?.code,
    });

    return (
      <main className="mx-auto max-w-7xl space-y-5 p-6 sm:p-8">
        <h1 className="text-2xl font-semibold text-[#252525]">
          Administración de calificaciones
        </h1>

        <StatusMessage type="error">
          No se pudieron cargar las calificaciones. Verifica los permisos de
          lectura en Supabase e inténtalo nuevamente.
        </StatusMessage>

        <Link
          href="/inicio"
          className="inline-block text-sm text-[#373737] underline"
        >
          Volver al inicio
        </Link>
      </main>
    );
  }

  const inscripcionesPorId = new Map(
    (inscripciones ?? []).map((inscripcion) => [
      inscripcion.id_inscripcion,
      inscripcion,
    ]),
  );

  const estudiantesPorId = new Map(
    (estudiantes ?? []).map((estudiante) => [
      estudiante.id_usuario,
      estudiante,
    ]),
  );

  const gruposPorId = new Map(
    (grupos ?? []).map((grupo) => [grupo.id_grupo, grupo]),
  );

  const materiasPorId = new Map(
    (materias ?? []).map((materia) => [materia.id_materia, materia]),
  );

  const profesoresPorId = new Map(
    (profesores ?? []).map((profesor) => [profesor.id_usuario, profesor]),
  );

  const registros = (calificaciones ?? []).map((calificacion) => {
    const inscripcion = inscripcionesPorId.get(calificacion.id_inscripcion);

    const estudiante = inscripcion
      ? estudiantesPorId.get(inscripcion.id_usuario)
      : undefined;

    const grupo = inscripcion
      ? gruposPorId.get(inscripcion.id_grupo)
      : undefined;

    const materia = grupo ? materiasPorId.get(grupo.id_materia) : undefined;

    const profesor = grupo ? profesoresPorId.get(grupo.id_profesor) : undefined;

    return {
      calificacion,
      estudiante,
      grupo,
      materia,
      profesor,
      grupoKey: grupo?.id_grupo ?? "sin-grupo",
    };
  });

  const registrosPorGrupo = new Map<string, typeof registros>();

  for (const registro of registros) {
    const existentes = registrosPorGrupo.get(registro.grupoKey) ?? [];

    existentes.push(registro);
    registrosPorGrupo.set(registro.grupoKey, existentes);
  }

  return (
    <main className="mx-auto max-w-[1500px] space-y-6 p-5 sm:p-8">
      <header className="space-y-2">
        <Link
          href="/inicio"
          className="text-sm text-[#787774] transition-colors hover:text-[#252525]"
        >
          ← Volver al inicio
        </Link>

        <div className="pt-2">
          <h1 className="text-3xl font-semibold tracking-tight text-[#252525]">
            Calificaciones
          </h1>

          <p className="mt-2 text-sm text-[#787774]">
            Consulta y edita las calificaciones de los estudiantes por grupo.
          </p>
        </div>
      </header>

      {estado && mensajes[estado] && (
        <StatusMessage type={estado === "actualizada" ? "success" : "error"}>
          {mensajes[estado]}
        </StatusMessage>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#252525]">
            Registros académicos
          </h2>
          <p className="mt-1 text-sm text-[#787774]">
            {registros.length} estudiantes con registro de calificación
          </p>
        </div>
      </div>

      {registros.length === 0 ? (
        <div className="rounded-lg border border-[#E9E9E7] bg-white px-6 py-12 text-center">
          <h3 className="font-medium text-[#373737]">
            No hay calificaciones registradas
          </h3>
          <p className="mt-2 text-sm text-[#787774]">
            Cuando existan registros, aparecerán organizados por grupo.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(registrosPorGrupo.entries()).map(
            ([grupoKey, registrosGrupo]) => {
              const primerRegistro = registrosGrupo[0];
              const grupo = primerRegistro.grupo;
              const materia = primerRegistro.materia;
              const profesor = primerRegistro.profesor;

              const ultimaActualizacion = registrosGrupo.reduce(
                (fechaMasReciente, registro) => {
                  const fecha = registro.calificacion.actualizado_en;

                  if (!fecha) return fechaMasReciente;

                  if (
                    !fechaMasReciente ||
                    new Date(fecha).getTime() >
                      new Date(fechaMasReciente).getTime()
                  ) {
                    return fecha;
                  }

                  return fechaMasReciente;
                },
                null as string | null,
              );

              return (
                <section
                  key={grupoKey}
                  className="overflow-hidden rounded-lg border border-[#E9E9E7] bg-white"
                >
                  <div className="border-b border-[#E9E9E7] bg-[#FAFAF9] p-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#999999]">
                          Registro académico
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-[#252525]">
                          {materia?.nombre ?? "Materia no disponible"}
                        </h3>
                      </div>

                      <span className="rounded-md border border-[#E5E5E3] bg-white px-3 py-1.5 text-xs font-medium text-[#666666]">
                        {registrosGrupo.length} estudiantes
                      </span>
                    </div>

                    <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                      <div>
                        <p className="text-xs text-[#999999]">Periodo</p>
                        <p className="mt-1 text-sm font-medium text-[#373737]">
                          {grupo?.periodo ?? "No disponible"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-[#999999]">Clave</p>
                        <p className="mt-1 text-sm font-medium text-[#373737]">
                          {materia?.clave ?? "No disponible"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-[#999999]">Grupo</p>
                        <p className="mt-1 text-sm font-medium text-[#373737]">
                          {grupo?.horario ?? "No disponible"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-[#999999]">Profesor</p>
                        <p className="mt-1 text-sm font-medium text-[#373737]">
                          {profesor?.nombre_completo ?? "No disponible"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-[#999999]">
                          Última actualización
                        </p>
                        <p className="mt-1 text-sm font-medium text-[#373737]">
                          {formatearFecha(ultimaActualizacion)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-b border-[#E9E9E7] px-5 py-3">
                    <h4 className="text-sm font-semibold text-[#373737]">
                      Calificaciones
                    </h4>
                    <p className="mt-1 text-xs text-[#999999]">
                      Puedes editar los valores directamente en la tabla.
                    </p>
                  </div>

                  <div className="w-full overflow-x-auto">
                    <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
                      <thead className="bg-[#F7F7F5]">
                        <tr className="border-b border-[#E9E9E7]">
                          <th className="px-4 py-3 text-xs font-semibold text-[#787774]">
                            Matrícula
                          </th>
                          <th className="px-4 py-3 text-xs font-semibold text-[#787774]">
                            Estudiante
                          </th>
                          <th className="w-32 px-3 py-3 text-center text-xs font-semibold text-[#787774]">
                            Medio curso
                          </th>
                          <th className="w-32 px-3 py-3 text-center text-xs font-semibold text-[#787774]">
                            Ordinario
                          </th>
                          <th className="w-32 px-3 py-3 text-center text-xs font-semibold text-[#787774]">
                            Extraordinario
                          </th>
                          <th className="w-28 px-3 py-3 text-center text-xs font-semibold text-[#787774]">
                            Final
                          </th>
                          <th className="w-40 px-3 py-3 text-center text-xs font-semibold text-[#787774]">
                            Acción
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-[#EEEEEC]">
                        {registrosGrupo.map((registro) => {
                          const calificacion = registro.calificacion;
                          const formId = `calificacion-${calificacion.id_calificacion}`;

                          return (
                            <tr
                              key={calificacion.id_calificacion}
                              className="transition-colors hover:bg-[#FAFAF9]"
                            >
                              <td className="whitespace-nowrap px-4 py-3 font-medium text-[#373737]">
                                {registro.estudiante?.matricula ??
                                  "No disponible"}
                              </td>

                              <td className="px-4 py-3 font-medium text-[#373737]">
                                {registro.estudiante?.nombre_completo ??
                                  "No disponible"}
                              </td>

                              <td className="px-3 py-2">
                                <TextInput
                                  form={formId}
                                  aria-label={`Medio curso de ${registro.estudiante?.nombre_completo ?? "estudiante"}`}
                                  name="medio_curso"
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  defaultValue={calificacion.medio_curso ?? ""}
                                  className="min-w-20 text-center tabular-nums"
                                />
                              </td>

                              <td className="px-3 py-2">
                                <TextInput
                                  form={formId}
                                  aria-label={`Ordinario de ${registro.estudiante?.nombre_completo ?? "estudiante"}`}
                                  name="ordinario"
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  defaultValue={calificacion.ordinario ?? ""}
                                  className="min-w-20 text-center tabular-nums"
                                />
                              </td>

                              <td className="px-3 py-2">
                                <TextInput
                                  form={formId}
                                  aria-label={`Extraordinario de ${registro.estudiante?.nombre_completo ?? "estudiante"}`}
                                  name="extraordinario"
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  defaultValue={
                                    calificacion.extraordinario ?? ""
                                  }
                                  className="min-w-20 text-center tabular-nums"
                                />
                              </td>

                              <td className="px-3 py-2">
                                <TextInput
                                  form={formId}
                                  aria-label={`Calificación final de ${registro.estudiante?.nombre_completo ?? "estudiante"}`}
                                  name="final"
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="1"
                                  defaultValue={calificacion.final ?? ""}
                                  className="min-w-20 text-center font-semibold tabular-nums"
                                />
                              </td>

                              <td className="px-3 py-2">
                                <form
                                  id={formId}
                                  action={actualizarCalificacionAction}
                                  className="flex justify-center"
                                >
                                  <input
                                    type="hidden"
                                    name="id_calificacion"
                                    value={calificacion.id_calificacion}
                                  />

                                  <Button
                                    type="submit"
                                    className="whitespace-nowrap"
                                  >
                                    Guardar
                                  </Button>
                                </form>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="border-t border-[#E9E9E7] bg-[#FAFAF9] px-5 py-3">
                    <p className="text-xs text-[#999999]">
                      Los campos vacíos se guardan sin calificación. La
                      calificación final debe ser entera.
                    </p>
                  </div>
                </section>
              );
            },
          )}
        </div>
      )}
    </main>
  );
}
