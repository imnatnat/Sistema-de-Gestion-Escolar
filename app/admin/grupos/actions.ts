"use server";

import { requireUser } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export type GrupoActionResult = {
  success: boolean;
  message: string;
};

export async function crearGrupoAction(
  _previousState: GrupoActionResult,
  formData: FormData,
): Promise<GrupoActionResult> {
  const { supabase, userId } = await requireUser();

  const { data: usuario, error: errorRol } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId)
    .single();

  if (errorRol || usuario?.rol !== "administrador") {
    return {
      success: false,
      message: "No tienes permiso para administrar grupos.",
    };
  }

  const idMateria = String(formData.get("id_materia") ?? "").trim();
  const idProfesor = String(formData.get("id_profesor") ?? "").trim();
  const periodo = String(formData.get("periodo") ?? "").trim();
  const horario = String(formData.get("horario") ?? "").trim();
  const cupoTexto = String(formData.get("cupo_maximo") ?? "").trim();

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!idMateria || !idProfesor || !periodo || !horario || !cupoTexto) {
    return {
      success: false,
      message: "Completa todos los campos obligatorios.",
    };
  }

  if (
    !uuidRegex.test(idMateria) ||
    !uuidRegex.test(idProfesor) ||
    !/^\d{4}-[12]$/.test(periodo) ||
    horario.length > 200 ||
    !/^\d+$/.test(cupoTexto)
  ) {
    return {
      success: false,
      message: "Revisa los datos ingresados.",
    };
  }

  const cupoMaximo = Number(cupoTexto);

  if (!Number.isSafeInteger(cupoMaximo) || cupoMaximo < 1 || cupoMaximo > 500) {
    return {
      success: false,
      message: "El cupo máximo debe estar entre 1 y 500.",
    };
  }

  const { data: materia, error: errorMateria } = await supabase
    .from("materias")
    .select("id_materia")
    .eq("id_materia", idMateria)
    .maybeSingle();

  if (errorMateria || !materia) {
    return {
      success: false,
      message: "Selecciona una materia válida.",
    };
  }

  const { data: profesor, error: errorProfesor } = await supabase
    .from("profesores")
    .select("id_usuario")
    .eq("id_usuario", idProfesor)
    .maybeSingle();

  if (errorProfesor || !profesor) {
    return {
      success: false,
      message: "Selecciona un profesor válido.",
    };
  }

  const { error } = await supabase.from("grupos").insert({
    id_materia: idMateria,
    id_profesor: idProfesor,
    periodo,
    horario,
    cupo_maximo: cupoMaximo,
  });

  if (error) {
    console.error("Error al crear grupo:", error.code);

    return {
      success: false,
      message: "No se pudo guardar el grupo. Inténtalo de nuevo.",
    };
  }

  revalidatePath("/admin/grupos");
  revalidatePath("/inicio");

  return {
    success: true,
    message: "Grupo creado correctamente.",
  };
}
