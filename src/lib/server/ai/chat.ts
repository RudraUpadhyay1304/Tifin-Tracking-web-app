"use server";

import { revalidatePath } from "next/cache";
import { functionDeclarations, toolByName, WRITE_TOOLS } from "./tools";
import { todayKolkata } from "@/lib/utils";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export interface AiProposal {
  tool: string;
  args: Record<string, unknown>;
  summary: string;
}

export interface AiResult {
  reply?: string;
  proposal?: AiProposal;
  needsConfig?: boolean;
}

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function apiKey(): string | null {
  return process.env.GEMINI_API_KEY ?? null;
}

function model(): string {
  return process.env.GEMINI_MODEL || "gemini-2.0-flash";
}

function systemPrompt(): string {
  return [
    "You are the assistant of a small Indian tiffin (lunch box) business owned by one person.",
    "You can read and manage business data through tools. Today's date: " + todayKolkata() + " (Asia/Kolkata).",
    "Business rules:",
    "- Each customer pays a monthly charge. The daily rate = monthly charge / (days in month - Sundays - global holidays - pauses).",
    "- Sundays are automatically off if the 'Sunday off' setting is on (default).",
    "- Calendar statuses: delivered (default), skipped (customer skipped a meal), extra (extra meal, billed), holiday, sunday_off.",
    "- 'Pending' for a month = this month's due minus payments recorded this month.",
    "Language rules:",
    "- Always answer in the same language the user wrote in (English or Hindi). For Hindi use Devanagari script.",
    "- Keep answers short, warm and simple, like talking to a shop owner. Use ₹ for money.",
    "- When the user asks to do something (add/update/delete/record/mark), ALWAYS call the matching tool with exact arguments; never invent data. Convert dates to YYYY-MM-DD based on today's date.",
    "- When the user only asks a question, call a read tool first (get_stats, list_customers, get_customer, get_month_summary, get_payments, get_menu, get_holidays) to get real data, then answer from the tool result.",
  ].join("\n");
}

const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-flash-latest",
].filter((m): m is string => Boolean(m));

async function callGemini(
  messages: ChatMessage[],
  contents: unknown[],
): Promise<{ text: string | null; functionCall: { name: string; args: Record<string, unknown> } | null }> {
  const key = apiKey();
  if (!key) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  let lastError: Error | null = null;
  const modelsToTry = Array.from(new Set(CANDIDATE_MODELS));

  for (const m of modelsToTry) {
    try {
      const res = await fetch(`${API_BASE}/${m}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt() }] },
          contents,
          tools: [{ functionDeclarations: functionDeclarations() }],
          toolConfig: { functionCallingConfig: { mode: "AUTO" } },
          generationConfig: { temperature: 0.3 },
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        lastError = new Error(`Gemini API error ${res.status}: ${body.slice(0, 300)}`);
        continue;
      }

      const data = (await res.json()) as {
        candidates?: {
          content?: { parts?: { text?: string; functionCall?: { name?: string; args?: Record<string, unknown> } }[] };
        }[];
      };

      const parts = data.candidates?.[0]?.content?.parts ?? [];
      let text: string | null = null;
      let functionCall: { name: string; args: Record<string, unknown> } | null = null;
      for (const part of parts) {
        if (part.functionCall?.name) {
          functionCall = { name: part.functionCall.name, args: part.functionCall.args ?? {} };
        } else if (part.text) {
          text = part.text;
        }
      }
      return { text, functionCall };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      continue;
    }
  }

  throw lastError ?? new Error("Failed to call Gemini API");
}

function toContents(messages: ChatMessage[], userText: string): unknown[] {
  const contents: unknown[] = [
    ...messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.text }] })),
    { role: "user", parts: [{ text: userText }] },
  ];
  return contents;
}

function summarizeProposal(name: string, args: Record<string, unknown>): string {
  const prettyArgs = Object.entries(args)
    .map(([k, v]) => `${k}: ${typeof v === "number" ? "₹" + v : v}`)
    .join(", ");
  return `${name} (${prettyArgs})`;
}

async function smartOfflineChat(userText: string): Promise<AiResult> {
  const text = userText.toLowerCase().trim();

  if (text.includes("customer") || text.includes("ग्राहक") || text.includes("client") || text.includes("list")) {
    const tool = toolByName("list_customers");
    if (tool) {
      const res = await tool.execute({});
      return { reply: `📊 Customer List:\n${res}` };
    }
  }

  if (text.includes("menu") || text.includes("khana") || text.includes("खाना") || text.includes("food")) {
    const tool = toolByName("get_menu");
    if (tool) {
      const res = await tool.execute({});
      return { reply: `🍱 Weekly Menu:\n${res}` };
    }
  }

  if (text.includes("earning") || text.includes("income") || text.includes("stat") || text.includes("total") || text.includes("kamai") || text.includes("कमाई")) {
    const tool = toolByName("get_stats");
    if (tool) {
      const res = await tool.execute({});
      return { reply: `📈 Business Statistics:\n${res}` };
    }
  }

  if (text.includes("payment") || text.includes("paid") || text.includes("collection") || text.includes("paisa") || text.includes("पैसा")) {
    const tool = toolByName("get_payments");
    if (tool) {
      const res = await tool.execute({});
      return { reply: `💳 Payment Records:\n${res}` };
    }
  }

  if (text.includes("holiday") || text.includes("chutti") || text.includes("pause") || text.includes("छुट्टी")) {
    const tool = toolByName("get_holidays");
    if (tool) {
      const res = await tool.execute({});
      return { reply: `🗓️ Holidays & Pauses:\n${res}` };
    }
  }

  if (text.includes("pending") || text.includes("baki") || text.includes("due") || text.includes("बकाया")) {
    const tool = toolByName("get_month_summary");
    if (tool) {
      const res = await tool.execute({});
      return { reply: `📋 Monthly Dues Summary:\n${res}` };
    }
  }

  const statsTool = toolByName("get_stats");
  const statsRes = statsTool ? await statsTool.execute({}) : "";
  return {
    reply: `👋 Hello! I am your Tiffin Business Assistant.\n\n${statsRes}\n\nYou can ask me about:\n• Customers ("Show customers")\n• Menu ("What is the menu?")\n• Stats & Dues ("Show business stats")\n• Payments ("Recent collections")\n• Holidays ("Upcoming holidays")`,
  };
}

/** First step: ask the model. Returns a reply, or a write proposal awaiting confirmation. */
export async function aiChat(
  messages: ChatMessage[],
  userText: string,
): Promise<AiResult> {
  try {
    const contents = toContents(messages, userText);
    const { text, functionCall } = await callGemini(messages, contents);

    if (functionCall) {
      const tool = toolByName(functionCall.name);
      if (!tool) {
        return { reply: text ?? "I found an unknown action. Please try again." };
      }
      if (WRITE_TOOLS.has(tool.name)) {
        return {
          proposal: {
            tool: tool.name,
            args: functionCall.args,
            summary: summarizeProposal(tool.name, functionCall.args),
          },
        };
      }
      let result: string;
      try {
        result = await tool.execute(functionCall.args);
      } catch (e) {
        result = `Error: ${e instanceof Error ? e.message : "Unknown error"}`;
      }
      const contents2 = [
        ...contents,
        {
          role: "model",
          parts: [{ functionCall: { name: tool.name, args: functionCall.args } }],
        },
        {
          role: "user",
          parts: [{ functionResponse: { name: tool.name, response: { result } } }],
        },
      ];
      try {
        const { text: finalText } = await callGemini(messages, contents2);
        return { reply: finalText ?? result };
      } catch {
        return { reply: result };
      }
    }

    return { reply: text ?? "Hmm, I couldn't figure that out. Could you rephrase?" };
  } catch (e) {
    console.warn("Gemini API fallback to smart offline assistant:", e);
    return smartOfflineChat(userText);
  }
}

/** Second step: execute an approved write proposal and let the model confirm. */
export async function aiConfirm(
  messages: ChatMessage[],
  userText: string,
  proposal: AiProposal,
): Promise<AiResult> {
  try {
    const tool = toolByName(proposal.tool);
    if (!tool) return { reply: "Unknown action." };
    let result: string;
    try {
      result = await tool.execute(proposal.args);
      revalidatePath("/", "layout");
    } catch (e) {
      result = `Error: ${e instanceof Error ? e.message : "Unknown error"}`;
    }
    let msgs = messages;
    if (
      msgs.length > 0 &&
      msgs[msgs.length - 1].role === "user" &&
      msgs[msgs.length - 1].text === userText
    ) {
      msgs = msgs.slice(0, -1);
    }
    const contents2 = [
      ...toContents(msgs, userText),
      {
        role: "model",
        parts: [{ functionCall: { name: tool.name, args: proposal.args } }],
      },
      {
        role: "user",
        parts: [{ functionResponse: { name: tool.name, response: { result } } }],
      },
    ];
    try {
      const { text: finalText } = await callGemini(messages, contents2);
      return { reply: finalText ?? result };
    } catch {
      return { reply: `Action completed successfully: ${result}` };
    }
  } catch (e) {
    return {
      reply: `Action executed: ${proposal.summary}`,
    };
  }
}

