import { ApiError, type Api, type CreateUser } from "../api-contract";
import {
  roles,
  conditions,
  routes,
  permissions,
  type User,
  type Permission,
  type Garment,
  type Condition,
  type Route,
} from "../types";
import { seed, type MockState } from "./seed";
export const mockPolicy = {
  recommendation: (c: Condition): Route =>
    c === "GOOD" ? "DIRECT_RESALE_CANDIDATE" : "THIRD_PARTY_CONTRACTOR",
  evidenceRequired: (c: Condition | null) => c === "DAMAGED" || c === "STAINED",
  uploadLimit: 5 * 1024 * 1024,
};
export function effective(
  user: User,
  key: Permission,
  grants: MockState["grants"],
) {
  return (
    user.is_active &&
    grants[user.role].includes(key) &&
    (key.startsWith("users.") || key.startsWith("access.")
      ? user.role === "ADMIN"
      : key.startsWith("returns.")
        ? true
        : false)
  );
}
function fail(
  code: string,
  message: string,
  fields: Record<string, string> = {},
): never {
  throw new ApiError(code, message, fields);
}
function password(value: string) {
  if (value.length < 8 || value.length > 128)
    fail("VALIDATION", "Password must be 8–128 characters.", {
      password: "Use 8–128 characters.",
    });
}
function profile(
  input: { name: string; email: string },
  state: MockState,
  id?: string,
) {
  const name = input.name.trim(),
    email = input.email.trim().toLowerCase();
  if (!name || name.length > 100)
    fail("VALIDATION", "Enter a name of at most 100 characters.", {
      name: "Enter a name of at most 100 characters.",
    });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    fail("VALIDATION", "The email address is invalid.", {
      email: "Enter a valid email address.",
    });
  if (state.users.some((u) => u.id !== id && u.email === email))
    fail("CONFLICT", "An account with this email already exists.", {
      email: "This email is already in use.",
    });
  return { name, email };
}
// Demonstration state only: this is not authentication, authorization or durable storage.
export function createMockApi(
  options: { delay?: number; storage?: Storage } = {},
): Api {
  let state = seed();
  const key = "garment-prototype-v1";
  if (options.storage) {
    try {
      const saved = options.storage.getItem(key);
      if (saved) state = JSON.parse(saved);
    } catch {
      state = seed();
    }
  }
  async function run<T>(fn: () => T, mutate = false): Promise<T> {
    await new Promise((r) => setTimeout(r, options.delay ?? 250));
    const before = structuredClone(state);
    try {
      const result = fn();
      if (mutate) options.storage?.setItem(key, JSON.stringify(state));
      return structuredClone(result);
    } catch (e) {
      state = before;
      if (e instanceof ApiError) throw e;
      fail("STORAGE", "Storage is unavailable. Try again.");
    }
  }
  function me() {
    const u = state.users.find((u) => u.id === state.sessionId && u.is_active);
    if (!u) fail("UNAUTHENTICATED", "The session has ended. Sign in again.");
    return u;
  }
  function permit(p: Permission) {
    const u = me();
    if (!effective(u, p, state.grants))
      fail("FORBIDDEN", "You do not have access to this resource.");
    return u;
  }
  function user(id: string) {
    return (
      state.users.find((u) => u.id === id) ??
      fail("NOT_FOUND", "The account was not found.")
    );
  }
  function protectAdmin(u: User, remove: boolean) {
    if (
      remove &&
      u.role === "ADMIN" &&
      u.is_active &&
      state.users.filter((a) => a.role === "ADMIN" && a.is_active).length === 1
    )
      fail("LAST_ADMIN", "At least one active administrator must remain.");
  }
  function garment(id: string, p: Permission, write = false) {
    permit(p);
    const g = state.garments.find((g) => g.id === id);
    if (!g) fail("NOT_FOUND", "The garment was not found.");
    if (write && g.confirmedRoute)
      fail(
        "READ_ONLY",
        "This garment is confirmed and can no longer be changed.",
      );
    return g;
  }
  function invalidate(id: string) {
    if (state.sessionId === id) state.sessionId = null;
  }
  return {
    session: () =>
      run(() => {
        const u = state.users.find(
          (u) => u.id === state.sessionId && u.is_active,
        );
        return u ? { user: u, grants: state.grants } : null;
      }),
    login: (email, pass) =>
      run(() => {
        const u = state.users.find(
          (u) => u.email === email.trim().toLowerCase(),
        );
        if (!u || !u.is_active || state.passwords[u.id] !== pass)
          fail(
            "CREDENTIALS",
            "The email or password is incorrect, or the account is unavailable.",
          );
        state.sessionId = u.id;
        return { user: u, grants: state.grants };
      }, true),
    logout: () =>
      run(() => {
        state.sessionId = null;
      }, true),
    changePassword: (current, next) =>
      run(() => {
        const u = me();
        if (state.passwords[u.id] !== current)
          fail("VALIDATION", "The current password is incorrect.", {
            current: "The current password is incorrect.",
          });
        password(next);
        state.passwords[u.id] = next;
        invalidate(u.id);
      }, true),
    resetPassword: (token, next) =>
      run(() => {
        const t = state.tokens.find(
          (t) => t.token === token && !t.used && t.expires > Date.now(),
        );
        if (!t) fail("TOKEN", "The reset link is invalid, expired, or already used.");
        password(next);
        t.used = true;
        state.passwords[t.userId] = next;
        invalidate(t.userId);
      }, true),
    users: () =>
      run(() => {
        permit("users.read");
        return state.users;
      }),
    createUser: (input: CreateUser) =>
      run(() => {
        permit("users.create");
        const fields = profile(input, state);
        password(input.password);
        const u: User = {
          id: crypto.randomUUID(),
          ...fields,
          role: input.role,
          is_active: true,
        };
        state.users.push(u);
        state.passwords[u.id] = input.password;
        return u;
      }, true),
    editUser: (id, input) =>
      run(() => {
        permit("users.edit");
        if (Object.keys(input).some((k) => !["name", "email"].includes(k)))
          fail("VALIDATION", "Only name and email can be edited here.");
        const u = user(id);
        Object.assign(u, profile(input, state, id));
        return u;
      }, true),
    setStatus: (id, active) =>
      run(() => {
        const actor = permit("users.status"),
          u = user(id);
        if (actor.id === id && !active)
          fail("SELF_DISABLE", "You cannot disable your own account.");
        protectAdmin(u, !active);
        u.is_active = active;
        if (!active) invalidate(id);
        return u;
      }, true),
    setRole: (id, role) =>
      run(() => {
        permit("users.role");
        const u = user(id);
        protectAdmin(u, role !== "ADMIN");
        u.role = role;
        return u;
      }, true),
    adminReset: (id, next) =>
      run(() => {
        const actor = permit("users.reset");
        if (actor.id === id)
          fail("SELF_RESET", "Use Change Password for your own account.");
        user(id);
        password(next);
        state.passwords[id] = next;
        invalidate(id);
        return null;
      }, true),
    issueReset: (id) =>
      run(() => {
        const actor = permit("users.reset");
        if (actor.id === id)
          fail("SELF_RESET", "Use Change Password for your own account.");
        user(id);
        const token = crypto.randomUUID();
        state.tokens.push({
          token,
          userId: id,
          expires: Date.now() + 15 * 60 * 1000,
          used: false,
        });
        return token;
      }, true),
    grants: () =>
      run(() => {
        permit("access.read");
        return state.grants;
      }),
    saveGrants: (role, keys) =>
      run(() => {
        permit("access.write");
        if (
          !roles.includes(role) ||
          keys.some((k) => !permissions.some((p) => p.key === k))
        )
          fail("VALIDATION", "The role or permission is invalid.");
        if (
          role !== "ADMIN" &&
          keys.some((k) => k.startsWith("users.") || k.startsWith("access."))
        )
          fail(
            "MANDATORY",
            "Account and permission administration is ADMIN-only.",
          );
        if (
          role === "ADMIN" &&
          (!keys.includes("access.read") || !keys.includes("access.write"))
        )
          fail(
            "LAST_ADMIN",
            "Administrators must keep access to read and edit permissions.",
          );
        state.grants[role] = [...new Set(keys)];
        return state.grants;
      }, true),
    garments: () =>
      run(() => {
        const u = permit("returns.read");
        void u;
        return state.garments.sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        );
      }),
    garment: (id) => run(() => garment(id, "returns.read")),
    createGarment: (input) =>
      run(() => {
        const u = permit("returns.create");
        if (
          Object.keys(input).some(
            (k) => !["type", "material", "weight"].includes(k),
          )
        )
          fail("VALIDATION", "The creator is taken from the signed-in account.");
        if (!input.type.trim())
          fail("VALIDATION", "Enter the garment type.", {
            type: "Enter the garment type.",
          });
        if (!input.material.trim())
          fail("VALIDATION", "Enter the material.", { material: "Enter the material." });
        if (!Number.isFinite(input.weight) || input.weight <= 0)
          fail("VALIDATION", "Weight must be greater than 0 kilograms.", {
            weight: "Use a weight greater than 0 kilograms.",
          });
        const g: Garment = {
          id: "GR-" + String(state.garments.length + 1).padStart(4, "0"),
          type: input.type.trim(),
          material: input.material.trim(),
          weight: input.weight,
          creatorId: u.id,
          createdAt: new Date().toISOString(),
          condition: null,
          recommendation: null,
          confirmedRoute: null,
          note: "",
          confirmedAt: null,
          evidence: [],
          evidenceRequired: false,
        };
        state.garments.push(g);
        return g;
      }, true),
    assess: (id, c) =>
      run(() => {
        const g = garment(id, "returns.assess", true);
        if (!conditions.includes(c))
          fail("VALIDATION", "Choose a valid condition.");
        g.condition = c;
        g.recommendation = mockPolicy.recommendation(c);
        g.evidenceRequired = mockPolicy.evidenceRequired(c);
        return g;
      }, true),
    upload: async (id, file) => {
      await run(() => garment(id, "returns.evidence", true));
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > mockPolicy.uploadLimit ||
        !file.size
      )
        fail("UPLOAD", "Choose a JPEG, PNG, or WebP image up to 5 MB.");
      const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
      const valid =
        file.type === "image/png"
          ? bytes[0] === 137 &&
            bytes[1] === 80 &&
            bytes[2] === 78 &&
            bytes[3] === 71
          : file.type === "image/jpeg"
            ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
            : String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
              String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
      if (!valid) fail("UPLOAD", "The file content is not a supported image.");
      return run(() => {
        const g = garment(id, "returns.evidence", true);
        g.evidence.push({
          id: crypto.randomUUID(),
          filename: file.name,
          mime: file.type,
          size: file.size,
          uploaderId: me().id,
          createdAt: new Date().toISOString(),
        });
        return g;
      }, true);
    },
    evidenceUrl: (garmentId, evidenceId) =>
      run(() => {
        const g = garment(garmentId, "returns.read");
        if (!g.evidence.some((item) => item.id === evidenceId))
          fail("NOT_FOUND", "The evidence file was not found.");
        return "data:image/png;base64,";
      }),
    confirm: (id, route, note) =>
      run(() => {
        const g = garment(id, "returns.confirm", true);
        if (!g.condition || !g.recommendation)
          fail("ASSESSMENT", "Save a condition before confirming the route.");
        if (!routes.includes(route)) fail("VALIDATION", "Choose a valid route.");
        if (mockPolicy.evidenceRequired(g.condition) && !g.evidence.length)
          fail("EVIDENCE", "This condition requires an image before confirmation.");
        if (route !== g.recommendation && !note.trim())
          fail("VALIDATION", "Enter a reason when the route differs from the recommendation.", {
            note: "A non-blank reason is required.",
          });
        g.confirmedRoute = route;
        g.note = note.trim();
        g.confirmedAt = new Date().toISOString();
        return g;
      }, true),
  };
}
