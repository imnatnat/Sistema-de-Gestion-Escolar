import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { guardarCalificacionProfesorAction } from "./actions";

type PageProps = {
  searchParams: Promise<{ estado?: string }>;
};

const mensajes: Record<string, string> = {
  actualizada: "La calificación se guardó correctamente.",
  "solicitud-invalida": "La solicitud no es válida.",
  "datos-invalidos":
    "Las calificaciones deben estar entre 0 y 100. La final debe ser entera.",
  "sin-permiso": "No puedes modificar calificaciones de este grupo.",
  "no-actualizada": "No se pudo actualizar la calificación.",
  error: "Ocurrió un error. Inténtalo nuevamente.",
};

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

  const [
    { data: grupos, error: errorGrupos },
    { data: materias, error: errorMaterias },
    { data: inscripciones, error: errorInscripciones },
    { data: estudiantes, error: errorEstudiantes },
    { data: calificaciones, error: errorCalificaciones },
  ] = await Promise.all([
    supabase
      .from("grupos")
      .select("id_grupo, id_materia, periodo, horario, cupo_maximo")
      .eq("id_profesor", userId)
      .order("periodo", { ascending: false }),

    supabase.from("materias").select("id_materia, nombre, clave"),

    supabase
      .from("inscripciones")
      .select("id_inscripcion, id_usuario, id_grupo"),

    supabase
      .from("estudiantes")
      .select("id_usuario, matricula, nombre_completo"),

    supabase
      .from("calificaciones")
      .select(
        "id_calificacion, id_inscripcion, medio_curso, ordinario, extraordinario, final, actualizado_en",
      ),
  ]);

  if (
    errorGrupos ||
    errorMaterias ||
    errorInscripciones ||
    errorEstudiantes ||
    errorCalificaciones
  ) {
    console.error("Error cargando grupos del profesor:", {
      grupos: errorGrupos?.code,
      materias: errorMaterias?.code,
      inscripciones: errorInscripciones?.code,
      estudiantes: errorEstudiantes?.code,
      calificaciones: errorCalificaciones?.code,
    });

    return (
      <main className="mx-auto max-w-5xl p-6 sm:p-8">
        <h1 className="text-2xl font-semibold">Mis grupos</h1>
        <p className="mt-4 rounded-lg border p-4" role="alert">
          No se pudieron cargar los grupos o las calificaciones. Verifica los
          permisos de lectura de Supabase.
        </p>
        <Link href="/inicio" className="mt-4 inline-block underline">
          Volver al inicio
        </Link>
      </main>
    );
  }

  const materiasPorId = new Map(
    (materias ?? []).map((materia) => [materia.id_materia, materia]),
  );

  const estudiantesPorId = new Map(
    (estudiantes ?? []).map((estudiante) => [
      estudiante.id_usuario,
      estudiante,
    ]),
  );

  const calificacionesPorInscripcion = new Map(
    (calificaciones ?? []).map((calificacion) => [
      calificacion.id_inscripcion,
      calificacion,
    ]),
  );

  const gruposLista = grupos ?? [];
  const idsGrupos = new Set(gruposLista.map((grupo) => grupo.id_grupo));

  const inscripcionesProfesor = (inscripciones ?? []).filter((inscripcion) =>
    idsGrupos.has(inscripcion.id_grupo),
  );

  const inscripcionesPorGrupo = new Map<string, typeof inscripcionesProfesor>();

  for (const inscripcion of inscripcionesProfesor) {
    const lista = inscripcionesPorGrupo.get(inscripcion.id_grupo) ?? [];
    inscripcionesPorGrupo.set(inscripcion.id_grupo, [...lista, inscripcion]);
  }

  const esExito = estado === "actualizada";

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6 sm:p-8">
      <header>
        <Link href="/inicio" className="text-sm text-blue-700 underline">
          ← Volver al inicio
        </Link>

        <h1 className="mt-4 text-3xl font-bold">Mis grupos</h1>

        <p className="mt-2 text-gray-600">
          Consulta a tus estudiantes y captura o actualiza sus calificaciones.
        </p>
      </header>

      {estado && mensajes[estado] && (
        <p
          role="status"
          className={`rounded-lg border p-3 ${
            esExito
              ? "border-green-300 bg-green-50 text-green-800"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {mensajes[estado]}
        </p>
      )}

      {gruposLista.length === 0 ? (
        <section className="rounded-xl border p-6">
          <h2 className="font-semibold">Todavía no tienes grupos asignados</h2>
          <p className="mt-2 text-gray-600">
            Cuando el administrador te asigne un grupo, aparecerá aquí.
          </p>
        </section>
      ) : (
        <div className="space-y-6">
          {gruposLista.map((grupo) => {
            const materia = materiasPorId.get(grupo.id_materia);
            const listaInscripciones =
              inscripcionesPorGrupo.get(grupo.id_grupo) ?? [];

            return (
              <section
                key={grupo.id_grupo}
                className="space-y-4 rounded-xl border p-5 sm:p-6"
              >
                <header>
                  <h2 className="text-xl font-semibold">
                    {materia
                      ? `${materia.clave} — ${materia.nombre}`
                      : "Materia no disponible"}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
                    <p>Periodo: {grupo.periodo}</p>
                    <p>Horario: {grupo.horario}</p>
                    <p>
                      Inscritos: {listaInscripciones.length} /{" "}
                      {grupo.cupo_maximo}
                    </p>
                  </div>
                </header>

                {listaInscripciones.length === 0 ? (
                  <p className="rounded-lg border p-4 text-gray-600">
                    No hay estudiantes inscritos en este grupo.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {listaInscripciones.map((inscripcion) => {
                      const estudiante = estudiantesPorId.get(
                        inscripcion.id_usuario,
                      );
                      const calificacion = calificacionesPorInscripcion.get(
                        inscripcion.id_inscripcion,
                      );

                      return (
                        <article
                          key={inscripcion.id_inscripcion}
                          className="rounded-lg border p-4"
                        >
                          <div className="mb-4">
                            <h3 className="font-semibold">
                              {estudiante?.nombre_completo ??
                                "Estudiante no disponible"}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Matrícula:{" "}
                              {estudiante?.matricula ?? "No disponible"}
                            </p>
                          </div>

                          <form
                            action={guardarCalificacionProfesorAction}
                            className="space-y-4"
                          >
                            <input
                              type="hidden"
                              name="id_inscripcion"
                              value={inscripcion.id_inscripcion}
                            />

                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                              <div>
                                <label
                                  htmlFor={`medio-${inscripcion.id_inscripcion}`}
                                  className="mb-1 block text-sm font-medium"
                                >
                                  Medio curso
                                </label>
                                <input
                                  id={`medio-${inscripcion.id_inscripcion}`}
                                  name="medio_curso"
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  defaultValue={calificacion?.medio_curso ?? ""}
                                  className="w-full rounded-lg border p-3"
                                />
                              </div>

                              <div>
                                <label
                                  htmlFor={`ordinario-${inscripcion.id_inscripcion}`}
                                  className="mb-1 block text-sm font-medium"
                                >
                                  Ordinario
                                </label>
                                <input
                                  id={`ordinario-${inscripcion.id_inscripcion}`}
                                  name="ordinario"
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  defaultValue={calificacion?.ordinario ?? ""}
                                  className="w-full rounded-lg border p-3"
                                />
                              </div>

                              <div>
                                <label
                                  htmlFor={`extra-${inscripcion.id_inscripcion}`}
                                  className="mb-1 block text-sm font-medium"
                                >
                                  Extraordinario
                                </label>
                                <input
                                  id={`extra-${inscripcion.id_inscripcion}`}
                                  name="extraordinario"
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  defaultValue={
                                    calificacion?.extraordinario ?? ""
                                  }
                                  className="w-full rounded-lg border p-3"
                                />
                              </div>

                              <div>
                                <label
                                  htmlFor={`final-${inscripcion.id_inscripcion}`}
                                  className="mb-1 block text-sm font-medium"
                                >
                                  Calificación final
                                </label>
                                <input
                                  id={`final-${inscripcion.id_inscripcion}`}
                                  name="final"
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="1"
                                  defaultValue={calificacion?.final ?? ""}
                                  className="w-full rounded-lg border p-3"
                                />
                              </div>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <p className="text-xs text-gray-500">
                                {calificacion
                                  ? `Última actualización: ${new Date(
                                      calificacion.actualizado_en,
                                    ).toLocaleString("es-MX", {
                                      dateStyle: "short",
                                      timeStyle: "short",
                                      timeZone: "America/Monterrey",
                                    })}`
                                  : "Todavía no hay calificaciones registradas."}
                              </p>

                              <button
                                type="submit"
                                className="rounded-lg bg-blue-700 px-5 py-3 font-medium text-white hover:bg-blue-800"
                              >
                                Guardar calificaciones
                              </button>
                            </div>
                          </form>
                        </article>
                      );
                    })}
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
