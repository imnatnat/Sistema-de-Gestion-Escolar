"use server";

import { requireUser } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

type ActionResult = {
  success: boolean;
  message: string;
};

export async function crearProfesor(formData: FormData): Promise<ActionResult> {
  const nombre = String(formData.get("nombre_completo") ?? "").trim();
  const correo = String(formData.get("correo") ?? "")
    .trim()
    .toLowerCase();
  const especialidad = String(formData.get("especialidad") ?? "").trim();

  if (!nombre || !correo) {
    return {
      success: false,
      message: "El nombre y el correo son obligatorios.",
    };
  }

  if (nombre.length > 150 || correo.length > 254 || especialidad.length > 150) {
    return {
      success: false,
      message: "Uno de los campos supera la longitud permitida.",
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return {
      success: false,
      message: "Ingresa un correo electrónico válido.",
    };
  }

  try {
    const { userId } = await requireUser();
    const supabase = getSupabaseAdminClient();

    const { data: usuarioActual, error: errorRol } = await supabase
      .from("usuarios")
      .select("rol")
      .eq("id_usuario", userId)
      .single();

    if (errorRol || usuarioActual?.rol !== "administrador") {
      return {
        success: false,
        message: "No tienes permisos para registrar profesores.",
      };
    }

    const { data: existente, error: errorConsulta } = await supabase
      .from("usuarios")
      .select("id_usuario")
      .eq("correo", correo)
      .maybeSingle();

    if (errorConsulta) {
      return {
        success: false,
        message: "No se pudo comprobar si el correo ya está registrado.",
      };
    }

    if (existente) {
      return {
        success: false,
        message: "Ese correo ya está registrado en el sistema.",
      };
    }

    const { data: invitacion, error: errorInvitacion } =
      await supabase.auth.admin.inviteUserByEmail(correo, {
        data: {
          nombre_completo: nombre,
          rol: "profesor",
        },
      });

    if (errorInvitacion || !invitacion.user) {
      return {
        success: false,
        message:
          "No se pudo crear la cuenta. Comprueba la configuración de correo de Supabase y que el correo no tenga ya una cuenta.",
      };
    }

    const nuevoId = invitacion.user.id;

    const { error: errorPerfil } = await supabase.from("usuarios").insert({
      id_usuario: nuevoId,
      correo,
      rol: "profesor",
    });

    if (errorPerfil) {
      const { error: errorEliminarCuenta } =
        await supabase.auth.admin.deleteUser(nuevoId);

      return {
        success: false,
        message: errorEliminarCuenta
          ? "Falló el registro del perfil y no se pudo limpiar la cuenta automáticamente. Revisa Supabase Auth."
          : "No se pudo guardar el perfil. Se eliminó la cuenta creada.",
      };
    }

    const { error: errorProfesor } = await supabase.from("profesores").insert({
      id_usuario: nuevoId,
      nombre_completo: nombre,
      especialidad: especialidad || null,
    });

    if (errorProfesor) {
      const { error: errorEliminarPerfil } = await supabase
        .from("usuarios")
        .delete()
        .eq("id_usuario", nuevoId);

      const { error: errorEliminarCuenta } =
        await supabase.auth.admin.deleteUser(nuevoId);

      if (errorEliminarPerfil || errorEliminarCuenta) {
        return {
          success: false,
          message:
            "Falló el registro del profesor y la limpieza quedó incompleta. Revisa las tablas usuarios y profesores, y Supabase Auth.",
        };
      }

      return {
        success: false,
        message:
          "No se pudo guardar el registro del profesor. Se limpió la cuenta creada.",
      };
    }

    revalidatePath("/admin/profesores");
    revalidatePath("/inicio");

    return {
      success: true,
      message: `Se registró a ${nombre}. Se envió una invitación a su correo.`,
    };
  } catch {
    return {
      success: false,
      message: "Ocurrió un error al registrar al profesor.",
    };
  }
}

export async function crearProfesorFormAction(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return crearProfesor(formData);
}
