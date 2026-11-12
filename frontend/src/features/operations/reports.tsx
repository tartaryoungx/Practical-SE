"use client";

import { useCallback, useState } from "react";
import { getApi } from "@/lib/api";
import { useSession } from "@/features/auth/session";
import { Button } from "@/components/ui/button";
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

export function ReportsPage() {
  const { can } = useSession();
  const action = useAction();
  const stores = useResource(useCallback(() => getApi().stores(), []));
  const contractors = useResource(useCallback(() => getApi().contractors(), []));
  const reports = useResource(useCallback(() => getApi().reports(), []));
  const [count, setCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);
  if (!can("report.configure")) {
    return <Notice tone="error">You do not have permission to configure reports.</Notice>;
  }
  if (stores.error) return <ResourceError error={stores.error} retry={stores.reload} />;
  if (contractors.error) return <ResourceError error={contractors.error} retry={contractors.reload} />;
  if (reports.error) return <ResourceError error={reports.error} retry={reports.reload} />;
  if (!stores.data || !contractors.data || !reports.data) return <Loading />;
  const storeList = stores.data;
  const contractorList = contractors.data;
  const saved = reports.data;

  return (
    <>
      <Heading
        title="Report configuration"
        description="Save draft criteria and see how many validated batches match. This does not generate, publish, or export a report."
      />
      <Card className="mb-6 max-w-3xl">
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const input = {
              periodStart: String(data.get("periodStart") || ""),
              periodEnd: String(data.get("periodEnd") || ""),
              storeCode: String(data.get("storeCode") || "") || undefined,
              contractorId: String(data.get("contractorId") || "") || undefined,
            };
            const intent = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value");
            if (intent === "count") {
              setCounting(true);
              void getApi()
                .reportMatch(input)
                .then((result) => {
                  setCount(result.matchingCount);
                  action.clear();
                })
                .catch((error: unknown) => {
                  setCount(null);
                  void action.run(() => Promise.reject(error));
                })
                .finally(() => setCounting(false));
              return;
            }
            void action
              .run(() => getApi().createReport(input), "Draft configuration saved.")
              .then((saved) => {
                if (!saved) return;
                setCount(saved.matchingCount);
                reports.reload();
              });
          }}
        >
          <label className="space-y-2 text-sm font-medium">
            Period start
            <input className="h-10 w-full rounded-md border px-3 font-normal" type="date" name="periodStart" required />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Period end
            <input className="h-10 w-full rounded-md border px-3 font-normal" type="date" name="periodEnd" required />
          </label>
          <Select label="Store" name="storeCode">
            <option value="">All stores</option>
            {storeList.map((store) => (
              <option key={store.code} value={store.code}>
                {store.name}
              </option>
            ))}
          </Select>
          <Select label="Contractor" name="contractorId">
            <option value="">All contractors</option>
            {contractorList.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </Select>
          <div className="md:col-span-2">
            <Notice>
              Only batches with a valid validation decision are counted. Flagged, incomplete, and unreviewed batches are excluded.
              {count !== null && (
                <span className="mt-2 block font-medium text-foreground">
                  Matching validated batches: {count}
                </span>
              )}
            </Notice>
          </div>
          <Feedback action={action} />
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button type="submit" value="count" variant="outline" disabled={counting || action.busy}>
              {counting ? "Counting…" : "Count matching batches"}
            </Button>
            <Button type="submit" value="save" disabled={action.busy}>
              Save draft configuration
            </Button>
          </div>
        </form>
      </Card>
      <h2 className="mb-3 text-lg font-semibold">Saved draft configurations</h2>
      {saved.length === 0 ? (
        <Card>
          <Empty text="No draft configurations yet." />
        </Card>
      ) : (
        <div className="table-wrap">
          <table className="min-w-[760px]">
            <thead>
              <tr>
                <th>Configuration</th>
                <th>Period</th>
                <th>Store</th>
                <th>Contractor</th>
                <th>Matching batches</th>
                <th>Saved</th>
              </tr>
            </thead>
            <tbody>
              {saved.map((report) => (
                <tr key={report.id}>
                  <td className="font-medium">{report.id}</td>
                  <td>
                    {report.periodStart} to {report.periodEnd}
                  </td>
                  <td>
                    {report.storeCode
                      ? storeList.find((store) => store.code === report.storeCode)?.name || report.storeCode
                      : "All stores"}
                  </td>
                  <td>
                    {report.contractorId
                      ? contractorList.find((person) => person.id === report.contractorId)?.name ||
                        "Selected contractor"
                      : "All contractors"}
                  </td>
                  <td>{report.matchingCount}</td>
                  <td className="text-xs">{date(report.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
