"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { answerQuestion } from "@/lib/ai/answer";
import { isLocale, type Locale } from "@/i18n/locales";
import { prisma } from "@/lib/db";
import { isDecisionAction } from "@/lib/rules/types";
import { getCase } from "@/server/cases";
import { requireOfficer } from "@/server/session";

export async function decideApplication(formData: FormData) {
  const localeValue = String(formData.get("locale") ?? "hi");
  const locale: Locale = isLocale(localeValue) ? localeValue : "hi";
  const applicationId = String(formData.get("applicationId") ?? "");
  const actionValue = formData.get("action");
  const note = String(formData.get("note") ?? "").trim();
  const officer = await requireOfficer(locale);

  if (!isDecisionAction(actionValue)) {
    redirect(`/${locale}/applications/${applicationId}?error=note`);
  }

  const current = await getCase(officer.id, applicationId, locale, { narrative: false });
  if (!current) redirect(`/${locale}`);
  if (!current.canDecide) {
    redirect(`/${locale}/applications/${applicationId}?error=closed`);
  }

  const needsNote = actionValue !== current.suggestion || actionValue !== "approved";
  if (needsNote && note.length < 8) {
    redirect(`/${locale}/applications/${applicationId}?error=note`);
  }

  const lines = current.checklist.flatMap((item) => item.details);
  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.application.updateMany({
        where: { id: applicationId, status: { in: ["pending", "returned"] } },
        data: { status: actionValue },
      });
      if (updated.count !== 1) throw new Error("CLOSED");
      await tx.decision.create({
        data: {
          applicationId,
          officerId: officer.id,
          action: actionValue,
          note,
          suggestedAction: current.suggestion,
          suggestionOverridden: actionValue !== current.suggestion,
          findingsSnapshot: { lines, suggestion: current.suggestion },
        },
      });
      await tx.auditLog.create({
        data: {
          applicationId,
          officerId: officer.id,
          event: "decision",
          payload: {
            action: actionValue,
            suggestedAction: current.suggestion,
            overridden: actionValue !== current.suggestion,
            referenceNo: current.referenceNo,
          },
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CLOSED") {
      redirect(`/${locale}/applications/${applicationId}?error=closed`);
    }
    throw error;
  }

  revalidatePath(`/${locale}`);
  revalidatePath(`/${locale}/applications/${applicationId}`);
  redirect(`/${locale}/applications/${applicationId}?saved=1`);
}

export async function narrateApplication(input: { locale: string; applicationId: string }) {
  const locale: Locale = isLocale(input.locale) ? input.locale : "hi";
  const officer = await requireOfficer(locale);
  const file = await getCase(officer.id, input.applicationId, locale);
  if (!file) return { summary: "", source: "template" as const };
  return { summary: file.summary, source: file.narrativeSource };
}

export async function askAboutApplication(input: {
  locale: string;
  applicationId: string;
  question: string;
  earlier: unknown;
}) {
  const locale: Locale = isLocale(input.locale) ? input.locale : "hi";
  const question = input.question.trim();
  if (question.length < 2 || question.length > 400) return { error: "empty" as const };

  const officer = await requireOfficer(locale);
  const file = await getCase(officer.id, input.applicationId, locale, { narrative: false });
  if (!file) return { error: "unavailable" as const };

  return answerQuestion({
    locale,
    question,
    earlier: earlierTurns(input.earlier),
    file: {
      reference: file.referenceNo,
      status: file.status,
      applicant: file.applicantName,
      locality: file.locality,
      service: file.serviceName,
      suggestion: file.suggestion,
      confidence: file.confidence,
      fields: file.fields,
      documents: file.documents,
      conditions: file.checklist.map((item) => ({
        met: item.passed,
        rule: item.summary,
        failures: item.details,
      })),
    },
  });
}

function earlierTurns(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(-3).flatMap((turn: { question?: unknown; answer?: unknown }) => {
    const question = typeof turn?.question === "string" ? turn.question.trim() : "";
    const answer = typeof turn?.answer === "string" ? turn.answer.trim() : "";
    if (question.length < 2 || question.length > 400 || answer.length < 2 || answer.length > 800) {
      return [];
    }
    return [{ question, answer }];
  });
}
