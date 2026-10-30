import type { ReactNode } from "react";
import { RoleShell } from "@/app/ui/role-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <RoleShell role="administrador">{children}</RoleShell>;
}
