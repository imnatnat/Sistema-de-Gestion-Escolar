"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function verificarEstudianteAprobado() {
  const { supabase, userId } = await requireUser();

  const { data: usuario, error: errorUsuario } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId)
    .maybeSingle();

  if (errorUsuario || usuario?.rol !== "estudiante") {
    redirect("/inicio");
  }

  const { data: estudiante, error: errorEstudiante } = await supabase
    .from("estudiantes")
    .select("aprobado")
    .eq("id_usuario", userId)
    .maybeSingle();

  if (errorEstudiante || !estudiante) {
    redirect("/inicio");
  }

  if (!estudiante.aprobado) {
    redirect("/pendiente-aprobacion");
  }

  return { supabase, userId };
}

export async function inscribirseGrupoAction(formData: FormData) {
  const idGrupo = String(formData.get("id_grupo") ?? "").trim();

  if (!UUID_REGEX.test(idGrupo)) {
    redirect("/estudiante/materias?estado=error");
  }

  const { supabase } = await verificarEstudianteAprobado();

  const { data, error } = await supabase.rpc("inscribirse_grupo_seguro", {
    p_id_grupo: idGrupo,
  });

  if (error) {
    console.error("Error al inscribir al estudiante:", error.code);

    if (error.code === "42501") {
      redirect("/estudiante/materias?estado=no_autorizado");
    }

    redirect("/estudiante/materias?estado=error");
  }

  switch (data) {
    case "inscrito":
      revalidatePath("/estudiante/materias");
      revalidatePath("/estudiante/inscripciones");
      redirect("/estudiante/materias?estado=inscrito");

    case "duplicada":
      redirect("/estudiante/materias?estado=duplicada");

    case "sin_cupo":
      redirect("/estudiante/materias?estado=sin_cupo");

    default:
      redirect("/estudiante/materias?estado=error");
  }
}

export async function cancelarInscripcionAction(formData: FormData) {
  const idInscripcion = String(formData.get("id_inscripcion") ?? "").trim();

  if (!UUID_REGEX.test(idInscripcion)) {
    redirect("/estudiante/inscripciones?estado=error");
  }

  const { supabase, userId } = await verificarEstudianteAprobado();

  const { data: inscripcion, error: errorInscripcion } = await supabase
    .from("inscripciones")
    .select("id_inscripcion")
    .eq("id_inscripcion", idInscripcion)
    .eq("id_usuario", userId)
    .maybeSingle();

  if (errorInscripcion || !inscripcion) {
    redirect("/estudiante/inscripciones?estado=error");
  }

  const { data: calificacion, error: errorCalificacion } = await supabase
    .from("calificaciones")
    .select("id_calificacion")
    .eq("id_inscripcion", idInscripcion)
    .maybeSingle();

  if (errorCalificacion) {
    redirect("/estudiante/inscripciones?estado=error");
  }

  if (calificacion) {
    redirect("/estudiante/inscripciones?estado=error");
  }

  const { data: eliminada, error: errorEliminar } = await supabase
    .from("inscripciones")
    .delete()
    .eq("id_inscripcion", idInscripcion)
    .eq("id_usuario", userId)
    .select("id_inscripcion")
    .maybeSingle();

  if (errorEliminar || !eliminada) {
    redirect("/estudiante/inscripciones?estado=error");
  }

  revalidatePath("/estudiante/materias");
  revalidatePath("/estudiante/inscripciones");
  revalidatePath("/estudiante/calificaciones");

  redirect("/estudiante/inscripciones?estado=cancelada");
}
