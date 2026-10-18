"use client";
import { useCallback, useState } from "react";
import { Plus, MoreHorizontal } from "lucide-react";
import { getApi } from "@/lib/api";
import { roles, roleLabels, type User, type Role } from "@/lib/types";
import { useSession } from "@/features/auth/session";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  Heading,
  Field,
  Select,
  Badge,
  Loading,
  Empty,
  Notice,
  Feedback,
  Submit,
  ResourceError,
  useResource,
  useAction,
  values,
} from "@/components/ui/shared";
type Mode =
  "create" | "edit" | "role" | "status" | "reset" | "recovery" | "actions";
export function UsersPage() {
  const { can, session, refresh } = useSession(),
    resource = useResource(useCallback(() => getApi().users(), [])),
    [target, setTarget] = useState<User | null>(null),
    [mode, setMode] = useState<Mode | null>(null),
    [role, setRole] = useState<Role>("STORE_STAFF"),
    [storeList, setStores] = useState<{ id: string; name: string }[]>([]),
    [resetLink, setResetLink] = useState(""),
    [message, setMessage] = useState(""),
    action = useAction();
  async function open(m: Mode, u: User | null = null) {
    action.clear();
    setResetLink("");
    setTarget(u);
    setRole(u?.role || "STORE_STAFF");
    setMode(m);
    if (m === "create" || m === "role")
      await action.run(async () => setStores(await getApi().stores()));
  }
  async function finish(fn: () => Promise<unknown>) {
    await action.run(async () => {
      await fn();
      resource.reload();
      await refresh();
      setMessage("บันทึกการเปลี่ยนแปลงบัญชีจำลองแล้ว");
      setMode(null);
    });
  }
  if (resource.error)
    return <ResourceError error={resource.error} retry={resource.reload} />;
  if (!resource.data) return <Loading />;
  const own = target?.id === session?.user.id;
  return (
    <>
      <Heading
        title="ผู้ใช้งาน"
        description="จัดการบัญชี บทบาท และการเข้าถึงของทีม"
        action={
          can("users.create") && (
            <Button onClick={() => void open("create")}>
              <Plus size={17} />
              เพิ่มผู้ใช้งาน
            </Button>
          )
        }
      />
      {message && (
        <div className="mb-5">
          <Notice tone="success">{message}</Notice>
        </div>
      )}
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm font-medium">
          บัญชีทั้งหมด{" "}
          <span className="ml-2 text-muted-foreground">
            {resource.data.length}
          </span>
        </p>
        <Badge>ADMIN ONLY</Badge>
      </div>
      <div className="table-wrap">
        <table className="min-w-[730px]">
          <thead>
            <tr>
              <th>ชื่อ / อีเมล</th>
              <th>บทบาท</th>
              <th>สาขา</th>
              <th>สถานะ</th>
              <th>
                <span className="sr-only">จัดการ</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {resource.data.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 place-items-center rounded-full bg-muted font-medium">
                      {u.name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="font-medium">
                        {u.name}
                        {u.id === session?.user.id && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            คุณ
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {u.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  {roleLabels[u.role]}
                  <small className="block text-[10px] text-muted-foreground">
                    {u.role}
                  </small>
                </td>
                <td>{u.storeId || "—"}</td>
                <td>
                  <Badge tone={u.is_active ? "green" : "neutral"}>
                    {u.is_active ? "ใช้งาน" : "ปิดใช้งาน"}
                  </Badge>
                </td>
                <td>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={"จัดการ " + u.name}
                    onClick={() => void open("actions", u)}
                  >
                    <MoreHorizontal size={18} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!resource.data.length && <Empty text="ยังไม่มีบัญชีผู้ใช้งาน" />}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        ชื่อและอีเมลแก้ไขแยกจากบทบาท สถานะ และรหัสผ่าน · ป้องกันการปิดบัญชีตนเอง
        / Admin คนสุดท้าย
      </p>
      <Dialog
        open={mode !== null}
        onOpenChange={(o) => {
          if (!o) setMode(null);
        }}
        title={
          mode === "create"
            ? "เพิ่มผู้ใช้งาน"
            : mode === "edit"
              ? "แก้ไขข้อมูลผู้ใช้"
              : mode === "role"
                ? "กำหนดบทบาท"
                : mode === "status"
                  ? target?.is_active
                    ? "ปิดใช้งานบัญชี"
                    : "เปิดใช้งานบัญชี"
                  : mode === "reset"
                    ? "รีเซ็ตรหัสผ่านโดย Admin"
                    : mode === "recovery"
                      ? "ออกลิงก์กู้รหัสผ่าน"
                      : "จัดการบัญชี"
        }
        description={
          target
            ? target.name + " · " + target.email
            : "สร้างบัญชีจำลองและกำหนดสาขาให้ Staff"
        }
      >
        {mode === "actions" && target && (
          <div className="space-y-2">
            {(
              [
                ["edit", "users.edit", "แก้ไขชื่อ / อีเมล"],
                ["role", "users.role", "เปลี่ยนบทบาท"],
                [
                  "status",
                  "users.status",
                  target.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน",
                ],
                ["reset", "users.reset", "รีเซ็ตรหัสผ่าน"],
                ["recovery", "users.reset", "ออกลิงก์กู้รหัสผ่าน"],
              ] as const
            )
              .filter(([, p]) => can(p))
              .map(([m, , label]) => (
                <Button
                  key={m}
                  variant="outline"
                  className="w-full justify-start"
                  disabled={
                    own && (m === "status" || m === "reset" || m === "recovery")
                  }
                  onClick={() => void open(m, target)}
                >
                  {label}
                </Button>
              ))}
            {own && (
              <p className="pt-3 text-xs text-muted-foreground">
                เปลี่ยนรหัสผ่านของตนเองจากเมนู “เปลี่ยนรหัสผ่าน”
              </p>
            )}
          </div>
        )}
        {(mode === "create" || mode === "edit") && (
          <form
            key={mode + (target?.id || "")}
            className="space-y-4"
            onSubmit={(e) => {
              const v = values(e);
              void finish(() =>
                mode === "create"
                  ? getApi().createUser({
                      name: v.name,
                      email: v.email,
                      password: v.password,
                      role,
                      storeId: v.storeId || null,
                    })
                  : getApi().editUser(target!.id, {
                      name: v.name,
                      email: v.email,
                    }),
              );
            }}
          >
            <Field
              label="ชื่อผู้ใช้งาน"
              name="name"
              required
              maxLength={100}
              defaultValue={target?.name}
              error={action.error?.fields.name}
            />
            <Field
              label="อีเมล"
              name="email"
              type="email"
              required
              defaultValue={target?.email}
              error={action.error?.fields.email}
            />
            {mode === "create" && (
              <>
                <Field
                  label="รหัสผ่านเริ่มต้น"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  hint="8–128 ตัวอักษร · ไม่มีบังคับเปลี่ยนรหัสผ่านครั้งแรก"
                />
                <Select
                  label="บทบาท"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {roleLabels[r]} · {r}
                    </option>
                  ))}
                </Select>
                {role === "STORE_STAFF" && (
                  <Select
                    label="สาขา · P-STORE (ชั่วคราว)"
                    name="storeId"
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>
                      เลือกสาขา
                    </option>
                    {storeList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                )}
              </>
            )}
            <Feedback action={action} />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMode(null)}
              >
                ยกเลิก
              </Button>
              <Submit busy={action.busy}>
                {mode === "create" ? "สร้างผู้ใช้งาน" : "บันทึกข้อมูล"}
              </Submit>
            </div>
          </form>
        )}
        {mode === "role" && target && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              const v = values(e);
              void finish(() =>
                getApi().setRole(
                  target.id,
                  role,
                  target.role === "STORE_STAFF" && role === "STORE_STAFF"
                    ? target.storeId
                    : v.storeId || null,
                ),
              );
            }}
          >
            <Select
              label="บทบาท"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {roleLabels[r]} · {r}
                </option>
              ))}
            </Select>
            {role === "STORE_STAFF" &&
              (target.role === "STORE_STAFF" ? (
                <Notice>
                  สาขา: {target.storeId} · ไม่รองรับการย้ายสาขาใน Sprint 1
                </Notice>
              ) : (
                <Select
                  label="สาขา · P-STORE (ชั่วคราว)"
                  name="storeId"
                  required
                  defaultValue=""
                >
                  <option disabled value="">
                    เลือกสาขา
                  </option>
                  {storeList.map((s) => (
                    <option value={s.id} key={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              ))}
            <Notice>
              บทบาทใหม่มีผลในการทำรายการครั้งถัดไป รวมถึงบัญชีที่กำลังเข้าใช้
            </Notice>
            <Feedback action={action} />
            <Submit busy={action.busy}>ยืนยันบทบาท</Submit>
          </form>
        )}
        {mode === "status" && target && (
          <div className="space-y-5">
            <Notice>
              {target.is_active
                ? "บัญชีนี้จะเข้าสู่ระบบและใช้เซสชันจำลองเดิมไม่ได้"
                : "บัญชีนี้จะกลับมาเข้าสู่ระบบได้"}
            </Notice>
            <Feedback action={action} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMode(null)}>
                ยกเลิก
              </Button>
              <Button
                disabled={action.busy}
                onClick={() =>
                  void finish(() =>
                    getApi().setStatus(target.id, !target.is_active),
                  )
                }
              >
                ยืนยัน{target.is_active ? "ปิด" : "เปิด"}ใช้งาน
              </Button>
            </div>
          </div>
        )}
        {mode === "reset" && target && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              const v = values(e);
              void finish(() => getApi().adminReset(target.id, v.password));
            }}
          >
            <Notice>
              รหัสผ่านเก่าและเซสชันจำลองเดิมจะใช้ไม่ได้
              กรุณาส่งรหัสใหม่ให้ผู้ใช้ด้วยตนเอง
            </Notice>
            <Field
              label="รหัสผ่านชั่วคราวที่ต้องการตั้ง"
              name="password"
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
            />
            <Feedback action={action} />
            <Submit busy={action.busy}>ยืนยันรีเซ็ตรหัสผ่าน</Submit>
          </form>
        )}
        {mode === "recovery" && target && (
          <div className="space-y-4">
            <Notice>
              P-RECOVERY · ชั่วคราว: Admin ส่งลิงก์ด้วยตนเอง โทเคนใช้ครั้งเดียว
              อายุ 15 นาที ไม่มีการส่งอีเมล
            </Notice>
            {resetLink ? (
              <>
                <Field
                  label="ลิงก์จำลองสำหรับส่งให้ผู้ใช้"
                  name="link"
                  value={resetLink}
                  readOnly
                />
                <p className="text-xs text-muted-foreground">
                  ทดสอบในแท็บเดิม เพราะข้อมูลต้นแบบเก็บแยกตามแท็บ
                </p>
                <Button asChild>
                  <a href={resetLink}>เปิดหน้าตั้งรหัสผ่านใหม่</a>
                </Button>
              </>
            ) : (
              <Button
                disabled={action.busy}
                onClick={() =>
                  void action.run(async () => {
                    const t = await getApi().issueReset(target.id);
                    setResetLink(
                      window.location.origin +
                        "/reset-password?token=" +
                        encodeURIComponent(t),
                    );
                  })
                }
              >
                สร้างลิงก์จำลอง
              </Button>
            )}
            <Feedback action={action} />
          </div>
        )}
      </Dialog>
    </>
  );
}
