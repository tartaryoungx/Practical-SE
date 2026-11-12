"use client";

import { Badge } from "@/components/ui/shared";
import type { Attention, BatchStatus, IssueStatus, OutcomeCategory } from "@/lib/types";

export const batchStatusLabels: Record<BatchStatus, string> = {
  DRAFT: "Draft",
  READY_FOR_PICKUP: "Ready for pickup",
  PICKED_UP: "Picked up",
  RECEIVED: "Received",
};

export const attentionLabels: Record<Attention, string> = {
  DELAYED: "Delayed pickup",
  PENDING: "Pending",
  MISSING: "Missing data",
  COMPLETED: "Data submitted",
  FLAGGED: "Flagged",
};

export const outcomeCategoryLabels: Record<OutcomeCategory, string> = {
  RESOLD: "Resold",
  FIBRE_TO_FIBRE: "Fibre-to-fibre recycling",
  DOWNCYCLED: "Downcycling",
  DISCARDED: "Discarded",
  UNKNOWN: "Unknown outcome",
};

export const issueStatusLabels: Record<IssueStatus, string> = {
  OPEN: "Open",
  RESPONDED: "Responded",
  RESOLVED: "Resolved",
  REOPENED: "Reopened",
};

export function kilograms(value: number) {
  return `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 3 }).format(value)} kg`;
}

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  const tone =
    status === "RECEIVED"
      ? "green"
      : status === "READY_FOR_PICKUP"
        ? "amber"
        : status === "PICKED_UP"
          ? "violet"
          : "neutral";
  return <Badge tone={tone}>{batchStatusLabels[status]}</Badge>;
}

export function AttentionBadge({ flag }: { flag: Attention }) {
  const tone = flag === "FLAGGED" || flag === "DELAYED" ? "red" : flag === "COMPLETED" ? "green" : "amber";
  return <Badge tone={tone}>{attentionLabels[flag]}</Badge>;
}
