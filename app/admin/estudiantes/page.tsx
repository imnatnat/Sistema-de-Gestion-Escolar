import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { aprobarEstudianteAction } from "./actions";

type PageProps = {
  searchParams: Promise<{
    estado?: string;
  }>;
};

export default async function AdminEstudiantesPage({
  searchParams,
}: PageProps) {
  const { supabase, userId } = await requireUser();
  const params = await searchParams;

  const { data: usuario, error: usuarioError } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId)
    .maybeSingle();

  if (usuarioError || usuario?.rol !== "administrador") {
    redirect("/inicio");
  }

  const { data: estudiantes, error: estudiantesError } = await supabase
    .from("estudiantes")
    .select("id_usuario, matricula, nombre_completo, carrera, semestre")
    .eq("aprobado", false)
    .order("nombre_completo");

  if (estudiantesError) {
    return (
      <main className="mx-auto w-full max-w-4xl p-8">
        <h1 className="text-2xl font-semibold">Solicitudes pendientes</h1>
        <p className="mt-4">
          No se pudo cargar la lista. Verifica los permisos de la base de datos
          e inténtalo nuevamente.
        </p>
      </main>
    );
  }

  const ids = (estudiantes ?? []).map((estudiante) => estudiante.id_usuario);

  let correosPorUsuario = new Map<string, string>();

  if (ids.length > 0) {
    const { data: usuarios, error: usuariosError } = await supabase
      .from("usuarios")
      .select("id_usuario, correo")
      .in("id_usuario", ids);

    if (usuariosError || !usuarios) {
      return (
        <main className="mx-auto w-full max-w-4xl p-8">
          <h1 className="text-2xl font-semibold">Solicitudes pendientes</h1>
          <p className="mt-4">
            No se pudieron cargar los datos de las cuentas. Inténtalo
            nuevamente.
          </p>
        </main>
      );
    }

    correosPorUsuario = new Map(
      usuarios.map((usuario) => [usuario.id_usuario, usuario.correo]),
    );
  }

  const mensajes: Record<string, string> = {
    aprobado: "La cuenta fue aprobada correctamente.",
    error:
      "No se pudo aprobar la cuenta. Revisa los permisos e inténtalo nuevamente.",
    "no-pendiente": "La cuenta ya estaba aprobada o no existe.",
    "solicitud-invalida": "La solicitud no es válida.",
  };

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-6 sm:p-8">
      <h1 className="text-2xl font-semibold">Administración de estudiantes</h1>

      <p className="mt-2 text-sm text-gray-600">
        Revisa las solicitudes y aprueba las cuentas que correspondan.
      </p>

      {params.estado && mensajes[params.estado] && (
        <p className="mt-4 rounded border p-3" role="status">
          {mensajes[params.estado]}
        </p>
      )}

      <h2 className="mt-8 text-lg font-semibold">
        Solicitudes pendientes ({estudiantes?.length ?? 0})
      </h2>

      {!estudiantes || estudiantes.length === 0 ? (
        <p className="mt-4">No hay estudiantes pendientes de aprobación.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="p-3">Nombre</th>
                <th className="p-3">Matrícula</th>
                <th className="p-3">Correo</th>
                <th className="p-3">Carrera</th>
                <th className="p-3">Semestre</th>
                <th className="p-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {estudiantes.map((estudiante) => (
                <tr
                  key={estudiante.id_usuario}
                  className="border-b last:border-0"
                >
                  <td className="p-3">{estudiante.nombre_completo}</td>
                  <td className="p-3">{estudiante.matricula}</td>
                  <td className="p-3">
                    {correosPorUsuario.get(estudiante.id_usuario) ??
                      "No disponible"}
                  </td>
                  <td className="p-3">{estudiante.carrera ?? "Sin asignar"}</td>
                  <td className="p-3">
                    {estudiante.semestre ?? "Sin asignar"}
                  </td>
                  <td className="p-3">
                    <form action={aprobarEstudianteAction}>
                      <input
                        type="hidden"
                        name="id_usuario"
                        value={estudiante.id_usuario}
                      />
                      <button
                        type="submit"
                        className="rounded border px-3 py-2 font-medium hover:bg-gray-100"
                      >
                        Aprobar
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
