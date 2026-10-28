import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { eliminarInscripcionAction } from "./actions";

type PageProps = {
  searchParams: Promise<{ estado?: string }>;
};

const mensajes: Record<string, string> = {
  eliminada: "La inscripción se eliminó correctamente.",
  "tiene-calificacion":
    "No se puede eliminar esta inscripción porque tiene calificaciones asociadas.",
  "no-encontrada": "La inscripción no existe o ya fue eliminada.",
  "solicitud-invalida": "La solicitud no es válida.",
  error: "No se pudo completar la operación. Inténtalo nuevamente.",
};

export default async function AdminInscripcionesPage({
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
    { data: inscripciones, error: errorInscripciones },
    { data: estudiantes, error: errorEstudiantes },
    { data: grupos, error: errorGrupos },
    { data: materias, error: errorMaterias },
    { data: profesores, error: errorProfesores },
    { data: calificaciones, error: errorCalificaciones },
  ] = await Promise.all([
    supabase
      .from("inscripciones")
      .select("id_inscripcion, id_usuario, id_grupo, fecha_inscripcion")
      .order("fecha_inscripcion", { ascending: false }),

    supabase
      .from("estudiantes")
      .select("id_usuario, matricula, nombre_completo"),

    supabase
      .from("grupos")
      .select("id_grupo, id_materia, id_profesor, periodo, horario"),

    supabase.from("materias").select("id_materia, nombre, clave"),

    supabase.from("profesores").select("id_usuario, nombre_completo"),

    supabase.from("calificaciones").select("id_inscripcion"),
  ]);

  if (
    errorInscripciones ||
    errorEstudiantes ||
    errorGrupos ||
    errorMaterias ||
    errorProfesores ||
    errorCalificaciones
  ) {
    console.error("Error cargando inscripciones:", {
      inscripciones: errorInscripciones?.code,
      estudiantes: errorEstudiantes?.code,
      grupos: errorGrupos?.code,
      materias: errorMaterias?.code,
      profesores: errorProfesores?.code,
      calificaciones: errorCalificaciones?.code,
    });

    return (
      <main className="mx-auto max-w-5xl p-6 sm:p-8">
        <h1 className="text-2xl font-semibold">
          Administración de inscripciones
        </h1>
        <p className="mt-4 rounded-lg border p-4" role="alert">
          No se pudieron cargar las inscripciones. Verifica los permisos de
          lectura de las tablas en Supabase e inténtalo nuevamente.
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

  const inscripcionesConCalificacion = new Set(
    (calificaciones ?? []).map((calificacion) => calificacion.id_inscripcion),
  );

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6 sm:p-8">
      <header>
        <Link href="/inicio" className="text-sm text-blue-700 underline">
          ← Volver al inicio
        </Link>

        <h1 className="mt-4 text-3xl font-bold">
          Administración de inscripciones
        </h1>

        <p className="mt-2 text-gray-600">
          Consulta las inscripciones registradas. Solo se pueden eliminar las
          que no tengan calificaciones asociadas.
        </p>
      </header>

      {estado && mensajes[estado] && (
        <p
          role="status"
          className={`rounded-lg border p-3 ${
            estado === "eliminada"
              ? "border-green-300 bg-green-50 text-green-800"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {mensajes[estado]}
        </p>
      )}

      <section>
        <h2 className="mb-4 text-xl font-semibold">
          Inscripciones registradas ({inscripciones?.length ?? 0})
        </h2>

        {!inscripciones || inscripciones.length === 0 ? (
          <p className="rounded-xl border p-6 text-gray-600">
            Todavía no hay inscripciones registradas.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3">Estudiante</th>
                  <th className="p-3">Matrícula</th>
                  <th className="p-3">Materia</th>
                  <th className="p-3">Profesor</th>
                  <th className="p-3">Periodo</th>
                  <th className="p-3">Horario</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Acción</th>
                </tr>
              </thead>

              <tbody>
                {inscripciones.map((inscripcion) => {
                  const estudiante = estudiantesPorId.get(
                    inscripcion.id_usuario,
                  );
                  const grupo = gruposPorId.get(inscripcion.id_grupo);
                  const materia = grupo
                    ? materiasPorId.get(grupo.id_materia)
                    : undefined;
                  const profesor = grupo
                    ? profesoresPorId.get(grupo.id_profesor)
                    : undefined;
                  const tieneCalificacion = inscripcionesConCalificacion.has(
                    inscripcion.id_inscripcion,
                  );

                  return (
                    <tr
                      key={inscripcion.id_inscripcion}
                      className="border-t align-top"
                    >
                      <td className="p-3">
                        {estudiante?.nombre_completo ?? "No disponible"}
                      </td>
                      <td className="p-3">
                        {estudiante?.matricula ?? "No disponible"}
                      </td>
                      <td className="p-3">
                        {materia
                          ? `${materia.clave} — ${materia.nombre}`
                          : "No disponible"}
                      </td>
                      <td className="p-3">
                        {profesor?.nombre_completo ?? "No disponible"}
                      </td>
                      <td className="p-3">
                        {grupo?.periodo ?? "No disponible"}
                      </td>
                      <td className="p-3">
                        {grupo?.horario ?? "No disponible"}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {new Date(inscripcion.fecha_inscripcion).toLocaleString(
                          "es-MX",
                          {
                            dateStyle: "short",
                            timeStyle: "short",
                            timeZone: "America/Monterrey",
                          },
                        )}
                      </td>
                      <td className="p-3">
                        {tieneCalificacion ? (
                          <span className="text-gray-600">
                            Tiene calificaciones
                          </span>
                        ) : (
                          <form action={eliminarInscripcionAction}>
                            <input
                              type="hidden"
                              name="id_inscripcion"
                              value={inscripcion.id_inscripcion}
                            />
                            <button
                              type="submit"
                              className="rounded-lg border border-red-300 px-3 py-2 font-medium text-red-700 hover:bg-red-50"
                            >
                              Eliminar
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
