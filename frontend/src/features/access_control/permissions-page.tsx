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
        title={readOnly ? "Access review" : "Roles and Permissions"}
        description={
          readOnly
            ? "Configured permissions and the restrictions that actually apply, grouped by role."
            : "Configure access permissions. Changes take effect on the next request."
        }
      />
      <div className="mb-6">
        <Notice>
          Account administration stays with ADMIN. A granted Return permission
          works for any role. Reserved Batch, Outcome, Validation, and Report
          keys do not open a workflow.
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
            All active roles have access to Login, Profile, and Password
            independently of this permission matrix.
          </p>
        </div>
        <Badge>
          {readOnly ? "Read-only" : "Assigned × effective access"}
        </Badge>
      </div>
      <div className="table-wrap">
        <table className="min-w-[670px]">
          <thead>
            <tr>
              <th>Group / capability</th>
              <th>Assigned</th>
              <th>Effective access</th>
            </tr>
          </thead>
          <tbody>
            {permissions.map((p) => {
              const reserved = p.key.endsWith(".reserved"),
                adminOnly = p.group === "Account" && role !== "ADMIN",
                locked =
                  role === "ADMIN" &&
                  (p.key === "access.read" || p.key === "access.write"),
                checked = (readOnly ? grants[role] : draft).includes(p.key),
                effective = checked && !reserved && !adminOnly,
                reason = reserved
                  ? "Reserved · no workflow"
                  : adminOnly
                    ? checked
                      ? "Assigned · blocked, ADMIN only"
                      : "Not granted · ADMIN only"
                    : effective
                      ? "Allowed"
                      : "Not granted";
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
                        {checked ? "Granted" : "Not granted"}
                      </Badge>
                    ) : (
                      <input
                        aria-label={role + " " + p.label}
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={checked}
                        disabled={
                          locked || !can("access.write") || action.busy
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
                        reserved || adminOnly
                          ? "neutral"
                          : effective
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
                ? "Unsaved changes. Save or discard them before switching roles."
                : "Matches the saved permissions."}
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
                Discard changes
              </Button>
              <Button
                disabled={!dirty || action.busy || !can("access.write")}
                onClick={() =>
                  void action.run(async () => {
                    const saved = await getApi().saveGrants(role, draft);
                    setGrants(saved);
                    setDraft(saved[role]);
                    await refresh();
                  }, "Permissions saved. They apply on the next request.")
                }
              >
                {action.busy ? "Saving…" : "Save permissions"}
              </Button>
            </div>
          </div>
        )}
        <Card>
          <h3 className="mb-2 text-sm font-semibold">
            Assigned permissions are not the same as effective access.
          </h3>
          <p className="text-xs leading-6 text-muted-foreground">
            Effective access follows the saved grants, the ADMIN-only
            administration rule, and the reserved-module labels. There is no
            implicit administrator bypass for garment work. Batch, Outcome,
            Validation, and Report have definitions only.
          </p>
        </Card>
      </div>
    </>
  );
}
