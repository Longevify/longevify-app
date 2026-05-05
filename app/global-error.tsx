"use client";

/**
 * Global error boundary — fallback de último recurso quando o ROOT
 * layout falha (importa que tenha sua própria HTML/body porque o
 * layout normal não vai estar disponível).
 *
 * Cobre catastrophic errors tipo erro no Geist font load, no
 * CartProvider, etc. UI minimalista pq não pode depender de Tailwind
 * classes do projeto (assume que TUDO pode estar quebrado).
 */
export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          background: "#f4faf6",
          color: "#0d2818",
          padding: "24px",
          paddingTop: "max(env(safe-area-inset-top), 24px)",
        }}
      >
        <div
          style={{
            maxWidth: "420px",
            width: "100%",
            textAlign: "center",
            background: "#fff",
            border: "1px solid #e7f5ec",
            borderRadius: "16px",
            padding: "32px",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "#0d2818",
              color: "#fff",
              fontSize: "24px",
              fontWeight: 700,
              marginBottom: "16px",
            }}
          >
            !
          </div>
          <h1
            style={{
              fontSize: "20px",
              fontWeight: 600,
              margin: "0 0 8px",
            }}
          >
            Erro crítico
          </h1>
          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.5,
              color: "#4b5d56",
              margin: "0 0 20px",
            }}
          >
            O app encontrou um erro inesperado. Tenta recarregar a página.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              cursor: "pointer",
              background: "#1f5d3f",
              color: "#fff",
              border: "none",
              borderRadius: "9999px",
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Recarregar
          </button>
          {error.digest ? (
            <p
              style={{
                marginTop: "14px",
                fontSize: "11px",
                color: "#8a9994",
                fontFamily: "monospace",
              }}
            >
              ID: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
