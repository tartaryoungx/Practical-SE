import test from "node:test";
import assert from "node:assert/strict";
import { createMockApi, mockPolicy } from "../src/lib/mock/service";
import { ApiError } from "../src/lib/api-contract";
import { conditions, roles, type Role } from "../src/lib/types";
const api = () => createMockApi({ delay: 0 });
const rejects = (fn: Promise<unknown>, code: string) =>
  assert.rejects(fn, (e: unknown) => e instanceof ApiError && e.code === code);
test("all four roles authenticate; account / Return boundaries and same-store peer reads", async () => {
  const a = api();
  for (const role of roles) {
    await a.login(
      (
        {
          ADMIN: "admin",
          STORE_STAFF: "staff",
          CONTRACTOR: "contractor",
          HEAD: "head",
        } as Record<Role, string>
      )[role] + "@demo.test",
      "Demo1234!",
    );
    assert.equal((await a.session())?.user.role, role);
    if (role !== "ADMIN") await rejects(a.users(), "FORBIDDEN");
    if (role !== "STORE_STAFF") await rejects(a.garments(), "FORBIDDEN");
  }
  await a.login("staff@demo.test", "Demo1234!");
  assert.ok((await a.garments()).some((g) => g.creatorId === "u-peer"));
  assert.ok((await a.garments()).some((g) => g.id === "GR-0004"));
  await a.logout();
  await rejects(a.garments(), "UNAUTHENTICATED");
  await rejects(a.login("disabled@demo.test", "Demo1234!"), "CREDENTIALS");
  await rejects(a.login("staff@demo.test", "wrong"), "CREDENTIALS");
});
test("create Staff, record, assessment, override, finality and retrieval across login", async () => {
  const a = api();
  await a.login("admin@demo.test", "Demo1234!");
  const u = await a.createUser({
    name: "New Staff",
    email: " NEW@demo.test ",
    role: "STORE_STAFF",
    password: "New12345!",
  });
  assert.equal(u.email, "new@demo.test");
  await a.login(u.email, "New12345!");
  const g = await a.createGarment({
    type: "Shirt",
    material: "Cotton",
    weight: 0.2,
  });
  assert.equal(g.condition, null);
  assert.equal(g.creatorId, u.id);
  await rejects(a.confirm(g.id, "DIRECT_RESALE_CANDIDATE", ""), "ASSESSMENT");
  await a.assess(g.id, "GOOD");
  await rejects(a.confirm(g.id, "THIRD_PARTY_CONTRACTOR", "   "), "VALIDATION");
  await a.confirm(g.id, "THIRD_PARTY_CONTRACTOR", "  Further sorting  ");
  await rejects(a.assess(g.id, "WORN"), "READ_ONLY");
  await rejects(a.confirm(g.id, "THIRD_PARTY_CONTRACTOR", ""), "READ_ONLY");
  await a.logout();
  await a.login(u.email, "New12345!");
  assert.ok((await a.garments()).some((x) => x.id === g.id));
  assert.equal((await a.garment(g.id)).note, "Further sorting");
});
test("condition mappings and evidence gates preserve unchanged confirmation state", async () => {
  const a = api();
  await a.login("staff@demo.test", "Demo1234!");
  for (const c of conditions) {
    const g = await a.createGarment({
      type: "Test",
      material: "Cotton",
      weight: 0.5,
    });
    const assessed = await a.assess(g.id, c);
    assert.equal(assessed.recommendation, mockPolicy.recommendation(c));
    if (mockPolicy.evidenceRequired(c)) {
      await rejects(a.confirm(g.id, assessed.recommendation!, ""), "EVIDENCE");
      assert.equal((await a.garment(g.id)).confirmedRoute, null);
    } else
      assert.ok(
        (await a.confirm(g.id, assessed.recommendation!, "")).confirmedAt,
      );
  }
  await rejects(
    a.createGarment({ type: "T", material: "C", weight: NaN }),
    "VALIDATION",
  );
  await rejects(
    a.upload("GR-0001", new File(["bad"], "bad.png", { type: "image/png" })),
    "UPLOAD",
  );
});
test("account actions, uniqueness, last-admin, role updates and disabled login", async () => {
  const a = api();
  await a.login("admin@demo.test", "Demo1234!");
  await rejects(a.setStatus("u-admin", false), "SELF_DISABLE");
  await rejects(a.setRole("u-admin", "HEAD"), "LAST_ADMIN");
  await rejects(
    a.editUser("u-staff", { name: "Staff", email: " ADMIN@demo.test " }),
    "CONFLICT",
  );
  await rejects(
    a.createUser({
      name: " ",
      email: "s@demo.test",
      role: "HEAD",
      password: "Demo1234!",
    }),
    "VALIDATION",
  );
  await a.editUser("u-staff", { name: "Changed", email: "staff@demo.test" });
  await a.setStatus("u-staff", false);
  await rejects(a.login("staff@demo.test", "Demo1234!"), "CREDENTIALS");
  await a.setStatus("u-staff", true);
  await a.setRole("u-staff", "HEAD");
  await a.login("staff@demo.test", "Demo1234!");
  assert.equal((await a.session())?.user.name, "Changed");
  assert.equal((await a.session())?.user.role, "HEAD");
  await rejects(a.garments(), "FORBIDDEN");
});
test("permission revoke/restore, management lockout and unresolved grants", async () => {
  const a = api();
  await a.login("admin@demo.test", "Demo1234!");
  const initial = await a.grants();
  await rejects(a.saveGrants("ADMIN", []), "LAST_ADMIN");
  await a.saveGrants("HEAD", ["returns.read"]);
  assert.ok((await a.grants()).HEAD.includes("returns.read"));
  await a.saveGrants(
    "STORE_STAFF",
    initial.STORE_STAFF.filter((p) => p !== "returns.create"),
  );
  await a.login("staff@demo.test", "Demo1234!");
  await rejects(
    a.createGarment({ type: "T", material: "C", weight: 1 }),
    "FORBIDDEN",
  );
  await a.login("admin@demo.test", "Demo1234!");
  await a.saveGrants("STORE_STAFF", initial.STORE_STAFF);
  await a.login("staff@demo.test", "Demo1234!");
  assert.ok(await a.createGarment({ type: "T", material: "C", weight: 1 }));
});
test("password change, direct reset, invalid and single-use recovery tokens", async () => {
  const a = api();
  await a.login("staff@demo.test", "Demo1234!");
  await rejects(a.changePassword("wrong", "Changed123!"), "VALIDATION");
  await a.changePassword("Demo1234!", "Changed123!");
  assert.equal(await a.session(), null);
  await rejects(a.login("staff@demo.test", "Demo1234!"), "CREDENTIALS");
  await a.login("admin@demo.test", "Demo1234!");
  await a.adminReset("u-staff", "Temporary123!");
  const token = await a.issueReset("u-staff");
  await rejects(a.resetPassword("invalid", "Recovered123!"), "TOKEN");
  const result = await Promise.allSettled([
    a.resetPassword(token, "Recovered123!"),
    a.resetPassword(token, "Other12345!"),
  ]);
  assert.equal(result.filter((x) => x.status === "fulfilled").length, 1);
  await rejects(a.login("staff@demo.test", "Temporary123!"), "CREDENTIALS");
  await a.login("staff@demo.test", "Recovered123!");
});
test("tab persistence and expired recovery; storage failure does not save a mutation", async () => {
  const entries = new Map<string, string>();
  const storage = {
    getItem: (k: string) => entries.get(k) || null,
    setItem: (k: string, v: string) => {
      entries.set(k, v);
    },
  } as Storage;
  const a = createMockApi({ delay: 0, storage });
  await a.login("admin@demo.test", "Demo1234!");
  const token = await a.issueReset("u-staff");
  const s = JSON.parse(entries.get("garment-prototype-v1")!);
  s.tokens[0].expires = 0;
  entries.set("garment-prototype-v1", JSON.stringify(s));
  const b = createMockApi({ delay: 0, storage });
  await rejects(b.resetPassword(token, "Recovered123!"), "TOKEN");
  assert.equal((await b.session())?.user.id, "u-admin");
  storage.setItem = () => {
    throw new Error("quota");
  };
  await rejects(
    b.createUser({
      name: "Rejected",
      email: "reject@demo.test",
      role: "HEAD",
      password: "Demo1234!",
    }),
    "STORAGE",
  );
  assert.equal(
    (await b.users()).some((u) => u.email === "reject@demo.test"),
    false,
  );
});
