import type { MetadataRoute } from "next";

/**
 * PWA Manifest — gerado dinamicamente pelo Next 16 metadata API.
 * URL servida automaticamente em /manifest.webmanifest
 *
 * Cores derivadas da paleta brand-* em globals.css:
 *   theme_color = brand-700 = #1f5d3f (verde primário)
 *   background_color = brand-50 = #f4faf6 (off-white pra splash)
 *
 * Display "standalone" — esconde browser chrome, parece app nativo
 * quando "Add to Home Screen" no Safari iOS / Chrome Android.
 *
 * Categories — usado por stores e launchers pra classificar.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Longevify · Plataforma de Longevidade",
    short_name: "Longevify",
    description:
      "Sua plataforma personalizada de longevidade — biomarcadores, protocolo médico, wearables e concierge clínico.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#1f5d3f",
    background_color: "#0d2818",
    lang: "pt-BR",
    dir: "ltr",
    categories: ["health", "medical", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
    screenshots: [
      // Adicionar quando tiver screenshots reais.
      // Apple/Chrome usam pra preview "Install" prompt.
    ],
    shortcuts: [
      {
        name: "Concierge IA",
        short_name: "Concierge",
        description: "Conversar com o Concierge Longevify",
        url: "/concierge",
      },
      {
        name: "Meus Dados",
        short_name: "Dados",
        description: "Ver biomarcadores e Longevify Score",
        url: "/dados",
      },
      {
        name: "Agendar coleta",
        short_name: "Coleta",
        description: "Marcar nova coleta domiciliar",
        url: "/coleta/agendar",
      },
    ],
    prefer_related_applications: false,
    // related_applications populated quando app nativo estiver na store
    related_applications: [],
  };
}
