import { addDays, isWeekend } from "date-fns";
import type { ComplaintCase } from "@/lib/types";

function addWorkingDays(startDate: Date, workingDays: number) {
  let date = new Date(startDate);
  let remaining = workingDays;

  while (remaining > 0) {
    date = addDays(date, 1);
    if (!isWeekend(date)) {
      remaining -= 1;
    }
  }

  return date;
}

export function applyEscalationRules(caseItem: ComplaintCase) {
  if (!caseItem.assignedAt || caseItem.firstResponseAt || caseItem.status === "Resolved") {
    return caseItem;
  }

  const escalationDate = addWorkingDays(new Date(caseItem.assignedAt), 7);
  if (new Date() < escalationDate) {
    return caseItem;
  }

  return {
    ...caseItem,
    status: "Escalated" as const,
    escalatedAt: caseItem.escalatedAt ?? new Date().toISOString(),
    reminderSentAt: caseItem.reminderSentAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

