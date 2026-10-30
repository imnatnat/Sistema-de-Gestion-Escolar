"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const componentesPermitidos = new Set([
  "actividad_1",
  "actividad_2",
  "actividad_3",
  "actividad_4",
  "actividad_5",
  "medio_curso",
  "ordinario",
  "extraordinario",
]);

function volverConEstado(estado: string): never {
  redirect(`/profesor/grupos?estado=${encodeURIComponent(estado)}`);
}

async function verificarProfesor() {
  const { supabase, userId } = await requireUser();

  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId)
    .maybeSingle();

  if (error || usuario?.rol !== "profesor") {
    redirect("/inicio");
  }

  return { supabase, userId };
}

function leerCalificacion(formData: FormData) {
  const valor = formData.get("calificacion");

  if (typeof valor !== "string" || valor.trim() === "") {
    return null;
  }

  const texto = valor.trim();

  if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(texto)) {
    return null;
  }

  const numero = Number(texto);

  if (!Number.isFinite(numero) || numero < 0 || numero > 100) {
    return null;
  }

  return numero;
}

export async function guardarCalificacionOportunidadAction(formData: FormData) {
  const { supabase } = await verificarProfesor();

  const idOportunidad = formData.get("id_oportunidad");
  const tipoComponente = formData.get("tipo_componente");
  const calificacion = leerCalificacion(formData);

  if (
    typeof idOportunidad !== "string" ||
    !uuidRegex.test(idOportunidad) ||
    typeof tipoComponente !== "string" ||
    !componentesPermitidos.has(tipoComponente)
  ) {
    volverConEstado("solicitud-invalida");
  }

  if (calificacion === null) {
    volverConEstado("datos-invalidos");
  }

  const { error } = await supabase.rpc("guardar_calificacion_oportunidad", {
    p_id_oportunidad: idOportunidad,
    p_tipo_componente: tipoComponente,
    p_calificacion: calificacion,
  });

  if (error) {
    console.error("Error guardando calificación:", error.code);
    volverConEstado("error");
  }

  revalidatePath("/profesor/grupos");
  revalidatePath("/estudiante/calificaciones");

  volverConEstado("calificacion-guardada");
}

export async function cerrarOportunidadCalificacionAction(formData: FormData) {
  const { supabase } = await verificarProfesor();

  const idOportunidad = formData.get("id_oportunidad");

  if (typeof idOportunidad !== "string" || !uuidRegex.test(idOportunidad)) {
    volverConEstado("solicitud-invalida");
  }

  const { error } = await supabase.rpc("cerrar_oportunidad_calificacion", {
    p_id_oportunidad: idOportunidad,
  });

  if (error) {
    console.error("Error cerrando oportunidad:", error.code);
    volverConEstado("no-se-pudo-cerrar");
  }

  revalidatePath("/profesor/grupos");
  revalidatePath("/estudiante/calificaciones");

  volverConEstado("oportunidad-cerrada");
}
