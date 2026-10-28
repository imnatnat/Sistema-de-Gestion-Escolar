import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/auth/actions";
import { requireUser } from "@/lib/auth/session";

type Accion = {
  titulo: string;
  descripcion: string;
  href: string;
};

const accionesPorRol: Record<string, Accion[]> = {
  estudiante: [
    {
      titulo: "Materias disponibles",
      descripcion: "Consulta materias, grupos, horarios y lugares disponibles.",
      href: "/estudiante/materias",
    },
    {
      titulo: "Mis inscripciones",
      descripcion:
        "Consulta tus grupos inscritos y las opciones de cancelación.",
      href: "/estudiante/inscripciones",
    },
    {
      titulo: "Mis calificaciones",
      descripcion: "Consulta las calificaciones registradas para tus materias.",
      href: "/estudiante/calificaciones",
    },
  ],
  profesor: [
    {
      titulo: "Mis grupos",
      descripcion:
        "Consulta tus grupos asignados y administra sus calificaciones.",
      href: "/profesor/grupos",
    },
  ],
  administrador: [
    {
      titulo: "Estudiantes",
      descripcion: "Consulta, administra y aprueba estudiantes.",
      href: "/admin/estudiantes",
    },
    {
      titulo: "Profesores",
      descripcion: "Administra los registros de profesores.",
      href: "/admin/profesores",
    },
    {
      titulo: "Materias",
      descripcion: "Administra el catálogo de materias.",
      href: "/admin/materias",
    },
    {
      titulo: "Grupos",
      descripcion:
        "Administra grupos, periodos, horarios y profesores asignados.",
      href: "/admin/grupos",
    },
    {
      titulo: "Inscripciones",
      descripcion:
        "Consulta y administra las inscripciones de los estudiantes.",
      href: "/admin/inscripciones",
    },
    {
      titulo: "Calificaciones",
      descripcion: "Consulta y administra las calificaciones registradas.",
      href: "/admin/calificaciones",
    },
  ],
};

export default async function InicioPage() {
  const { supabase, userId, email } = await requireUser();

  const { data: usuario, error: usuarioError } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId)
    .maybeSingle();

  if (usuarioError || !usuario) {
    throw new Error("No se pudo verificar el rol del usuario.");
  }

  const rol = usuario.rol;

  if (!accionesPorRol[rol]) {
    redirect("/pendiente-aprobacion");
  }

  let nombre = "";
  let matricula = "";
  let carrera = "";
  let semestre: number | null = null;
  let aprobado = true;

  if (rol === "estudiante") {
    const { data: estudiante, error } = await supabase
      .from("estudiantes")
      .select("nombre_completo, matricula, carrera, semestre, aprobado")
      .eq("id_usuario", userId)
      .maybeSingle();

    if (error) {
      throw new Error("No se pudo obtener la información del estudiante.");
    }

    if (!estudiante) {
      redirect("/pendiente-aprobacion");
    }

    nombre = estudiante.nombre_completo ?? "";
    matricula = estudiante.matricula ?? "";
    carrera = estudiante.carrera ?? "";
    semestre = estudiante.semestre ?? null;
    aprobado = estudiante.aprobado;
  } else if (rol === "profesor") {
    const { data: profesor, error } = await supabase
      .from("profesores")
      .select("nombre_completo")
      .eq("id_usuario", userId)
      .maybeSingle();

    if (error) {
      throw new Error("No se pudo obtener la información del profesor.");
    }

    nombre = profesor?.nombre_completo ?? "";
  }

  const acciones = accionesPorRol[rol];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 p-6 sm:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">Sistema de Gestión Escolar</p>
          <h1 className="mt-2 text-3xl font-semibold">
            Hola{nombre ? `, ${nombre}` : ""}
          </h1>
          <p className="mt-2 text-gray-600">
            Bienvenido al sistema de gestión escolar.
          </p>
        </div>

        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-md border px-4 py-2 hover:bg-gray-50"
          >
            Cerrar sesión
          </button>
        </form>
      </header>

      <section className="rounded-xl border p-6">
        <h2 className="mb-4 text-xl font-semibold">Mi información</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-sm text-gray-500">Correo</p>
            <p className="break-words">{email || "No disponible"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Rol</p>
            <p className="capitalize">{rol}</p>
          </div>

          {rol === "estudiante" && (
            <>
              <div>
                <p className="text-sm text-gray-500">Matrícula</p>
                <p>{matricula || "No registrada"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Carrera</p>
                <p>{carrera || "No registrada"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Semestre</p>
                <p>{semestre ?? "No registrado"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Estado de aprobación</p>
                <p>{aprobado ? "Aprobado" : "Pendiente de aprobación"}</p>
              </div>
            </>
          )}
        </div>
      </section>

      {rol === "estudiante" && !aprobado ? (
        <section className="rounded-xl border p-6">
          <h2 className="font-semibold">
            Tu cuenta está pendiente de aprobación
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Podrás acceder al catálogo de materias y realizar inscripciones
            cuando tu cuenta sea aprobada por un administrador.
          </p>
          <Link
            href="/pendiente-aprobacion"
            className="mt-4 inline-block underline"
          >
            Consultar estado
          </Link>
        </section>
      ) : (
        <section>
          <h2 className="mb-4 text-xl font-semibold">Acciones disponibles</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {acciones.map((accion) => (
              <Link
                key={accion.href}
                href={accion.href}
                className="rounded-xl border p-5 transition-colors hover:bg-gray-50"
              >
                <h3 className="font-semibold">{accion.titulo}</h3>
                <p className="mt-2 text-sm text-gray-600">
                  {accion.descripcion}
                </p>
                <span className="mt-4 inline-block text-sm underline">
                  Abrir módulo
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
