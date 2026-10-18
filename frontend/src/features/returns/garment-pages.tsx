"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
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
import { mockPolicy } from "@/lib/mock/service";
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
        ? "ยืนยันแล้ว"
        : g.condition
          ? "รอยืนยัน"
          : "ยังไม่ประเมิน"}
    </Badge>
  );
}
export function GarmentsPage() {
  const { can, session } = useSession(),
    resource = useResource(useCallback(() => getApi().garments(), []));
  if (resource.error)
    return <ResourceError error={resource.error} retry={resource.reload} />;
  if (!resource.data) return <Loading />;
  return (
    <>
      <Heading
        title="เสื้อผ้ารับคืน"
        description="บันทึก ประเมิน และติดตามการตัดสินใจของแต่ละชิ้น"
        action={
          can("returns.create") && (
            <Button asChild>
              <Link href="/garments/new">
                <Plus size={17} />
                บันทึกเสื้อผ้า
              </Link>
            </Button>
          )
        }
      />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          รายการในสาขา{" "}
          <span className="font-semibold">{session?.user.storeId}</span>{" "}
          <span className="ml-2 text-muted-foreground">
            · {resource.data.length} ชิ้น
          </span>
        </div>
        <Badge tone="amber">P-STORE · กฎชั่วคราว</Badge>
      </div>
      <div className="table-wrap">
        <table className="min-w-[760px]">
          <thead>
            <tr>
              <th>รหัส / ประเภท</th>
              <th>บันทึกเมื่อ</th>
              <th>สภาพ</th>
              <th>สถานะ</th>
              <th>เส้นทางที่ยืนยัน</th>
              <th>
                <span className="sr-only">ดูรายละเอียด</span>
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
                    <span className="text-muted-foreground">ยังไม่ยืนยัน</span>
                  )}
                </td>
                <td>
                  <Button asChild size="icon" variant="ghost">
                    <Link href={"/garments/" + g.id} aria-label={"ดู " + g.id}>
                      <ArrowRight size={17} />
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {resource.data.length === 0 && (
          <Empty text="ยังไม่มีเสื้อผ้าในสาขานี้">
            {can("returns.create") && (
              <Button asChild>
                <Link href="/garments/new">บันทึกชิ้นแรก</Link>
              </Button>
            )}
          </Empty>
        )}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        ดูข้อมูลของเพื่อนร่วมสาขาได้ตามสิทธิ์ ·
        ปลายทางที่เลือกยังไม่ใช่ผลขายหรือรีไซเคิลจริง
      </p>
    </>
  );
}
export function NewGarmentPage() {
  const { session, can } = useSession(),
    router = useRouter(),
    action = useAction();
  if (!can("returns.create"))
    return <Notice tone="error">คุณไม่มีสิทธิ์บันทึกเสื้อผ้า</Notice>;
  return (
    <>
      <Link
        href="/garments"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground"
      >
        <ArrowLeft size={15} />
        กลับรายการเสื้อผ้า
      </Link>
      <Heading
        title="บันทึกเสื้อผ้ารับคืน"
        description="หนึ่งรายการต่อหนึ่งชิ้น เริ่มจากข้อมูลเบื้องต้นแล้วประเมินสภาพในขั้นถัดไป"
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
              <h2 className="font-semibold">ข้อมูลเสื้อผ้า</h2>
            </div>
            <Field
              label="ประเภทเสื้อผ้า"
              name="type"
              required
              placeholder="เช่น เสื้อยืด เสื้อเชิ้ต กางเกงยีนส์"
              error={action.error?.fields.type}
            />
            <Field
              label="วัสดุ"
              name="material"
              required
              placeholder="เช่น Cotton, Linen, Polyester"
              error={action.error?.fields.material}
            />
            <Field
              label="น้ำหนัก (กิโลกรัม)"
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
                <Link href="/garments">ยกเลิก</Link>
              </Button>
              <Submit busy={action.busy}>
                บันทึกและประเมินต่อ <ArrowRight size={16} />
              </Submit>
            </div>
          </form>
        </Card>
        <div className="space-y-4">
          <Card>
            <h2 className="mb-4 font-semibold">รับเข้าที่สาขา</h2>
            <p>{session?.user.storeId}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              ผู้บันทึก: {session?.user.name}
            </p>
            <p className="mt-5 text-xs text-muted-foreground">
              ระบบกำหนดสาขาและผู้บันทึกจากบัญชี พร้อมสร้างรหัสและเวลารับเข้า
            </p>
            <div className="mt-4">
              <Badge tone="amber">P-STORE · ชั่วคราว</Badge>
            </div>
          </Card>
          <Notice>
            บันทึกแล้วจะได้ร่างที่ยังไม่ประเมิน
            คุณกลับมาทำต่อจากรายการเสื้อผ้าได้
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
    created ? "บันทึกเสื้อผ้าจำลองสำเร็จ พร้อมประเมินสภาพต่อ" : "",
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
    assess = useAction(),
    upload = useAction(),
    confirm = useAction();
  const locked = !!g.confirmedRoute,
    required = mockPolicy.evidenceRequired(g.condition),
    dirty = condition !== g.condition && condition !== "",
    missing = required && !g.evidence.length,
    override = route !== g.recommendation,
    canConfirm = can("returns.confirm") && !!g.condition && !missing && !dirty;
  return (
    <>
      <Link
        href="/garments"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground"
      >
        <ArrowLeft size={15} />
        กลับรายการเสื้อผ้า
      </Link>
      <Heading
        title={g.id}
        description={g.type + " · รับเข้า " + date(g.createdAt)}
        action={<Status g={g} />}
      />
      <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge tone="green">1 บันทึกข้อมูล ✓</Badge>
        <span>—</span>
        <Badge tone={g.condition ? "green" : "neutral"}>
          2 ประเมินสภาพ {g.condition ? "✓" : ""}
        </Badge>
        <span>—</span>
        <Badge tone={locked ? "green" : "neutral"}>
          3 ยืนยันเส้นทาง {locked ? "✓" : ""}
        </Badge>
      </div>
      {locked && (
        <div className="mb-6">
          <Notice tone="success">
            <span className="flex items-center gap-2">
              <LockKeyhole size={16} />
              ยืนยันผลแล้ว · สภาพ หลักฐาน และเส้นทางเป็นข้อมูลอ่านอย่างเดียว
            </span>
          </Notice>
        </div>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_350px]">
        <div className="space-y-6">
          <Card>
            <h2 className="mb-5 flex items-center gap-2 font-semibold">
              <Shirt size={19} />
              ข้อมูลเสื้อผ้า
            </h2>
            <dl className="grid grid-cols-2 gap-5 text-sm">
              {[
                ["ประเภท", g.type],
                ["วัสดุ", g.material],
                ["น้ำหนัก", g.weight + " กก."],
                ["สาขา", g.storeId],
                ["ผู้บันทึก", g.creatorId],
                ["รหัสที่สร้าง", g.id],
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
              <h2 className="font-semibold">ประเมินสภาพ</h2>
              <Badge>{locked ? "อ่านอย่างเดียว" : "เลือก 1 สภาพ"}</Badge>
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
                    {mockPolicy.evidenceRequired(c)
                      ? "ต้องมีรูปก่อนยืนยัน"
                      : "รูปไม่บังคับ"}
                  </span>
                </button>
              ))}
            </div>
            <p className="my-4 text-xs text-muted-foreground">
              บันทึกสภาพได้ก่อนแนบรูป · คำแนะนำใช้สภาพเท่านั้น
            </p>
            <Feedback action={assess} />
            {!locked && can("returns.assess") && (
              <Button
                disabled={!condition || !dirty || assess.busy}
                variant="outline"
                onClick={() =>
                  void assess.run(async () => {
                    await getApi().assess(g.id, condition as Condition);
                    reload("บันทึกการประเมินสภาพและคำแนะนำแล้ว");
                  }, "บันทึกสภาพแล้ว")
                }
              >
                {assess.busy ? "กำลังบันทึก…" : "บันทึกการประเมิน"}
              </Button>
            )}
          </Card>
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-semibold">
                <Camera size={18} />
                หลักฐานรูปภาพ
              </h2>
              <Badge tone="amber">P-EVIDENCE · ชั่วคราว</Badge>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              {g.condition
                ? required
                  ? "สภาพนี้ต้องมีรูปอย่างน้อยหนึ่งรูปก่อนยืนยัน"
                  : "สภาพนี้ไม่บังคับรูปภาพ"
                : "GOOD / WORN: ไม่บังคับ · DAMAGED / STAINED: ต้องมีก่อนยืนยัน"}
            </p>
            {!locked && can("returns.evidence") && (
              <label className="mb-4 block cursor-pointer rounded-lg border border-dashed bg-muted/30 p-6 text-center hover:bg-muted">
                <Upload
                  size={24}
                  className="mx-auto mb-2 text-muted-foreground"
                />
                <span className="block text-sm font-medium">
                  {upload.busy
                    ? "กำลังอ่านรูปจำลอง…"
                    : "เลือกรูปเพื่อแนบหลักฐาน"}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  JPEG, PNG, WebP · ไม่เกิน 5 MB / รูป · เก็บในแท็บนี้
                </span>
                <input
                  type="file"
                  className="mt-4 block w-full text-xs"
                  aria-label="เลือกรูปหลักฐาน"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={upload.busy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f)
                      void upload.run(async () => {
                        await getApi().upload(g.id, f);
                        reload("แนบหลักฐานจำลองแล้ว");
                      });
                    e.target.value = "";
                  }}
                />
              </label>
            )}
            <Feedback action={upload} />
            {!g.evidence.length ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                ยังไม่มีหลักฐาน{missing ? " · ต้องแนบก่อนยืนยัน" : ""}
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
                    <span className="text-xs text-primary">ดูรูป</span>
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
              เส้นทางแนะนำ
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
                  จากสภาพ {g.condition} · P-ROUTE (ชั่วคราว)
                </p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-medium">ยังไม่มีคำแนะนำ</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  บันทึกการประเมินสภาพก่อน
                </p>
              </>
            )}
            <p className="mt-4 border-t pt-4 text-xs text-muted-foreground">
              คำแนะนำเป็นการกำหนดปลายทาง ยังไม่ใช่ผลขายต่อหรือรีไซเคิล
            </p>
          </Card>
          {locked ? (
            <Card>
              <h2 className="mb-4 flex items-center gap-2 font-semibold">
                <Check size={18} />
                เส้นทางที่ยืนยัน
              </h2>
              <p className="text-lg font-semibold">
                {routeLabels[g.confirmedRoute!]}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {date(g.confirmedAt!)}
              </p>
              <p className="mt-5 text-xs text-muted-foreground">
                เหตุผล / หมายเหตุ
              </p>
              <p className="mt-1 text-sm whitespace-pre-wrap">
                {g.note || "ไม่มี · ยืนยันตามคำแนะนำ"}
              </p>
            </Card>
          ) : (
            <Card>
              <h2 className="mb-4 font-semibold">ยืนยันการตัดสินใจ</h2>
              {!can("returns.confirm") ? (
                <Notice>คุณไม่มีสิทธิ์ยืนยันเส้นทาง</Notice>
              ) : (
                <>
                  <fieldset className="space-y-3">
                    <legend className="mb-3 text-xs text-muted-foreground">
                      เลือกปลายทางสุดท้าย
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
                              ตรงกับคำแนะนำ
                            </small>
                          )}
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  {g.recommendation && override && (
                    <div className="mt-4">
                      <label htmlFor="override-note" className="label">
                        เหตุผลในการเปลี่ยนเส้นทาง *
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
                        ต้องมีข้อความที่ไม่ว่างหลังตัดช่องว่าง
                      </p>
                    </div>
                  )}
                  <div className="mt-4 text-xs text-muted-foreground">
                    {!g.condition
                      ? "บันทึกสภาพก่อนยืนยัน"
                      : dirty
                        ? "มีสภาพที่ยังไม่บันทึก"
                        : missing
                          ? "แนบรูปที่จำเป็นก่อนยืนยัน"
                          : "พร้อมตรวจสอบและยืนยัน"}
                  </div>
                  <Button
                    className="mt-4 w-full"
                    disabled={
                      !canConfirm || !route || (override && !note.trim())
                    }
                    onClick={() => setConfirmOpen(true)}
                  >
                    {override && g.recommendation
                      ? "เปลี่ยนเส้นทางและยืนยัน"
                      : "ยืนยันตามคำแนะนำ"}
                  </Button>
                  <p className="mt-3 text-xs text-muted-foreground">
                    ยืนยันแล้วจะเปลี่ยนสภาพ รูป หรือเส้นทางไม่ได้
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
        title="ยืนยันเส้นทางของเสื้อผ้า"
        description={g.id + " · " + g.type}
      >
        <div className="space-y-5">
          <p className="text-lg font-semibold">{route && routeLabels[route]}</p>
          {override && (
            <p className="text-sm whitespace-pre-wrap">เหตุผล: {note.trim()}</p>
          )}
          <Notice>
            ผลจำลองจะถูกบันทึกและแสดงเป็นอ่านอย่างเดียว
            ไม่สามารถยืนยันซ้ำหรือเปิดแก้ได้
          </Notice>
          <Feedback action={confirm} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              กลับไปตรวจสอบ
            </Button>
            <Button
              disabled={confirm.busy}
              onClick={() =>
                void confirm.run(async () => {
                  await getApi().confirm(g.id, route!, note);
                  setConfirmOpen(false);
                  reload("ยืนยันเส้นทางจำลองแล้ว");
                })
              }
            >
              {confirm.busy ? "กำลังยืนยัน…" : "ยืนยันผลจำลอง"}
            </Button>
          </div>
        </div>
      </Dialog>
      <Dialog
        open={!!view}
        onOpenChange={(o) => {
          if (!o) setView(null);
        }}
        title="หลักฐานจำลอง"
        description={g.evidence.find((f) => f.id === view)?.filename}
      >
        {view && (
          <Image
            unoptimized
            width={800}
            height={600}
            src={g.evidence.find((f) => f.id === view)!.preview}
            alt={"หลักฐาน " + g.evidence.find((f) => f.id === view)?.filename}
            className="max-h-[60vh] w-full rounded-lg object-contain"
          />
        )}
      </Dialog>
    </>
  );
}
