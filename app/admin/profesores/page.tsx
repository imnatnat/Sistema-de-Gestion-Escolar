import { requireUser } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

import { PageHeader } from "@/app/ui/page-header";
import { DataTable } from "@/app/ui/data-table";
import type { DataTableColumn } from "@/app/ui/data-table";
import { StatusMessage } from "@/app/ui/status-message";
import { EmptyState } from "@/app/ui/empty-state";
import { ProfessorCreateForm } from "./professor-create-form";

export const dynamic = "force-dynamic";

type Profesor = {
  id_usuario: string;
  nombre_completo: string;
  especialidad: string | null;
};

export default async function ProfesoresPage() {
  let userId: string;

  try {
    const session = await requireUser();
    userId = session.userId;
  } catch {
    redirect("/login");
  }

  const supabase = getSupabaseAdminClient();

  const { data: usuario, error: errorUsuario } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId)
    .single();

  if (errorUsuario || usuario?.rol !== "administrador") {
    redirect("/inicio");
  }

  const { data: profesores, error: errorProfesores } = await supabase
    .from("profesores")
    .select("id_usuario, nombre_completo, especialidad")
    .order("nombre_completo", { ascending: true });

  if (errorProfesores) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <PageHeader
          eyebrow="Administración"
          title="Profesores"
          description="Registra profesores y consulta los que forman parte del sistema."
        />

        <ProfessorCreateForm />

        <StatusMessage type="error">
          No se pudo cargar la lista de profesores. Inténtalo nuevamente.
        </StatusMessage>
      </div>
    );
  }

  const listaProfesores: Profesor[] = profesores ?? [];
  const ids = listaProfesores.map((profesor) => profesor.id_usuario);

  let correosPorUsuario = new Map<string, string>();

  if (ids.length > 0) {
    const { data: usuarios, error: errorCorreos } = await supabase
      .from("usuarios")
      .select("id_usuario, correo")
      .in("id_usuario", ids);

    if (errorCorreos || !usuarios) {
      return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <PageHeader
            eyebrow="Administración"
            title="Profesores"
            description="Registra profesores y consulta los que forman parte del sistema."
          />

          <ProfessorCreateForm />

          <StatusMessage type="error">
            No se pudieron cargar los correos de los profesores.
          </StatusMessage>
        </div>
      );
    }

    correosPorUsuario = new Map(
      usuarios.map((usuario) => [usuario.id_usuario, usuario.correo]),
    );
  }

  const columns: DataTableColumn<Profesor>[] = [
    {
      key: "nombre",
      header: "Nombre",
      render: (profesor) => (
        <span className="font-medium text-[#252525]">
          {profesor.nombre_completo}
        </span>
      ),
    },
    {
      key: "correo",
      header: "Correo electrónico",
      render: (profesor) =>
        correosPorUsuario.get(profesor.id_usuario) ?? "No disponible",
    },
    {
      key: "especialidad",
      header: "Especialidad",
      render: (profesor) => profesor.especialidad || "Sin especificar",
    },
    {
      key: "id",
      header: "ID de usuario",
      render: (profesor) => (
        <span className="font-mono text-xs text-[#888888]">
          {profesor.id_usuario}
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7">
      <PageHeader
        eyebrow="Administración"
        title="Profesores"
        description="Registra profesores y consulta los que forman parte del sistema."
      />

      <ProfessorCreateForm />

      <section className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-[#252525]">
            Profesores registrados
          </h2>

          <span className="text-sm text-[#888888]">
            {listaProfesores.length}{" "}
            {listaProfesores.length === 1 ? "profesor" : "profesores"}
          </span>
        </div>

        {listaProfesores.length === 0 ? (
          <EmptyState
            title="Todavía no hay profesores registrados"
            description="Cuando registres un profesor, aparecerá en esta lista."
          />
        ) : (
          <DataTable
            columns={columns}
            rows={listaProfesores}
            getRowKey={(profesor) => profesor.id_usuario}
          />
        )}
      </section>
    </div>
  );
}
