import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CastingApp — Gestiona Castings y trabajos",
  description: "Plataforma personal para actores. Gestiona tus castings, proyectos, finanzas y contactos.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
