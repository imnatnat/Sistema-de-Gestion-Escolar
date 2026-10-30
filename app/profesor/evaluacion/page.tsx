import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/app/ui/page-header";
import { Field, TextInput } from "@/app/ui/form-controls";
import { StatusMessage } from "@/app/ui/status-message";
import { guardarConfiguracionEvaluacionAction } from "./actions";

type PageProps = {
  searchParams: Promise<{ estado?: string }>;
};

const mensajes: Record<string, string> = {
  guardada:
    "La configuración se guardó correctamente. Se creó una nueva versión.",
  "solicitud-invalida": "La solicitud no es válida.",
  "datos-invalidos":
    "Todos los porcentajes deben ser números entre 0 y 100, con hasta dos decimales.",
  "total-invalido": "La suma de los porcentajes debe ser exactamente 100 %.",
  "sin-permiso": "No tienes grupos asignados para esa materia y periodo.",
  error: "No se pudo guardar la configuración. Inténtalo nuevamente.",
};

const componentes = [
  { campo: "actividad_1", nombre: "Actividad 1" },
  { campo: "actividad_2", nombre: "Actividad 2" },
  { campo: "actividad_3", nombre: "Actividad 3" },
  { campo: "actividad_4", nombre: "Actividad 4" },
  { campo: "actividad_5", nombre: "Actividad 5" },
  { campo: "medio_curso", nombre: "Medio curso" },
  { campo: "ordinario", nombre: "Ordinario" },
] as const;

export default async function ProfesorEvaluacionPage({
  searchParams,
}: PageProps) {
  const { supabase, userId } = await requireUser();
  const { estado } = await searchParams;

  const { data: usuario, error: errorRol } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId)
    .maybeSingle();

  if (errorRol || usuario?.rol !== "profesor") {
    redirect("/inicio");
  }

  const [
    { data: grupos, error: errorGrupos },
    { data: materias, error: errorMaterias },
    { data: configuraciones, error: errorConfiguraciones },
  ] = await Promise.all([
    supabase
      .from("grupos")
      .select("id_materia, periodo")
      .eq("id_profesor", userId)
      .order("periodo", { ascending: false }),

    supabase.from("materias").select("id_materia, nombre, clave"),

    supabase
      .from("configuraciones_evaluacion")
      .select("id_configuracion, id_materia, periodo, version")
      .eq("id_profesor", userId)
      .eq("activa", true),
  ]);

  if (errorGrupos || errorMaterias || errorConfiguraciones) {
    console.error("Error cargando configuración de evaluación:", {
      grupos: errorGrupos?.code,
      materias: errorMaterias?.code,
      configuraciones: errorConfiguraciones?.code,
    });

    return (
      <main className="mx-auto max-w-5xl p-6">
        <PageHeader title="Configuración de evaluación" />
        <StatusMessage type="error">
          No se pudo cargar la información. Verifica los permisos de lectura.
        </StatusMessage>
      </main>
    );
  }

  const materiasPorId = new Map(
    (materias ?? []).map((materia) => [materia.id_materia, materia]),
  );

  const combinaciones = new Map<
    string,
    { id_materia: string; periodo: string }
  >();

  for (const grupo of grupos ?? []) {
    const llave = `${grupo.id_materia}|${grupo.periodo}`;

    combinaciones.set(llave, {
      id_materia: grupo.id_materia,
      periodo: grupo.periodo,
    });
  }

  const configuracionesPorLlave = new Map(
    (configuraciones ?? []).map((configuracion) => [
      `${configuracion.id_materia}|${configuracion.periodo}`,
      configuracion,
    ]),
  );

  const idsConfiguraciones = (configuraciones ?? []).map(
    (configuracion) => configuracion.id_configuracion,
  );

  const { data: componentesGuardados, error: errorComponentes } =
    idsConfiguraciones.length > 0
      ? await supabase
          .from("componentes_configuracion")
          .select("id_configuracion, tipo_componente, porcentaje")
          .in("id_configuracion", idsConfiguraciones)
      : { data: [], error: null };

  if (errorComponentes) {
    console.error("Error cargando porcentajes:", errorComponentes.code);

    return (
      <main className="mx-auto max-w-5xl p-6">
        <PageHeader title="Configuración de evaluación" />
        <StatusMessage type="error">
          No se pudieron cargar los porcentajes actuales.
        </StatusMessage>
      </main>
    );
  }

  const porcentajesPorConfiguracion = new Map<string, Map<string, number>>();

  for (const componente of componentesGuardados ?? []) {
    const lista =
      porcentajesPorConfiguracion.get(componente.id_configuracion) ??
      new Map<string, number>();

    lista.set(componente.tipo_componente, Number(componente.porcentaje));

    porcentajesPorConfiguracion.set(componente.id_configuracion, lista);
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6 sm:p-8">
      <PageHeader
        eyebrow="Área del profesor"
        title="Configuración de evaluación"
        description="Define los porcentajes de las actividades y exámenes para cada materia y periodo."
      />

      {estado && mensajes[estado] && (
        <StatusMessage type={estado === "guardada" ? "success" : "error"}>
          {mensajes[estado]}
        </StatusMessage>
      )}

      {(grupos ?? []).length === 0 ? (
        <section className="rounded-md border border-[#E5E5E3] bg-white p-6">
          <h2 className="font-semibold text-[#252525]">
            No tienes grupos asignados
          </h2>
          <p className="mt-2 text-sm text-[#787774]">
            Cuando el administrador te asigne un grupo, podrás configurar su
            evaluación desde aquí.
          </p>
        </section>
      ) : (
        <div className="space-y-6">
          {Array.from(combinaciones.entries()).map(([llave, combinacion]) => {
            const materia = materiasPorId.get(combinacion.id_materia);
            const configuracion = configuracionesPorLlave.get(llave);

            const porcentajes = configuracion
              ? porcentajesPorConfiguracion.get(configuracion.id_configuracion)
              : undefined;

            return (
              <section
                key={llave}
                className="space-y-5 rounded-lg border border-[#E5E5E3] bg-white p-5 sm:p-6"
              >
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-[#252525]">
                      {materia
                        ? `${materia.clave} — ${materia.nombre}`
                        : "Materia no disponible"}
                    </h2>
                    <p className="mt-1 text-sm text-[#787774]">
                      Periodo: {combinacion.periodo}
                    </p>
                  </div>

                  {configuracion && (
                    <span className="rounded-md bg-[#F1F1EF] px-3 py-1 text-xs font-medium text-[#555555]">
                      Versión {configuracion.version}
                    </span>
                  )}
                </header>

                <form
                  action={guardarConfiguracionEvaluacionAction}
                  className="space-y-5"
                >
                  <input
                    type="hidden"
                    name="id_materia"
                    value={combinacion.id_materia}
                  />

                  <input
                    type="hidden"
                    name="periodo"
                    value={combinacion.periodo}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    {componentes.map((componente) => (
                      <Field
                        key={componente.campo}
                        label={`${componente.nombre} (%)`}
                        htmlFor={`${componente.campo}-${llave}`}
                      >
                        <TextInput
                          id={`${componente.campo}-${llave}`}
                          name={componente.campo}
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          required
                          defaultValue={
                            porcentajes?.get(componente.campo) ??
                            (componente.campo === "ordinario"
                              ? 30
                              : componente.campo === "medio_curso"
                                ? 20
                                : 10)
                          }
                        />
                      </Field>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3 border-t border-[#EAEAE8] pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-[#787774]">
                      La suma de los siete porcentajes debe ser exactamente 100
                      %.
                    </p>

                    <button
                      type="submit"
                      className="rounded-md bg-[#252525] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#444444]"
                    >
                      {configuracion
                        ? "Guardar nueva versión"
                        : "Crear configuración"}
                    </button>
                  </div>
                </form>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
