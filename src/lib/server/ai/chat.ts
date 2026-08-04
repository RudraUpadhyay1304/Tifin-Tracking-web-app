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
  return process.env.GEMINI_API_KEY || null;
}

function model(): string {
  return process.env.GEMINI_MODEL || "gemini-3.6-flash";
}

function systemPrompt(): string {
  return [
    "You are the intelligent AI assistant of a small Indian tiffin (lunch box) business owned by one person.",
    "You can read data AND perform tasks/actions on the business through tools.",
    "Today's date: " + todayKolkata() + " (Asia/Kolkata).",
    "Business rules:",
    "- Each customer pays a monthly charge. The daily rate = monthly charge / (days in month - Sundays - global holidays - pauses).",
    "- Sundays are automatically off if the 'Sunday off' setting is on (default).",
    "- Calendar statuses: delivered (default), skipped (customer skipped a meal), extra (extra meal, billed), holiday, sunday_off.",
    "- 'Pending' for a month = this month's due minus payments recorded this month.",
    "Language rules:",
    "- Always answer in the same language the user wrote in (English or Hindi/Hinglish). For Hindi use Devanagari script or clean Roman script as requested.",
    "- Keep answers warm, professional and helpful. Use ₹ for money.",
    "- When the user asks to do something (add customer, update customer, delete customer, record payment, add holiday, set day status, update menu), ALWAYS invoke the matching tool with exact parameters.",
    "- When the user asks a question about business statistics, customers, dues, payments, menu, or holidays, ALWAYS invoke a read tool first (get_stats, list_customers, get_customer, get_month_summary, get_payments, get_menu, get_holidays) to fetch accurate data.",
  ].join("\n");
}

const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-3.6-flash",
  "gemini-3-flash",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
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
        signal: AbortSignal.timeout(30000),
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

async function parseIntentFallback(userText: string): Promise<AiResult | null> {
  const text = userText.trim();
  const lower = text.toLowerCase();

  // Pattern: "Add Rahul Sharma with ₹3000 monthly charge" or "Add customer Rahul 3000"
  const addMatch = text.match(/^add\s+(?:customer\s+)?(.+?)\s+(?:with\s+)?(?:₹|\$)?(\d+)(?:\s+monthly|\s+charge|\s+₹|\$)?$/i) ??
                   text.match(/^add\s+(?:customer\s+)?(.+?)\s+(?:with\s+)?(?:₹|\$)?(\d+)/i);
  if (addMatch) {
    const name = addMatch[1].replace(/with|charge|monthly|₹|\$/gi, "").trim();
    const charge = Number(addMatch[2]);
    if (name && !isNaN(charge) && charge > 0) {
      const args = { name, monthly_charge: charge };
      return {
        proposal: {
          tool: "add_customer",
          args,
          summary: summarizeProposal("add_customer", args),
        },
      };
    }
  }

  // Pattern: "Record 1500 payment from Rahul" or "Record payment Rahul 1500"
  const payMatch = text.match(/^record\s+(?:payment\s+)?(?:of\s+)?(?:₹|\$)?(\d+)\s+(?:from\s+)?(.+)/i) ??
                   text.match(/^record\s+(?:payment\s+)?(.+?)\s+(?:₹|\$)?(\d+)/i);
  if (payMatch) {
    let amount: number;
    let customer: string;
    if (!isNaN(Number(payMatch[1]))) {
      amount = Number(payMatch[1]);
      customer = payMatch[2].trim();
    } else {
      customer = payMatch[1].trim();
      amount = Number(payMatch[2]);
    }
    if (customer && !isNaN(amount) && amount > 0) {
      const args = { customer, amount };
      return {
        proposal: {
          tool: "record_payment",
          args,
          summary: summarizeProposal("record_payment", args),
        },
      };
    }
  }

  // Pattern: "Set Wednesday menu to Paneer"
  const menuMatch = text.match(/^set\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+menu\s+(?:to\s+)?(.+)/i);
  if (menuMatch) {
    const args = { day: menuMatch[1].toLowerCase(), item: menuMatch[2].trim() };
    return {
      proposal: {
        tool: "update_menu",
        args,
        summary: summarizeProposal("update_menu", args),
      },
    };
  }

  // Read Queries Fallback
  if (lower.includes("customer") || lower.includes("list")) {
    const tool = toolByName("list_customers");
    if (tool) return { reply: `📊 Customers:\n${await tool.execute({})}` };
  }
  if (lower.includes("stat") || lower.includes("earning") || lower.includes("income")) {
    const tool = toolByName("get_stats");
    if (tool) return { reply: `📈 Stats:\n${await tool.execute({})}` };
  }
  if (lower.includes("menu")) {
    const tool = toolByName("get_menu");
    if (tool) return { reply: `🍱 Menu:\n${await tool.execute({})}` };
  }

  return null;
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

    return { reply: text ?? "I understand. How else can I help with your tiffin business?" };
  } catch (e) {
    console.warn("Gemini API call failed, running intent parser fallback:", e);
    const fallback = await parseIntentFallback(userText);
    if (fallback) return fallback;

    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg.includes("401")) {
      return {
        reply: `⚠️ Invalid Gemini API Key (Error 401)\n\nTo enable full AI capabilities, generate a free API key at:\n👉 https://aistudio.google.com/apikey\n\nThen add GEMINI_API_KEY in your Vercel Project Settings!`,
      };
    }
    return { reply: `AI Chat Error: ${msg.slice(0, 150)}. Please try again.` };
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
      return { reply: finalText ?? (result.startsWith("Error:") ? result : `✅ ${result}`) };
    } catch {
      return { reply: result.startsWith("Error:") ? result : `✅ ${result}` };
    }
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return {
      reply: `Action result: ${err}`,
    };
  }
}


