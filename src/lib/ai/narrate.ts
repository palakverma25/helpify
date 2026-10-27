import "server-only";
import type { DecisionAction } from "@/lib/rules/types";
import type { Locale } from "@/i18n/locales";

const language: Record<Locale, string> = {
  hi: "Hindi",
  en: "English",
};

export async function narrate(input: {
  locale: Locale;
  fallback: string;
  suggestedAction: DecisionAction;
  referenceNo: string;
  failedLines: string[];
}) {
  const apiKey = process.env.AI_API_KEY?.trim();
  if (!apiKey) return { summary: input.fallback, source: "template" as const };

  const base = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.AI_MODEL || "gpt-4o-mini";

  try {
    const response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 200,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "You help a tehsil officer read one application.",
              `Write only in ${language[input.locale]}.`,
              "Return JSON: {\"summary\":\"...\"}.",
              "The summary is two short sentences.",
              "Use only the failed lines given by the user. Do not add facts.",
              `The rules already chose "${input.suggestedAction}". Do not recommend a different action.`,
              "If there are no failed lines, say the file meets the written scheme.",
            ].join(" "),
          },
          {
            role: "user",
            content: JSON.stringify({
              reference: input.referenceNo,
              suggestedAction: input.suggestedAction,
              failedLines: input.failedLines,
            }),
          },
        ],
      }),
    });

    if (!response.ok) return { summary: input.fallback, source: "template" as const };
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(content) as { summary?: unknown };
    if (typeof parsed.summary !== "string") {
      return { summary: input.fallback, source: "template" as const };
    }
    const summary = parsed.summary.trim();
    if (summary.length < 10 || summary.length > 600) {
      return { summary: input.fallback, source: "template" as const };
    }
    return { summary, source: "model" as const };
  } catch {
    return { summary: input.fallback, source: "template" as const };
  }
}
