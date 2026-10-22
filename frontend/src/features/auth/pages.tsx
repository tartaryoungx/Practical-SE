"use client";
import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Leaf, ArrowRight, ShieldCheck, UserRound } from "lucide-react";
import { getApi } from "@/lib/api";
import { ApiError } from "@/lib/api-contract";
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
            Record every return
            <br />
            and keep its route
          </h1>
          <p className="mt-6 max-w-sm text-sm leading-7 text-green-100/75">
            Record a garment, assess its condition, and confirm where it goes.
          </p>
          <div className="mt-12 flex gap-3 text-xs text-green-100/75">
            <ShieldCheck size={17} /> Access follows the signed-in account
          </div>
        </div>
          <p className="text-xs text-green-100/60">Internal garment returns workspace</p>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2 text-xs font-medium text-amber-800">
            <span className="size-2 rounded-full bg-amber-500" /> Sign in with your
            account
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
    if (ready && session) {
      const keys = session.grants[session.user.role] ?? [];
      router.replace(
        session.user.role === "ADMIN" && keys.includes("users.read")
          ? "/users"
          : keys.includes("returns.read")
            ? "/garments"
            : "/profile",
      );
    }
  }, [ready, session, router]);
  return (
    <AuthLayout>
      <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-2 mb-7 text-sm text-muted-foreground">
        Sign in to continue your work
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
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <Field
          label="Password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Feedback action={action} />
        <Button className="w-full" disabled={action.busy}>
          {action.busy ? "Signing in…" : "Sign in"}
          <ArrowRight size={16} />
        </Button>
      </form>
      <p className="mt-5 text-xs text-muted-foreground">
        Forgot your password? Ask an administrator for a recovery link.
        <br />
        <Link href="/reset-password" className="mt-1 inline-block underline">
          I already have a recovery link
        </Link>
      </p>
    </AuthLayout>
  );
}
export function ProfilePage() {
  const { session } = useSession();
  if (!session) return null;
  const u = session.user;
  return (
    <>
      <Heading title="My profile" description="The account you are using now" />
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
            <Badge tone={u.is_active ? "green" : "neutral"}>
              {u.is_active ? "Active" : "Disabled"}
            </Badge>
          </div>
        </div>
        <dl className="grid gap-5 border-t pt-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Role</dt>
            <dd className="mt-1">
              {roleLabels[u.role]}{" "}
              <small className="block text-xs text-muted-foreground">
                {u.role}
              </small>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Account status</dt>
            <dd className="mt-1">{u.is_active ? "Active" : "Disabled"}</dd>
          </div>
        </dl>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/change-password">Change password</Link>
        </Button>
      </Card>
      {["HEAD", "CONTRACTOR"].includes(u.role) && (
        <div className="mt-6 max-w-2xl">
          <Notice>
            This role can use its profile and password in Sprint 1. Sorting and
            reporting workflows are not available.
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
        title="Change password"
        description="Confirm the change with your current password"
      />
      <Card className="max-w-xl">
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            const v = values(e);
            await action.run(async () => {
              if (v.password !== v.confirm)
                throw new ApiError("VALIDATION", "The confirmation does not match.", {
                  confirm: "The confirmation does not match.",
                });
              await getApi().changePassword(v.current, v.password);
              await refresh();
              router.push("/login");
            });
          }}
        >
          <Field
            name="current"
            label="Current password"
            type="password"
            required
            autoComplete="current-password"
            error={action.error?.fields.current}
          />
          <PasswordFields />
          <Feedback action={action} />
          <Notice>
            After a successful change, this session ends and you need to sign in again.
          </Notice>
          <Submit busy={action.busy}>Change password</Submit>
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
        label="New password"
        name="password"
        type="password"
        required
        minLength={8}
        maxLength={128}
        autoComplete="new-password"
        hint="8–128 characters"
        onChange={(e) => setPass(e.target.value)}
      />
      <Field
        label="Confirm new password"
        name="confirm"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={
          confirm && confirm !== pass ? "The confirmation does not match" : undefined
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
      <h1 className="text-3xl font-semibold">Set a new password</h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        Use the token from the recovery link an administrator gave you.
      </p>
      {done ? (
        <div className="space-y-5">
          <Notice tone="success">
            The password was changed. This link cannot be used again.
          </Notice>
          <Button asChild>
            <Link href="/login">Return to sign in</Link>
          </Button>
        </div>
      ) : (
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            const v = values(e);
            await action.run(async () => {
              if (v.password !== v.confirm)
                throw new ApiError("VALIDATION", "The confirmation does not match.", {
                  confirm: "The confirmation does not match.",
                });
              await getApi().resetPassword(token, v.password);
              setDone(true);
            });
          }}
        >
          <Field
            label="Recovery token"
            name="token"
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            hint="The token lasts 15 minutes and can be used once"
          />
          <PasswordFields />
          <Feedback action={action} />
          <Submit busy={action.busy}>Set new password</Submit>
          <div>
            <Link href="/login" className="text-sm underline">
              Back to sign in
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
