import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import {
  crearInscripcionAdminAction,
  eliminarInscripcionAction,
} from "./actions";

type PageProps = {
  searchParams: Promise<{ estado?: string }>;
};

const mensajes: Record<string, string> = {
  creada: "La inscripción se creó correctamente.",
  eliminada: "La inscripción se eliminó correctamente.",
  duplicada: "Este estudiante ya está inscrito en ese grupo.",
  "sin-cupo": "El grupo ya alcanzó su cupo máximo.",
  "estudiante-no-aprobado":
    "El estudiante todavía no tiene su cuenta aprobada.",
  "estudiante-no-encontrado": "No se encontró al estudiante seleccionado.",
  "grupo-no-encontrado": "No se encontró el grupo seleccionado.",
  "tiene-calificacion":
    "No se puede eliminar esta inscripción porque tiene calificaciones asociadas.",
  "no-encontrada": "La inscripción no existe o ya fue eliminada.",
  "solicitud-invalida": "La solicitud no es válida.",
  "no-autorizado": "No tienes permiso para realizar esta operación.",
  error: "No se pudo completar la operación. Inténtalo nuevamente.",
};

type Estudiante = {
  id_usuario: string;
  matricula: string;
  nombre_completo: string;
  aprobado: boolean;
};

type Grupo = {
  id_grupo: string;
  id_materia: string;
  id_profesor: string;
  periodo: string;
  horario: string;
  cupo_maximo: number;
};

type Materia = {
  id_materia: string;
  nombre: string;
  clave: string;
};

type Profesor = {
  id_usuario: string;
  nombre_completo: string;
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
      .select("id_usuario, matricula, nombre_completo, aprobado")
      .order("nombre_completo"),
    supabase
      .from("grupos")
      .select(
        "id_grupo, id_materia, id_profesor, periodo, horario, cupo_maximo",
      ),
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
      <main className="mx-auto max-w-5xl space-y-4 p-6 sm:p-8">
        <h1 className="text-2xl font-bold">Administración de inscripciones</h1>
        <p role="alert" className="rounded-lg border p-4">
          No se pudieron cargar los datos. Verifica los permisos de lectura en
          Supabase e inténtalo nuevamente.
        </p>
        <Link href="/inicio" className="text-blue-700 underline">
          Volver al inicio
        </Link>
      </main>
    );
  }

  const listaEstudiantes = (estudiantes ?? []) as Estudiante[];
  const listaGrupos = (grupos ?? []) as Grupo[];
  const listaMaterias = (materias ?? []) as Materia[];
  const listaProfesores = (profesores ?? []) as Profesor[];

  const estudiantesPorId = new Map(
    listaEstudiantes.map((estudiante) => [estudiante.id_usuario, estudiante]),
  );

  const gruposPorId = new Map(
    listaGrupos.map((grupo) => [grupo.id_grupo, grupo]),
  );

  const materiasPorId = new Map(
    listaMaterias.map((materia) => [materia.id_materia, materia]),
  );

  const profesoresPorId = new Map(
    listaProfesores.map((profesor) => [profesor.id_usuario, profesor]),
  );

  const inscripcionesConCalificacion = new Set(
    (calificaciones ?? []).map((calificacion) => calificacion.id_inscripcion),
  );

  const gruposDisponibles = listaGrupos.filter(
    (grupo) => Number.isInteger(grupo.cupo_maximo) && grupo.cupo_maximo > 0,
  );

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-6 sm:p-8">
      <header>
        <Link href="/inicio" className="text-sm text-blue-700 underline">
          ← Volver al inicio
        </Link>
        <h1 className="mt-4 text-3xl font-bold">
          Administración de inscripciones
        </h1>
        <p className="mt-2 text-gray-600">
          Administra las inscripciones de los estudiantes. Los grupos no pueden
          superar su cupo máximo y no se pueden eliminar inscripciones con
          calificaciones asociadas.
        </p>
      </header>

      {estado && mensajes[estado] && (
        <p
          role="status"
          className={`rounded-lg border p-3 ${
            estado === "creada" || estado === "eliminada"
              ? "border-green-300 bg-green-50 text-green-800"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {mensajes[estado]}
        </p>
      )}

      <section className="rounded-xl border p-5">
        <h2 className="text-xl font-semibold">
          Inscribir estudiante en un grupo
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Solo aparecen estudiantes aprobados. La disponibilidad del grupo se
          vuelve a comprobar en Supabase al enviar el formulario.
        </p>

        {listaEstudiantes.filter((e) => e.aprobado).length === 0 ||
        gruposDisponibles.length === 0 ? (
          <p className="mt-4 rounded-lg bg-gray-50 p-4 text-gray-700">
            Se necesita al menos un estudiante aprobado y un grupo con cupo
            configurado para crear una inscripción.
          </p>
        ) : (
          <form
            action={crearInscripcionAdminAction}
            className="mt-5 grid gap-4 md:grid-cols-3"
          >
            <div>
              <label
                htmlFor="id_usuario"
                className="mb-1 block text-sm font-medium"
              >
                Estudiante
              </label>
              <select
                id="id_usuario"
                name="id_usuario"
                required
                className="w-full rounded-lg border border-gray-300 bg-white p-3"
                defaultValue=""
              >
                <option value="" disabled>
                  Selecciona un estudiante
                </option>
                {listaEstudiantes
                  .filter((estudiante) => estudiante.aprobado)
                  .map((estudiante) => (
                    <option
                      key={estudiante.id_usuario}
                      value={estudiante.id_usuario}
                    >
                      {estudiante.matricula} — {estudiante.nombre_completo}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="id_grupo"
                className="mb-1 block text-sm font-medium"
              >
                Grupo
              </label>
              <select
                id="id_grupo"
                name="id_grupo"
                required
                defaultValue=""
                className="w-full rounded-lg border border-gray-300 bg-white p-3"
              >
                <option value="" disabled>
                  Selecciona un grupo
                </option>
                {gruposDisponibles.map((grupo) => {
                  const materia = materiasPorId.get(grupo.id_materia);
                  const profesor = profesoresPorId.get(grupo.id_profesor);

                  return (
                    <option key={grupo.id_grupo} value={grupo.id_grupo}>
                      {materia
                        ? `${materia.clave} — ${materia.nombre}`
                        : "Materia no disponible"}{" "}
                      | {grupo.periodo} | {grupo.horario} | Cupo:{" "}
                      {grupo.cupo_maximo}
                      {profesor ? ` | ${profesor.nombre_completo}` : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-lg bg-blue-700 px-4 py-3 font-medium text-white hover:bg-blue-800"
              >
                Crear inscripción
              </button>
            </div>
          </form>
        )}
      </section>

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
                      <td className="whitespace-nowrap p-3">
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
