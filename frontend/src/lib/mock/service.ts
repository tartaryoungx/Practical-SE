import { ApiError, type Api, type CreateUser } from "../api-contract";
import {
  roles,
  conditions,
  routes,
  permissions,
  type User,
  type Role,
  type Permission,
  type Garment,
  type Condition,
  type Route,
} from "../types";
import { seed, stores, type MockState } from "./seed";
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
        ? user.role === "STORE_STAFF" && !!user.storeId
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
    fail("VALIDATION", "รหัสผ่านต้องมี 8–128 ตัวอักษร", {
      password: "ใช้รหัสผ่าน 8–128 ตัวอักษร",
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
    fail("VALIDATION", "กรุณาระบุชื่อไม่เกิน 100 ตัวอักษร", {
      name: "กรุณาระบุชื่อไม่เกิน 100 ตัวอักษร",
    });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    fail("VALIDATION", "อีเมลไม่ถูกต้อง", {
      email: "กรุณาระบุอีเมลที่ถูกต้อง",
    });
  if (state.users.some((u) => u.id !== id && u.email === email))
    fail("CONFLICT", "อีเมลนี้มีบัญชีอยู่แล้ว", {
      email: "อีเมลนี้ถูกใช้งานแล้ว",
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
      fail("STORAGE", "พื้นที่เก็บข้อมูลจำลองไม่พร้อมใช้งาน กรุณาลองใหม่");
    }
  }
  function me() {
    const u = state.users.find((u) => u.id === state.sessionId && u.is_active);
    if (!u) fail("UNAUTHENTICATED", "เซสชันจำลองสิ้นสุดแล้ว กรุณาเข้าสู่ระบบ");
    return u;
  }
  function permit(p: Permission) {
    const u = me();
    if (!effective(u, p, state.grants))
      fail("FORBIDDEN", "บัญชีนี้ไม่มีสิทธิ์ทำรายการนี้");
    return u;
  }
  function user(id: string) {
    return (
      state.users.find((u) => u.id === id) ??
      fail("NOT_FOUND", "ไม่พบบัญชีผู้ใช้")
    );
  }
  function store(role: Role, id: string | null) {
    if (!roles.includes(role)) fail("VALIDATION", "บทบาทไม่ถูกต้อง");
    if (role === "STORE_STAFF" && !stores.some((s) => s.id === id))
      fail("VALIDATION", "เลือกสาขาสำหรับ Staff", {
        storeId: "กรุณาเลือกสาขา",
      });
    return role === "STORE_STAFF" ? id : null;
  }
  function protectAdmin(u: User, remove: boolean) {
    if (
      remove &&
      u.role === "ADMIN" &&
      u.is_active &&
      state.users.filter((a) => a.role === "ADMIN" && a.is_active).length === 1
    )
      fail("LAST_ADMIN", "ต้องเหลือผู้ดูแลระบบที่ใช้งานได้อย่างน้อยหนึ่งคน");
  }
  function garment(id: string, p: Permission, write = false) {
    const u = permit(p);
    const g = state.garments.find(
      (g) => g.id === id && g.storeId === u.storeId,
    );
    if (!g) fail("NOT_FOUND", "ไม่พบเสื้อผ้าที่คุณเข้าถึงได้");
    if (write && g.confirmedRoute)
      fail(
        "READ_ONLY",
        "ยืนยันแล้ว ไม่สามารถเปลี่ยนสภาพ หลักฐาน หรือเส้นทางได้",
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
            "อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือบัญชีไม่พร้อมใช้งาน",
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
          fail("VALIDATION", "รหัสผ่านปัจจุบันไม่ถูกต้อง", {
            current: "รหัสผ่านปัจจุบันไม่ถูกต้อง",
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
        if (!t) fail("TOKEN", "ลิงก์ไม่ถูกต้อง หมดอายุ หรือถูกใช้แล้ว");
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
    stores: () =>
      run(() => {
        const u = me();
        if (
          !effective(u, "users.create", state.grants) &&
          !effective(u, "users.role", state.grants)
        )
          fail("FORBIDDEN", "ไม่มีสิทธิ์เลือกสาขา");
        return stores;
      }),
    createUser: (input: CreateUser) =>
      run(() => {
        permit("users.create");
        const fields = profile(input, state);
        password(input.password);
        const storeId = store(input.role, input.storeId);
        const u: User = {
          id: crypto.randomUUID(),
          ...fields,
          role: input.role,
          storeId,
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
          fail("VALIDATION", "แก้ไขได้เฉพาะชื่อและอีเมล");
        const u = user(id);
        Object.assign(u, profile(input, state, id));
        return u;
      }, true),
    setStatus: (id, active) =>
      run(() => {
        const actor = permit("users.status"),
          u = user(id);
        if (actor.id === id && !active)
          fail("SELF_DISABLE", "ไม่สามารถปิดบัญชีของตนเอง");
        protectAdmin(u, !active);
        u.is_active = active;
        if (!active) invalidate(id);
        return u;
      }, true),
    setRole: (id, role, storeId) =>
      run(() => {
        permit("users.role");
        const u = user(id);
        protectAdmin(u, role !== "ADMIN");
        if (
          u.role === "STORE_STAFF" &&
          role === "STORE_STAFF" &&
          u.storeId !== storeId
        )
          fail("STORE_TRANSFER", "การย้ายสาขาอยู่นอก Sprint 1");
        u.storeId = store(role, storeId);
        u.role = role;
        return u;
      }, true),
    adminReset: (id, next) =>
      run(() => {
        const actor = permit("users.reset");
        if (actor.id === id)
          fail("SELF_RESET", "ใช้หน้าเปลี่ยนรหัสผ่านสำหรับบัญชีตนเอง");
        user(id);
        password(next);
        state.passwords[id] = next;
        invalidate(id);
      }, true),
    issueReset: (id) =>
      run(() => {
        const actor = permit("users.reset");
        if (actor.id === id)
          fail("SELF_RESET", "ใช้หน้าเปลี่ยนรหัสผ่านสำหรับบัญชีตนเอง");
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
          fail("VALIDATION", "บทบาทหรือสิทธิ์ไม่ถูกต้อง");
        if (
          role !== "STORE_STAFF" &&
          keys.some((k) => k.startsWith("returns."))
        )
          fail("UNRESOLVED", "U-ACCESS: สิทธิ์ Return ข้ามบทบาทยังไม่สรุป");
        if (
          role !== "ADMIN" &&
          keys.some((k) => k.startsWith("users.") || k.startsWith("access."))
        )
          fail(
            "MANDATORY",
            "BR-04: งานจัดการบัญชีและสิทธิ์เป็น ADMIN เท่านั้น",
          );
        if (
          role === "ADMIN" &&
          (!keys.includes("access.read") || !keys.includes("access.write"))
        )
          fail(
            "LAST_ADMIN",
            "ต้องรักษาสิทธิ์อ่านและแก้ไขการตั้งค่าสิทธิ์ของ ADMIN",
          );
        state.grants[role] = [...new Set(keys)];
        return state.grants;
      }, true),
    garments: () =>
      run(() => {
        const u = permit("returns.read");
        return state.garments
          .filter((g) => g.storeId === u.storeId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
          fail("VALIDATION", "สาขาและผู้บันทึกกำหนดจากบัญชี");
        if (!input.type.trim())
          fail("VALIDATION", "กรุณาระบุประเภทเสื้อผ้า", {
            type: "กรุณาระบุประเภท",
          });
        if (!input.material.trim())
          fail("VALIDATION", "กรุณาระบุวัสดุ", { material: "กรุณาระบุวัสดุ" });
        if (!Number.isFinite(input.weight) || input.weight <= 0)
          fail("VALIDATION", "น้ำหนักต้องมากกว่า 0 กิโลกรัม", {
            weight: "ใช้น้ำหนักมากกว่า 0 กิโลกรัม",
          });
        const g: Garment = {
          id: "GR-" + String(state.garments.length + 1).padStart(4, "0"),
          type: input.type.trim(),
          material: input.material.trim(),
          weight: input.weight,
          storeId: u.storeId!,
          creatorId: u.id,
          createdAt: new Date().toISOString(),
          condition: null,
          recommendation: null,
          confirmedRoute: null,
          note: "",
          confirmedAt: null,
          evidence: [],
        };
        state.garments.push(g);
        return g;
      }, true),
    assess: (id, c) =>
      run(() => {
        const g = garment(id, "returns.assess", true);
        if (!conditions.includes(c))
          fail("VALIDATION", "สภาพเสื้อผ้าไม่ถูกต้อง");
        g.condition = c;
        g.recommendation = mockPolicy.recommendation(c);
        return g;
      }, true),
    upload: async (id, file) => {
      await run(() => garment(id, "returns.evidence", true));
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > mockPolicy.uploadLimit ||
        !file.size
      )
        fail("UPLOAD", "เลือก JPEG, PNG หรือ WebP ขนาดไม่เกิน 5 MB");
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
      if (!valid) fail("UPLOAD", "เนื้อหาไฟล์ไม่ตรงกับรูปภาพที่รองรับ");
      const preview = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new ApiError("UPLOAD", "อ่านรูปภาพไม่สำเร็จ"));
        r.readAsDataURL(file);
      });
      return run(() => {
        const g = garment(id, "returns.evidence", true);
        g.evidence.push({
          id: crypto.randomUUID(),
          filename: file.name,
          mime: file.type,
          size: file.size,
          uploaderId: me().id,
          createdAt: new Date().toISOString(),
          preview,
        });
        return g;
      }, true);
    },
    confirm: (id, route, note) =>
      run(() => {
        const g = garment(id, "returns.confirm", true);
        if (!g.condition || !g.recommendation)
          fail("ASSESSMENT", "บันทึกการประเมินสภาพก่อนยืนยัน");
        if (!routes.includes(route)) fail("VALIDATION", "ปลายทางไม่ถูกต้อง");
        if (mockPolicy.evidenceRequired(g.condition) && !g.evidence.length)
          fail("EVIDENCE", "สภาพนี้ต้องมีหลักฐานรูปภาพก่อนยืนยัน");
        if (route !== g.recommendation && !note.trim())
          fail("VALIDATION", "ระบุเหตุผลเมื่อเปลี่ยนจากคำแนะนำ", {
            note: "ต้องมีเหตุผลที่ไม่ว่าง",
          });
        g.confirmedRoute = route;
        g.note = note.trim();
        g.confirmedAt = new Date().toISOString();
        return g;
      }, true),
  };
}
