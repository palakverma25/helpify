"use client";

import { useEffect, useState } from "react";
import { narrateApplication } from "@/server/actions";

const remembered = new Map<string, { summary: string; source: "model" }>();
const pending = new Map<string, Promise<{ summary: string; source: "template" | "model" }>>();

function loadSummary(locale: string, applicationId: string) {
  const key = `${locale}:${applicationId}`;
  const saved = remembered.get(key);
  if (saved) return Promise.resolve(saved);
  const current = pending.get(key);
  if (current) return current;
  const request = narrateApplication({ locale, applicationId }).then((result) => {
    if (result.source === "model" && result.summary) {
      remembered.set(key, { summary: result.summary, source: "model" });
    }
    return result;
  });
  pending.set(key, request);
  void request.finally(() => pending.delete(key));
  return request;
}

export function FileSummary({
  locale,
  applicationId,
  summary,
  sourceTemplate,
  sourceModel,
}: {
  locale: string;
  applicationId: string;
  summary: string;
  sourceTemplate: string;
  sourceModel: string;
}) {
  const [text, setText] = useState(summary);
  const [fromModel, setFromModel] = useState(false);

  useEffect(() => {
    let active = true;
    void loadSummary(locale, applicationId).then((result) => {
      if (!active || result.source !== "model" || !result.summary) return;
      setText(result.summary);
      setFromModel(true);
    });
    return () => {
      active = false;
    };
  }, [locale, applicationId]);

  return (
    <>
      <p className="mt-2 text-sm">{text}</p>
      <p className="mt-2 text-sm text-muted">{fromModel ? sourceModel : sourceTemplate}</p>
    </>
  );
}
