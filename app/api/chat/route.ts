import type { NextRequest } from "next/server";
import { BIOMARKERS, PATIENT } from "@/lib/mock-data";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { getFallbackReply } from "@/lib/ai/fallback-chat";

export const runtime = "edge";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatBody {
  messages: ChatMessage[];
}

// Provider preference order:
// 1. MOONSHOT_API_KEY → Kimi K2 (chinês, OpenAI-compatible)
// 2. ANTHROPIC_API_KEY → Claude Sonnet 4.6
// 3. OPENAI_API_KEY → gpt-4o-mini
// 4. Sem nada configurado → fallback rule-based
const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const MOONSHOT_MODEL = "kimi-k2.5";
const MOONSHOT_BASE_URL = "https://api.moonshot.ai/v1";
const OPENAI_MODEL = "gpt-4o-mini";

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
  const systemPrompt = buildSystemPrompt(PATIENT, BIOMARKERS);

  const moonshotKey = process.env.MOONSHOT_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // Moonshot / Kimi K2 — OpenAI-compatible, preferência 1
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

  if (anthropicKey) {
    return streamAnthropic({
      apiKey: anthropicKey,
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
        const response = await client.messages.stream({
          model: ANTHROPIC_MODEL,
          max_tokens: 1024,
          system: systemPrompt,
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
          max_tokens: 4096,
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
