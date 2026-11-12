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
  Field,
  Heading,
  Loading,
  Notice,
  ResourceError,
  Select,
  useAction,
  useResource,
  date,
} from "@/components/ui/shared";
import type { BatchDetail, OutcomeCategory } from "@/lib/types";
import { outcomeCategories } from "@/lib/types";
import {
  AttentionBadge,
  BatchStatusBadge,
  kilograms,
  outcomeCategoryLabels,
} from "./format";

type Row = { key: string; category: OutcomeCategory; weight: string; note: string };

function localDateTime(value?: string | null) {
  const parsed = value ? new Date(value) : new Date();
  if (Number.isNaN(parsed.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

export function BatchDetailPage({ id }: { id: string }) {
  const { can, session } = useSession();
  const resource = useResource(useCallback(() => getApi().batch(id), [id]));
  const action = useAction();
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pickupOpen, setPickupOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [pickupAt, setPickupAt] = useState(localDateTime());
  if (resource.error) return <ResourceError error={resource.error} retry={resource.reload} />;
  if (!resource.data || !session) return <Loading />;
  const batch = resource.data;
  const mine = session.user.id === batch.contractorId;

  async function run(task: () => Promise<BatchDetail>, message: string) {
    const saved = await action.run(task, message);
    if (saved) resource.reload();
    return saved;
  }

  return (
    <>
      <Heading
        title={batch.id}
        description={`${batch.storeName} · ${batch.contractorName}`}
        action={<BatchStatusBadge status={batch.status} />}
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {batch.attention.map((flag) => (
          <AttentionBadge key={flag} flag={flag} />
        ))}
        {batch.validationDecision === "VALID" && <span className="text-sm">Reviewer marked the checks valid.</span>}
        {batch.validationDecision === "FLAGGED" && (
          <span className="text-sm">Flagged: {batch.validation?.reason}</span>
        )}
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs text-muted-foreground">Quantity</p>
          <p className="mt-2 text-2xl font-semibold">{batch.quantity}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted-foreground">Total weight</p>
          <p className="mt-2 text-2xl font-semibold">{kilograms(batch.totalWeight)}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted-foreground">Planned pickup</p>
          <p className="mt-2 font-medium">{date(batch.plannedPickupAt)}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted-foreground">Pickup / receipt</p>
          <p className="mt-2 text-sm">
            {batch.pickedUpAt ? date(batch.pickedUpAt) : "Not picked up"}
            <span className="mt-1 block text-muted-foreground">
              {batch.receivedAt ? `Received ${date(batch.receivedAt)}` : "Not received"}
            </span>
          </p>
        </Card>
      </div>
      <Feedback action={action} />
      <div className="mb-6 flex flex-wrap gap-2">
        {batch.editable && can("batch.confirm") && (
          <Button onClick={() => setConfirmOpen(true)} disabled={batch.quantity === 0 || action.busy}>
            Confirm batch
          </Button>
        )}
        {batch.status === "READY_FOR_PICKUP" && can("batch.pickup") && (
          <Button onClick={() => setPickupOpen(true)} disabled={action.busy}>
            Record pickup
          </Button>
        )}
        {batch.status === "PICKED_UP" && can("batch.receive") && mine && (
          <Button onClick={() => setReceiveOpen(true)} disabled={action.busy}>
            Confirm receipt
          </Button>
        )}
        {can("validation.read") && (
          <Button asChild variant="outline">
            <Link href={`/validation/${batch.id}`}>Validation checks</Link>
          </Button>
        )}
      </div>
      <Card className="mb-6">
        <h2 className="mb-4 font-semibold">Selected garments</h2>
        {batch.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">This batch has no garments. An empty batch cannot be confirmed.</p>
        ) : (
          <div className="table-wrap">
            <table className="min-w-[720px]">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Garment</th>
                  <th>Type</th>
                  <th>Condition</th>
                  <th>Weight</th>
                  <th>Recorded</th>
                  <th>
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {batch.items.map((item) => (
                  <tr key={item.garmentId}>
                    <td>{item.position}</td>
                    <td>
                      <Link className="font-medium text-primary hover:underline" href={`/garments/${item.garmentId}`}>
                        {item.garmentId}
                      </Link>
                    </td>
                    <td>{item.type}</td>
                    <td>{item.condition || "Not assessed"}</td>
                    <td>{kilograms(item.weight)}</td>
                    <td className="text-xs">{date(item.createdAt)}</td>
                    <td>
                      {batch.editable && can("batch.create") && (
                        <Button variant="outline" size="sm" onClick={() => setRemoveId(item.garmentId)}>
                          Remove
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <SortingSection batch={batch} canEdit={can("outcome.sorting") && mine} busy={action.busy} run={run} />
      <OutcomeSection batch={batch} canEdit={can("outcome.final") && mine} busy={action.busy} run={run} />
      <Dialog
        open={removeId !== null}
        onOpenChange={(open) => !open && setRemoveId(null)}
        title="Remove garment"
        description="The quantity and total weight are recalculated. This is only available while the batch is a draft."
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setRemoveId(null)}>
            Keep garment
          </Button>
          <Button
            disabled={action.busy}
            onClick={() => {
              if (!removeId) return;
              void run(
                () => getApi().removeBatchItem(batch.id, removeId),
                "Garment removed.",
              ).then(() => setRemoveId(null));
            }}
          >
            Remove garment
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm batch"
        description="Confirmation locks the garment list. Pickup can be recorded after that."
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={action.busy}
            onClick={() =>
              void run(() => getApi().confirmBatch(batch.id), "Batch confirmed.").then(() =>
                setConfirmOpen(false),
              )
            }
          >
            Confirm batch
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={pickupOpen}
        onOpenChange={setPickupOpen}
        title="Record pickup"
        description="Pickup can be recorded only when the batch is ready."
      >
        <Field
          label="Pickup time"
          name="pickedUpAt"
          type="datetime-local"
          value={pickupAt}
          onChange={(event) => setPickupAt(event.target.value)}
        />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setPickupOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={action.busy}
            onClick={() => {
              const parsed = new Date(pickupAt);
              if (Number.isNaN(parsed.getTime())) return;
              void run(
                () => getApi().pickupBatch(batch.id, parsed.toISOString()),
                "Pickup recorded.",
              ).then(() => setPickupOpen(false));
            }}
          >
            Record pickup
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        title="Confirm receipt"
        description="Only the assigned contractor can confirm that this batch was received."
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setReceiveOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={action.busy}
            onClick={() =>
              void run(() => getApi().receiveBatch(batch.id), "Receipt confirmed.").then(() =>
                setReceiveOpen(false),
              )
            }
          >
            Confirm receipt
          </Button>
        </div>
      </Dialog>
    </>
  );
}

function SortingSection({
  batch,
  canEdit,
  busy,
  run,
}: {
  batch: BatchDetail;
  canEdit: boolean;
  busy: boolean;
  run: (task: () => Promise<BatchDetail>, message: string) => Promise<BatchDetail | undefined>;
}) {
  const sorting = batch.sorting;
  const editable = canEdit && batch.status === "RECEIVED" && sorting?.status !== "SUBMITTED";
  const [weights, setWeights] = useState({
    resaleKg: String(sorting?.resaleKg ?? 0),
    fibreToFibreKg: String(sorting?.fibreToFibreKg ?? 0),
    downcyclingKg: String(sorting?.downcyclingKg ?? 0),
    unknownKg: String(sorting?.unknownKg ?? 0),
  });
  const [review, setReview] = useState<BatchDetail | null>(null);
  const fields = [
    ["resaleKg", "Resale"],
    ["fibreToFibreKg", "Fibre-to-fibre recycling"],
    ["downcyclingKg", "Downcycling"],
    ["unknownKg", "Unknown"],
  ] as const;

  return (
    <Card className="mb-6">
      <h2 className="font-semibold">Sorting results</h2>
      <p className="mt-2 mb-4 text-sm text-muted-foreground">
        Resale, fibre-to-fibre recycling, downcycling, and unknown are recorded separately.
        These figures stay unverified until a reviewer validates the batch.
      </p>
      {batch.status !== "RECEIVED" && !sorting && (
        <Notice>Sorting can be recorded after the assigned contractor confirms receipt.</Notice>
      )}
      {sorting?.status === "SUBMITTED" && (
        <Notice tone="success">Submitted on {date(sorting.submittedAt || "")}. The record is read-only.</Notice>
      )}
      {editable ? (
        <form
          className="mt-4 grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const payload = {
              resaleKg: Number(weights.resaleKg),
              fibreToFibreKg: Number(weights.fibreToFibreKg),
              downcyclingKg: Number(weights.downcyclingKg),
              unknownKg: Number(weights.unknownKg),
            };
            void run(() => getApi().saveSorting(batch.id, payload), "Sorting draft saved.").then((saved) => {
              if (saved?.sorting) {
                setWeights({
                  resaleKg: String(saved.sorting.resaleKg),
                  fibreToFibreKg: String(saved.sorting.fibreToFibreKg),
                  downcyclingKg: String(saved.sorting.downcyclingKg),
                  unknownKg: String(saved.sorting.unknownKg),
                });
              }
            });
          }}
        >
          {fields.map(([key, label]) => (
            <Field
              key={key}
              label={label}
              name={key}
              type="number"
              min="0"
              step="0.001"
              required
              value={weights[key]}
              onChange={(event) => setWeights((current) => ({ ...current, [key]: event.target.value }))}
            />
          ))}
          <div className="sm:col-span-2 flex flex-wrap justify-end gap-2">
            <Button type="submit" variant="outline" disabled={busy}>
              Save draft
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => {
                const payload = {
                  resaleKg: Number(weights.resaleKg),
                  fibreToFibreKg: Number(weights.fibreToFibreKg),
                  downcyclingKg: Number(weights.downcyclingKg),
                  unknownKg: Number(weights.unknownKg),
                };
                void run(() => getApi().saveSorting(batch.id, payload), "Review the saved total.").then(
                  (saved) => saved && setReview(saved),
                );
              }}
            >
              Review and submit
            </Button>
          </div>
        </form>
      ) : (
        sorting && (
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {fields.map(([key, label]) => (
              <div key={key}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="font-medium">{kilograms(sorting[key])}</dd>
              </div>
            ))}
            <div>
              <dt className="text-xs text-muted-foreground">Calculated total</dt>
              <dd className="font-medium">{kilograms(sorting.totalKg)}</dd>
            </div>
          </dl>
        )
      )}
      <Dialog
        open={review !== null}
        onOpenChange={(open) => !open && setReview(null)}
        title="Submit sorting results"
        description="Submission requires the calculated total to equal the batch weight. The record becomes read-only."
      >
        {review?.sorting && (
          <p className="mb-4 text-sm">
            Calculated total {kilograms(review.sorting.totalKg)}. Batch weight {kilograms(review.totalWeight)}.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setReview(null)}>
            Keep as draft
          </Button>
          <Button
            disabled={busy}
            onClick={() =>
              void run(() => getApi().submitSorting(batch.id), "Sorting results submitted.").then(() =>
                setReview(null),
              )
            }
          >
            Submit sorting
          </Button>
        </div>
      </Dialog>
    </Card>
  );
}

function OutcomeSection({
  batch,
  canEdit,
  busy,
  run,
}: {
  batch: BatchDetail;
  canEdit: boolean;
  busy: boolean;
  run: (task: () => Promise<BatchDetail>, message: string) => Promise<BatchDetail | undefined>;
}) {
  const outcome = batch.finalOutcome;
  const editable = canEdit && batch.status === "RECEIVED" && outcome?.status !== "SUBMITTED";
  const [rows, setRows] = useState<Row[]>(
    outcome?.items.map((item) => ({
      key: item.id,
      category: item.category,
      weight: String(item.weight),
      note: item.note,
    })) ?? [],
  );
  const [review, setReview] = useState<BatchDetail | null>(null);

  function payload() {
    return rows.map((row) => ({
      category: row.category,
      weight: Number(row.weight),
      note: row.note,
    }));
  }

  return (
    <Card>
      <h2 className="font-semibold">Final outcomes</h2>
      <p className="mt-2 mb-4 text-sm text-muted-foreground">
        Record the actual end of life for the batch. Unknown outcomes stay separate from recorded
        categories. Evidence is attached to this outcome, not to an individual garment. Submission
        does not by itself validate the data.
      </p>
      {batch.status !== "RECEIVED" && !outcome && (
        <Notice>Final outcomes can be recorded after receipt.</Notice>
      )}
      {outcome?.status === "SUBMITTED" && (
        <Notice tone="success">Submitted on {date(outcome.submittedAt || "")}. The record is read-only.</Notice>
      )}
      {editable && (
        <div className="space-y-4">
          {rows.map((row, index) => (
            <div key={row.key} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1.2fr_.8fr_1fr_auto]">
              <Select
                label="Category"
                value={row.category}
                onChange={(event) =>
                  setRows((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, category: event.target.value as OutcomeCategory }
                        : item,
                    ),
                  )
                }
              >
                {outcomeCategories.map((category) => (
                  <option key={category} value={category}>
                    {outcomeCategoryLabels[category]}
                  </option>
                ))}
              </Select>
              <Field
                label="Weight (kg)"
                name={`weight-${row.key}`}
                type="number"
                min="0"
                step="0.001"
                value={row.weight}
                onChange={(event) =>
                  setRows((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, weight: event.target.value } : item,
                    ),
                  )
                }
              />
              <Field
                label="Note"
                name={`note-${row.key}`}
                value={row.note}
                onChange={(event) =>
                  setRows((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, note: event.target.value } : item,
                    ),
                  )
                }
              />
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRows((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                >
                  Remove row
                </Button>
              </div>
            </div>
          ))}
          <div className="flex flex-wrap justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setRows((current) => [
                  ...current,
                  { key: crypto.randomUUID(), category: "RESOLD", weight: "", note: "" },
                ])
              }
            >
              Add row
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void run(() => getApi().saveOutcomes(batch.id, payload()), "Outcome draft saved.")}
              >
                Save draft
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(() => getApi().saveOutcomes(batch.id, payload()), "Review the saved total.").then(
                    (saved) => saved && setReview(saved),
                  )
                }
              >
                Review and submit
              </Button>
            </div>
          </div>
          <label className="block text-sm font-medium">
            Outcome evidence
            <input
              className="mt-2 block w-full text-sm"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                void run(() => getApi().uploadOutcomeEvidence(batch.id, file), "Evidence attached.");
              }}
            />
          </label>
        </div>
      )}
      {outcome && (
        <div className="mt-4 space-y-3">
          <p className="text-sm">
            Calculated total <span className="font-medium">{kilograms(outcome.totalKg)}</span>
          </p>
          {!editable &&
            outcome.items.map((item) => (
              <p key={item.id} className="text-sm">
                {outcomeCategoryLabels[item.category]} · {kilograms(item.weight)}
                {item.note ? ` · ${item.note}` : ""}
              </p>
            ))}
          {outcome.evidence.map((file) => (
            <button
              key={file.id}
              className="block text-sm text-primary underline"
              type="button"
              onClick={() =>
                void getApi()
                  .outcomeEvidenceUrl(batch.id, file.id)
                  .then((url) => window.open(url, "_blank", "noopener"))
              }
            >
              {file.filename}
            </button>
          ))}
        </div>
      )}
      <Dialog
        open={review !== null}
        onOpenChange={(open) => !open && setReview(null)}
        title="Submit final outcomes"
        description="Submission requires the calculated total to equal the batch weight. The record becomes read-only."
      >
        {review?.finalOutcome && (
          <div className="mb-4 space-y-2 text-sm">
            {review.finalOutcome.items.map((item) => (
              <p key={item.id}>
                {outcomeCategoryLabels[item.category]} · {kilograms(item.weight)}
              </p>
            ))}
            <p>
              Calculated total {kilograms(review.finalOutcome.totalKg)}. Batch weight{" "}
              {kilograms(review.totalWeight)}.
            </p>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setReview(null)}>
            Keep as draft
          </Button>
          <Button
            disabled={busy}
            onClick={() =>
              void run(() => getApi().submitOutcomes(batch.id), "Final outcomes submitted.").then(() =>
                setReview(null),
              )
            }
          >
            Submit outcomes
          </Button>
        </div>
      </Dialog>
    </Card>
  );
}
