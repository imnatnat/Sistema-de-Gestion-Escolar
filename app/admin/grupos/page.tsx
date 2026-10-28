import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { crearGrupoAction } from "./actions";

type PageProps = {
  searchParams: Promise<{ estado?: string }>;
};

const mensajes: Record<string, string> = {
  creado: "Grupo creado correctamente.",
  "sin-permiso": "No tienes permiso para administrar grupos.",
  "campos-obligatorios": "Completa todos los campos obligatorios.",
  "datos-invalidos": "Revisa los datos ingresados.",
  "materia-invalida": "Selecciona una materia válida.",
  "profesor-invalido": "Selecciona un profesor válido.",
  "error-guardar": "No se pudo guardar el grupo. Inténtalo de nuevo.",
};

export default async function GruposAdminPage({ searchParams }: PageProps) {
  const { supabase, userId } = await requireUser();
  const { estado } = await searchParams;

  const { data: usuario, error: errorRol } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId)
    .single();

  if (errorRol) {
    console.error("Error consultando el rol:", errorRol.code);
    throw new Error("No se pudo consultar el rol del usuario.");
  }

  if (usuario.rol !== "administrador") {
    redirect("/inicio");
  }

  const [
    { data: materias, error: errorMaterias },
    { data: profesores, error: errorProfesores },
    { data: grupos, error: errorGrupos },
  ] = await Promise.all([
    supabase
      .from("materias")
      .select("id_materia, nombre, clave")
      .order("nombre", { ascending: true }),

    supabase
      .from("profesores")
      .select("id_usuario, nombre_completo, especialidad")
      .order("nombre_completo", { ascending: true }),

    supabase
      .from("grupos")
      .select(
        "id_grupo, id_materia, id_profesor, periodo, horario, cupo_maximo",
      )
      .order("periodo", { ascending: false }),
  ]);

  if (errorMaterias || errorProfesores || errorGrupos) {
    console.error("Error cargando catálogo de grupos:", {
      materias: errorMaterias?.code,
      profesores: errorProfesores?.code,
      grupos: errorGrupos?.code,
    });

    throw new Error("No se pudieron cargar los datos de grupos.");
  }

  const materiasPorId = new Map(
    (materias ?? []).map((materia) => [materia.id_materia, materia]),
  );

  const profesoresPorId = new Map(
    (profesores ?? []).map((profesor) => [profesor.id_usuario, profesor]),
  );

  const esError = estado !== undefined && estado !== "creado";

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-6">
      <header>
        <Link href="/inicio" className="text-sm text-blue-700 underline">
          ← Volver al inicio
        </Link>

        <h1 className="mt-4 text-3xl font-bold">Administración de grupos</h1>

        <p className="mt-2 text-gray-600">
          Crea grupos asignando materias y profesores para cada periodo escolar.
        </p>
      </header>

      {estado && mensajes[estado] && (
        <p
          role="status"
          className={`rounded-lg border p-3 ${
            esError
              ? "border-red-300 bg-red-50 text-red-800"
              : "border-green-300 bg-green-50 text-green-800"
          }`}
        >
          {mensajes[estado]}
        </p>
      )}

      <section className="rounded-xl border p-6">
        <h2 className="mb-5 text-xl font-semibold">Registrar grupo</h2>

        {materias.length === 0 || profesores.length === 0 ? (
          <p className="rounded-lg border p-4 text-gray-700">
            {materias.length === 0 && profesores.length === 0
              ? "Primero registra al menos una materia y un profesor."
              : materias.length === 0
                ? "Primero registra al menos una materia."
                : "Primero registra al menos un profesor."}
          </p>
        ) : (
          <form action={crearGrupoAction} className="space-y-4">
            <div>
              <label htmlFor="id_materia" className="mb-1 block font-medium">
                Materia *
              </label>

              <select
                id="id_materia"
                name="id_materia"
                required
                defaultValue=""
                className="w-full rounded-lg border p-3"
              >
                <option value="" disabled>
                  Selecciona una materia
                </option>

                {materias.map((materia) => (
                  <option key={materia.id_materia} value={materia.id_materia}>
                    {materia.clave} — {materia.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="id_profesor" className="mb-1 block font-medium">
                Profesor *
              </label>

              <select
                id="id_profesor"
                name="id_profesor"
                required
                defaultValue=""
                className="w-full rounded-lg border p-3"
              >
                <option value="" disabled>
                  Selecciona un profesor
                </option>

                {profesores.map((profesor) => (
                  <option key={profesor.id_usuario} value={profesor.id_usuario}>
                    {profesor.nombre_completo}
                    {profesor.especialidad ? ` — ${profesor.especialidad}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="periodo" className="mb-1 block font-medium">
                  Periodo escolar *
                </label>
                <input
                  id="periodo"
                  name="periodo"
                  required
                  pattern="[0-9]{4}-[12]"
                  maxLength={6}
                  className="w-full rounded-lg border p-3"
                  placeholder="2026-2"
                  title="Usa el formato AAAA-1 o AAAA-2."
                />
              </div>

              <div>
                <label htmlFor="horario" className="mb-1 block font-medium">
                  Horario *
                </label>
                <input
                  id="horario"
                  name="horario"
                  required
                  maxLength={200}
                  className="w-full rounded-lg border p-3"
                  placeholder="Ej. Lun y Mié, 10:00–12:00"
                />
              </div>

              <div>
                <label htmlFor="cupo_maximo" className="mb-1 block font-medium">
                  Cupo máximo *
                </label>
                <input
                  id="cupo_maximo"
                  name="cupo_maximo"
                  type="number"
                  min="1"
                  max="500"
                  step="1"
                  required
                  defaultValue={30}
                  className="w-full rounded-lg border p-3"
                />
              </div>
            </div>

            <button
              type="submit"
              className="rounded-lg bg-blue-700 px-5 py-3 font-medium text-white hover:bg-blue-800"
            >
              Crear grupo
            </button>
          </form>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">
          Grupos registrados ({grupos.length})
        </h2>

        {grupos.length === 0 ? (
          <p className="rounded-xl border p-6 text-gray-600">
            Todavía no hay grupos registrados.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3">Materia</th>
                  <th className="p-3">Profesor</th>
                  <th className="p-3">Periodo</th>
                  <th className="p-3">Horario</th>
                  <th className="p-3">Cupo</th>
                </tr>
              </thead>

              <tbody>
                {grupos.map((grupo) => {
                  const materia = materiasPorId.get(grupo.id_materia);
                  const profesor = profesoresPorId.get(grupo.id_profesor);

                  return (
                    <tr key={grupo.id_grupo} className="border-t">
                      <td className="p-3">
                        {materia
                          ? `${materia.clave} — ${materia.nombre}`
                          : "Materia no disponible"}
                      </td>
                      <td className="p-3">
                        {profesor?.nombre_completo ?? "Profesor no disponible"}
                      </td>
                      <td className="p-3">{grupo.periodo}</td>
                      <td className="p-3">{grupo.horario}</td>
                      <td className="p-3">{grupo.cupo_maximo}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
