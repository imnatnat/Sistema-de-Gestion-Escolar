import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/app/ui/page-header";
import { DataTable } from "@/app/ui/data-table";
import type { DataTableColumn } from "@/app/ui/data-table";
import { EmptyState } from "@/app/ui/empty-state";
import { StatusMessage } from "@/app/ui/status-message";

import { SubjectCreateForm } from "./subject-create-form";

export const dynamic = "force-dynamic";

type Materia = {
  id_materia: string;
  nombre: string;
  clave: string;
  creditos: number;
  semestre: number | null;
  horas: number;
};

export default async function MateriasAdminPage() {
  const { supabase, userId } = await requireUser();

  const { data: usuario, error: errorRol } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId)
    .single();

  if (errorRol || usuario?.rol !== "administrador") {
    redirect("/inicio");
  }

  const { data: materias, error } = await supabase
    .from("materias")
    .select("id_materia, nombre, clave, creditos, semestre, horas")
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error cargando materias:", error.code);

    return (
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <PageHeader
          eyebrow="Administración"
          title="Materias"
          description="Registra materias y consulta el catálogo escolar."
        />

        <SubjectCreateForm />

        <StatusMessage type="error">
          No se pudo cargar el catálogo de materias. Inténtalo nuevamente.
        </StatusMessage>
      </div>
    );
  }

  const listaMaterias: Materia[] = materias ?? [];

  const columns: DataTableColumn<Materia>[] = [
    {
      key: "clave",
      header: "Clave",
      render: (materia) => (
        <span className="font-mono text-xs font-medium text-[#555555]">
          {materia.clave}
        </span>
      ),
    },
    {
      key: "nombre",
      header: "Materia",
      render: (materia) => (
        <span className="font-medium text-[#252525]">{materia.nombre}</span>
      ),
    },
    {
      key: "creditos",
      header: "Créditos",
      render: (materia) => materia.creditos,
    },
    {
      key: "horas",
      header: "Horas",
      render: (materia) => materia.horas,
    },
    {
      key: "semestre",
      header: "Semestre",
      render: (materia) => materia.semestre ?? "Sin asignar",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7">
      <PageHeader
        eyebrow="Administración"
        title="Materias"
        description="Registra materias y consulta el catálogo escolar."
      />

      <SubjectCreateForm />

      <section className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-[#252525]">
            Catálogo de materias
          </h2>

          <span className="text-sm text-[#888888]">
            {listaMaterias.length}{" "}
            {listaMaterias.length === 1 ? "materia" : "materias"}
          </span>
        </div>

        {listaMaterias.length === 0 ? (
          <EmptyState
            title="Todavía no hay materias registradas"
            description="Cuando registres una materia, aparecerá en este catálogo."
          />
        ) : (
          <DataTable
            columns={columns}
            rows={listaMaterias}
            getRowKey={(materia) => materia.id_materia}
          />
        )}
      </section>
    </div>
  );
}
