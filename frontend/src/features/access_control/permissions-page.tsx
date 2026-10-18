"use client";
import { useCallback, useState } from "react";
import { getApi } from "@/lib/api";
import {
  permissions,
  roles,
  roleLabels,
  type Role,
  type Permission,
  type Grants,
} from "@/lib/types";
import { useSession } from "@/features/auth/session";
import {
  Card,
  Heading,
  Badge,
  Notice,
  Feedback,
  Loading,
  ResourceError,
  useResource,
  useAction,
} from "@/components/ui/shared";
import { Button } from "@/components/ui/button";
export function PermissionsPage({ readOnly = false }: { readOnly?: boolean }) {
  const resource = useResource(useCallback(() => getApi().grants(), []));
  if (resource.error)
    return <ResourceError error={resource.error} retry={resource.reload} />;
  if (!resource.data) return <Loading />;
  return <PermissionsEditor initial={resource.data} readOnly={readOnly} />;
}
function PermissionsEditor({
  initial,
  readOnly,
}: {
  initial: Grants;
  readOnly: boolean;
}) {
  const { can, refresh } = useSession(),
    [grants, setGrants] = useState(initial),
    [role, setRole] = useState<Role>("STORE_STAFF"),
    [draft, setDraft] = useState<Permission[]>(initial.STORE_STAFF),
    action = useAction(),
    dirty =
      JSON.stringify([...draft].sort()) !==
      JSON.stringify([...grants[role]].sort());
  function choose(r: Role) {
    setRole(r);
    setDraft(grants[r]);
    action.clear();
  }
  return (
    <>
      <Heading
        title={readOnly ? "ทบทวนการเข้าถึง" : "บทบาทและสิทธิ์"}
        description={
          readOnly
            ? "สิทธิ์ที่ตั้งค่าไว้และข้อจำกัดที่มีผลจริง แสดงแยกตามบทบาท"
            : "กำหนดสิทธิ์การทำงาน การแก้ไขมีผลในการทำรายการครั้งถัดไป"
        }
      />
      <div className="mb-6">
        <Notice>
          U-ACCESS ยังไม่สรุป: ไม่เปิดให้ ADMIN / HEAD / CONTRACTOR รับสิทธิ์
          Return ข้ามบทบาท · การจัดการบัญชีเป็น ADMIN เท่านั้น (BR-04)
        </Notice>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {roles.map((r) => (
          <Button
            key={r}
            variant={role === r ? "default" : "outline"}
            onClick={() => choose(r)}
            disabled={action.busy || (dirty && r !== role)}
          >
            {roleLabels[r]}
          </Button>
        ))}
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold">{role}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            ทุกบทบาทที่ใช้งานได้มี Login / Profile / Password
            โดยไม่ขึ้นกับตารางนี้
          </p>
        </div>
        <Badge>
          {readOnly ? "อ่านอย่างเดียว" : "ค่าที่ตั้งไว้ × การเข้าถึงจริง"}
        </Badge>
      </div>
      <div className="table-wrap">
        <table className="min-w-[670px]">
          <thead>
            <tr>
              <th>หมวด / ความสามารถ</th>
              <th>กำหนดสิทธิ์</th>
              <th>ผลการเข้าถึง</th>
            </tr>
          </thead>
          <tbody>
            {permissions.map((p) => {
              const reserved = p.key.endsWith(".reserved"),
                blocked =
                  p.group === "Return"
                    ? role !== "STORE_STAFF"
                    : p.group === "Account"
                      ? role !== "ADMIN"
                      : false,
                checked = (readOnly ? grants[role] : draft).includes(p.key),
                reason = reserved
                  ? "Reserved · ยังไม่มี workflow"
                  : blocked
                    ? p.group === "Return"
                      ? "ยังไม่สรุป · U-ACCESS"
                      : "ไม่ได้ · ADMIN เท่านั้น"
                    : checked
                      ? p.group === "Return"
                        ? "ได้ · เฉพาะสาขาที่กำหนด"
                        : "ได้"
                      : "ไม่ได้ · ยังไม่ให้สิทธิ์";
              return (
                <tr key={p.key}>
                  <td>
                    <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                      {p.group}
                    </span>
                    <span>{p.label}</span>
                  </td>
                  <td>
                    {readOnly ? (
                      <Badge tone={checked ? "green" : "neutral"}>
                        {checked ? "ให้สิทธิ์" : "ไม่ให้สิทธิ์"}
                      </Badge>
                    ) : (
                      <input
                        aria-label={role + " " + p.label}
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={checked}
                        disabled={
                          blocked || !can("access.write") || action.busy
                        }
                        onChange={(e) =>
                          setDraft((v) =>
                            e.target.checked
                              ? [...v, p.key]
                              : v.filter((k) => k !== p.key),
                          )
                        }
                      />
                    )}
                  </td>
                  <td>
                    <Badge
                      tone={
                        blocked && p.group === "Return"
                          ? "violet"
                          : reserved
                            ? "neutral"
                            : checked && !blocked
                              ? "green"
                              : "neutral"
                      }
                    >
                      {reason}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-5 space-y-4">
        <Feedback action={action} />
        {!readOnly && (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">
              {dirty
                ? "มีการเปลี่ยนแปลงที่ยังไม่บันทึก · บันทึกหรือคืนค่าก่อนเปลี่ยนบทบาท"
                : "ค่าตรงกับข้อมูลจำลองที่บันทึกไว้"}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={!dirty || action.busy}
                onClick={() => {
                  setDraft(grants[role]);
                  action.clear();
                }}
              >
                คืนค่าก่อนแก้
              </Button>
              <Button
                disabled={!dirty || action.busy || !can("access.write")}
                onClick={() =>
                  void action.run(async () => {
                    const saved = await getApi().saveGrants(role, draft);
                    setGrants(saved);
                    setDraft(saved[role]);
                    await refresh();
                  }, "บันทึกสิทธิ์จำลองแล้ว มีผลในการทำรายการครั้งถัดไป")
                }
              >
                {action.busy ? "กำลังบันทึก…" : "บันทึกสิทธิ์"}
              </Button>
            </div>
          </div>
        )}
        <Card>
          <h3 className="mb-2 text-sm font-semibold">
            สิทธิ์ที่ตั้งค่าไว้ ≠ การข้ามข้อจำกัด
          </h3>
          <p className="text-xs leading-6 text-muted-foreground">
            การเข้าถึงจริงต้องผ่านสิทธิ์ปัจจุบัน ข้อจำกัด ADMIN และ P-STORE
            (ชั่วคราว) ไม่มี ADMIN bypass ส่วน Batch / Outcome / Validation /
            Report มีเพียงนิยามสิทธิ์สำรอง
            ยังไม่มีหน้าจอหรือการทำงานของโมดูลเหล่านั้น
          </p>
        </Card>
      </div>
    </>
  );
}
