"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { Plus } from "lucide-react";
import { getApi } from "@/lib/api";
import { useSession } from "@/features/auth/session";
import { Button } from "@/components/ui/button";
import {
  Card,
  Empty,
  Feedback,
  Field,
  Heading,
  Loading,
  Notice,
  ResourceError,
  Select,
  Submit,
  useAction,
  useResource,
  values,
  date,
} from "@/components/ui/shared";
import { BatchStatusBadge, kilograms } from "./format";

export function BatchesPage() {
  const { can } = useSession();
  const resource = useResource(useCallback(() => getApi().batches(), []));
  if (resource.error) return <ResourceError error={resource.error} retry={resource.reload} />;
  if (!resource.data) return <Loading />;
  return (
    <>
      <Heading
        title="Pickup batches"
        description="Group confirmed contractor-bound garments and follow each batch through pickup and receipt."
        action={
          can("batch.create") && (
            <Button asChild>
              <Link href="/batches/new">
                <Plus size={17} />
                Create batch
              </Link>
            </Button>
          )
        }
      />
      {resource.data.length === 0 ? (
        <Card>
          <Empty text="No pickup batches yet.">
            {can("batch.create") && (
              <Button asChild>
                <Link href="/batches/new">Create the first batch</Link>
              </Button>
            )}
          </Empty>
        </Card>
      ) : (
        <div className="table-wrap">
          <table className="min-w-[860px]">
            <thead>
              <tr>
                <th>Batch</th>
                <th>Store</th>
                <th>Contractor</th>
                <th>Status</th>
                <th>Items</th>
                <th>Weight</th>
                <th>Planned pickup</th>
                <th>
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {resource.data.map((batch) => (
                <tr key={batch.id}>
                  <td className="font-medium">{batch.id}</td>
                  <td>{batch.storeName}</td>
                  <td>{batch.contractorName}</td>
                  <td>
                    <BatchStatusBadge status={batch.status} />
                  </td>
                  <td>{batch.quantity}</td>
                  <td>{kilograms(batch.totalWeight)}</td>
                  <td className="text-xs">{date(batch.plannedPickupAt)}</td>
                  <td>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/batches/${batch.id}`}>Open</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function NewBatchPage() {
  const { can } = useSession();
  const router = useRouter();
  const action = useAction();
  const stores = useResource(useCallback(() => getApi().stores(), []));
  const contractors = useResource(useCallback(() => getApi().contractors(), []));
  if (!can("batch.create")) {
    return <Notice tone="error">You do not have permission to create a pickup batch.</Notice>;
  }
  if (stores.error) return <ResourceError error={stores.error} retry={stores.reload} />;
  if (contractors.error) return <ResourceError error={contractors.error} retry={contractors.reload} />;
  if (!stores.data || !contractors.data) return <Loading />;
  return (
    <>
      <Heading
        title="Create pickup batch"
        description="The oldest eligible garments for the selected store are added first. Direct resale candidates, unconfirmed garments, unassigned garments, and garments already in a batch are left out."
      />
      <Card className="max-w-2xl">
        <form
          className="space-y-5"
          onSubmit={(event) => {
            const input = values(event);
            const planned = new Date(input.plannedPickupAt);
            if (Number.isNaN(planned.getTime())) return;
            void action.run(async () => {
              const batch = await getApi().createBatch({
                storeCode: input.storeCode,
                contractorId: input.contractorId,
                plannedPickupAt: planned.toISOString(),
                maxItems: input.maxItems ? Number(input.maxItems) : undefined,
              });
              router.push(`/batches/${batch.id}`);
            }, "Batch created.");
          }}
        >
          <Select label="Store" name="storeCode" required error={action.error?.fields.storeCode}>
            <option value="">Select a store</option>
            {stores.data.map((store) => (
              <option key={store.code} value={store.code}>
                {store.name}
              </option>
            ))}
          </Select>
          <Select
            label="Contractor"
            name="contractorId"
            required
            error={action.error?.fields.contractorId}
          >
            <option value="">Select a contractor</option>
            {contractors.data.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </Select>
          {contractors.data.length === 0 && (
            <Notice>No active contractor accounts are available.</Notice>
          )}
          <Field
            label="Planned pickup"
            name="plannedPickupAt"
            type="datetime-local"
            required
            error={action.error?.fields.plannedPickupAt}
          />
          <Field
            label="Maximum items"
            name="maxItems"
            type="number"
            min="1"
            step="1"
            hint="Leave this empty to include every eligible garment."
            error={action.error?.fields.maxItems}
          />
          <Feedback action={action} />
          <div className="flex justify-end gap-2">
            <Button asChild variant="outline">
              <Link href="/batches">Cancel</Link>
            </Button>
            <Submit busy={action.busy}>Create batch</Submit>
          </div>
        </form>
      </Card>
    </>
  );
}
