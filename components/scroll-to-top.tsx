"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Sobe pro topo da página em toda mudança de rota.
 *
 * O Next App Router já tem scroll-restoration por padrão pra navegação
 * via <Link>, mas:
 *   1. Quando o user clica num link DENTRO da mesma rota com hash
 *      (ex: /scans → /scans#mthfr), o scroll vai pro hash e fica lá
 *      mesmo se ele depois clica num link sem hash. Isso é confuso.
 *   2. Em algumas transições com state (ex: navegando entre tabs do
 *      top-nav após um modal abrir), o Next NÃO restaura scroll.
 *   3. Em PWA standalone iOS, o Next às vezes pula essa lógica por
 *      causa do swipe-back nativo da WebKit.
 *
 * Esse componente força scroll(0,0) em qualquer mudança de pathname
 * — mais simples e previsível.
 */
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // Se a URL atual tem hash, NÃO força scroll-to-top — o user clicou
    // num anchor link e quer ir pra seção específica.
    if (typeof window !== "undefined" && window.location.hash) return;

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
