import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { actualizarCalificacionAction } from "./actions";

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
      <main className="mx-auto max-w-5xl p-6 sm:p-8">
        <h1 className="text-2xl font-semibold">
          Administración de calificaciones
        </h1>
        <p className="mt-4 rounded-lg border p-4" role="alert">
          No se pudieron cargar las calificaciones. Verifica los permisos de
          lectura en Supabase e inténtalo nuevamente.
        </p>
        <Link
          href="/inicio"
          className="mt-4 inline-block text-blue-700 underline"
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

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6 sm:p-8">
      <header>
        <Link href="/inicio" className="text-sm text-blue-700 underline">
          ← Volver al inicio
        </Link>

        <h1 className="mt-4 text-3xl font-bold">
          Administración de calificaciones
        </h1>

        <p className="mt-2 text-gray-600">
          Consulta y corrige los registros de calificaciones. Los cambios
          respetan los permisos definidos en Supabase.
        </p>
      </header>

      {estado && mensajes[estado] && (
        <p
          role="status"
          className={`rounded-lg border p-3 ${
            estado === "actualizada"
              ? "border-green-300 bg-green-50 text-green-800"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {mensajes[estado]}
        </p>
      )}

      <section>
        <h2 className="mb-4 text-xl font-semibold">
          Registros de calificaciones ({calificaciones?.length ?? 0})
        </h2>

        {!calificaciones || calificaciones.length === 0 ? (
          <p className="rounded-xl border p-6 text-gray-600">
            Todavía no hay registros de calificaciones.
          </p>
        ) : (
          <div className="space-y-5">
            {calificaciones.map((calificacion) => {
              const inscripcion = inscripcionesPorId.get(
                calificacion.id_inscripcion,
              );
              const estudiante = inscripcion
                ? estudiantesPorId.get(inscripcion.id_usuario)
                : undefined;
              const grupo = inscripcion
                ? gruposPorId.get(inscripcion.id_grupo)
                : undefined;
              const materia = grupo
                ? materiasPorId.get(grupo.id_materia)
                : undefined;
              const profesor = grupo
                ? profesoresPorId.get(grupo.id_profesor)
                : undefined;

              return (
                <article
                  key={calificacion.id_calificacion}
                  className="rounded-xl border p-5"
                >
                  <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-sm text-gray-500">Estudiante</p>
                      <p className="font-medium">
                        {estudiante?.nombre_completo ?? "No disponible"}
                      </p>
                      <p className="text-sm text-gray-600">
                        Matrícula: {estudiante?.matricula ?? "No disponible"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Materia</p>
                      <p className="font-medium">
                        {materia
                          ? `${materia.clave} — ${materia.nombre}`
                          : "No disponible"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Profesor</p>
                      <p className="font-medium">
                        {profesor?.nombre_completo ?? "No disponible"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Grupo</p>
                      <p className="font-medium">
                        {grupo?.periodo ?? "Periodo no disponible"}
                      </p>
                      <p className="text-sm text-gray-600">
                        {grupo?.horario ?? "Horario no disponible"}
                      </p>
                    </div>
                  </div>

                  <form
                    action={actualizarCalificacionAction}
                    className="space-y-4"
                  >
                    <input
                      type="hidden"
                      name="id_calificacion"
                      value={calificacion.id_calificacion}
                    />

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label
                          htmlFor={`medio-${calificacion.id_calificacion}`}
                          className="mb-1 block text-sm font-medium"
                        >
                          Medio curso
                        </label>
                        <input
                          id={`medio-${calificacion.id_calificacion}`}
                          name="medio_curso"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          defaultValue={calificacion.medio_curso ?? ""}
                          className="w-full rounded-lg border p-3"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`ordinario-${calificacion.id_calificacion}`}
                          className="mb-1 block text-sm font-medium"
                        >
                          Ordinario
                        </label>
                        <input
                          id={`ordinario-${calificacion.id_calificacion}`}
                          name="ordinario"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          defaultValue={calificacion.ordinario ?? ""}
                          className="w-full rounded-lg border p-3"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`extra-${calificacion.id_calificacion}`}
                          className="mb-1 block text-sm font-medium"
                        >
                          Extraordinario
                        </label>
                        <input
                          id={`extra-${calificacion.id_calificacion}`}
                          name="extraordinario"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          defaultValue={calificacion.extraordinario ?? ""}
                          className="w-full rounded-lg border p-3"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`final-${calificacion.id_calificacion}`}
                          className="mb-1 block text-sm font-medium"
                        >
                          Calificación final
                        </label>
                        <input
                          id={`final-${calificacion.id_calificacion}`}
                          name="final"
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          defaultValue={calificacion.final ?? ""}
                          className="w-full rounded-lg border p-3"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-gray-500">
                        Última actualización:{" "}
                        {new Date(calificacion.actualizado_en).toLocaleString(
                          "es-MX",
                          {
                            dateStyle: "short",
                            timeStyle: "short",
                            timeZone: "America/Monterrey",
                          },
                        )}
                      </p>

                      <button
                        type="submit"
                        className="rounded-lg bg-blue-700 px-5 py-3 font-medium text-white hover:bg-blue-800"
                      >
                        Guardar cambios
                      </button>
                    </div>
                  </form>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
