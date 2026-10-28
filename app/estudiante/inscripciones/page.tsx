import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { cancelarInscripcionAction } from "../materias/actions";

type SearchParams = Promise<{
  estado?: string;
}>;

type Inscripcion = {
  id_inscripcion: string;
  id_usuario: string;
  id_grupo: string;
  fecha_inscripcion: string;
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
  creditos: number;
  semestre: number | null;
  horas: number;
};

type Profesor = {
  id_usuario: string;
  nombre_completo: string;
  especialidad: string | null;
};

type Calificacion = {
  id_calificacion: string;
  id_inscripcion: string;
  medio_curso: number | null;
  ordinario: number | null;
  extraordinario: number | null;
  final: number | null;
};

function mostrarCalificacion(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? "Pendiente" : String(valor);
}

function mensajeEstado(estado?: string): string | null {
  switch (estado) {
    case "cancelada":
      return "La inscripción se canceló correctamente.";
    case "error":
      return "No fue posible cancelar la inscripción. Puede tener una calificación registrada o no cumplir con los permisos necesarios.";
    case "sin_cupo":
      return "No hay cupo disponible para realizar la inscripción.";
    case "duplicada":
      return "Ya existe una inscripción para este grupo.";
    default:
      return null;
  }
}

export default async function InscripcionesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { supabase, userId } = await requireUser();
  const params = await searchParams;

  const { data: usuario, error: errorUsuario } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId)
    .maybeSingle();

  if (errorUsuario || usuario?.rol !== "estudiante") {
    redirect("/inicio");
  }

  const { data: estudiante, error: errorEstudiante } = await supabase
    .from("estudiantes")
    .select("aprobado")
    .eq("id_usuario", userId)
    .maybeSingle();

  if (errorEstudiante || !estudiante) {
    redirect("/inicio");
  }

  if (!estudiante.aprobado) {
    redirect("/pendiente-aprobacion");
  }

  const { data: inscripcionesData, error: errorInscripciones } = await supabase
    .from("inscripciones")
    .select("id_inscripcion, id_usuario, id_grupo, fecha_inscripcion")
    .eq("id_usuario", userId)
    .order("fecha_inscripcion", { ascending: false });

  if (errorInscripciones) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold">Mis inscripciones</h1>
        <p className="mt-4 text-red-700">
          No fue posible cargar tus inscripciones. Intenta de nuevo más tarde.
        </p>
        <Link
          href="/estudiante/materias"
          className="mt-4 inline-block text-blue-700 underline"
        >
          Ver materias y grupos
        </Link>
      </main>
    );
  }

  const inscripciones = (inscripcionesData ?? []) as Inscripcion[];
  const grupoIds = [...new Set(inscripciones.map((i) => i.id_grupo))];
  const inscripcionIds = inscripciones.map((i) => i.id_inscripcion);

  let grupos: Grupo[] = [];
  let materias: Materia[] = [];
  let profesores: Profesor[] = [];
  let calificaciones: Calificacion[] = [];

  if (grupoIds.length > 0) {
    const { data: gruposData, error: errorGrupos } = await supabase
      .from("grupos")
      .select(
        "id_grupo, id_materia, id_profesor, periodo, horario, cupo_maximo",
      )
      .in("id_grupo", grupoIds);

    if (errorGrupos) {
      return (
        <main className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold">Mis inscripciones</h1>
          <p className="mt-4 text-red-700">
            No fue posible cargar los datos de tus grupos.
          </p>
        </main>
      );
    }

    grupos = (gruposData ?? []) as Grupo[];

    const materiaIds = [...new Set(grupos.map((grupo) => grupo.id_materia))];
    const profesorIds = [...new Set(grupos.map((grupo) => grupo.id_profesor))];

    if (materiaIds.length > 0) {
      const { data: materiasData } = await supabase
        .from("materias")
        .select("id_materia, nombre, clave, creditos, semestre, horas")
        .in("id_materia", materiaIds);

      materias = (materiasData ?? []) as Materia[];
    }

    if (profesorIds.length > 0) {
      const { data: profesoresData } = await supabase
        .from("profesores")
        .select("id_usuario, nombre_completo, especialidad")
        .in("id_usuario", profesorIds);

      profesores = (profesoresData ?? []) as Profesor[];
    }

    const { data: calificacionesData } = await supabase
      .from("calificaciones")
      .select(
        "id_calificacion, id_inscripcion, medio_curso, ordinario, extraordinario, final",
      )
      .in("id_inscripcion", inscripcionIds);

    calificaciones = (calificacionesData ?? []) as Calificacion[];
  }

  const gruposPorId = new Map(grupos.map((grupo) => [grupo.id_grupo, grupo]));

  const materiasPorId = new Map(
    materias.map((materia) => [materia.id_materia, materia]),
  );

  const profesoresPorId = new Map(
    profesores.map((profesor) => [profesor.id_usuario, profesor]),
  );

  const calificacionesPorInscripcion = new Map(
    calificaciones.map((calificacion) => [
      calificacion.id_inscripcion,
      calificacion,
    ]),
  );

  const aviso = mensajeEstado(params.estado);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mis inscripciones</h1>
          <p className="mt-2 text-gray-600">
            Consulta los grupos en los que estás inscrito y las calificaciones
            que ya se hayan registrado.
          </p>
        </div>

        <Link
          href="/estudiante/materias"
          className="inline-flex w-fit rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
        >
          Ver materias y grupos
        </Link>
      </div>

      {aviso && (
        <div
          role="status"
          className={`mt-6 rounded-lg border p-4 ${
            params.estado === "cancelada"
              ? "border-green-300 bg-green-50 text-green-800"
              : "border-amber-300 bg-amber-50 text-amber-900"
          }`}
        >
          {aviso}
        </div>
      )}

      {inscripciones.length === 0 ? (
        <section className="mt-8 rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold">Aún no tienes inscripciones</h2>
          <p className="mt-2 text-gray-600">
            Consulta las materias disponibles para encontrar un grupo e
            inscribirte.
          </p>
          <Link
            href="/estudiante/materias"
            className="mt-4 inline-block rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
          >
            Explorar grupos
          </Link>
        </section>
      ) : (
        <section className="mt-8 space-y-5">
          <p className="text-sm text-gray-600">
            Total de inscripciones: {inscripciones.length}
          </p>

          {inscripciones.map((inscripcion) => {
            const grupo = gruposPorId.get(inscripcion.id_grupo);
            const materia = grupo
              ? materiasPorId.get(grupo.id_materia)
              : undefined;
            const profesor = grupo
              ? profesoresPorId.get(grupo.id_profesor)
              : undefined;
            const calificacion = calificacionesPorInscripcion.get(
              inscripcion.id_inscripcion,
            );

            const tieneCalificacion = Boolean(calificacion);

            return (
              <article
                key={inscripcion.id_inscripcion}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {materia?.nombre ?? "Materia no disponible"}
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Clave: {materia?.clave ?? "No disponible"}
                    </p>
                  </div>

                  <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-800">
                    {grupo?.periodo ?? "Periodo no disponible"}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-gray-500">Profesor</p>
                    <p className="font-medium">
                      {profesor?.nombre_completo ?? "No disponible"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Horario</p>
                    <p className="font-medium">
                      {grupo?.horario ?? "No disponible"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Créditos</p>
                    <p className="font-medium">
                      {materia?.creditos ?? "No disponible"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">
                      Semestre de la materia
                    </p>
                    <p className="font-medium">
                      {materia?.semestre ?? "No especificado"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">
                      Fecha de inscripción
                    </p>
                    <p className="font-medium">
                      {new Date(
                        inscripcion.fecha_inscripcion,
                      ).toLocaleDateString("es-MX", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-lg bg-gray-50 p-4">
                  <h3 className="font-semibold">Calificaciones</h3>

                  {!calificacion ? (
                    <p className="mt-2 text-sm text-gray-600">
                      Todavía no hay calificaciones registradas.
                    </p>
                  ) : (
                    <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div>
                        <p className="text-sm text-gray-500">Medio curso</p>
                        <p className="font-semibold">
                          {mostrarCalificacion(calificacion.medio_curso)}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500">Ordinario</p>
                        <p className="font-semibold">
                          {mostrarCalificacion(calificacion.ordinario)}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500">Extraordinario</p>
                        <p className="font-semibold">
                          {mostrarCalificacion(calificacion.extraordinario)}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500">Final</p>
                        <p className="font-semibold">
                          {mostrarCalificacion(calificacion.final)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-600">
                    {tieneCalificacion
                      ? "No puedes cancelar una inscripción que ya tiene un registro de calificación."
                      : "Puedes cancelar esta inscripción mientras no tenga calificación registrada."}
                  </p>

                  {!tieneCalificacion && (
                    <form action={cancelarInscripcionAction}>
                      <input
                        type="hidden"
                        name="id_inscripcion"
                        value={inscripcion.id_inscripcion}
                      />
                      <button
                        type="submit"
                        className="rounded-lg border border-red-300 px-4 py-2 font-medium text-red-700 hover:bg-red-50"
                      >
                        Cancelar inscripción
                      </button>
                    </form>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
