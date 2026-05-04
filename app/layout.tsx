import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart/provider";
import { ToastViewport } from "@/components/ui/toast";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { PWAInstallPrompt } from "@/components/pwa/install-prompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://longevify.co";
const SITE_DESCRIPTION =
  "Sua plataforma personalizada de longevidade — biomarcadores, protocolo médico, wearables e concierge clínico em um só lugar.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Longevify · Sua plataforma personalizada de longevidade",
    template: "%s · Longevify",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Longevify",
  keywords: [
    "longevidade",
    "saúde preventiva",
    "biomarcadores",
    "idade biológica",
    "exames de longevidade",
    "wearables",
    "healthtech",
    "Longevify",
  ],
  authors: [{ name: "Longevify" }],
  creator: "Longevify",
  publisher: "Longevify",
  category: "health",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  // PWA / iOS Safari Add-to-Home-Screen
  appleWebApp: {
    capable: true,
    title: "Longevify",
    statusBarStyle: "black-translucent",
  },
  // Manifest é exposto automaticamente via app/manifest.ts em /manifest.webmanifest
  // O Next 14+ detecta automaticamente `app/icon.png` e injeta a tag
  // <link rel="icon" href="/icon.png">. Sem override manual aqui pra
  // evitar referência a /favicon.svg que não existe mais.
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: "Longevify",
    title: "Longevify · Sua plataforma personalizada de longevidade",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Longevify · Sua plataforma personalizada de longevidade",
    description: SITE_DESCRIPTION,
    creator: "@longevify",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

/**
 * Viewport export — separado de metadata por convenção Next 16.
 * theme-color brand-700 controla cor da barra de status mobile + chrome
 * window decorations no PWA standalone.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1f5d3f" },
    { media: "(prefers-color-scheme: dark)", color: "#0d2818" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  // Permite zoom — acessibilidade. Apple WebKit aceita.
  userScalable: true,
  viewportFit: "cover",
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
        <ServiceWorkerRegister />
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
