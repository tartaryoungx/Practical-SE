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
    [temporaryPassword, setTemporaryPassword] = useState(""),
    [resetLink, setResetLink] = useState(""),
    [message, setMessage] = useState(""),
    action = useAction();
  async function open(m: Mode, u: User | null = null) {
    action.clear();
    setResetLink("");
    setTemporaryPassword("");
    setTarget(u);
    setRole(u?.role || "STORE_STAFF");
    setMode(m);
  }
  async function finish(fn: () => Promise<unknown>) {
    await action.run(async () => {
      await fn();
      resource.reload();
      await refresh();
      setMessage("The account change was saved.");
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
        title="Users"
        description="Manage user accounts, roles, and team access"
        action={
          can("users.create") && (
            <Button onClick={() => void open("create")}>
              <Plus size={17} />
              Add User
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
          Total accounts{" "}
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
              <th>Name / Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>
                <span className="sr-only">Actions</span>
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
                            You
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
                <td>
                  <Badge tone={u.is_active ? "green" : "neutral"}>
                    {u.is_active ? "Active" : "Disabled"}
                  </Badge>
                </td>
                <td>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={"Manage " + u.name}
                    onClick={() => void open("actions", u)}
                  >
                    <MoreHorizontal size={18} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!resource.data.length && <Empty text="No user accounts yet" />}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Name and email are edited separately from role, status, and password.
        Self-disable and removal of the last administrator are prevented.
      </p>
      <Dialog
        open={mode !== null}
        onOpenChange={(o) => {
          if (!o) setMode(null);
        }}
        title={
          mode === "create"
            ? "Add User"
            : mode === "edit"
              ? "Edit user"
              : mode === "role"
                ? "Assign role"
                : mode === "status"
                  ? target?.is_active
                    ? "Disable account"
                    : "Reactivate account"
                  : mode === "reset"
                    ? "Reset password"
                    : mode === "recovery"
                      ? "Issue recovery link"
                      : "Manage account"
        }
        description={
          target
            ? target.name + " · " + target.email
            : "Create an account and choose a role"
        }
      >
        {mode === "actions" && target && (
          <div className="space-y-2">
            {(
              [
                ["edit", "users.edit", "Edit name / email"],
                ["role", "users.role", "Change role"],
                [
                  "status",
                  "users.status",
                  target.is_active ? "Disable" : "Reactivate",
                ],
                ["reset", "users.reset", "Reset password"],
                ["recovery", "users.reset", "Issue recovery link"],
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
                Change your own password from the Change password page.
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
                    })
                  : getApi().editUser(target!.id, {
                      name: v.name,
                      email: v.email,
                    }),
              );
            }}
          >
            <Field
              label="Name"
              name="name"
              required
              maxLength={100}
              defaultValue={target?.name}
              error={action.error?.fields.name}
            />
            <Field
              label="Email"
              name="email"
              type="email"
              required
              defaultValue={target?.email}
              error={action.error?.fields.email}
            />
            {mode === "create" && (
              <>
                <Field
                  label="Initial Password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  hint="8–128 characters. No forced change on first login."
                />
                <Select
                  label="Role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {roleLabels[r]} · {r}
                    </option>
                  ))}
                </Select>
              </>
            )}
            <Feedback action={action} />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMode(null)}
              >
                Cancel
              </Button>
              <Submit busy={action.busy}>
                {mode === "create" ? "Create User" : "Save"}
              </Submit>
            </div>
          </form>
        )}
        {mode === "role" && target && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void finish(() => getApi().setRole(target.id, role));
            }}
          >
            <Select
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {roleLabels[r]} · {r}
                </option>
              ))}
            </Select>
            <Notice>
              The new role applies on the next request, including an existing session.
            </Notice>
            <Feedback action={action} />
            <Submit busy={action.busy}>Confirm role</Submit>
          </form>
        )}
        {mode === "status" && target && (
          <div className="space-y-5">
            <Notice>
              {target.is_active
                ? "This account will not be able to sign in, and its current session will end."
                : "This account will be able to sign in again."}
            </Notice>
            <Feedback action={action} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMode(null)}>
                Cancel
              </Button>
              <Button
                disabled={action.busy}
                onClick={() =>
                  void finish(() =>
                    getApi().setStatus(target.id, !target.is_active),
                  )
                }
              >
                Confirm {target.is_active ? "disable" : "reactivation"}
              </Button>
            </div>
          </div>
        )}
        {mode === "reset" && target && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              const v = values(e);
              void action.run(async () => {
                const temporary = await getApi().adminReset(target.id, v.password);
                resource.reload();
                await refresh();
                if (temporary) {
                  setTemporaryPassword(temporary);
                  setMessage("");
                } else {
                  setMessage("The password was reset.");
                  setMode(null);
                }
              });
            }}
          >
            <Notice>
              The previous password stops working. Give the new password to the
              user directly. Leave the field blank to generate one.
            </Notice>
            {temporaryPassword ? (
              <Field
                label="Temporary password"
                name="generated"
                value={temporaryPassword}
                readOnly
              />
            ) : (
              <Field
                label="Temporary password"
                name="password"
                type="password"
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                hint="Optional. A password is generated when this is blank."
              />
            )}
            <Feedback action={action} />
            {!temporaryPassword && (
              <Submit busy={action.busy}>Reset password</Submit>
            )}
          </form>
        )}
        {mode === "recovery" && target && (
          <div className="space-y-4">
            <Notice>
              The administrator delivers this link manually. The token works once
              and expires after 15 minutes. No email is sent.
            </Notice>
            {resetLink ? (
              <>
                <Field
                  label="Recovery link"
                  name="link"
                  value={resetLink}
                  readOnly
                />
                <p className="text-xs text-muted-foreground">
                  Open the link and set a new password. The token is single-use.
                </p>
                <Button asChild>
                  <a href={resetLink}>Open reset password page</a>
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
                Create recovery link
              </Button>
            )}
            <Feedback action={action} />
          </div>
        )}
      </Dialog>
    </>
  );
}
