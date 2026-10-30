"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type InscripcionActionResult = {
  success: boolean;
  message: string;
};

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

export async function crearInscripcionAdminAction(
  _previousState: InscripcionActionResult,
  formData: FormData,
): Promise<InscripcionActionResult> {
  const idUsuario = formData.get("id_usuario");
  const idGrupo = formData.get("id_grupo");

  if (
    typeof idUsuario !== "string" ||
    !UUID_REGEX.test(idUsuario) ||
    typeof idGrupo !== "string" ||
    !UUID_REGEX.test(idGrupo)
  ) {
    return {
      success: false,
      message: "La solicitud no es válida.",
    };
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

    return {
      success: false,
      message:
        error.code === "42501"
          ? "No tienes permiso para realizar esta operación."
          : "No se pudo completar la inscripción. Inténtalo nuevamente.",
    };
  }

  switch (data) {
    case "inscrita":
      revalidatePath("/admin/inscripciones");
      revalidatePath("/admin/grupos");
      revalidatePath("/estudiante/inscripciones");
      revalidatePath("/estudiante/materias");

      return {
        success: true,
        message: "La inscripción se creó correctamente.",
      };

    case "duplicada":
      return {
        success: false,
        message: "Este estudiante ya está inscrito en ese grupo.",
      };

    case "sin_cupo":
      return {
        success: false,
        message: "El grupo ya alcanzó su cupo máximo.",
      };

    case "estudiante_no_aprobado":
      return {
        success: false,
        message: "El estudiante todavía no tiene su cuenta aprobada.",
      };

    case "estudiante_no_encontrado":
      return {
        success: false,
        message: "No se encontró al estudiante seleccionado.",
      };

    case "grupo_no_encontrado":
      return {
        success: false,
        message: "No se encontró el grupo seleccionado.",
      };

    default:
      return {
        success: false,
        message: "No se pudo completar la operación. Inténtalo nuevamente.",
      };
  }
}

export async function eliminarInscripcionAction(
  _previousState: InscripcionActionResult,
  formData: FormData,
): Promise<InscripcionActionResult> {
  const idInscripcion = formData.get("id_inscripcion");

  if (typeof idInscripcion !== "string" || !UUID_REGEX.test(idInscripcion)) {
    return {
      success: false,
      message: "La solicitud no es válida.",
    };
  }

  const { supabase } = await verificarAdministrador();

  const { data: inscripcion, error: errorInscripcion } = await supabase
    .from("inscripciones")
    .select("id_inscripcion")
    .eq("id_inscripcion", idInscripcion)
    .maybeSingle();

  if (errorInscripcion) {
    console.error("Error consultando inscripción:", errorInscripcion.code);

    return {
      success: false,
      message: "No se pudo consultar la inscripción.",
    };
  }

  if (!inscripcion) {
    return {
      success: false,
      message: "La inscripción no existe o ya fue eliminada.",
    };
  }

  const { data: calificacion, error: errorCalificacion } = await supabase
    .from("calificaciones")
    .select("id_calificacion")
    .eq("id_inscripcion", idInscripcion)
    .limit(1)
    .maybeSingle();

  if (errorCalificacion) {
    console.error("Error consultando calificaciones:", errorCalificacion.code);

    return {
      success: false,
      message: "No se pudieron consultar las calificaciones.",
    };
  }

  if (calificacion) {
    return {
      success: false,
      message:
        "No se puede eliminar esta inscripción porque tiene calificaciones asociadas.",
    };
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
      return {
        success: false,
        message:
          "No se puede eliminar esta inscripción porque tiene calificaciones asociadas.",
      };
    }

    return {
      success: false,
      message: "No se pudo eliminar la inscripción.",
    };
  }

  if (!eliminada) {
    return {
      success: false,
      message: "La inscripción no existe o ya fue eliminada.",
    };
  }

  revalidatePath("/admin/inscripciones");
  revalidatePath("/admin/grupos");
  revalidatePath("/estudiante/inscripciones");
  revalidatePath("/estudiante/materias");
  revalidatePath("/estudiante/calificaciones");

  return {
    success: true,
    message: "La inscripción se eliminó correctamente.",
  };
}
