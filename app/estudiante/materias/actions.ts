"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";

function volverConEstado(estado: string): never {
  redirect(`/estudiante/materias?estado=${encodeURIComponent(estado)}`);
}

function esUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

async function verificarEstudiante() {
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

  if (errorEstudiante) {
    volverConEstado("error-estudiante");
  }

  if (!estudiante?.aprobado) {
    redirect("/pendiente-aprobacion");
  }

  return { supabase, userId };
}

export async function inscribirseGrupoAction(formData: FormData) {
  const { supabase, userId } = await verificarEstudiante();
  const idGrupo = String(formData.get("id_grupo") ?? "");

  if (!esUuid(idGrupo)) {
    volverConEstado("grupo-invalido");
  }

  // Confirmar que el grupo existe y consultar su capacidad.
  const { data: grupo, error: errorGrupo } = await supabase
    .from("grupos")
    .select("id_grupo, cupo_maximo")
    .eq("id_grupo", idGrupo)
    .maybeSingle();

  if (errorGrupo || !grupo) {
    volverConEstado("grupo-no-disponible");
  }

  if (!Number.isInteger(grupo.cupo_maximo) || grupo.cupo_maximo < 1) {
    volverConEstado("cupo-invalido");
  }

  // No permitir inscripciones duplicadas.
  const { data: existente, error: errorExistente } = await supabase
    .from("inscripciones")
    .select("id_inscripcion")
    .eq("id_usuario", userId)
    .eq("id_grupo", idGrupo)
    .maybeSingle();

  if (errorExistente) {
    volverConEstado("error-consulta");
  }

  if (existente) {
    volverConEstado("ya-inscrito");
  }

  // Verificar que todavía haya lugares.
  const { count, error: errorCupo } = await supabase
    .from("inscripciones")
    .select("id_inscripcion", { count: "exact", head: true })
    .eq("id_grupo", idGrupo);

  if (errorCupo || count === null) {
    volverConEstado("error-cupo");
  }

  if (count >= grupo.cupo_maximo) {
    volverConEstado("grupo-lleno");
  }

  const { error: errorInsert } = await supabase.from("inscripciones").insert({
    id_usuario: userId,
    id_grupo: idGrupo,
  });

  if (errorInsert) {
    // También maneja la restricción UNIQUE si llegan dos solicitudes
    // de inscripción para el mismo estudiante y grupo.
    if (errorInsert.code === "23505") {
      volverConEstado("ya-inscrito");
    }

    if (errorInsert.code === "42501") {
      volverConEstado("sin-permiso");
    }

    volverConEstado("error-inscripcion");
  }

  revalidatePath("/estudiante/materias");
  revalidatePath("/estudiante/inscripciones");
  revalidatePath("/profesor/grupos");
  revalidatePath("/admin/inscripciones");

  volverConEstado("inscripcion-exitosa");
}

export async function cancelarInscripcionAction(formData: FormData) {
  const { supabase, userId } = await verificarEstudiante();
  const idInscripcion = String(formData.get("id_inscripcion") ?? "");

  if (!esUuid(idInscripcion)) {
    redirect("/estudiante/inscripciones?estado=inscripcion-invalida");
  }

  // Buscar únicamente una inscripción que pertenezca al estudiante.
  const { data: inscripcion, error: errorInscripcion } = await supabase
    .from("inscripciones")
    .select("id_inscripcion")
    .eq("id_inscripcion", idInscripcion)
    .eq("id_usuario", userId)
    .maybeSingle();

  if (errorInscripcion) {
    redirect("/estudiante/inscripciones?estado=error-consulta");
  }

  if (!inscripcion) {
    redirect("/estudiante/inscripciones?estado=inscripcion-no-encontrada");
  }

  // No cancelar si ya existe una calificación para esta inscripción.
  const { data: calificacion, error: errorCalificacion } = await supabase
    .from("calificaciones")
    .select("id_calificacion")
    .eq("id_inscripcion", idInscripcion)
    .maybeSingle();

  if (errorCalificacion) {
    redirect("/estudiante/inscripciones?estado=error-calificacion");
  }

  if (calificacion) {
    redirect("/estudiante/inscripciones?estado=tiene-calificacion");
  }

  const { error: errorDelete } = await supabase
    .from("inscripciones")
    .delete()
    .eq("id_inscripcion", idInscripcion)
    .eq("id_usuario", userId);

  if (errorDelete) {
    if (errorDelete.code === "23503") {
      redirect("/estudiante/inscripciones?estado=tiene-calificacion");
    }

    if (errorDelete.code === "42501") {
      redirect("/estudiante/inscripciones?estado=sin-permiso");
    }

    redirect("/estudiante/inscripciones?estado=error-cancelacion");
  }

  revalidatePath("/estudiante/materias");
  revalidatePath("/estudiante/inscripciones");
  revalidatePath("/profesor/grupos");
  revalidatePath("/admin/inscripciones");

  redirect("/estudiante/inscripciones?estado=cancelacion-exitosa");
}
