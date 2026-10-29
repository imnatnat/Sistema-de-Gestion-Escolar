"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function volverConEstado(estado: string): never {
  redirect(`/admin/inscripciones?estado=${encodeURIComponent(estado)}`);
}

async function verificarAdministrador() {
  const { supabase, userId } = await requireUser();

  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId)
    .maybeSingle();

  if (error || usuario?.rol !== "administrador") {
    redirect("/inicio");
  }

  return { supabase };
}

export async function crearInscripcionAdminAction(formData: FormData) {
  const idUsuario = formData.get("id_usuario");
  const idGrupo = formData.get("id_grupo");

  if (
    typeof idUsuario !== "string" ||
    !UUID_REGEX.test(idUsuario) ||
    typeof idGrupo !== "string" ||
    !UUID_REGEX.test(idGrupo)
  ) {
    volverConEstado("solicitud-invalida");
  }

  const { supabase } = await verificarAdministrador();

  const { data, error } = await supabase.rpc(
    "admin_inscribir_estudiante_seguro",
    {
      p_id_usuario: idUsuario,
      p_id_grupo: idGrupo,
    },
  );

  if (error) {
    console.error("Error creando inscripción:", error.code);

    if (error.code === "42501") {
      volverConEstado("no-autorizado");
    }

    volverConEstado("error");
  }

  switch (data) {
    case "inscrita":
      revalidatePath("/admin/inscripciones");
      revalidatePath("/admin/grupos");
      revalidatePath("/estudiante/inscripciones");
      revalidatePath("/estudiante/materias");
      volverConEstado("creada");

    case "duplicada":
      volverConEstado("duplicada");

    case "sin_cupo":
      volverConEstado("sin-cupo");

    case "estudiante_no_aprobado":
      volverConEstado("estudiante-no-aprobado");

    case "estudiante_no_encontrado":
      volverConEstado("estudiante-no-encontrado");

    case "grupo_no_encontrado":
      volverConEstado("grupo-no-encontrado");

    default:
      volverConEstado("error");
  }
}

export async function eliminarInscripcionAction(formData: FormData) {
  const idInscripcion = formData.get("id_inscripcion");

  if (typeof idInscripcion !== "string" || !UUID_REGEX.test(idInscripcion)) {
    volverConEstado("solicitud-invalida");
  }

  const { supabase } = await verificarAdministrador();

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

  const { data: eliminada, error: errorEliminar } = await supabase
    .from("inscripciones")
    .delete()
    .eq("id_inscripcion", idInscripcion)
    .select("id_inscripcion")
    .maybeSingle();

  if (errorEliminar) {
    console.error("Error eliminando inscripción:", errorEliminar.code);

    if (errorEliminar.code === "23503") {
      volverConEstado("tiene-calificacion");
    }

    volverConEstado("error");
  }

  if (!eliminada) {
    volverConEstado("no-encontrada");
  }

  revalidatePath("/admin/inscripciones");
  revalidatePath("/admin/grupos");
  revalidatePath("/estudiante/inscripciones");
  revalidatePath("/estudiante/materias");
  revalidatePath("/estudiante/calificaciones");

  volverConEstado("eliminada");
}
