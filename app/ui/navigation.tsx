import Link from "next/link";
import { logoutAction } from "@/app/auth/actions";

type Rol = "administrador" | "profesor" | "estudiante";

const enlacesPorRol: Record<Rol, { nombre: string; href: string }[]> = {
  administrador: [
    { nombre: "Inicio", href: "/inicio" },
    { nombre: "Estudiantes", href: "/admin/estudiantes" },
    { nombre: "Profesores", href: "/admin/profesores" },
    { nombre: "Materias", href: "/admin/materias" },
    { nombre: "Grupos", href: "/admin/grupos" },
    { nombre: "Inscripciones", href: "/admin/inscripciones" },
    { nombre: "Calificaciones", href: "/admin/calificaciones" },
  ],
  profesor: [
    { nombre: "Inicio", href: "/inicio" },
    { nombre: "Mis grupos", href: "/profesor/grupos" },
  ],
  estudiante: [
    { nombre: "Inicio", href: "/inicio" },
    { nombre: "Materias", href: "/estudiante/materias" },
    { nombre: "Mis inscripciones", href: "/estudiante/inscripciones" },
    { nombre: "Mis calificaciones", href: "/estudiante/calificaciones" },
  ],
};

type NavigationProps = {
  rol: Rol;
};

export function Navigation({ rol }: NavigationProps) {
  const enlaces = enlacesPorRol[rol];

  return (
    <nav className="border-b">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 p-4">
        <div className="mr-2 font-semibold">SGE</div>

        {enlaces.map((enlace) => (
          <Link
            key={enlace.href}
            href={enlace.href}
            className="rounded-md px-3 py-2 text-sm hover:bg-gray-100"
          >
            {enlace.nombre}
          </Link>
        ))}

        <form action={logoutAction} className="ml-auto">
          <button
            type="submit"
            className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </nav>
  );
}
