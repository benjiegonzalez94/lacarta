import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "LaCarta — Menús Digitales y Pedidos por WhatsApp",
    template: "%s | LaCarta",
  },
  description:
    "Plataforma multi-tenant de menús digitales para restaurantes con pedidos directos a WhatsApp y códigos QR en mesa.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-[#0F0F11] text-zinc-50 font-sans">
        {children}
      </body>
    </html>
  );
}
