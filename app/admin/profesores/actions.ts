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

  let adminUserId: string;

  try {
    const { userId } = await requireUser();
    const supabase = getSupabaseAdminClient();

    const { data: usuarioActual, error: errorUsuario } = await supabase
      .from("usuarios")
      .select("rol")
      .eq("id_usuario", userId)
      .single();

    if (errorUsuario || usuarioActual?.rol !== "administrador") {
      return {
        success: false,
        message: "No tienes permisos para registrar profesores.",
      };
    }

    adminUserId = userId;
  } catch {
    return {
      success: false,
      message: "No se pudo verificar tu sesión.",
    };
  }

  const supabase = getSupabaseAdminClient();

  const { data: cuentaExistente, error: errorConsulta } =
    await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

  if (errorConsulta) {
    return {
      success: false,
      message: "No se pudieron verificar las cuentas existentes.",
    };
  }

  if (
    cuentaExistente.users.some((user) => user.email?.toLowerCase() === correo)
  ) {
    return {
      success: false,
      message: "Ya existe una cuenta con ese correo.",
    };
  }

  const { data: nuevaCuenta, error: errorCrearCuenta } =
    await supabase.auth.admin.inviteUserByEmail(correo, {
      data: {
        nombre_completo: nombre,
        rol: "profesor",
      },
    });

  if (errorCrearCuenta || !nuevaCuenta.user) {
    return {
      success: false,
      message:
        "No se pudo crear la cuenta. Revisa la configuración de correo de Supabase.",
    };
  }

  const nuevoId = nuevaCuenta.user.id;

  const { error: errorPerfil } = await supabase.from("usuarios").insert({
    id_usuario: nuevoId,
    correo,
    rol: "profesor",
  });

  if (errorPerfil) {
    await supabase.auth.admin.deleteUser(nuevoId);

    return {
      success: false,
      message:
        "No se pudo guardar el perfil del profesor. La cuenta creada se ha eliminado.",
    };
  }

  const { error: errorProfesor } = await supabase.from("profesores").insert({
    id_usuario: nuevoId,
    nombre_completo: nombre,
    especialidad: especialidad || null,
  });

  if (errorProfesor) {
    await supabase.from("usuarios").delete().eq("id_usuario", nuevoId);
    await supabase.auth.admin.deleteUser(nuevoId);

    return {
      success: false,
      message:
        "No se pudo guardar el registro del profesor. Se intentó limpiar la cuenta creada.",
    };
  }

  revalidatePath("/admin/profesores");
  revalidatePath("/inicio");

  return {
    success: true,
    message: `Se registró a ${nombre}. Se envió una invitación a su correo.`,
  };
}
