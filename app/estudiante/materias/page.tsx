import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";

export default async function MateriasPage() {
  const { supabase, userId } = await requireUser();

  // Verificar el rol desde la base de datos.
  const { data: usuario, error: usuarioError } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId)
    .maybeSingle();

  if (usuarioError || usuario?.rol !== "estudiante") {
    redirect("/inicio");
  }

  // Solo los estudiantes aprobados pueden consultar el catálogo.
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

  // Consultar materias.
  const { data: materias, error: materiasError } = await supabase
    .from("materias")
    .select("id_materia, nombre, clave, creditos, semestre, horas")
    .order("semestre")
    .order("nombre");

  if (materiasError) {
    return (
      <main className="mx-auto w-full max-w-5xl p-8">
        <h1 className="text-2xl font-semibold">Materias disponibles</h1>
        <p className="mt-4">
          No se pudo cargar el catálogo. Verifica los permisos de lectura de la
          base de datos.
        </p>
        <Link className="mt-4 inline-block underline" href="/inicio">
          Volver al inicio
        </Link>
      </main>
    );
  }

  const listaMaterias = materias ?? [];
  const idsMaterias = listaMaterias.map((materia) => materia.id_materia);

  // Consultar los grupos de las materias.
  let grupos: {
    id_grupo: string;
    id_materia: string;
    id_profesor: string;
    periodo: string;
    horario: string;
    cupo_maximo: number;
  }[] = [];

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
          <h1 className="text-2xl font-semibold">Materias disponibles</h1>
          <p className="mt-4">
            Las materias se encontraron, pero no se pudieron cargar los grupos.
            Verifica los permisos de lectura de grupos.
          </p>
          <Link className="mt-4 inline-block underline" href="/inicio">
            Volver al inicio
          </Link>
        </main>
      );
    }

    grupos = data ?? [];
  }

  // Obtener los nombres de los profesores.
  const idsProfesores = [...new Set(grupos.map((grupo) => grupo.id_profesor))];
  const profesoresPorId = new Map<string, string>();

  if (idsProfesores.length > 0) {
    const { data: profesores, error: profesoresError } = await supabase
      .from("profesores")
      .select("id_usuario, nombre_completo")
      .in("id_usuario", idsProfesores);

    if (!profesoresError && profesores) {
      for (const profesor of profesores) {
        profesoresPorId.set(profesor.id_usuario, profesor.nombre_completo);
      }
    }
  }

  const gruposPorMateria = new Map<string, typeof grupos>();

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
          Consulta las materias, sus grupos, profesores y horarios.
        </p>
      </header>

      {listaMaterias.length === 0 ? (
        <section className="rounded-xl border p-6">
          <h2 className="font-semibold">Todavía no hay materias</h2>
          <p className="mt-2 text-sm text-gray-600">
            El catálogo está vacío. Cuando se registren materias en el sistema,
            aparecerán aquí.
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
                      {gruposMateria.map((grupo) => (
                        <article
                          key={grupo.id_grupo}
                          className="rounded-lg border p-4"
                        >
                          <p className="font-medium">Periodo {grupo.periodo}</p>

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
                        </article>
                      ))}
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
