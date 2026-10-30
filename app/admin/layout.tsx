import { Navigation } from "@/app/ui/navigation";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navigation rol="administrador" />
      {children}
    </>
  );
}
