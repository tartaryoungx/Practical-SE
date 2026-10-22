import type { Grants, Permission, User } from "./types";

export function effective(user: User, key: Permission, grants: Grants) {
  return (
    user.is_active &&
    (grants[user.role] ?? []).includes(key) &&
    !key.endsWith(".reserved") &&
    (key.startsWith("users.") || key.startsWith("access.")
      ? user.role === "ADMIN"
      : key.startsWith("returns."))
  );
}
