import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";

type Inscripcion = {
  id_inscripcion: string;
  id_grupo: string;
};

type Grupo = {
  id_grupo: string;
  id_materia: string;
  periodo: string;
  horario: string;
};

type Materia = {
  id_materia: string;
  nombre: string;
  clave: string;
};

type Calificacion = {
  id_inscripcion: string;
  medio_curso: number | null;
  ordinario: number | null;
  extraordinario: number | null;
  final: number | null;
  actualizado_en: string | null;
};

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

  const { data: inscripciones, error: errorInscripciones } = await supabase
    .from("inscripciones")
    .select("id_inscripcion, id_grupo")
    .eq("id_usuario", userId);

  if (errorInscripciones) {
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

  const listaInscripciones = (inscripciones ?? []) as Inscripcion[];
  const idsInscripciones = listaInscripciones.map((i) => i.id_inscripcion);
  const idsGrupos = [...new Set(listaInscripciones.map((i) => i.id_grupo))];

  let grupos: Grupo[] = [];
  let materias: Materia[] = [];
  let calificaciones: Calificacion[] = [];

  if (idsGrupos.length > 0) {
    const { data, error } = await supabase
      .from("grupos")
      .select("id_grupo, id_materia, periodo, horario")
      .in("id_grupo", idsGrupos);

    if (error) {
      return (
        <main className="mx-auto w-full max-w-5xl p-8">
          No se pudieron cargar los grupos de tus materias.
        </main>
      );
    }

    grupos = (data ?? []) as Grupo[];

    const idsMaterias = [...new Set(grupos.map((g) => g.id_materia))];

    if (idsMaterias.length > 0) {
      const { data: datosMaterias, error: errorMaterias } = await supabase
        .from("materias")
        .select("id_materia, nombre, clave")
        .in("id_materia", idsMaterias);

      if (errorMaterias) {
        return (
          <main className="mx-auto w-full max-w-5xl p-8">
            No se pudieron cargar las materias.
          </main>
        );
      }

      materias = (datosMaterias ?? []) as Materia[];
    }
  }

  if (idsInscripciones.length > 0) {
    const { data, error } = await supabase
      .from("calificaciones")
      .select(
        "id_inscripcion, medio_curso, ordinario, extraordinario, final, actualizado_en",
      )
      .in("id_inscripcion", idsInscripciones);

    if (error) {
      return (
        <main className="mx-auto w-full max-w-5xl p-8">
          No se pudieron cargar tus calificaciones.
        </main>
      );
    }

    calificaciones = (data ?? []) as Calificacion[];
  }

  const grupoPorId = new Map(grupos.map((g) => [g.id_grupo, g]));
  const materiaPorId = new Map(materias.map((m) => [m.id_materia, m]));
  const calificacionPorInscripcion = new Map(
    calificaciones.map((c) => [c.id_inscripcion, c]),
  );

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-6 sm:p-8">
      <Link href="/inicio" className="text-sm underline">
        ← Volver al inicio
      </Link>

      <header className="mb-8 mt-6">
        <p className="text-sm text-gray-500">Sistema de Gestión Escolar</p>
        <h1 className="mt-2 text-3xl font-semibold">Mis calificaciones</h1>
        <p className="mt-2 text-gray-600">
          Consulta las calificaciones registradas para tus materias.
        </p>
      </header>

      {listaInscripciones.length === 0 ? (
        <section className="rounded-xl border p-6">
          <h2 className="font-semibold">
            Todavía no tienes materias inscritas
          </h2>
          <Link
            href="/estudiante/materias"
            className="mt-4 inline-block underline"
          >
            Consultar materias
          </Link>
        </section>
      ) : (
        <div className="space-y-4">
          {listaInscripciones.map((inscripcion) => {
            const grupo = grupoPorId.get(inscripcion.id_grupo);
            const materia = grupo
              ? materiaPorId.get(grupo.id_materia)
              : undefined;
            const nota = calificacionPorInscripcion.get(
              inscripcion.id_inscripcion,
            );

            const mostrarNota = (valor: number | null | undefined) =>
              valor === null || valor === undefined ? "Pendiente" : valor;

            return (
              <section
                key={inscripcion.id_inscripcion}
                className="rounded-xl border p-5"
              >
                <h2 className="text-lg font-semibold">
                  {materia?.nombre ?? "Materia no disponible"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Clave: {materia?.clave ?? "No disponible"}
                </p>
                <div className="mt-3 space-y-1 text-sm text-gray-600">
                  <p>Periodo: {grupo?.periodo ?? "No disponible"}</p>
                  <p>Horario: {grupo?.horario ?? "No disponible"}</p>
                </div>

                {!nota ? (
                  <p className="mt-4 rounded-md border p-3 text-sm">
                    Aún no se han registrado calificaciones para esta materia.
                  </p>
                ) : (
                  <>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border p-3">
                        <p className="text-sm text-gray-500">Medio curso</p>
                        <p className="mt-1 font-semibold">
                          {mostrarNota(nota.medio_curso)}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-sm text-gray-500">Ordinario</p>
                        <p className="mt-1 font-semibold">
                          {mostrarNota(nota.ordinario)}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-sm text-gray-500">Extraordinario</p>
                        <p className="mt-1 font-semibold">
                          {mostrarNota(nota.extraordinario)}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-sm text-gray-500">
                          Calificación final
                        </p>
                        <p className="mt-1 font-semibold">
                          {mostrarNota(nota.final)}
                        </p>
                      </div>
                    </div>

                    {nota.actualizado_en && (
                      <p className="mt-3 text-xs text-gray-500">
                        Última actualización:{" "}
                        {new Date(nota.actualizado_en).toLocaleString("es-MX", {
                          timeZone: "America/Monterrey",
                        })}
                      </p>
                    )}
                  </>
                )}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
