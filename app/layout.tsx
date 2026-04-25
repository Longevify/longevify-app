import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart/provider";
import { ToastViewport } from "@/components/ui/toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Longevify",
  description:
    "Sua plataforma personalizada de longevidade — biomarcadores, protocolo e concierge médico.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} antialiased`}>
      <body className="min-h-screen text-ink">
        <CartProvider>
          {children}
          <ToastViewport />
        </CartProvider>
      </body>
    </html>
  );
}
