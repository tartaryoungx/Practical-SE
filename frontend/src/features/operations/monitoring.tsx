"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getApi } from "@/lib/api";
import { batchStatuses } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  Empty,
  Heading,
  Loading,
  Notice,
  ResourceError,
  Select,
  useResource,
  date,
} from "@/components/ui/shared";
import { AttentionBadge, BatchStatusBadge, batchStatusLabels, kilograms } from "./format";

export function MonitoringPage() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const query = useMemo(
    () => ({
      status: params.get("status") || "",
      storeCode: params.get("store") || "",
      contractorId: params.get("contractor") || "",
      dateFrom: params.get("from") || "",
      dateTo: params.get("to") || "",
    }),
    [params],
  );
  const stores = useResource(useCallback(() => getApi().stores(), []));
  const contractors = useResource(useCallback(() => getApi().contractors(), []));
  const resource = useResource(
    useCallback(
      () =>
        getApi().monitoring({
          status: query.status || undefined,
          storeCode: query.storeCode || undefined,
          contractorId: query.contractorId || undefined,
          dateFrom: query.dateFrom || undefined,
          dateTo: query.dateTo || undefined,
        }),
      [query],
    ),
  );

  function apply(next: typeof query) {
    const search = new URLSearchParams();
    if (next.status) search.set("status", next.status);
    if (next.storeCode) search.set("store", next.storeCode);
    if (next.contractorId) search.set("contractor", next.contractorId);
    if (next.dateFrom) search.set("from", next.dateFrom);
    if (next.dateTo) search.set("to", next.dateTo);
    const text = search.toString();
    router.replace(text ? `${pathname}?${text}` : pathname);
  }

  if (resource.error) return <ResourceError error={resource.error} retry={resource.reload} />;
  const summary = resource.data?.summary;
  const statusData = summary
    ? batchStatuses.map((status) => ({ name: batchStatusLabels[status], value: summary.byStatus[status] }))
    : [];
  const attentionData = summary
    ? [
        { name: "Delayed", value: summary.delayed },
        { name: "Missing", value: summary.missing },
        { name: "Flagged", value: summary.flagged },
        { name: "Pending", value: summary.pending },
        { name: "Data submitted", value: summary.completed },
      ]
    : [];

  return (
    <>
      <Heading
        title="Batch monitoring"
        description="Operational status stays separate from delay, missing data, and validation flags."
      />
      <Card className="mb-6">
        <form
          key={params.toString()}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            apply({
              status: String(data.get("status") || ""),
              storeCode: String(data.get("storeCode") || ""),
              contractorId: String(data.get("contractorId") || ""),
              dateFrom: String(data.get("dateFrom") || ""),
              dateTo: String(data.get("dateTo") || ""),
            });
          }}
        >
          <Select label="Status" name="status" defaultValue={query.status}>
            <option value="">Any status</option>
            {batchStatuses.map((status) => (
              <option key={status} value={status}>
                {batchStatusLabels[status]}
              </option>
            ))}
          </Select>
          <Select label="Store" name="storeCode" defaultValue={query.storeCode}>
            <option value="">Any store</option>
            {stores.data?.map((store) => (
              <option key={store.code} value={store.code}>
                {store.name}
              </option>
            ))}
          </Select>
          <Select label="Contractor" name="contractorId" defaultValue={query.contractorId}>
            <option value="">Any contractor</option>
            {contractors.data?.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </Select>
          <label className="space-y-2 text-sm font-medium">
            From
            <input
              className="h-10 w-full rounded-md border bg-background px-3 font-normal"
              type="date"
              name="dateFrom"
              defaultValue={query.dateFrom}
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            To
            <input
              className="h-10 w-full rounded-md border bg-background px-3 font-normal"
              type="date"
              name="dateTo"
              defaultValue={query.dateTo}
            />
          </label>
          <div className="flex items-end gap-2 md:col-span-2 xl:col-span-5">
            <Button type="submit">Apply filters</Button>
            <Button type="button" variant="outline" onClick={() => apply({
              status: "",
              storeCode: "",
              contractorId: "",
              dateFrom: "",
              dateTo: "",
            })}>
              Clear
            </Button>
          </div>
        </form>
      </Card>
      {!resource.data && <Loading />}
      {summary && summary.total === 0 && (
        <Card>
          <Empty text="No batches match these filters." />
        </Card>
      )}
      {summary && summary.total > 0 && resource.data && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <p className="text-xs text-muted-foreground">Batches</p>
              <p className="mt-2 text-3xl font-semibold">{summary.total}</p>
            </Card>
            <Card>
              <p className="text-xs text-muted-foreground">Delayed pickups</p>
              <p className="mt-2 text-3xl font-semibold">{summary.delayed}</p>
            </Card>
            <Card>
              <p className="text-xs text-muted-foreground">Flagged</p>
              <p className="mt-2 text-3xl font-semibold">{summary.flagged}</p>
            </Card>
            <Card>
              <p className="text-xs text-muted-foreground">Missing data</p>
              <p className="mt-2 text-3xl font-semibold">{summary.missing}</p>
            </Card>
          </div>
          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-4 font-semibold">Status distribution</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData}>
                    <CartesianGrid stroke="#e5eae6" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "#66766d", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: "#66766d", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#275d43" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <h2 className="mb-4 font-semibold">Attention</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attentionData}>
                    <CartesianGrid stroke="#e5eae6" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "#66766d", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: "#66766d", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#4b7a61" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                These counts come from saved batches. They are operational indicators, not verified sustainability outcomes.
              </p>
            </Card>
          </div>
          <Notice>
            A batch can be received and still be missing sorting or outcome data. Validation is a separate decision.
          </Notice>
          <div className="mt-6 table-wrap">
            <table className="min-w-[980px]">
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Store</th>
                  <th>Contractor</th>
                  <th>Status</th>
                  <th>Attention</th>
                  <th>Validation</th>
                  <th>Planned pickup</th>
                  <th>Weight</th>
                </tr>
              </thead>
              <tbody>
                {resource.data.batches.map((batch) => (
                  <tr key={batch.id}>
                    <td>
                      <Link className="font-medium text-primary hover:underline" href={`/batches/${batch.id}`}>
                        {batch.id}
                      </Link>
                    </td>
                    <td>{batch.storeName}</td>
                    <td>{batch.contractorName}</td>
                    <td>
                      <BatchStatusBadge status={batch.status} />
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {batch.attention.map((flag) => (
                          <AttentionBadge key={flag} flag={flag} />
                        ))}
                      </div>
                    </td>
                    <td>
                      {batch.validationDecision === "VALID"
                        ? "Validated"
                        : batch.validationDecision === "FLAGGED"
                          ? "Flagged"
                          : "Not reviewed"}
                    </td>
                    <td className="text-xs">{date(batch.plannedPickupAt)}</td>
                    <td>{kilograms(batch.totalWeight)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
