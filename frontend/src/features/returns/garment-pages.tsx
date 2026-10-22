"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  ArrowLeft,
  ArrowRight,
  Shirt,
  Camera,
  LockKeyhole,
  Check,
  Upload,
  FileImage,
} from "lucide-react";
import { getApi } from "@/lib/api";
import {
  conditions,
  routes,
  conditionLabels,
  routeLabels,
  type Garment,
  type Condition,
  type Route,
} from "@/lib/types";
import { useSession } from "@/features/auth/session";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  Card,
  Heading,
  Badge,
  Notice,
  Field,
  Feedback,
  Submit,
  Loading,
  Empty,
  ResourceError,
  useResource,
  useAction,
  values,
  date,
} from "@/components/ui/shared";
function Status({ g }: { g: Garment }) {
  return (
    <Badge
      tone={g.confirmedRoute ? "green" : g.condition ? "amber" : "neutral"}
    >
      {g.confirmedRoute
        ? "Confirmed"
        : g.condition
          ? "Awaiting confirmation"
          : "Not assessed"}
    </Badge>
  );
}
export function GarmentsPage() {
  const { can } = useSession(),
    resource = useResource(useCallback(() => getApi().garments(), []));
  if (resource.error)
    return <ResourceError error={resource.error} retry={resource.reload} />;
  if (!resource.data) return <Loading />;
  return (
    <>
      <Heading
        title="Returned garments"
        description="Record, assess, and follow each item's decision"
        action={
          can("returns.create") && (
            <Button asChild>
              <Link href="/garments/new">
                <Plus size={17} />
                Record garment
              </Link>
            </Button>
          )
        }
      />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          All records{" "}
          <span className="ml-2 text-muted-foreground">
            · {resource.data.length} items
          </span>
        </div>
        <Badge>All accessible records</Badge>
      </div>
      <div className="table-wrap">
        <table className="min-w-[760px]">
          <thead>
            <tr>
              <th>ID / Type</th>
              <th>Recorded</th>
              <th>Condition</th>
              <th>Status</th>
              <th>Confirmed route</th>
              <th>
                <span className="sr-only">View details</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {resource.data.map((g) => (
              <tr key={g.id}>
                <td>
                  <Link
                    className="font-medium text-primary hover:underline"
                    href={"/garments/" + g.id}
                  >
                    {g.id}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">{g.type}</p>
                </td>
                <td className="text-xs">{date(g.createdAt)}</td>
                <td>{g.condition ? conditionLabels[g.condition] : "—"}</td>
                <td>
                  <Status g={g} />
                </td>
                <td>
                  {g.confirmedRoute ? (
                    routeLabels[g.confirmedRoute]
                  ) : (
                    <span className="text-muted-foreground">Not confirmed</span>
                  )}
                </td>
                <td>
                  <Button asChild size="icon" variant="ghost">
                    <Link href={"/garments/" + g.id} aria-label={"View " + g.id}>
                      <ArrowRight size={17} />
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {resource.data.length === 0 && (
          <Empty text="No garments yet">
            {can("returns.create") && (
              <Button asChild>
                <Link href="/garments/new">Record the first garment</Link>
              </Button>
            )}
          </Empty>
        )}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Authorized users can open records created by other people. A selected
        route is not a completed resale or recycling outcome.
      </p>
    </>
  );
}
export function NewGarmentPage() {
  const { session, can } = useSession(),
    router = useRouter(),
    action = useAction();
  if (!can("returns.create"))
    return <Notice tone="error">You do not have permission to record a garment.</Notice>;
  return (
    <>
      <Link
        href="/garments"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground"
      >
        <ArrowLeft size={15} />
        Back to garments
      </Link>
      <Heading
        title="Record a returned garment"
        description="One record per item. Start with the basic details, then assess the condition."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <form
            className="space-y-6"
            onSubmit={(e) => {
              const v = values(e);
              void action.run(async () => {
                const g = await getApi().createGarment({
                  type: v.type,
                  material: v.material,
                  weight: Number(v.weight),
                });
                router.push("/garments/" + g.id + "?created=1");
              });
            }}
          >
            <div className="flex items-center gap-3 border-b pb-5">
              <Shirt size={22} className="text-primary" />
              <h2 className="font-semibold">Garment details</h2>
            </div>
            <Field
              label="Garment type"
              name="type"
              required
              placeholder="For example, T-shirt, shirt, jeans"
              error={action.error?.fields.type}
            />
            <Field
              label="Material"
              name="material"
              required
              placeholder="For example, Cotton, Linen, Polyester"
              error={action.error?.fields.material}
            />
            <Field
              label="Weight (kilograms)"
              name="weight"
              type="number"
              required
              min="0"
              step="any"
              placeholder="0.25"
              error={action.error?.fields.weight}
            />
            <Feedback action={action} />
            <div className="flex justify-end gap-2 border-t pt-5">
              <Button asChild variant="outline">
                <Link href="/garments">Cancel</Link>
              </Button>
              <Submit busy={action.busy}>
                Save and assess <ArrowRight size={16} />
              </Submit>
            </div>
          </form>
        </Card>
        <div className="space-y-4">
          <Card>
            <h2 className="mb-4 font-semibold">Recorded by</h2>
            <p>{session?.user.name}</p>
            <p className="mt-5 text-xs text-muted-foreground">
              The server assigns the creator, the id, and the creation time.
            </p>
            <div className="mt-4">
              <Badge tone="amber">Provisional</Badge>
            </div>
          </Card>
          <Notice>
            Saving creates an unassessed draft. You can continue it from the
            garment list.
          </Notice>
        </div>
      </div>
    </>
  );
}
export function GarmentPage({
  id,
  created = false,
}: {
  id: string;
  created?: boolean;
}) {
  const [message, setMessage] = useState(
    created ? "The garment was saved. You can assess its condition next." : "",
  );
  const resource = useResource(useCallback(() => getApi().garment(id), [id]));
  if (resource.error)
    return <ResourceError error={resource.error} retry={resource.reload} />;
  if (!resource.data) return <Loading />;
  return (
    <>
      {message && (
        <div className="mb-5">
          <Notice tone="success">{message}</Notice>
        </div>
      )}
      <GarmentEditor
        key={
          resource.data.id +
          resource.data.condition +
          resource.data.evidence.length +
          resource.data.confirmedAt
        }
        garment={resource.data}
        reload={(text) => {
          setMessage(text);
          resource.reload();
        }}
      />
    </>
  );
}
function GarmentEditor({
  garment: g,
  reload,
}: {
  garment: Garment;
  reload: (message: string) => void;
}) {
  const { can } = useSession(),
    [condition, setCondition] = useState<Condition | "">(g.condition || ""),
    [route, setRoute] = useState<Route | null>(g.recommendation),
    [note, setNote] = useState(""),
    [confirmOpen, setConfirmOpen] = useState(false),
    [view, setView] = useState<string | null>(null),
    [preview, setPreview] = useState(""),
    assess = useAction(),
    upload = useAction(),
    confirm = useAction();
  const locked = !!g.confirmedRoute,
    required = g.evidenceRequired,
    dirty = condition !== g.condition && condition !== "",
    missing = required && !g.evidence.length,
    override = route !== g.recommendation,
    canConfirm = can("returns.confirm") && !!g.condition && !missing && !dirty;
  useEffect(() => {
    if (!view) return;
    let active = true;
    let url = "";
    void getApi()
      .evidenceUrl(g.id, view)
      .then((next) => {
        if (!active) {
          URL.revokeObjectURL(next);
          return;
        }
        url = next;
        setPreview(next);
      })
      .catch(() => {
        if (active) setPreview("");
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [view, g.id]);
  return (
    <>
      <Link
        href="/garments"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground"
      >
        <ArrowLeft size={15} />
        Back to garments
      </Link>
      <Heading
        title={g.id}
        description={g.type + " · Received " + date(g.createdAt)}
        action={<Status g={g} />}
      />
      <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge tone="green">1 Details saved ✓</Badge>
        <span>—</span>
        <Badge tone={g.condition ? "green" : "neutral"}>
          2 Condition {g.condition ? "✓" : ""}
        </Badge>
        <span>—</span>
        <Badge tone={locked ? "green" : "neutral"}>
          3 Route {locked ? "✓" : ""}
        </Badge>
      </div>
      {locked && (
        <div className="mb-6">
          <Notice tone="success">
            <span className="flex items-center gap-2">
              <LockKeyhole size={16} />
              Confirmed. Condition, evidence, and route are read-only.
            </span>
          </Notice>
        </div>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_350px]">
        <div className="space-y-6">
          <Card>
            <h2 className="mb-5 flex items-center gap-2 font-semibold">
              <Shirt size={19} />
              Garment details
            </h2>
            <dl className="grid grid-cols-2 gap-5 text-sm">
              {[
                ["Type", g.type],
                ["Material", g.material],
                ["Weight", g.weight + " kg"],
                ["Recorded by", g.creatorId],
                ["Created", date(g.createdAt)],
                ["Record id", g.id],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="mt-1 font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-semibold">Assess condition</h2>
              <Badge>{locked ? "Read-only" : "Choose one condition"}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {conditions.map((c) => (
                <button
                  key={c}
                  disabled={locked || !can("returns.assess") || assess.busy}
                  aria-pressed={condition === c}
                  className={
                    "rounded-lg border p-4 text-left disabled:cursor-default disabled:opacity-65 " +
                    (condition === c
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:bg-muted")
                  }
                  onClick={() => setCondition(c)}
                >
                  <span className="mb-3 block text-xs font-semibold">{c}</span>
                  <span className="block text-sm">{conditionLabels[c]}</span>
                  <span className="mt-2 block text-[10px] text-muted-foreground">
                    {c}
                  </span>
                </button>
              ))}
            </div>
            <p className="my-4 text-xs text-muted-foreground">
              Condition can be saved before an image. GOOD and WORN do not
              require evidence. DAMAGED and STAINED do, before confirmation.
              The server calculates the recommendation from condition alone.
            </p>
            <Feedback action={assess} />
            {!locked && can("returns.assess") && (
              <Button
                disabled={!condition || !dirty || assess.busy}
                variant="outline"
                onClick={() =>
                  void assess.run(async () => {
                    await getApi().assess(g.id, condition as Condition);
                    reload("Condition and recommendation were saved.");
                  }, "Condition saved")
                }
              >
                {assess.busy ? "Saving…" : "Save assessment"}
              </Button>
            )}
          </Card>
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-semibold">
                <Camera size={18} />
                Image evidence
              </h2>
              <Badge tone="amber">Provisional evidence rule</Badge>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              {g.condition
                ? required
                  ? "This condition needs at least one image before confirmation."
                  : "An image is optional for this condition."
                : "GOOD and WORN: optional. DAMAGED and STAINED: required before confirmation."}
            </p>
            {!locked && can("returns.evidence") && (
              <label className="mb-4 block cursor-pointer rounded-lg border border-dashed bg-muted/30 p-6 text-center hover:bg-muted">
                <Upload
                  size={24}
                  className="mx-auto mb-2 text-muted-foreground"
                />
                <span className="block text-sm font-medium">
                  {upload.busy
                    ? "Reading the image…"
                    : "Choose an image to attach"}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  JPEG, PNG, or WebP · up to 5 MB each
                </span>
                <input
                  type="file"
                  className="mt-4 block w-full text-xs"
                  aria-label="Choose evidence image"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={upload.busy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f)
                      void upload.run(async () => {
                        await getApi().upload(g.id, f);
                        reload("Evidence was attached.");
                      });
                    e.target.value = "";
                  }}
                />
              </label>
            )}
            <Feedback action={upload} />
            {!g.evidence.length ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No evidence yet{missing ? " · required before confirmation" : ""}
              </p>
            ) : (
              <div className="space-y-2">
                {g.evidence.map((f) => (
                  <button
                    key={f.id}
                    className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:bg-muted"
                    onClick={() => setView(f.id)}
                  >
                    <FileImage size={21} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">
                        {f.filename}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {Math.ceil(f.size / 1024)} KB · {date(f.createdAt)}
                      </span>
                    </span>
                    <span className="text-xs text-primary">View</span>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
        <div className="space-y-5 xl:sticky xl:top-6">
          <Card className="border-primary/20">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-primary">
              <ArrowRight size={18} />
              Recommended route
            </div>
            {g.recommendation ? (
              <>
                <h2 className="text-xl font-semibold">
                  {routeLabels[g.recommendation]}
                </h2>
                <p className="mt-2 break-all font-mono text-[10px] text-muted-foreground">
                  {g.recommendation}
                </p>
                <p className="mt-4 text-xs text-muted-foreground">
                  From condition {g.condition} · provisional route rule
                </p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-medium">No recommendation yet</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Save a condition first.
                </p>
              </>
            )}
            <p className="mt-4 border-t pt-4 text-xs text-muted-foreground">
              The recommendation chooses a destination. It is not a completed resale or recycling outcome.
            </p>
          </Card>
          {locked ? (
            <Card>
              <h2 className="mb-4 flex items-center gap-2 font-semibold">
                <Check size={18} />
                Confirmed route
              </h2>
              <p className="text-lg font-semibold">
                {routeLabels[g.confirmedRoute!]}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {date(g.confirmedAt!)}
              </p>
              <p className="mt-5 text-xs text-muted-foreground">
                Reason / note
              </p>
              <p className="mt-1 text-sm whitespace-pre-wrap">
                {g.note || "None · confirmed as recommended"}
              </p>
            </Card>
          ) : (
            <Card>
              <h2 className="mb-4 font-semibold">Confirm the decision</h2>
              {!can("returns.confirm") ? (
                <Notice>You do not have permission to confirm a route.</Notice>
              ) : (
                <>
                  <fieldset className="space-y-3">
                    <legend className="mb-3 text-xs text-muted-foreground">
                      Choose the final destination
                    </legend>
                    {routes.map((r) => (
                      <label
                        key={r}
                        className={
                          "flex cursor-pointer items-start gap-3 rounded-lg border p-3 " +
                          (route === r ? "border-primary bg-primary/5" : "")
                        }
                      >
                        <input
                          className="mt-1 accent-primary"
                          name="route"
                          type="radio"
                          value={r}
                          checked={route === r}
                          onChange={() => setRoute(r)}
                          disabled={!g.recommendation}
                        />
                        <span className="text-sm">
                          {routeLabels[r]}
                          {g.recommendation === r && (
                            <small className="mt-1 block text-xs text-primary">
                              Matches the recommendation
                            </small>
                          )}
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  {g.recommendation && override && (
                    <div className="mt-4">
                      <label htmlFor="override-note" className="label">
                        Reason for changing the route *
                      </label>
                      <textarea
                        id="override-note"
                        className="mt-2"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        aria-describedby="note-help"
                      />
                      <p
                        id="note-help"
                        className="text-xs text-muted-foreground"
                      >
                        A non-blank note is required after trimming spaces.
                      </p>
                    </div>
                  )}
                  <div className="mt-4 text-xs text-muted-foreground">
                    {!g.condition
                      ? "Save a condition before confirming."
                      : dirty
                        ? "A condition change has not been saved."
                        : missing
                          ? "Attach the required image before confirming."
                          : "Ready to review and confirm."}
                  </div>
                  <Button
                    className="mt-4 w-full"
                    disabled={
                      !canConfirm || !route || (override && !note.trim())
                    }
                    onClick={() => setConfirmOpen(true)}
                  >
                    {override && g.recommendation
                      ? "Override and confirm"
                      : "Confirm recommendation"}
                  </Button>
                  <p className="mt-3 text-xs text-muted-foreground">
                    After confirmation, the condition, images, and route cannot be changed.
                  </p>
                </>
              )}
            </Card>
          )}
        </div>
      </div>
      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm the garment route"
        description={g.id + " · " + g.type}
      >
        <div className="space-y-5">
          <p className="text-lg font-semibold">{route && routeLabels[route]}</p>
          {override && (
            <p className="text-sm whitespace-pre-wrap">Reason: {note.trim()}</p>
          )}
          <Notice>
            The decision will be saved as read-only. It cannot be confirmed
            again or reopened.
          </Notice>
          <Feedback action={confirm} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Back to review
            </Button>
            <Button
              disabled={confirm.busy}
              onClick={() =>
                void confirm.run(async () => {
                  await getApi().confirm(g.id, route!, note);
                  setConfirmOpen(false);
                  reload("The route was confirmed.");
                })
              }
            >
              {confirm.busy ? "Confirming…" : "Confirm decision"}
            </Button>
          </div>
        </div>
      </Dialog>
      <Dialog
        open={!!view}
        onOpenChange={(o) => {
          if (!o) setView(null);
        }}
        title="Evidence"
        description={g.evidence.find((f) => f.id === view)?.filename}
      >
        {view && preview && (
          // Evidence bytes come from the authenticated API, so they are not a remote image URL.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={g.evidence.find((f) => f.id === view)?.filename || "Evidence"}
            className="max-h-[60vh] w-full rounded-lg object-contain"
          />
        )}
      </Dialog>
    </>
  );
}
