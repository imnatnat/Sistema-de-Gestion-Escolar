"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";

function volverConEstado(estado: string): never {
  redirect(`/admin/inscripciones?estado=${encodeURIComponent(estado)}`);
}

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function eliminarInscripcionAction(formData: FormData) {
  const { supabase, userId } = await requireUser();

  const { data: usuario, error: errorRol } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId)
    .maybeSingle();

  if (errorRol || usuario?.rol !== "administrador") {
    redirect("/inicio");
  }

  const idInscripcion = formData.get("id_inscripcion");

  if (typeof idInscripcion !== "string" || !uuidRegex.test(idInscripcion)) {
    volverConEstado("solicitud-invalida");
  }

  const { data: inscripcion, error: errorInscripcion } = await supabase
    .from("inscripciones")
    .select("id_inscripcion")
    .eq("id_inscripcion", idInscripcion)
    .maybeSingle();

  if (errorInscripcion) {
    console.error("Error consultando inscripción:", errorInscripcion.code);
    volverConEstado("error");
  }

  if (!inscripcion) {
    volverConEstado("no-encontrada");
  }

  const { data: calificacion, error: errorCalificacion } = await supabase
    .from("calificaciones")
    .select("id_calificacion")
    .eq("id_inscripcion", idInscripcion)
    .limit(1)
    .maybeSingle();

  if (errorCalificacion) {
    console.error("Error consultando calificaciones:", errorCalificacion.code);
    volverConEstado("error");
  }

  if (calificacion) {
    volverConEstado("tiene-calificacion");
  }

  const { error: errorEliminar } = await supabase
    .from("inscripciones")
    .delete()
    .eq("id_inscripcion", idInscripcion);

  if (errorEliminar) {
    console.error("Error eliminando inscripción:", errorEliminar.code);

    if (errorEliminar.code === "23503") {
      volverConEstado("tiene-calificacion");
    }

    volverConEstado("error");
  }

  revalidatePath("/admin/inscripciones");
  revalidatePath("/admin/grupos");

  volverConEstado("eliminada");
}
