import { requireUser } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { crearProfesor } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProfesoresPage() {
  let userId: string;

  try {
    const session = await requireUser();
    userId = session.userId;
  } catch {
    redirect("/login");
  }

  const supabase = getSupabaseAdminClient();

  const { data: usuario, error: errorUsuario } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId!)
    .single();

  if (errorUsuario || usuario?.rol !== "administrador") {
    redirect("/inicio");
  }

  const { data: profesores, error: errorProfesores } = await supabase
    .from("profesores")
    .select("id_usuario, nombre_completo, especialidad")
    .order("nombre_completo", { ascending: true });

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6">
      <header>
        <h1 className="text-3xl font-bold">Gestión de profesores</h1>
        <p className="mt-2 text-gray-600">
          Registra profesores y consulta los que ya forman parte del sistema.
        </p>
      </header>

      <section className="rounded-xl border p-6">
        <h2 className="mb-4 text-xl font-semibold">Registrar profesor</h2>

        <form action={crearProfesor} className="space-y-4">
          <div>
            <label htmlFor="nombre_completo" className="mb-1 block font-medium">
              Nombre completo *
            </label>
            <input
              id="nombre_completo"
              name="nombre_completo"
              type="text"
              maxLength={150}
              autoComplete="name"
              required
              className="w-full rounded-lg border px-3 py-2"
              placeholder="Nombre del profesor"
            />
          </div>

          <div>
            <label htmlFor="correo" className="mb-1 block font-medium">
              Correo electrónico *
            </label>
            <input
              id="correo"
              name="correo"
              type="email"
              maxLength={254}
              autoComplete="email"
              required
              className="w-full rounded-lg border px-3 py-2"
              placeholder="profesor@universidad.edu"
            />
          </div>

          <div>
            <label htmlFor="especialidad" className="mb-1 block font-medium">
              Especialidad
            </label>
            <input
              id="especialidad"
              name="especialidad"
              type="text"
              maxLength={150}
              className="w-full rounded-lg border px-3 py-2"
              placeholder="Ej. Matemáticas"
            />
          </div>

          <button
            type="submit"
            className="rounded-lg bg-blue-700 px-5 py-2 font-medium text-white hover:bg-blue-800"
          >
            Registrar profesor
          </button>
        </form>
      </section>

      <section className="rounded-xl border p-6">
        <h2 className="mb-4 text-xl font-semibold">Profesores registrados</h2>

        {errorProfesores ? (
          <p role="alert" className="text-red-700">
            No se pudo cargar la lista de profesores.
          </p>
        ) : !profesores || profesores.length === 0 ? (
          <p className="text-gray-600">
            Todavía no hay profesores registrados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-3">Nombre</th>
                  <th className="px-3 py-3">Especialidad</th>
                  <th className="px-3 py-3">ID de usuario</th>
                </tr>
              </thead>
              <tbody>
                {profesores.map((profesor) => (
                  <tr
                    key={profesor.id_usuario}
                    className="border-b last:border-0"
                  >
                    <td className="px-3 py-3">{profesor.nombre_completo}</td>
                    <td className="px-3 py-3">
                      {profesor.especialidad || "Sin especificar"}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">
                      {profesor.id_usuario}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
