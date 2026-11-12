import type { Grants, Permission, User } from "./types";

export function effective(user: User, key: Permission, grants: Grants) {
  const account = key.startsWith("users.") || key.startsWith("access.");
  const operational =
    key.startsWith("returns.") ||
    key.startsWith("batch.") ||
    key.startsWith("outcome.") ||
    key.startsWith("validation.") ||
    key.startsWith("issues.") ||
    key.startsWith("report.");
  return (
    user.is_active &&
    (grants[user.role] ?? []).includes(key) &&
    !key.endsWith(".reserved") &&
    (account ? user.role === "ADMIN" : operational)
  );
}
