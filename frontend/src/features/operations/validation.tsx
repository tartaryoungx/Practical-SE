"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { getApi } from "@/lib/api";
import { useSession } from "@/features/auth/session";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  Card,
  Feedback,
  Heading,
  Loading,
  Notice,
  ResourceError,
  useAction,
  useResource,
} from "@/components/ui/shared";
import { batchStatusLabels, kilograms } from "./format";

export function ValidationPage({ id }: { id: string }) {
  const { can } = useSession();
  const resource = useResource(useCallback(() => getApi().validation(id), [id]));
  const action = useAction();
  const [flagOpen, setFlagOpen] = useState(false);
  const [reason, setReason] = useState("");
  if (!can("validation.read")) {
    return <Notice tone="error">You do not have permission to review validation checks.</Notice>;
  }
  if (resource.error) return <ResourceError error={resource.error} retry={resource.reload} />;
  if (!resource.data) return <Loading />;
  const detail = resource.data;
  const ready = detail.checks.every((check) => check.passed);

  return (
    <>
      <Heading
        title={`Validation ${detail.batchId}`}
        description={`Operational status: ${batchStatusLabels[detail.operationalStatus]}. Batch weight ${kilograms(detail.batchWeight)}.`}
        action={
          <Button asChild variant="outline">
            <Link href={`/batches/${detail.batchId}`}>Open batch</Link>
          </Button>
        }
      />
      {detail.fullyVerified ? (
        <Notice tone="success">A reviewer confirmed that every check passed. This is a data validation, not a published sustainability report.</Notice>
      ) : (
        <Notice tone="error">This batch is not fully verified. Incomplete or flagged data stays visible as a failed check.</Notice>
      )}
      <div className="mt-6 grid gap-4">
        {detail.checks.map((check) => (
          <Card key={check.key}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{check.label}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{check.detail}</p>
              </div>
              <span className={check.passed ? "text-sm font-medium text-emerald-800" : "text-sm font-medium text-red-800"}>
                {check.passed ? "Passed" : "Needs attention"}
              </span>
            </div>
          </Card>
        ))}
      </div>
      {detail.decision && (
        <p className="mt-4 text-sm">
          Current decision: {detail.decision === "VALID" ? "Valid" : "Flagged"}
          {detail.reason ? `. ${detail.reason}` : ""}
        </p>
      )}
      <div className="mt-6">
        <Feedback action={action} />
      </div>
      {can("validation.decide") && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            disabled={!ready || action.busy}
            onClick={() =>
              void action
                .run(() => getApi().decideValidation(detail.batchId, "VALID", ""), "Batch data confirmed.")
                .then((saved) => saved && resource.reload())
            }
          >
            Confirm valid
          </Button>
          <Button variant="outline" disabled={action.busy} onClick={() => setFlagOpen(true)}>
            Flag data
          </Button>
          <Button asChild variant="outline">
            <Link href={`/issues?batch=${detail.batchId}`}>Request correction</Link>
          </Button>
        </div>
      )}
      {!ready && can("validation.decide") && (
        <p className="mt-3 text-xs text-muted-foreground">
          Confirm valid stays unavailable until every check passes.
        </p>
      )}
      <Dialog
        open={flagOpen}
        onOpenChange={setFlagOpen}
        title="Flag batch data"
        description="A reason is required. Flagged data is not treated as validated."
      >
        <label className="block text-sm font-medium" htmlFor="flag-reason">
          Reason
        </label>
        <textarea
          id="flag-reason"
          className="mt-2"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          required
        />
        {action.error?.fields.reason && <p className="mt-2 text-xs text-destructive">{action.error.fields.reason}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setFlagOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={action.busy || !reason.trim()}
            onClick={() =>
              void action
                .run(
                  () => getApi().decideValidation(detail.batchId, "FLAGGED", reason.trim()),
                  "Batch flagged.",
                )
                .then((saved) => {
                  if (!saved) return;
                  setFlagOpen(false);
                  setReason("");
                  resource.reload();
                })
            }
          >
            Flag data
          </Button>
        </div>
      </Dialog>
    </>
  );
}
