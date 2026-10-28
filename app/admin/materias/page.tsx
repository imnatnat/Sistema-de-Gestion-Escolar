import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { crearMateriaAction } from "./actions";

type PageProps = {
  searchParams: Promise<{ estado?: string }>;
};

const mensajes: Record<string, string> = {
  creada: "Materia creada correctamente.",
  "sin-permiso": "No tienes permiso para administrar materias.",
  "campos-obligatorios": "Completa todos los campos obligatorios.",
  "datos-invalidos": "Revisa los datos: uno o más valores no son válidos.",
  "materia-duplicada": "Ya existe una materia con esos datos únicos.",
  "error-guardar": "No se pudo guardar la materia. Inténtalo de nuevo.",
};

export default async function MateriasAdminPage({ searchParams }: PageProps) {
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

  const { data: materias, error } = await supabase
    .from("materias")
    .select("id_materia, nombre, clave, creditos, semestre, horas")
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error cargando materias:", error.code);
    throw new Error("No se pudo cargar el catálogo de materias.");
  }

  const esError = estado !== undefined && estado !== "creada";

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6">
      <div>
        <Link href="/inicio" className="text-sm text-blue-700 underline">
          ← Volver al inicio
        </Link>

        <h1 className="mt-4 text-3xl font-bold">Administración de materias</h1>

        <p className="mt-2 text-gray-600">
          Registra materias y consulta el catálogo escolar.
        </p>
      </div>

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
        <h2 className="mb-5 text-xl font-semibold">Registrar materia</h2>

        <form action={crearMateriaAction} className="space-y-4">
          <div>
            <label htmlFor="nombre" className="mb-1 block font-medium">
              Nombre de la materia *
            </label>
            <input
              id="nombre"
              name="nombre"
              required
              maxLength={150}
              className="w-full rounded-lg border p-3"
              placeholder="Ej. Programación orientada a objetos"
            />
          </div>

          <div>
            <label htmlFor="clave" className="mb-1 block font-medium">
              Clave *
            </label>
            <input
              id="clave"
              name="clave"
              required
              maxLength={30}
              className="w-full rounded-lg border p-3"
              placeholder="Ej. POO101"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="creditos" className="mb-1 block font-medium">
                Créditos *
              </label>
              <input
                id="creditos"
                name="creditos"
                type="number"
                min="1"
                max="100"
                step="1"
                required
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label htmlFor="horas" className="mb-1 block font-medium">
                Horas *
              </label>
              <input
                id="horas"
                name="horas"
                type="number"
                min="1"
                max="1000"
                step="1"
                required
                className="w-full rounded-lg border p-3"
              />
            </div>

            <div>
              <label htmlFor="semestre" className="mb-1 block font-medium">
                Semestre
              </label>
              <input
                id="semestre"
                name="semestre"
                type="number"
                min="1"
                max="20"
                step="1"
                className="w-full rounded-lg border p-3"
                placeholder="Opcional"
              />
            </div>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-blue-700 px-5 py-3 font-medium text-white hover:bg-blue-800"
          >
            Crear materia
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Catálogo ({materias.length})</h2>

        {materias.length === 0 ? (
          <p className="rounded-xl border p-6 text-gray-600">
            Todavía no hay materias registradas. Usa el formulario para agregar
            la primera.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3">Clave</th>
                  <th className="p-3">Materia</th>
                  <th className="p-3">Créditos</th>
                  <th className="p-3">Horas</th>
                  <th className="p-3">Semestre</th>
                </tr>
              </thead>

              <tbody>
                {materias.map((materia) => (
                  <tr key={materia.id_materia} className="border-t">
                    <td className="p-3">{materia.clave}</td>
                    <td className="p-3">{materia.nombre}</td>
                    <td className="p-3">{materia.creditos}</td>
                    <td className="p-3">{materia.horas}</td>
                    <td className="p-3">{materia.semestre ?? "Sin asignar"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
