"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ChartColumn,
  ClipboardList,
  GraduationCap,
  House,
  Layers,
  LogOut,
  Menu,
  Settings,
  Users,
  UserRound,
  X,
} from "lucide-react";
import { logoutAction } from "@/app/auth/actions";

type Role = "administrador" | "profesor" | "estudiante";

type SidebarProps = {
  role: Role;
  email: string;
};

const navigation: Record<
  Role,
  { label: string; href: string; icon: typeof House }[]
> = {
  administrador: [
    { label: "Inicio", href: "/inicio", icon: House },
    { label: "Estudiantes", href: "/admin/estudiantes", icon: Users },
    { label: "Profesores", href: "/admin/profesores", icon: GraduationCap },
    { label: "Materias", href: "/admin/materias", icon: BookOpen },
    { label: "Grupos", href: "/admin/grupos", icon: Layers },
    {
      label: "Inscripciones",
      href: "/admin/inscripciones",
      icon: ClipboardList,
    },
    {
      label: "Calificaciones",
      href: "/admin/calificaciones",
      icon: ChartColumn,
    },
  ],
  profesor: [
    { label: "Inicio", href: "/inicio", icon: House },
    { label: "Mis grupos", href: "/profesor/grupos", icon: BookOpen },
    {
      label: "Evaluación",
      href: "/profesor/evaluacion",
      icon: ChartColumn,
    },
  ],
  estudiante: [
    { label: "Inicio", href: "/inicio", icon: House },
    { label: "Materias", href: "/estudiante/materias", icon: BookOpen },
    {
      label: "Mis inscripciones",
      href: "/estudiante/inscripciones",
      icon: ClipboardList,
    },
    {
      label: "Calificaciones",
      href: "/estudiante/calificaciones",
      icon: ChartColumn,
    },
  ],
};

const roleLabels: Record<Role, string> = {
  administrador: "Administrador",
  profesor: "Profesor",
  estudiante: "Estudiante",
};

export function Sidebar({ role, email }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = navigation[role];

  function closeMobileMenu() {
    setMobileOpen(false);
  }

  const sidebarContent = (
    <>
      <div className="flex h-16 items-center gap-3 border-b border-[#E9E9E7] px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#252525] text-white">
          <GraduationCap size={19} />
        </div>

        <span className="text-sm font-semibold tracking-tight text-[#252525]">
          Sistema Escolar
        </span>
      </div>

      <div className="px-3 pt-7">
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#999999]">
          Workspace
        </p>

        <nav aria-label="Navegación principal" className="space-y-1">
          {links.map(({ label, href, icon: Icon }) => {
            const active =
              pathname === href ||
              (href !== "/inicio" && pathname.startsWith(`${href}/`));

            return (
              <Link
                key={href}
                href={href}
                onClick={closeMobileMenu}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors ${
                  active
                    ? "bg-[#EAEAE8] font-semibold text-[#252525]"
                    : "text-[#666666] hover:bg-[#EEEEEC] hover:text-[#252525]"
                }`}
              >
                <Icon size={17} strokeWidth={1.8} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto border-t border-[#E9E9E7] p-3">
        <div className="mb-3 flex items-center gap-3 rounded-md px-2 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E9E9E7] text-[#555555]">
            <UserRound size={18} />
          </div>

          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-[#333333]">
              {email}
            </p>
            <p className="text-[11px] text-[#999999]">{roleLabels[role]}</p>
          </div>
        </div>

        <Link
          href="/inicio"
          onClick={closeMobileMenu}
          className="mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-[13px] text-[#666666] hover:bg-[#EEEEEC]"
        >
          <Settings size={17} strokeWidth={1.8} />
          Mi espacio
        </Link>

        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-[13px] text-[#666666] hover:bg-[#EEEEEC] hover:text-red-700"
          >
            <LogOut size={17} strokeWidth={1.8} />
            Cerrar sesión
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center border-b border-[#E9E9E7] bg-[#F7F7F5] px-4 md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={mobileOpen}
          className="rounded-md p-2 text-[#555555] hover:bg-[#EAEAE8]"
        >
          <Menu size={21} />
        </button>

        <span className="ml-3 text-sm font-semibold text-[#252525]">
          Sistema Escolar
        </span>
      </header>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={closeMobileMenu}
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[250px] flex-col border-r border-[#E9E9E7] bg-[#F7F7F5] transition-transform duration-200 md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="absolute right-3 top-4 md:hidden">
          <button
            type="button"
            onClick={closeMobileMenu}
            aria-label="Cerrar menú"
            className="rounded-md p-2 text-[#777777] hover:bg-[#EAEAE8]"
          >
            <X size={19} />
          </button>
        </div>

        {sidebarContent}
      </aside>
    </>
  );
}
