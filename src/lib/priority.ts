const dayMs = 86_400_000;

export function daysUntilDue(submittedAt: Date, slaDays: number, now: Date) {
  const due = submittedAt.getTime() + slaDays * dayMs;
  return Math.floor((due - now.getTime()) / dayMs);
}

export function compareQueue(
  left: { severity: number; daysLeft: number; submittedAt: number },
  right: { severity: number; daysLeft: number; submittedAt: number },
) {
  if (right.severity !== left.severity) return right.severity - left.severity;
  if (left.daysLeft !== right.daysLeft) return left.daysLeft - right.daysLeft;
  return left.submittedAt - right.submittedAt;
}
