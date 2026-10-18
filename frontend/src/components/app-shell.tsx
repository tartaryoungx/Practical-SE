"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Shirt,
  Users,
  ShieldCheck,
  UserRound,
  KeyRound,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  Leaf,
  FlaskConical,
} from "lucide-react";
import { useSession } from "@/features/auth/session";
import { getApi } from "@/lib/api";
import { roleLabels, type Permission } from "@/lib/types";
import { Button } from "./ui/button";
import { Loading, Badge } from "./ui/shared";
import { Dialog } from "./ui/dialog";
import { cn } from "@/lib/utils";
const links = [
  {
    href: "/garments",
    label: "เสื้อผ้ารับคืน",
    icon: Shirt,
    permission: "returns.read",
  },
  {
    href: "/users",
    label: "จัดการผู้ใช้งาน",
    icon: Users,
    permission: "users.read",
  },
  {
    href: "/permissions",
    label: "ตั้งค่าสิทธิ์",
    icon: ShieldCheck,
    permission: "access.read",
  },
  {
    href: "/access",
    label: "ทบทวนการเข้าถึง",
    icon: ShieldCheck,
    permission: "access.read",
  },
  { href: "/profile", label: "โปรไฟล์ของฉัน", icon: UserRound },
  { href: "/change-password", label: "เปลี่ยนรหัสผ่าน", icon: KeyRound },
];
export function AppShell({ children }: { children: ReactNode }) {
  const { session, ready, can, refresh } = useSession(),
    router = useRouter(),
    path = usePathname(),
    [collapsed, setCollapsed] = useState(false),
    [mobile, setMobile] = useState(false);
  useEffect(() => {
    if (ready && !session) router.replace("/login");
  }, [ready, session, router]);
  if (!ready || !session) return <Loading />;
  const nav = (
    <>
      <Link
        href="/profile"
        className="mb-9 flex items-center gap-3 font-semibold"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-white">
          <Leaf size={21} />
        </span>
        {!collapsed && (
          <span>
            Garment Returns
            <small className="block text-[10px] tracking-widest text-muted-foreground">
              SPRINT 1
            </small>
          </span>
        )}
      </Link>
      <div className="mb-3 text-[10px] tracking-widest text-muted-foreground">
        {collapsed ? "MENU" : "WORKSPACE"}
      </div>
      <nav className="space-y-1" aria-label="เมนูหลัก">
        {links
          .filter((l) => !l.permission || can(l.permission as Permission))
          .map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobile(false)}
              title={l.label}
              aria-current={path.startsWith(l.href) ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                path.startsWith(l.href)
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <l.icon size={18} className="shrink-0" />
              {!collapsed && l.label}
            </Link>
          ))}
      </nav>
      <div className="mt-auto pt-10">
        <div className="mb-4 border-t pt-4 text-xs text-muted-foreground">
          {!collapsed && (
            <>
              <p className="font-medium text-foreground">{session.user.name}</p>
              <p className="mt-1">{roleLabels[session.user.role]}</p>
            </>
          )}
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start"
          title="ออกจากระบบ"
          onClick={async () => {
            await getApi().logout();
            await refresh();
            router.push("/login");
          }}
        >
          <LogOut size={17} />
          {!collapsed && "ออกจากระบบ"}
        </Button>
      </div>
    </>
  );
  return (
    <div className="flex min-h-screen">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:p-3"
      >
        ข้ามไปเนื้อหา
      </a>
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-white p-5 md:flex",
          collapsed ? "w-20 px-3" : "w-60",
        )}
      >
        {nav}
      </aside>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-[11px] text-amber-900">
          <span className="flex items-center gap-2">
            <FlaskConical size={14} /> FRONTEND PROTOTYPE · บัญชี / ข้อมูล /
            อัปโหลดจำลอง
          </span>
          <span className="hidden sm:block">
            เก็บในแท็บนี้ · ไม่ใช่ระบบจริง
          </span>
        </div>
        <header className="flex h-16 items-center justify-between border-b bg-white px-5 md:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:inline-flex"
              aria-label={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <PanelLeftOpen size={18} />
              ) : (
                <PanelLeftClose size={18} />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="เปิดเมนู"
              onClick={() => {
                setCollapsed(false);
                setMobile(true);
              }}
            >
              <Menu size={20} />
            </Button>
            <span className="text-sm text-muted-foreground">
              Workspace <span className="mx-2 text-border">/</span>{" "}
              {links.find((l) => path.startsWith(l.href))?.label ||
                "เสื้อผ้ารับคืน"}
            </span>
          </div>
          <Badge>{session.user.storeId || session.user.role}</Badge>
        </header>
        <main
          id="content"
          className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10"
        >
          {children}
        </main>
      </div>
      <Dialog
        open={mobile}
        onOpenChange={setMobile}
        title="เมนู"
        description="เลือกหน้าที่ต้องการใช้งาน"
      >
        <div className="flex min-h-80 flex-col">{nav}</div>
      </Dialog>
    </div>
  );
}
