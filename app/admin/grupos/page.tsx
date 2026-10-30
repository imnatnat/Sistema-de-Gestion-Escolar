import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/app/ui/page-header";
import { DataTable } from "@/app/ui/data-table";
import type { DataTableColumn } from "@/app/ui/data-table";
import { EmptyState } from "@/app/ui/empty-state";
import { StatusMessage } from "@/app/ui/status-message";

import { GroupCreateForm } from "./group-create-form";

export const dynamic = "force-dynamic";

type Materia = {
  id_materia: string;
  nombre: string;
  clave: string;
};

type Profesor = {
  id_usuario: string;
  nombre_completo: string;
  especialidad: string | null;
};

type Grupo = {
  id_grupo: string;
  id_materia: string;
  id_profesor: string;
  periodo: string;
  horario: string;
  cupo_maximo: number;
};

type GrupoTabla = Grupo & {
  materiaNombre: string;
  profesorNombre: string;
};

export default async function GruposAdminPage() {
  const { supabase, userId } = await requireUser();

  const { data: usuario, error: errorRol } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId)
    .single();

  if (errorRol || usuario?.rol !== "administrador") {
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

    return (
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <PageHeader
          eyebrow="Administración"
          title="Grupos"
          description="Crea grupos asignando materias y profesores para cada periodo escolar."
        />

        <StatusMessage type="error">
          No se pudieron cargar los datos de grupos. Inténtalo nuevamente.
        </StatusMessage>
      </div>
    );
  }

  const listaMaterias: Materia[] = materias ?? [];
  const listaProfesores: Profesor[] = profesores ?? [];
  const listaGrupos: Grupo[] = grupos ?? [];

  const materiasPorId = new Map(
    listaMaterias.map((materia) => [materia.id_materia, materia]),
  );

  const profesoresPorId = new Map(
    listaProfesores.map((profesor) => [profesor.id_usuario, profesor]),
  );

  const filas: GrupoTabla[] = listaGrupos.map((grupo) => {
    const materia = materiasPorId.get(grupo.id_materia);
    const profesor = profesoresPorId.get(grupo.id_profesor);

    return {
      ...grupo,
      materiaNombre: materia
        ? `${materia.clave} — ${materia.nombre}`
        : "Materia no disponible",
      profesorNombre: profesor?.nombre_completo ?? "Profesor no disponible",
    };
  });

  const columns: DataTableColumn<GrupoTabla>[] = [
    {
      key: "materia",
      header: "Materia",
      render: (grupo) => (
        <span className="font-medium text-[#252525]">
          {grupo.materiaNombre}
        </span>
      ),
    },
    {
      key: "profesor",
      header: "Profesor",
      render: (grupo) => grupo.profesorNombre,
    },
    {
      key: "periodo",
      header: "Periodo",
      render: (grupo) => (
        <span className="font-mono text-xs text-[#555555]">
          {grupo.periodo}
        </span>
      ),
    },
    {
      key: "horario",
      header: "Horario",
      render: (grupo) => grupo.horario,
    },
    {
      key: "cupo",
      header: "Cupo máximo",
      render: (grupo) => grupo.cupo_maximo,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7">
      <PageHeader
        eyebrow="Administración"
        title="Grupos"
        description="Crea grupos asignando materias y profesores para cada periodo escolar."
      />

      <GroupCreateForm materias={listaMaterias} profesores={listaProfesores} />

      <section className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-[#252525]">
            Grupos registrados
          </h2>

          <span className="text-sm text-[#888888]">
            {listaGrupos.length} {listaGrupos.length === 1 ? "grupo" : "grupos"}
          </span>
        </div>

        {listaGrupos.length === 0 ? (
          <EmptyState
            title="Todavía no hay grupos registrados"
            description="Cuando registres un grupo, aparecerá en esta lista."
          />
        ) : (
          <DataTable
            columns={columns}
            rows={filas}
            getRowKey={(grupo) => grupo.id_grupo}
          />
        )}
      </section>
    </div>
  );
}
