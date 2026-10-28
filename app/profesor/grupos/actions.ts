"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";

function volverConEstado(estado: string): never {
  redirect(`/profesor/grupos?estado=${encodeURIComponent(estado)}`);
}

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function leerNota(formData: FormData, campo: string) {
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

export async function guardarCalificacionProfesorAction(formData: FormData) {
  const { supabase, userId } = await requireUser();

  const { data: usuario, error: errorRol } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId)
    .maybeSingle();

  if (errorRol || usuario?.rol !== "profesor") {
    redirect("/inicio");
  }

  const idInscripcion = formData.get("id_inscripcion");

  if (typeof idInscripcion !== "string" || !uuidRegex.test(idInscripcion)) {
    volverConEstado("solicitud-invalida");
  }

  const medioCurso = leerNota(formData, "medio_curso");
  const ordinario = leerNota(formData, "ordinario");
  const extraordinario = leerNota(formData, "extraordinario");
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

  // Verificar que la inscripción pertenece a un grupo del profesor.
  const { data: inscripcion, error: errorInscripcion } = await supabase
    .from("inscripciones")
    .select("id_inscripcion, grupos!inner(id_profesor)")
    .eq("id_inscripcion", idInscripcion)
    .eq("grupos.id_profesor", userId)
    .maybeSingle();

  if (errorInscripcion) {
    console.error(
      "Error verificando inscripción del profesor:",
      errorInscripcion.code,
    );
    volverConEstado("error");
  }

  if (!inscripcion) {
    volverConEstado("sin-permiso");
  }

  // Buscar la calificación existente para esta inscripción.
  const { data: existente, error: errorExistente } = await supabase
    .from("calificaciones")
    .select("id_calificacion")
    .eq("id_inscripcion", idInscripcion)
    .maybeSingle();

  if (errorExistente) {
    console.error("Error consultando calificación:", errorExistente.code);
    volverConEstado("error");
  }

  const datos = {
    medio_curso: medioCurso.valor,
    ordinario: ordinario.valor,
    extraordinario: extraordinario.valor,
    final: calificacionFinal,
    actualizado_en: new Date().toISOString(),
  };

  if (existente) {
    const { data: actualizada, error: errorActualizar } = await supabase
      .from("calificaciones")
      .update(datos)
      .eq("id_calificacion", existente.id_calificacion)
      .select("id_calificacion")
      .maybeSingle();

    if (errorActualizar) {
      console.error("Error actualizando calificación:", errorActualizar.code);
      volverConEstado("error");
    }

    if (!actualizada) {
      volverConEstado("no-actualizada");
    }
  } else {
    const { error: errorCrear } = await supabase.from("calificaciones").insert({
      id_inscripcion: idInscripcion,
      ...datos,
    });

    if (errorCrear) {
      console.error("Error creando calificación:", errorCrear.code);
      volverConEstado("error");
    }
  }

  revalidatePath("/profesor/grupos");
  revalidatePath("/admin/calificaciones");
  revalidatePath("/admin/inscripciones");

  volverConEstado("actualizada");
}
