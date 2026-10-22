"use client";
import {
  useEffect,
  useId,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { LoaderCircle, AlertCircle, CheckCircle2, Inbox } from "lucide-react";
import { ApiError } from "@/lib/api-contract";
import { Button } from "./button";
import { Input } from "./input";
import { cn } from "@/lib/utils";
export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border bg-card p-5 shadow-xs md:p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "amber" | "violet";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-1 text-xs font-medium",
        tone === "green"
          ? "bg-emerald-50 text-emerald-800"
          : tone === "amber"
            ? "bg-amber-50 text-amber-800"
            : tone === "violet"
              ? "bg-violet-50 text-violet-800"
              : "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}
export function Heading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Notice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "error" | "success";
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-lg border p-3 text-sm",
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-800"
          : tone === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border-border bg-muted/50 text-muted-foreground",
      )}
    >
      {tone === "success" ? (
        <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
      ) : (
        <AlertCircle size={18} className="mt-0.5 shrink-0" />
      )}
      <div>{children}</div>
    </div>
  );
}
export function Field({
  label,
  name,
  error,
  hint,
  children,
  ...props
}: React.ComponentProps<typeof Input> & {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children?: ReactNode;
}) {
  const auto = useId(),
    id = props.id || auto;
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {props.required && (
          <span aria-hidden="true" className="ml-1 text-destructive">
            *
          </span>
        )}
      </label>
      {children || (
        <Input
          {...props}
          id={id}
          name={name}
          aria-invalid={!!error}
          aria-describedby={
            error ? id + "-error" : hint ? id + "-hint" : undefined
          }
        />
      )}{" "}
      {hint && (
        <p id={id + "-hint"} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={id + "-error"} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
export function Select({
  label,
  children,
  ...props
}: React.ComponentProps<"select"> & { label: string }) {
  const id = useId();
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {props.required && <span aria-hidden="true"> *</span>}
      </label>
      <select
        {...props}
        id={id}
        className="h-10 w-full rounded-md border bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        {children}
      </select>
    </div>
  );
}
export function Loading() {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-3 p-16 text-sm text-muted-foreground"
    >
      <LoaderCircle size={19} className="animate-spin" />
      Loading…
    </div>
  );
}
export function Empty({
  text,
  children,
}: {
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-4 py-16 text-center">
      <Inbox className="mx-auto text-muted-foreground" size={34} />
      <p className="text-sm text-muted-foreground">{text}</p>
      {children}
    </div>
  );
}
export function useAction() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<ApiError | null>(null),
    [success, setSuccess] = useState("");
  async function run<T>(action: () => Promise<T>, message = "") {
    setBusy(true);
    setError(null);
    setSuccess("");
    try {
      const result = await action();
      setSuccess(message);
      return result;
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e
          : new ApiError("ERROR", "The request could not be completed. Try again."),
      );
      return undefined;
    } finally {
      setBusy(false);
    }
  }
  return {
    busy,
    error,
    success,
    run,
    clear: () => {
      setError(null);
      setSuccess("");
    },
  };
}
export function Feedback({ action }: { action: ReturnType<typeof useAction> }) {
  return (
    <>
      {action.error && <Notice tone="error">{action.error.message}</Notice>}
      {action.success && <Notice tone="success">{action.success}</Notice>}
    </>
  );
}
export function Submit({
  busy,
  children = "Save",
}: {
  busy: boolean;
  children?: ReactNode;
}) {
  return (
    <Button type="submit" disabled={busy}>
      {busy && <LoaderCircle className="animate-spin" size={16} />}{" "}
      {busy ? "Saving…" : children}
    </Button>
  );
}
export function useResource<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState<string | null>(null),
    [version, setVersion] = useState(0);
  useEffect(() => {
    let alive = true;
    fetcher()
      .then((v) => {
        if (alive) {
          setData(v);
          setError(null);
        }
      })
      .catch((e) => {
        if (alive) {
          setError(e.message);
          setData(null);
        }
      });
    return () => {
      alive = false;
    };
  }, [fetcher, version]);
  return { data, error, reload: () => setVersion((v) => v + 1) };
}
export function ResourceError({
  error,
  retry,
}: {
  error: string;
  retry: () => void;
}) {
  return (
    <div className="space-y-4">
      <Notice tone="error">{error}</Notice>
      <Button variant="outline" onClick={retry}>
        Try again
      </Button>
    </div>
  );
}
export function values(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  return Object.fromEntries(new FormData(event.currentTarget)) as Record<
    string,
    string
  >;
}
export function date(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
