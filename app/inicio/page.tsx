import { logoutAction } from "@/app/auth/actions";
import { requireUser } from "@/lib/auth/session";

export default async function InicioPage() {
  const { supabase, userId, email } = await requireUser();

  // The role always comes from the database. RLS limits this query to the user's own row.
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId)
    .maybeSingle();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Inicio</h1>
      <p>
        Sesión iniciada como <strong>{email}</strong>
      </p>
      <p>
        Rol: <strong>{usuario?.rol ?? "sin rol"}</strong>
      </p>
      <form action={logoutAction}>
        <button type="submit" className="rounded border px-4 py-2">
          Cerrar sesión
        </button>
      </form>
    </main>
  );
}
