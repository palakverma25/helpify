"use client";

import { useState, startTransition } from "react";
import { askAboutApplication } from "@/server/actions";

export function CaseChat({
  locale,
  applicationId,
  labels,
}: {
  locale: string;
  applicationId: string;
  labels: {
    title: string;
    hint: string;
    placeholder: string;
    submit: string;
    pending: string;
    empty: string;
    unavailable: string;
  };
}) {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Array<{ question: string; answer: string }>>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = question.trim();
    if (text.length < 2) {
      setError(labels.empty);
      return;
    }
    setError("");
    setPending(true);
    startTransition(async () => {
      const result = await askAboutApplication({
        locale,
        applicationId,
        question: text,
        earlier: turns.slice(-3),
      });
      setPending(false);
      if ("error" in result) {
        setError(result.error === "empty" ? labels.empty : labels.unavailable);
        return;
      }
      setTurns((current) => [...current, { question: text, answer: result.answer }]);
      setQuestion("");
    });
  }

  return (
    <div className="mt-5 border-t border-line pt-4">
      <h3 className="font-semibold">{labels.title}</h3>
      <p className="mt-1 text-sm text-muted">{labels.hint}</p>
      {turns.length > 0 ? (
        <ol className="mt-3 grid gap-3">
          {turns.map((turn, index) => (
            <li key={`${index}-${turn.question}`} className="text-sm">
              <p className="font-medium">{turn.question}</p>
              <p className="mt-1">{turn.answer}</p>
            </li>
          ))}
        </ol>
      ) : null}
      <form onSubmit={onSubmit} className="mt-3 grid gap-2">
        <label className="sr-only" htmlFor="file-question">
          {labels.title}
        </label>
        <input
          id="file-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={labels.placeholder}
          maxLength={400}
          className="h-11 rounded-md border border-line px-3 text-sm"
        />
        {error ? (
          <p role="alert" className="text-sm text-brick">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-md bg-pine text-sm font-semibold text-paper disabled:opacity-70"
        >
          {pending ? labels.pending : labels.submit}
        </button>
      </form>
    </div>
  );
}
