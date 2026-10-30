import { Navigation } from "@/app/ui/navigation";

export default function ProfesorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navigation rol="profesor" />
      {children}
    </>
  );
}
