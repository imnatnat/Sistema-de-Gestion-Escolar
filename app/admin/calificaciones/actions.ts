"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";

function volverConEstado(estado: string): never {
  redirect(`/admin/calificaciones?estado=${encodeURIComponent(estado)}`);
}

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function leerCalificacion(formData: FormData, campo: string) {
  const valor = formData.get(campo);

  if (typeof valor !== "string") {
    return { valida: false as const, valor: null };
  }

  const texto = valor.trim();

  if (texto === "") {
    return { valida: true as const, valor: null };
  }

  if (!/^(?:\d{1,3})(?:\.\d{1,2})?$/.test(texto)) {
    return { valida: false as const, valor: null };
  }

  const numero = Number(texto);

  if (!Number.isFinite(numero) || numero < 0 || numero > 100) {
    return { valida: false as const, valor: null };
  }

  return { valida: true as const, valor: numero };
}

export async function actualizarCalificacionAction(formData: FormData) {
  const { supabase, userId } = await requireUser();

  const { data: usuario, error: errorRol } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId)
    .maybeSingle();

  if (errorRol || usuario?.rol !== "administrador") {
    redirect("/inicio");
  }

  const idCalificacion = formData.get("id_calificacion");

  if (typeof idCalificacion !== "string" || !uuidRegex.test(idCalificacion)) {
    volverConEstado("solicitud-invalida");
  }

  const medioCurso = leerCalificacion(formData, "medio_curso");
  const ordinario = leerCalificacion(formData, "ordinario");
  const extraordinario = leerCalificacion(formData, "extraordinario");
  const finalTexto = formData.get("final");

  if (
    !medioCurso.valida ||
    !ordinario.valida ||
    !extraordinario.valida ||
    typeof finalTexto !== "string"
  ) {
    volverConEstado("datos-invalidos");
  }

  const finalLimpio = finalTexto.trim();
  let calificacionFinal: number | null = null;

  if (finalLimpio !== "") {
    if (!/^\d{1,3}$/.test(finalLimpio)) {
      volverConEstado("datos-invalidos");
    }

    calificacionFinal = Number(finalLimpio);

    if (
      !Number.isSafeInteger(calificacionFinal) ||
      calificacionFinal < 0 ||
      calificacionFinal > 100
    ) {
      volverConEstado("datos-invalidos");
    }
  }

  const { data: existente, error: errorExistente } = await supabase
    .from("calificaciones")
    .select("id_calificacion")
    .eq("id_calificacion", idCalificacion)
    .maybeSingle();

  if (errorExistente) {
    console.error("Error consultando calificación:", errorExistente.code);
    volverConEstado("error");
  }

  if (!existente) {
    volverConEstado("no-encontrada");
  }

  const { data: actualizada, error: errorActualizar } = await supabase
    .from("calificaciones")
    .update({
      medio_curso: medioCurso.valor,
      ordinario: ordinario.valor,
      extraordinario: extraordinario.valor,
      final: calificacionFinal,
      actualizado_en: new Date().toISOString(),
    })
    .eq("id_calificacion", idCalificacion)
    .select("id_calificacion")
    .maybeSingle();

  if (errorActualizar) {
    console.error("Error actualizando calificación:", errorActualizar.code);
    volverConEstado("error");
  }

  if (!actualizada) {
    volverConEstado("no-actualizada");
  }

  revalidatePath("/admin/calificaciones");
  revalidatePath("/admin/inscripciones");

  volverConEstado("actualizada");
}
