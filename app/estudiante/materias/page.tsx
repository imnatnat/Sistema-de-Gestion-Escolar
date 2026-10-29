import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { inscribirseGrupoAction } from "./actions";

type Materia = {
  id_materia: string;
  nombre: string;
  clave: string;
  creditos: number;
  semestre: number | null;
  horas: number;
};

type Grupo = {
  id_grupo: string;
  id_materia: string;
  id_profesor: string;
  periodo: string;
  horario: string;
  cupo_maximo: number;
};

type Inscripcion = {
  id_grupo: string;
};

const mensajes: Record<string, string> = {
  "inscripcion-exitosa": "Tu inscripción se registró correctamente.",
  "ya-inscrito": "Ya estás inscrito en este grupo.",
  "grupo-lleno": "El grupo ya no tiene lugares disponibles.",
  "grupo-no-disponible": "El grupo no está disponible.",
  "grupo-invalido": "El grupo seleccionado no es válido.",
  "cupo-invalido": "El grupo tiene una configuración de cupo inválida.",
  "error-cupo": "No se pudo verificar el cupo. Inténtalo más tarde.",
  "error-consulta": "No se pudo verificar tu inscripción.",
  "error-estudiante": "No se pudo verificar tu información.",
  "error-inscripcion": "No se pudo completar la inscripción.",
  "sin-permiso": "No tienes permiso para realizar esta acción.",

  // Estados devueltos por la acción de inscripción.
  inscrito: "Tu inscripción se registró correctamente.",
  duplicada: "Ya estás inscrito en este grupo.",
  sin_cupo: "El grupo ya no tiene lugares disponibles.",
  no_autorizado: "No tienes permiso para realizar esta acción.",
  error: "No se pudo completar la inscripción. Inténtalo nuevamente.",
};

export default async function MateriasPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const { supabase, userId } = await requireUser();

  const { data: usuario, error: usuarioError } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId)
    .maybeSingle();

  if (usuarioError || usuario?.rol !== "estudiante") {
    redirect("/inicio");
  }

  const { data: estudiante, error: estudianteError } = await supabase
    .from("estudiantes")
    .select("aprobado")
    .eq("id_usuario", userId)
    .maybeSingle();

  if (estudianteError) {
    return (
      <main className="mx-auto w-full max-w-5xl p-8">
        <p>No se pudo verificar tu aprobación. Inténtalo nuevamente.</p>
      </main>
    );
  }

  if (!estudiante?.aprobado) {
    redirect("/pendiente-aprobacion");
  }

  // Consultar las inscripciones del estudiante actual.
  const { data: misInscripciones, error: inscripcionesError } = await supabase
    .from("inscripciones")
    .select("id_grupo")
    .eq("id_usuario", userId);

  if (inscripcionesError) {
    return (
      <main className="mx-auto w-full max-w-5xl p-8">
        <Link href="/inicio" className="text-sm underline">
          ← Volver al inicio
        </Link>
        <h1 className="mt-6 text-2xl font-semibold">Materias disponibles</h1>
        <p className="mt-4">
          No se pudieron consultar tus inscripciones. Inténtalo nuevamente.
        </p>
      </main>
    );
  }

  const gruposInscritos = new Set(
    ((misInscripciones ?? []) as Inscripcion[]).map(
      (inscripcion) => inscripcion.id_grupo,
    ),
  );

  // Consultar el catálogo de materias.
  const { data: materias, error: materiasError } = await supabase
    .from("materias")
    .select("id_materia, nombre, clave, creditos, semestre, horas")
    .order("semestre")
    .order("nombre");

  if (materiasError) {
    return (
      <main className="mx-auto w-full max-w-5xl p-8">
        <Link href="/inicio" className="text-sm underline">
          ← Volver al inicio
        </Link>
        <h1 className="mt-6 text-2xl font-semibold">Materias disponibles</h1>
        <p className="mt-4">
          No se pudo cargar el catálogo. Verifica los permisos de lectura.
        </p>
      </main>
    );
  }

  const listaMaterias = (materias ?? []) as Materia[];
  const idsMaterias = listaMaterias.map((materia) => materia.id_materia);

  let grupos: Grupo[] = [];

  if (idsMaterias.length > 0) {
    const { data, error } = await supabase
      .from("grupos")
      .select(
        "id_grupo, id_materia, id_profesor, periodo, horario, cupo_maximo",
      )
      .in("id_materia", idsMaterias)
      .order("periodo");

    if (error) {
      return (
        <main className="mx-auto w-full max-w-5xl p-8">
          <Link href="/inicio" className="text-sm underline">
            ← Volver al inicio
          </Link>
          <h1 className="mt-6 text-2xl font-semibold">Materias disponibles</h1>
          <p className="mt-4">
            No se pudieron cargar los grupos. Verifica los permisos de lectura.
          </p>
        </main>
      );
    }

    grupos = (data ?? []) as Grupo[];
  }

  // Obtener los nombres de los profesores.
  const idsProfesores = [...new Set(grupos.map((grupo) => grupo.id_profesor))];

  const profesoresPorId = new Map<string, string>();

  if (idsProfesores.length > 0) {
    const { data: profesores, error: profesoresError } = await supabase
      .from("profesores")
      .select("id_usuario, nombre_completo")
      .in("id_usuario", idsProfesores);

    if (profesoresError) {
      return (
        <main className="mx-auto w-full max-w-5xl p-8">
          <Link href="/inicio" className="text-sm underline">
            ← Volver al inicio
          </Link>
          <h1 className="mt-6 text-2xl font-semibold">Materias disponibles</h1>
          <p className="mt-4">
            No se pudieron cargar los nombres de los profesores.
          </p>
        </main>
      );
    }

    for (const profesor of profesores ?? []) {
      profesoresPorId.set(profesor.id_usuario, profesor.nombre_completo);
    }
  }

  const gruposPorMateria = new Map<string, Grupo[]>();

  for (const grupo of grupos) {
    const actuales = gruposPorMateria.get(grupo.id_materia) ?? [];
    gruposPorMateria.set(grupo.id_materia, [...actuales, grupo]);
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-6 sm:p-8">
      <Link href="/inicio" className="text-sm underline">
        ← Volver al inicio
      </Link>

      <header className="mb-8 mt-6">
        <p className="text-sm text-gray-500">Sistema de Gestión Escolar</p>
        <h1 className="mt-2 text-3xl font-semibold">Materias disponibles</h1>
        <p className="mt-2 text-gray-600">
          Consulta las materias, grupos, profesores, horarios y lugares
          disponibles.
        </p>
      </header>

      {estado && (
        <div role="status" className="mb-6 rounded-lg border p-4 text-sm">
          {mensajes[estado] ??
            "No se pudo completar la operación. Inténtalo nuevamente."}
        </div>
      )}

      <div className="mb-6">
        <Link
          href="/estudiante/inscripciones"
          className="inline-block rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
        >
          Consultar mis inscripciones
        </Link>
      </div>

      {listaMaterias.length === 0 ? (
        <section className="rounded-xl border p-6">
          <h2 className="font-semibold">Todavía no hay materias</h2>
          <p className="mt-2 text-sm text-gray-600">
            Cuando se registren materias en el sistema, aparecerán aquí.
          </p>
        </section>
      ) : (
        <div className="space-y-6">
          {listaMaterias.map((materia) => {
            const gruposMateria =
              gruposPorMateria.get(materia.id_materia) ?? [];

            return (
              <section
                key={materia.id_materia}
                className="rounded-xl border p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">{materia.nombre}</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Clave: {materia.clave}
                    </p>
                  </div>

                  <span className="rounded-full border px-3 py-1 text-sm">
                    {materia.creditos} créditos
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
                  <p>Semestre: {materia.semestre ?? "Sin asignar"}</p>
                  <p>Horas: {materia.horas}</p>
                </div>

                <div className="mt-6 border-t pt-5">
                  <h3 className="font-semibold">Grupos disponibles</h3>

                  {gruposMateria.length === 0 ? (
                    <p className="mt-3 text-sm text-gray-600">
                      Esta materia todavía no tiene grupos registrados.
                    </p>
                  ) : (
                    <div className="mt-3 grid gap-4 md:grid-cols-2">
                      {gruposMateria.map((grupo) => {
                        const inscrito = gruposInscritos.has(grupo.id_grupo);

                        return (
                          <article
                            key={grupo.id_grupo}
                            className="rounded-lg border p-4"
                          >
                            <p className="font-medium">
                              Periodo {grupo.periodo}
                            </p>

                            <p className="mt-2 text-sm text-gray-600">
                              Profesor:{" "}
                              {profesoresPorId.get(grupo.id_profesor) ??
                                "No disponible"}
                            </p>

                            <p className="mt-1 text-sm text-gray-600">
                              Horario: {grupo.horario}
                            </p>

                            <p className="mt-1 text-sm text-gray-600">
                              Cupo máximo: {grupo.cupo_maximo} estudiantes
                            </p>

                            {inscrito ? (
                              <div className="mt-4 rounded-md border p-3 text-sm">
                                Ya estás inscrito en este grupo.
                                <Link
                                  href="/estudiante/inscripciones"
                                  className="mt-2 block underline"
                                >
                                  Ver mi inscripción
                                </Link>
                              </div>
                            ) : (
                              <form
                                action={inscribirseGrupoAction}
                                className="mt-4"
                              >
                                <input
                                  type="hidden"
                                  name="id_grupo"
                                  value={grupo.id_grupo}
                                />
                                <button
                                  type="submit"
                                  className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50"
                                >
                                  Inscribirme
                                </button>
                              </form>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
