import { Navigation } from "@/app/ui/navigation";

export default function EstudianteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navigation rol="estudiante" />
      {children}
    </>
  );
}
