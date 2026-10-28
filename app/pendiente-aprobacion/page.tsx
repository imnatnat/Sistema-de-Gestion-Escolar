import { logoutAction } from "@/app/auth/actions";
import { requireUser } from "@/lib/auth/session";

export default async function PendienteAprobacionPage() {
  const { supabase, userId } = await requireUser();

  const { data: usuario, error: usuarioError } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId)
    .maybeSingle();

  if (usuarioError || !usuario) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 p-8">
        <h1 className="text-2xl font-semibold">
          No pudimos verificar tu cuenta
        </h1>
        <p>
          Por seguridad, el acceso académico está bloqueado mientras no podamos
          verificar tu perfil. Intenta cerrar sesión e ingresar nuevamente. Si
          el problema continúa, contacta al administrador.
        </p>
        <form action={logoutAction}>
          <button type="submit" className="rounded border px-4 py-2">
            Cerrar sesión
          </button>
        </form>
      </main>
    );
  }

  if (usuario.rol !== "estudiante") {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 p-8">
        <h1 className="text-2xl font-semibold">Acceso no disponible</h1>
        <p>No se pudo verificar el permiso de esta cuenta.</p>
        <form action={logoutAction}>
          <button type="submit" className="rounded border px-4 py-2">
            Cerrar sesión
          </button>
        </form>
      </main>
    );
  }

  const { data: estudiante, error: estudianteError } = await supabase
    .from("estudiantes")
    .select("aprobado")
    .eq("id_usuario", userId)
    .maybeSingle();

  if (estudianteError || estudiante?.aprobado !== false) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 p-8">
        <h1 className="text-2xl font-semibold">
          No pudimos verificar tu aprobación
        </h1>
        <p>
          Por seguridad, no podemos habilitar el acceso académico en este
          momento. Intenta iniciar sesión nuevamente o contacta al
          administrador.
        </p>
        <form action={logoutAction}>
          <button type="submit" className="rounded border px-4 py-2">
            Cerrar sesión
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">
        Tu cuenta está pendiente de aprobación
      </h1>

      <p>
        Tu correo fue confirmado y tu sesión está activa, pero un administrador
        debe aprobar tu cuenta antes de que puedas utilizar las funciones
        académicas del sistema.
      </p>

      <p>
        No necesitas registrarte nuevamente. Cuando tu cuenta sea aprobada,
        vuelve a iniciar sesión para acceder a las funciones disponibles.
      </p>

      <form action={logoutAction}>
        <button type="submit" className="rounded border px-4 py-2">
          Cerrar sesión
        </button>
      </form>
    </main>
  );
}
