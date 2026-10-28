import { logoutAction } from "@/app/auth/actions";
import { requireUser } from "@/lib/auth/session";

export default async function InicioPage() {
  const { supabase, userId, email } = await requireUser();

  const { data: usuario, error: usuarioError } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId)
    .maybeSingle();

  if (usuarioError) {
    throw new Error("No se pudo obtener el rol del usuario.");
  }

  const rol = usuario?.rol ?? "sin rol";

  let nombre = "";
  let matricula = "";
  let carrera = "";
  let semestre: number | null = null;

  if (rol === "estudiante") {
    const { data: estudiante, error: estudianteError } = await supabase
      .from("estudiantes")
      .select("nombre_completo, matricula, carrera, semestre, aprobado")
      .eq("id_usuario", userId)
      .maybeSingle();

    if (estudianteError) {
      throw new Error("No se pudo obtener la información del estudiante.");
    }

    nombre = estudiante?.nombre_completo ?? "";
    matricula = estudiante?.matricula ?? "";
    carrera = estudiante?.carrera ?? "";
    semestre = estudiante?.semestre ?? null;
  }

  if (rol === "profesor") {
    const { data: profesor, error: profesorError } = await supabase
      .from("profesores")
      .select("nombre_completo, especialidad")
      .eq("id_usuario", userId)
      .maybeSingle();

    if (profesorError) {
      throw new Error("No se pudo obtener la información del profesor.");
    }

    nombre = profesor?.nombre_completo ?? "";
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 p-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">Sistema de Gestión Escolar</p>
          <h1 className="text-3xl font-semibold">
            Hola{nombre ? `, ${nombre}` : ""}
          </h1>
        </div>

        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded border px-4 py-2 hover:bg-gray-50"
          >
            Cerrar sesión
          </button>
        </form>
      </header>

      <section className="rounded-lg border p-6">
        <h2 className="mb-4 text-xl font-semibold">Mi información</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Correo</p>
            <p>{email}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Rol</p>
            <p className="capitalize">{rol}</p>
          </div>

          {rol === "estudiante" && (
            <>
              <div>
                <p className="text-sm text-gray-500">Matrícula</p>
                <p>{matricula || "No registrada"}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Carrera</p>
                <p>{carrera || "No registrada"}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Semestre</p>
                <p>{semestre ?? "No registrado"}</p>
              </div>
            </>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Acciones</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rol === "estudiante" && (
            <>
              <a
                href="/estudiante/materias"
                className="rounded-lg border p-6 hover:bg-gray-50"
              >
                <h3 className="font-semibold">Materias</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Consulta las materias y grupos disponibles.
                </p>
              </a>

              <a
                href="/estudiante/inscripciones"
                className="rounded-lg border p-6 hover:bg-gray-50"
              >
                <h3 className="font-semibold">Mis inscripciones</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Consulta las materias en las que estás inscrito.
                </p>
              </a>
            </>
          )}

          {rol === "profesor" && (
            <a
              href="/profesor/grupos"
              className="rounded-lg border p-6 hover:bg-gray-50"
            >
              <h3 className="font-semibold">Mis grupos</h3>
              <p className="mt-1 text-sm text-gray-500">
                Consulta los grupos que tienes asignados.
              </p>
            </a>
          )}

          {rol === "administrador" && (
            <a
              href="/admin/estudiantes"
              className="rounded-lg border p-6 hover:bg-gray-50"
            >
              <h3 className="font-semibold">Estudiantes</h3>
              <p className="mt-1 text-sm text-gray-500">
                Administra y aprueba estudiantes.
              </p>
            </a>
          )}
        </div>
      </section>
    </main>
  );
}
