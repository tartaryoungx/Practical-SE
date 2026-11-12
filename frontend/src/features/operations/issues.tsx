"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getApi } from "@/lib/api";
import { useSession } from "@/features/auth/session";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  Card,
  Empty,
  Feedback,
  Heading,
  Loading,
  Notice,
  ResourceError,
  Select,
  useAction,
  useResource,
  date,
} from "@/components/ui/shared";
import type { DataIssue } from "@/lib/types";
import { issueStatusLabels } from "./format";

export function IssuesPage() {
  const params = useSearchParams();
  return <IssueBoard mode="manage" initialBatch={params.get("batch") || ""} />;
}

export function AssignedIssuesPage() {
  return <IssueBoard mode="assigned" initialBatch="" />;
}

function IssueBoard({ mode, initialBatch }: { mode: "manage" | "assigned"; initialBatch: string }) {
  const { can } = useSession();
  const allowed = mode === "manage" ? can("issues.manage") : can("issues.respond");
  const resource = useResource(
    useCallback(() => (mode === "manage" ? getApi().issues() : getApi().myIssues()), [mode]),
  );
  const batches = useResource(useCallback(() => (mode === "manage" ? getApi().batches() : Promise.resolve([])), [mode]));
  const assignees = useResource(
    useCallback(() => (mode === "manage" ? getApi().assignees() : Promise.resolve([])), [mode]),
  );
  const action = useAction();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<DataIssue | null>(null);
  const [message, setMessage] = useState("");
  if (!allowed) return <Notice tone="error">You do not have permission to view these data issues.</Notice>;
  if (resource.error) return <ResourceError error={resource.error} retry={resource.reload} />;
  if (!resource.data) return <Loading />;

  return (
    <>
      <Heading
        title={mode === "manage" ? "Data issues" : "Assigned issues"}
        description={
          mode === "manage"
            ? "Request a correction from the person who can update the record."
            : "Issues assigned to you. Other people's correction requests are not listed here."
        }
        action={
          mode === "manage" ? (
            <Button onClick={() => setOpen(true)}>Request correction</Button>
          ) : undefined
        }
      />
      {resource.data.length === 0 ? (
        <Card>
          <Empty text={mode === "manage" ? "No correction requests yet." : "No issues are assigned to you."} />
        </Card>
      ) : (
        <div className="table-wrap">
          <table className="min-w-[760px]">
            <thead>
              <tr>
                <th>Issue</th>
                <th>Batch</th>
                <th>Assignee</th>
                <th>Status</th>
                <th>Opened</th>
                <th>
                  <span className="sr-only">Review</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {resource.data.map((issue) => (
                <tr key={issue.id}>
                  <td>
                    <p className="font-medium">{issue.id}</p>
                    <p className="mt-1 max-w-md text-xs text-muted-foreground">{issue.message}</p>
                  </td>
                  <td>{issue.batchId}</td>
                  <td>{issue.assigneeName}</td>
                  <td>{issueStatusLabels[issue.status]}</td>
                  <td className="text-xs">{date(issue.createdAt)}</td>
                  <td>
                    <Button size="sm" variant="outline" onClick={() => { setSelected(issue); setMessage(""); }}>
                      Review
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4">
        <Feedback action={action} />
      </div>
      <Dialog open={open} onOpenChange={setOpen} title="Request correction" description="Assign the request to store staff or a contractor.">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            void action
              .run(
                () =>
                  getApi().createIssue({
                    batchId: String(data.get("batchId") || ""),
                    assigneeId: String(data.get("assigneeId") || ""),
                    message: String(data.get("message") || ""),
                  }),
                "Correction requested.",
              )
              .then((saved) => {
                if (!saved) return;
                setOpen(false);
                resource.reload();
              });
          }}
        >
          <Select label="Batch" name="batchId" required defaultValue={initialBatch} error={action.error?.fields.batchId}>
            <option value="">Select a batch</option>
            {batches.data?.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.id} · {batch.storeName}
              </option>
            ))}
          </Select>
          <Select label="Assignee" name="assigneeId" required error={action.error?.fields.assigneeId}>
            <option value="">Select a person</option>
            {assignees.data?.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name} · {person.role === "CONTRACTOR" ? "Contractor" : "Store staff"}
              </option>
            ))}
          </Select>
          <label className="block text-sm font-medium" htmlFor="issue-message">
            Request
          </label>
          <textarea id="issue-message" name="message" required />
          <div className="flex justify-end">
            <Button type="submit" disabled={action.busy}>
              Send request
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={selected !== null}
        onOpenChange={(next) => !next && setSelected(null)}
        title={selected ? selected.id : "Issue"}
        description={selected?.message}
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <p>Status: {issueStatusLabels[selected.status]}</p>
            <p>Assigned to {selected.assigneeName}</p>
            {selected.response && (
              <div>
                <p className="font-medium">Response</p>
                <p className="mt-1">{selected.response}</p>
              </div>
            )}
            {selected.resolutionNote && (
              <div>
                <p className="font-medium">Review note</p>
                <p className="mt-1">{selected.resolutionNote}</p>
              </div>
            )}
            {mode === "assigned" && (selected.status === "OPEN" || selected.status === "REOPENED") && (
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void action
                    .run(() => getApi().respondIssue(selected.id, message), "Response submitted.")
                    .then((saved) => {
                      if (!saved) return;
                      setSelected(null);
                      resource.reload();
                    });
                }}
              >
                <label className="block font-medium" htmlFor="response-message">
                  Your response
                </label>
                <textarea
                  id="response-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  required
                />
                <Button type="submit" disabled={action.busy}>
                  Submit response
                </Button>
              </form>
            )}
            {mode === "manage" && selected.status === "RESPONDED" && (
              <div className="space-y-3">
                <label className="block font-medium" htmlFor="review-note">
                  Note
                </label>
                <textarea id="review-note" value={message} onChange={(event) => setMessage(event.target.value)} />
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={action.busy}
                    onClick={() =>
                      void action
                        .run(() => getApi().resolveIssue(selected.id, message), "Issue resolved.")
                        .then((saved) => {
                          if (!saved) return;
                          setSelected(null);
                          resource.reload();
                        })
                    }
                  >
                    Resolve
                  </Button>
                  <Button
                    variant="outline"
                    disabled={action.busy || !message.trim()}
                    onClick={() =>
                      void action
                        .run(() => getApi().reopenIssue(selected.id, message), "Issue reopened.")
                        .then((saved) => {
                          if (!saved) return;
                          setSelected(null);
                          resource.reload();
                        })
                    }
                  >
                    Reopen
                  </Button>
                </div>
              </div>
            )}
            {mode === "manage" && selected.status === "RESOLVED" && (
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void action
                    .run(() => getApi().reopenIssue(selected.id, message), "Issue reopened.")
                    .then((saved) => {
                      if (!saved) return;
                      setSelected(null);
                      resource.reload();
                    });
                }}
              >
                <label className="block font-medium" htmlFor="reopen-note">
                  Why is this being reopened?
                </label>
                <textarea
                  id="reopen-note"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  required
                />
                <Button type="submit" disabled={action.busy}>
                  Reopen
                </Button>
              </form>
            )}
          </div>
        )}
      </Dialog>
    </>
  );
}
