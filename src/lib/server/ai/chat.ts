"use server";

import { revalidatePath } from "next/cache";
import { functionDeclarations, openAiTools, toolByName, WRITE_TOOLS } from "./tools";
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

interface LlmResponse {
  text: string | null;
  functionCall: { name: string; args: Record<string, unknown> } | null;
  provider: string;
}

function toOpenAiMessages(messages: ChatMessage[], userText: string): unknown[] {
  return [
    { role: "system", content: systemPrompt() },
    ...messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.text,
    })),
    { role: "user", content: userText },
  ];
}

function summarizeProposal(name: string, args: Record<string, unknown>): string {
  const prettyArgs = Object.entries(args)
    .map(([k, v]) => `${k}: ${typeof v === "number" ? "₹" + v : v}`)
    .join(", ");
  return `${name} (${prettyArgs})`;
}

// 1. Primary Provider: NVIDIA API
async function callNvidiaApi(
  messages: ChatMessage[],
  userText: string,
  toolResultContext?: { toolName: string; args: Record<string, unknown>; result: string }
): Promise<LlmResponse> {
  const key = process.env.NVIDIA_API_KEY;
  if (!key || !key.trim()) {
    throw new Error("NVIDIA_API_KEY not configured");
  }

  const apiBase = (process.env.NVIDIA_API_BASE || "https://integrate.api.nvidia.com/v1").replace(/\/+$/, "");
  const modelName = process.env.NVIDIA_MODEL || "nvidia/nemotron-3-ultra-550b-a55b";

  let openAiMsgs = toOpenAiMessages(messages, userText);
  if (toolResultContext) {
    openAiMsgs = [
      ...openAiMsgs,
      {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: {
              name: toolResultContext.toolName,
              arguments: JSON.stringify(toolResultContext.args),
            },
          },
        ],
      },
      {
        role: "tool",
        tool_call_id: "call_1",
        content: toolResultContext.result,
      },
    ];
  }

  const res = await fetch(`${apiBase}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelName,
      messages: openAiMsgs,
      tools: openAiTools(),
      tool_choice: "auto",
      temperature: 0.3,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(25000),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(`NVIDIA API HTTP ${res.status}: ${errorBody.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: {
      message?: {
        content?: string | null;
        tool_calls?: {
          function?: {
            name?: string;
            arguments?: string;
          };
        }[];
      };
    }[];
  };

  const choice = data.choices?.[0]?.message;
  const text: string | null = choice?.content ?? null;
  let functionCall: { name: string; args: Record<string, unknown> } | null = null;

  if (choice?.tool_calls && choice.tool_calls.length > 0) {
    const fn = choice.tool_calls[0].function;
    if (fn?.name) {
      let parsedArgs: Record<string, unknown> = {};
      try {
        parsedArgs = fn.arguments ? JSON.parse(fn.arguments) : {};
      } catch {
        parsedArgs = {};
      }
      functionCall = { name: fn.name, args: parsedArgs };
    }
  }

  return { text, functionCall, provider: `NVIDIA (${modelName})` };
}

// 2. Fallback 1: OpenCode API
async function callOpenCodeApi(
  messages: ChatMessage[],
  userText: string,
  toolResultContext?: { toolName: string; args: Record<string, unknown>; result: string }
): Promise<LlmResponse> {
  const key = process.env.OPENCODE_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!key || !key.trim()) {
    throw new Error("OPENCODE_API_KEY not configured");
  }

  const apiBase = (process.env.OPENCODE_API_BASE || "https://opencode.ai/v1").replace(/\/+$/, "");
  const modelName = process.env.OPENCODE_MODEL || "nemotron-3-ultra-free";

  let openAiMsgs = toOpenAiMessages(messages, userText);
  if (toolResultContext) {
    openAiMsgs = [
      ...openAiMsgs,
      {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: {
              name: toolResultContext.toolName,
              arguments: JSON.stringify(toolResultContext.args),
            },
          },
        ],
      },
      {
        role: "tool",
        tool_call_id: "call_1",
        content: toolResultContext.result,
      },
    ];
  }

  const res = await fetch(`${apiBase}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelName,
      messages: openAiMsgs,
      tools: openAiTools(),
      tool_choice: "auto",
      temperature: 0.3,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(25000),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(`OpenCode API HTTP ${res.status}: ${errorBody.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: {
      message?: {
        content?: string | null;
        tool_calls?: {
          function?: {
            name?: string;
            arguments?: string;
          };
        }[];
      };
    }[];
  };

  const choice = data.choices?.[0]?.message;
  const text: string | null = choice?.content ?? null;
  let functionCall: { name: string; args: Record<string, unknown> } | null = null;

  if (choice?.tool_calls && choice.tool_calls.length > 0) {
    const fn = choice.tool_calls[0].function;
    if (fn?.name) {
      let parsedArgs: Record<string, unknown> = {};
      try {
        parsedArgs = fn.arguments ? JSON.parse(fn.arguments) : {};
      } catch {
        parsedArgs = {};
      }
      functionCall = { name: fn.name, args: parsedArgs };
    }
  }

  return { text, functionCall, provider: `OpenCode (${modelName})` };
}

// 3. Fallback 2: Google Gemini Flash
async function callGeminiApi(
  messages: ChatMessage[],
  userText: string,
  toolResultContext?: { toolName: string; args: Record<string, unknown>; result: string }
): Promise<LlmResponse> {
  const key = process.env.GEMINI_API_KEY;
  if (!key || !key.trim()) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const modelName = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const apiBase = "https://generativelanguage.googleapis.com/v1beta/models";

  const contents: unknown[] = [
    ...messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.text }] })),
    { role: "user", parts: [{ text: userText }] },
  ];

  if (toolResultContext) {
    contents.push(
      {
        role: "model",
        parts: [{ functionCall: { name: toolResultContext.toolName, args: toolResultContext.args } }],
      },
      {
        role: "user",
        parts: [{ functionResponse: { name: toolResultContext.toolName, response: { result: toolResultContext.result } } }],
      }
    );
  }

  const res = await fetch(`${apiBase}/${modelName}:generateContent?key=${key.trim()}`, {
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
    signal: AbortSignal.timeout(25000),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(`Gemini API HTTP ${res.status}: ${errorBody.slice(0, 200)}`);
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

  return { text, functionCall, provider: `Gemini (${modelName})` };
}

// Master Cascade Function: Primary (NVIDIA) -> Fallback 1 (OpenCode) -> Fallback 2 (Gemini)
async function callAiCascade(
  messages: ChatMessage[],
  userText: string,
  toolResultContext?: { toolName: string; args: Record<string, unknown>; result: string }
): Promise<LlmResponse> {
  const errors: string[] = [];

  // Primary: NVIDIA API
  try {
    return await callNvidiaApi(messages, userText, toolResultContext);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[AI Cascade] Primary (NVIDIA) failed, failing over to OpenCode:", msg);
    errors.push(`NVIDIA: ${msg}`);
  }

  // Fallback 1: OpenCode
  try {
    return await callOpenCodeApi(messages, userText, toolResultContext);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[AI Cascade] Fallback 1 (OpenCode) failed, failing over to Gemini:", msg);
    errors.push(`OpenCode: ${msg}`);
  }

  // Fallback 2: Google Gemini Flash
  try {
    return await callGeminiApi(messages, userText, toolResultContext);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[AI Cascade] Fallback 2 (Gemini) failed:", msg);
    errors.push(`Gemini: ${msg}`);
  }

  throw new Error(`All LLM API Providers Failed:\n- ${errors.join("\n- ")}`);
}

async function parseIntentFallback(userText: string): Promise<AiResult | null> {
  const text = userText.trim();
  const lower = text.toLowerCase();

  // Pattern: "Add Rahul Sharma with ₹3000 monthly charge"
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

  // Pattern: "Record 1500 payment from Rahul"
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

/** First step: query model cascade. Returns reply or proposal for write confirmation. */
export async function aiChat(
  messages: ChatMessage[],
  userText: string
): Promise<AiResult> {
  try {
    const { text, functionCall } = await callAiCascade(messages, userText);

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

      try {
        const { text: finalText } = await callAiCascade(messages, userText, {
          toolName: tool.name,
          args: functionCall.args,
          result,
        });
        return { reply: finalText ?? result };
      } catch {
        return { reply: result };
      }
    }

    return { reply: text ?? "I understand. How else can I help with your tiffin business?" };
  } catch (e) {
    console.warn("All LLM APIs failed, running local intent parser fallback:", e);
    const fallback = await parseIntentFallback(userText);
    if (fallback) return fallback;

    return {
      reply: `⚠️ AI Chat Notice: Rate limits or API connection issues occurred across providers.\n\nTo restore full AI capabilities, add your API keys in Vercel:\n- NVIDIA_API_KEY\n- OPENCODE_API_KEY\n- GEMINI_API_KEY`,
    };
  }
}

/** Second step: execute write proposal and get confirmation. */
export async function aiConfirm(
  messages: ChatMessage[],
  userText: string,
  proposal: AiProposal
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

    try {
      const { text: finalText } = await callAiCascade(msgs, userText, {
        toolName: tool.name,
        args: proposal.args,
        result,
      });
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
