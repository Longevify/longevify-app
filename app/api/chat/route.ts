import type { NextRequest } from "next/server";
import { BIOMARKERS, PATIENT } from "@/lib/mock-data";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { loadConciergeContext } from "@/lib/ai/context";
import { getFallbackReply } from "@/lib/ai/fallback-chat";

// Runtime nodejs (default) — supabase ssr + cookies precisam do node runtime.
// Nada de edge aqui: a chamada de LLM é IO-bound, edge não traz ganho real.

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatBody {
  messages: ChatMessage[];
}

// Provider preference order (Lucas 2026-05: "Dr. Lon está demorando muito
// para responder"). Reordenado pra priorizar latência:
//
// 1. ANTHROPIC_API_KEY → Claude Haiku 4.5 com prompt caching explícito
//    (cache_control: ephemeral). TTFT ~300ms, sem reasoning interno.
//    PRIMÁRIO agora — antes era 2º depois de Kimi.
// 2. MOONSHOT_API_KEY → Kimi K2.5. É reasoning model — stream começa
//    com `reasoning_content` (chain-of-thought interno) ANTES do content
//    visível. TTFT efetivo (até o user ver texto) é 2-4s — muito lento
//    pra chat. Mantido como 2º só se Haiku falhar/sem key.
// 3. OPENAI_API_KEY → gpt-4o-mini (cache automático também)
// 4. Sem nada configurado → fallback rule-based
const ANTHROPIC_MODEL = "claude-haiku-4-5";
const MOONSHOT_MODEL = "kimi-k2.5";
const MOONSHOT_BASE_URL = "https://api.moonshot.ai/v1";
const OPENAI_MODEL = "gpt-4o-mini";

// max_tokens cap razoável pra resposta de Concierge — entre 200-500 tokens
// é o range típico (~80-200 palavras). Cap de 1024 protege contra resposta
// run-away (LLM viajando) sem cortar respostas reais. Antes era 4096 nos
// providers OpenAI-compat — desperdício e tail latency longa.
const MAX_OUTPUT_TOKENS = 1024;

export async function POST(request: NextRequest) {
  let body: ChatBody;
  try {
    body = (await request.json()) as ChatBody;
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const lastUser = [...messages].reverse().find((m) => m.role === "user");

  // Carrega contexto real do user logado (Wave 3) — perfil + intake +
  // biomarcadores reais + uploads + wearables.
  //
  // Catch é fallback DEMO marcado explicitamente (isDemo=true) pra evitar
  // o bug onde uma falha no Supabase mid-request fazia o user real receber
  // dados do João Silva mock como se fossem dele — o LLM cumprimentava
  // "Olá, João!" e atribuía longevifyScore=70/idadeBio=25 sem confirmar.
  const ctx = await loadConciergeContext().catch(() => ({
    patient: PATIENT,
    biomarkers: BIOMARKERS,
    extras: undefined,
    isDemo: true,
    hasExamData: true,
  }));
  const { patient, biomarkers, extras, isDemo, hasExamData } = ctx;

  const systemPrompt = buildSystemPrompt(patient, biomarkers, extras, {
    isDemo,
    hasExamData,
  });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const moonshotKey = process.env.MOONSHOT_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // Anthropic Haiku 4.5 — preferência 1 (sem reasoning, TTFT ~300ms)
  if (anthropicKey) {
    return streamAnthropic({
      apiKey: anthropicKey,
      systemPrompt,
      messages,
      lastUser,
    });
  }

  // Moonshot Kimi K2.5 — preferência 2 (reasoning model, mais lento)
  if (moonshotKey) {
    return streamOpenAICompatible({
      apiKey: moonshotKey,
      baseURL: MOONSHOT_BASE_URL,
      model: MOONSHOT_MODEL,
      systemPrompt,
      messages,
      lastUser,
    });
  }

  if (openaiKey) {
    return streamOpenAICompatible({
      apiKey: openaiKey,
      model: OPENAI_MODEL,
      systemPrompt,
      messages,
      lastUser,
    });
  }

  return streamFallback(lastUser?.content ?? "");
}

// ──────────────────────────────────────────────────────────────────────────
// Anthropic streaming
async function streamAnthropic({
  apiKey,
  systemPrompt,
  messages,
  lastUser,
}: {
  apiKey: string;
  systemPrompt: string;
  messages: ChatMessage[];
  lastUser?: ChatMessage;
}): Promise<Response> {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { default: Anthropic } = await import("@anthropic-ai/sdk");
        const client = new Anthropic({ apiKey });
        // Anthropic prompt caching:
        //   docs.claude.com/en/build-with-claude/prompt-caching
        //
        // O system prompt do Concierge tem ~3-5k tokens (perfil + biomarcadores
        // + instruções clínicas) e é IDÊNTICO entre todas as mensagens da mesma
        // sessão. Marcando ele com cache_control: { type: "ephemeral" }, a
        // Anthropic guarda esse prefixo por 5 min — chamadas subsequentes
        // pagam 10% do custo desses tokens (e voltam em ~latência reduzida).
        //
        // Limite: precisa ter >=1024 tokens cacheáveis pro cache valer.
        // Se estiver abaixo, a API ignora silenciosamente o cache_control
        // e cobra normal — sem erro. Por isso é seguro deixar sempre ligado.
        const response = await client.messages.stream({
          model: ANTHROPIC_MODEL,
          max_tokens: MAX_OUTPUT_TOKENS,
          system: [
            {
              type: "text",
              text: systemPrompt,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        });
        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        // Log usage pra validar que prompt cache está hitando. Em mensagem
        // 1 da sessão: cache_creation_input_tokens > 0, cache_read = 0.
        // Em mensagens subsequentes: cache_read_input_tokens deve ser
        // o size do system prompt e input_tokens fica baixo. Se cache_read
        // sempre 0 em mensagens 2+, há algo invalidando o prefix (ex:
        // timestamp na system prompt) — debug aqui.
        try {
          const final = await response.finalMessage();
          // eslint-disable-next-line no-console
          console.log("[concierge anthropic]", {
            input: final.usage?.input_tokens,
            cache_read: final.usage?.cache_read_input_tokens,
            cache_create: final.usage?.cache_creation_input_tokens,
            output: final.usage?.output_tokens,
            stop: final.stop_reason,
          });
        } catch {
          // Sem fatal — log é opcional.
        }
        controller.close();
      } catch {
        const fallback = getFallbackReply(
          lastUser?.content ?? "",
          PATIENT,
          BIOMARKERS,
        );
        controller.enqueue(encoder.encode(fallback));
        controller.close();
      }
    },
  });
  return streamResponse(stream);
}

// ──────────────────────────────────────────────────────────────────────────
// OpenAI-compatible streaming (Moonshot/Kimi, OpenAI, etc.)
async function streamOpenAICompatible({
  apiKey,
  baseURL,
  model,
  systemPrompt,
  messages,
  lastUser,
}: {
  apiKey: string;
  baseURL?: string;
  model: string;
  systemPrompt: string;
  messages: ChatMessage[];
  lastUser?: ChatMessage;
}): Promise<Response> {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { default: OpenAI } = await import("openai");
        const client = new OpenAI({ apiKey, baseURL });

        const completion = await client.chat.completions.create({
          model,
          max_tokens: MAX_OUTPUT_TOKENS,
          stream: true,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
          ],
        });

        for await (const chunk of completion) {
          // Kimi reasoning models stream `reasoning_content` first (chain-of-thought)
          // and then the user-visible `content`. We discard the reasoning and only
          // forward the final answer to the chat UI.
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) controller.enqueue(encoder.encode(delta));
        }
        controller.close();
      } catch {
        const fallback = getFallbackReply(
          lastUser?.content ?? "",
          PATIENT,
          BIOMARKERS,
        );
        controller.enqueue(encoder.encode(fallback));
        controller.close();
      }
    },
  });
  return streamResponse(stream);
}

// ──────────────────────────────────────────────────────────────────────────
// Fallback (sem provider configurado)
function streamFallback(userMessage: string): Response {
  const reply = getFallbackReply(userMessage, PATIENT, BIOMARKERS);
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const chunks = reply.match(/.{1,8}/gs) ?? [reply];
      let i = 0;
      const push = () => {
        if (i >= chunks.length) {
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(chunks[i++]));
        setTimeout(push, 12);
      };
      push();
    },
  });
  return streamResponse(stream);
}

function streamResponse(stream: ReadableStream): Response {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
