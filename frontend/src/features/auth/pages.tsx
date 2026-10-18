"use client";
import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Leaf, ArrowRight, ShieldCheck, UserRound } from "lucide-react";
import { getApi } from "@/lib/api";
import { ApiError } from "@/lib/api-contract";
import { demoAccounts } from "@/lib/mock/seed";
import { roleLabels } from "@/lib/types";
import { useSession } from "./session";
import { Button } from "@/components/ui/button";
import {
  Card,
  Field,
  Feedback,
  Submit,
  Heading,
  Badge,
  Notice,
  useAction,
  values,
} from "@/components/ui/shared";
function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[.9fr_1.1fr]">
      <section className="hidden flex-col justify-between bg-[#254c3a] p-14 text-white lg:flex">
        <div className="flex items-center gap-3 font-semibold">
          <Leaf size={25} /> Garment Returns
        </div>
        <div>
          <span className="text-xs tracking-[.22em] text-green-200">
            TEXTILE TAKE-BACK / SPRINT 1
          </span>
          <h1 className="mt-7 text-5xl leading-tight font-medium">
            รับคืนอย่างเป็นระบบ
            <br />
            ให้ทุกชิ้นมีเส้นทาง
          </h1>
          <p className="mt-6 max-w-sm text-sm leading-7 text-green-100/75">
            บันทึกเสื้อผ้า ประเมินสภาพ และยืนยันปลายทาง
            พร้อมข้อมูลที่กลับมาดูได้
          </p>
          <div className="mt-12 flex gap-3 text-xs text-green-100/75">
            <ShieldCheck size={17} /> สิทธิ์ตามบทบาท · ข้อมูลตามสาขา
          </div>
        </div>
        <p className="text-xs text-green-100/60">
          UI/UX prototype · ใช้ข้อมูลจำลองเท่านั้น
        </p>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2 text-xs font-medium text-amber-800">
            <span className="size-2 rounded-full bg-amber-500" /> PROTOTYPE ·
            ไม่มีการยืนยันตัวตนจริง
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
export function LoginPage() {
  const router = useRouter(),
    { refresh, session, ready } = useSession(),
    action = useAction(),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  useEffect(() => {
    if (ready && session)
      router.replace(
        session.user.role === "ADMIN"
          ? "/users"
          : session.user.role === "STORE_STAFF" &&
              session.grants.STORE_STAFF.includes("returns.read")
            ? "/garments"
            : "/profile",
      );
  }, [ready, session, router]);
  return (
    <AuthLayout>
      <h1 className="text-3xl font-semibold tracking-tight">
        ยินดีต้อนรับกลับ
      </h1>
      <p className="mt-2 mb-7 text-sm text-muted-foreground">
        เข้าสู่ระบบเพื่อเริ่มงานของคุณ
      </p>
      <form
        className="space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          await action.run(async () => {
            await getApi().login(email, password);
            await refresh();
          });
        }}
      >
        <Field
          label="อีเมล"
          name="email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <Field
          label="รหัสผ่าน"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Feedback action={action} />
        <Button className="w-full" disabled={action.busy}>
          {action.busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
          <ArrowRight size={16} />
        </Button>
      </form>
      <p className="mt-5 text-xs text-muted-foreground">
        ลืมรหัสผ่าน? ขอให้ Admin ออกลิงก์กู้รหัสผ่านให้คุณ
        <br />
        <Link href="/reset-password" className="mt-1 inline-block underline">
          มีลิงก์หรือโทเคนแล้ว
        </Link>
      </p>
      <div className="mt-8 rounded-xl border border-dashed p-4">
        <p className="mb-3 text-xs font-semibold">
          ทดลองบทบาท · คลิกเพื่อกรอกบัญชี
        </p>
        <div className="grid grid-cols-2 gap-2">
          {demoAccounts.map((a) => (
            <Button
              key={a.email}
              variant="outline"
              size="sm"
              type="button"
              onClick={() => {
                setEmail(a.email);
                setPassword("Demo1234!");
                action.clear();
              }}
            >
              {a.label}
            </Button>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          รหัสเริ่มต้นทุกบัญชี: Demo1234!
          <br />
          ข้อมูลจำลองคงอยู่เมื่อ refresh / ออกจากระบบ ภายในแท็บนี้
        </p>
      </div>
    </AuthLayout>
  );
}
export function ProfilePage() {
  const { session } = useSession();
  if (!session) return null;
  const u = session.user;
  return (
    <>
      <Heading title="โปรไฟล์ของฉัน" description="ข้อมูลบัญชีที่กำลังใช้งาน" />
      <Card className="max-w-2xl">
        <div className="mb-6 flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
            <UserRound size={25} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{u.name}</h2>
            <span className="text-sm text-muted-foreground">{u.email}</span>
          </div>
          <div className="ml-auto">
            <Badge tone="green">ใช้งาน</Badge>
          </div>
        </div>
        <dl className="grid gap-5 border-t pt-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">บทบาท</dt>
            <dd className="mt-1">
              {roleLabels[u.role]}{" "}
              <small className="block text-xs text-muted-foreground">
                {u.role}
              </small>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">สาขาที่กำหนด</dt>
            <dd className="mt-1">{u.storeId || "ไม่เกี่ยวข้องกับบทบาทนี้"}</dd>
          </div>
        </dl>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/change-password">เปลี่ยนรหัสผ่าน</Link>
        </Button>
      </Card>
      {["HEAD", "CONTRACTOR"].includes(u.role) && (
        <div className="mt-6 max-w-2xl">
          <Notice>
            บทบาทนี้ใช้โปรไฟล์และจัดการรหัสผ่านได้ใน Sprint 1
            งานคัดแยกและรายงานยังไม่เปิดใช้งาน
          </Notice>
        </div>
      )}
    </>
  );
}
export function ChangePasswordPage() {
  const action = useAction(),
    { refresh } = useSession(),
    router = useRouter();
  return (
    <>
      <Heading
        title="เปลี่ยนรหัสผ่าน"
        description="ใช้รหัสผ่านปัจจุบันเพื่อยืนยันการเปลี่ยนแปลง"
      />
      <Card className="max-w-xl">
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            const v = values(e);
            await action.run(async () => {
              if (v.password !== v.confirm)
                throw new ApiError("VALIDATION", "รหัสผ่านยืนยันไม่ตรงกัน", {
                  confirm: "รหัสผ่านยืนยันไม่ตรงกัน",
                });
              await getApi().changePassword(v.current, v.password);
              await refresh();
              router.push("/login");
            });
          }}
        >
          <Field
            name="current"
            label="รหัสผ่านปัจจุบัน"
            type="password"
            required
            autoComplete="current-password"
            error={action.error?.fields.current}
          />
          <PasswordFields />
          <Feedback action={action} />
          <Notice>
            เมื่อเปลี่ยนสำเร็จ เซสชันจำลองจะสิ้นสุดและต้องเข้าสู่ระบบอีกครั้ง
          </Notice>
          <Submit busy={action.busy}>เปลี่ยนรหัสผ่าน</Submit>
        </form>
      </Card>
    </>
  );
}
export function PasswordFields() {
  const [pass, setPass] = useState(""),
    [confirm, setConfirm] = useState("");
  return (
    <>
      <Field
        label="รหัสผ่านใหม่"
        name="password"
        type="password"
        required
        minLength={8}
        maxLength={128}
        autoComplete="new-password"
        hint="8–128 ตัวอักษร · ค่าเทคนิคของต้นแบบ"
        onChange={(e) => setPass(e.target.value)}
      />
      <Field
        label="ยืนยันรหัสผ่านใหม่"
        name="confirm"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={
          confirm && confirm !== pass ? "รหัสผ่านยืนยันไม่ตรงกัน" : undefined
        }
      />
    </>
  );
}
export function ResetPasswordPage() {
  const action = useAction(),
    [done, setDone] = useState(false),
    [token, setToken] = useState("");
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    if (t)
      Promise.resolve().then(() => {
        setToken(t);
        window.history.replaceState(null, "", "/reset-password");
      });
  }, []);
  return (
    <AuthLayout>
      <h1 className="text-3xl font-semibold">ตั้งรหัสผ่านใหม่</h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        ใช้โทเคนจากลิงก์ที่ Admin ส่งให้ · P-RECOVERY ชั่วคราว
      </p>
      {done ? (
        <div className="space-y-5">
          <Notice tone="success">
            ตั้งรหัสผ่านจำลองใหม่แล้ว ลิงก์นี้ใช้ซ้ำไม่ได้
          </Notice>
          <Button asChild>
            <Link href="/login">กลับไปเข้าสู่ระบบ</Link>
          </Button>
        </div>
      ) : (
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            const v = values(e);
            await action.run(async () => {
              if (v.password !== v.confirm)
                throw new ApiError("VALIDATION", "รหัสผ่านยืนยันไม่ตรงกัน", {
                  confirm: "รหัสผ่านยืนยันไม่ตรงกัน",
                });
              await getApi().resetPassword(token, v.password);
              setDone(true);
            });
          }}
        >
          <Field
            label="โทเคนกู้รหัสผ่าน"
            name="token"
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            hint="โทเคนจำลองอายุ 15 นาที ใช้ได้ครั้งเดียว"
          />
          <PasswordFields />
          <Feedback action={action} />
          <Submit busy={action.busy}>ตั้งรหัสผ่านใหม่</Submit>
          <div>
            <Link href="/login" className="text-sm underline">
              กลับเข้าสู่ระบบ
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
