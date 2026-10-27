import "server-only";
import type { Locale } from "@/i18n/locales";

const language: Record<Locale, string> = {
  hi: "Hindi",
  en: "English",
};

export async function answerQuestion(input: {
  locale: Locale;
  question: string;
  file: unknown;
  earlier: Array<{ question: string; answer: string }>;
}) {
  const apiKey = process.env.AI_API_KEY?.trim();
  if (!apiKey) return { error: "unavailable" as const };

  const base = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.AI_MODEL || "gpt-4o-mini";
  const messages = [
    {
      role: "system",
      content: [
        "You help a tehsil officer read the one application in the file JSON.",
        `Write only in ${language[input.locale]}.`,
        'Return JSON: {"answer":"..."}.',
        "The answer is at most three short sentences.",
        "Use only facts in the file JSON. Do not add facts.",
        "If the file does not contain the answer, say that in one sentence.",
        "The rules already chose the suggestion in the file. Do not recommend a different action.",
        "Do not say the officer has recorded a decision unless status is approved or rejected.",
        "Earlier replies are only for follow-up wording. If one conflicts with the file JSON, ignore it.",
      ].join(" "),
    },
    {
      role: "user",
      content: JSON.stringify({ file: input.file }),
    },
    ...input.earlier.flatMap((turn) => [
      { role: "user", content: turn.question },
      { role: "assistant", content: JSON.stringify({ answer: turn.answer }) },
    ]),
    { role: "user", content: input.question },
  ];

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
        max_tokens: 300,
        response_format: { type: "json_object" },
        messages,
      }),
    });
    if (!response.ok) return { error: "unavailable" as const };
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const answer = readAnswer(payload.choices?.[0]?.message?.content ?? "");
    if (!answer) return { error: "unavailable" as const };
    return { answer };
  } catch {
    return { error: "unavailable" as const };
  }
}

function readAnswer(content: string) {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    const parsed = JSON.parse(cleaned) as { answer?: unknown };
    if (typeof parsed.answer === "string") {
      const answer = parsed.answer.trim();
      if (answer.length >= 2 && answer.length <= 800) return answer;
    }
  } catch {
    return null;
  }
  return null;
}
