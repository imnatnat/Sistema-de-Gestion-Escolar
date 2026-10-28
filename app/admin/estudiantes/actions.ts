"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";

export async function aprobarEstudianteAction(formData: FormData) {
  const idUsuario = formData.get("id_usuario");

  if (
    typeof idUsuario !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      idUsuario,
    )
  ) {
    redirect("/admin/estudiantes?estado=solicitud-invalida");
  }

  const { supabase, userId } = await requireUser();

  const { data: usuario, error: usuarioError } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId)
    .maybeSingle();

  if (usuarioError || usuario?.rol !== "administrador") {
    redirect("/inicio");
  }

  const { data: estudiante, error } = await supabase
    .from("estudiantes")
    .update({ aprobado: true })
    .eq("id_usuario", idUsuario)
    .eq("aprobado", false)
    .select("id_usuario")
    .maybeSingle();

  if (error) {
    redirect("/admin/estudiantes?estado=error");
  }

  if (!estudiante) {
    redirect("/admin/estudiantes?estado=no-pendiente");
  }

  revalidatePath("/admin/estudiantes");
  revalidatePath("/pendiente-aprobacion");

  redirect("/admin/estudiantes?estado=aprobado");
}
