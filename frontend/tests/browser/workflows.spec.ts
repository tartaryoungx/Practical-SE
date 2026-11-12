import { expect, test, type Page } from "@playwright/test";

const apiURL = "http://localhost:18110";
const admin = { email: "admin@example.com", password: "Adminpass1" };
const password = "Browser-pass-2026";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=",
  "base64",
);

function alertWith(page: Page, text: string) {
  return page.getByRole("alert").filter({ hasText: text });
}

async function login(page: Page, email: string, secret: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(secret);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}

async function logout(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
}

async function createAccount(page: Page, name: string, email: string, role: string) {
  await page.getByRole("button", { name: "Add User" }).click();
  const dialog = page.getByRole("dialog", { name: "Add User" });
  await dialog.getByLabel("Name").fill(name);
  await dialog.getByLabel("Email").fill(email);
  await dialog.getByLabel("Initial Password").fill(password);
  await dialog.getByLabel("Role").selectOption({ label: role });
  await dialog.getByRole("button", { name: "Create User" }).click();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
}

test("Sprint 1 account and garment confirmation stay available to the right roles", async ({ page }) => {
  await login(page, admin.email, admin.password);
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  await createAccount(page, "Riley Staff", "riley.staff@example.com", "Store staff · STORE_STAFF");
  await logout(page);

  await login(page, "riley.staff@example.com", password);
  await expect(page.getByRole("heading", { name: "Returned garments" })).toBeVisible();
  await page.getByRole("link", { name: "Record garment" }).click();
  await page.getByLabel("Garment type").fill("Release shirt");
  await page.getByLabel("Material").fill("Cotton");
  await page.getByLabel("Weight (kilograms)").fill("0.3");
  await page.getByRole("button", { name: "Save and assess" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /GR-/ })).toBeVisible();
  await page.getByRole("button", { name: /Worn/ }).click();
  await page.getByRole("button", { name: "Save assessment" }).click();
  await expect(page.getByText("Third-party contractor")).toBeVisible();
  await page.getByRole("button", { name: "Confirm recommendation" }).click();
  await page.getByRole("dialog", { name: "Confirm the garment route" }).getByRole("button", { name: "Confirm decision" }).click();
  await expect(page.getByText("Confirmed. Condition, evidence, and route are read-only.")).toBeVisible();

  await page.goto("/users");
  await expect(alertWith(page, "You do not have access to this resource.")).toBeVisible();
  await page.goto("/monitoring");
  await expect(alertWith(page, "You do not have access to this resource.")).toBeVisible();
});

test("Sprint 2 workflow uploads outcome evidence and keeps open issues out of the report rule", async ({ page }) => {
  await login(page, admin.email, admin.password);
  await createAccount(page, "Lane Staff", "lane.staff@example.com", "Store staff · STORE_STAFF");
  await createAccount(page, "Nora Contractor", "nora.contractor@example.com", "Contractor · CONTRACTOR");
  await createAccount(page, "Omar Contractor", "omar.contractor@example.com", "Contractor · CONTRACTOR");
  await createAccount(page, "Helena Head", "helena.head@example.com", "Project head · HEAD");
  await logout(page);

  await login(page, "lane.staff@example.com", password);
  await page.getByRole("link", { name: "Record garment" }).click();
  await page.getByLabel("Garment type").fill("Release jacket");
  await page.getByLabel("Material").fill("Wool");
  await page.getByLabel("Weight (kilograms)").fill("0.4");
  await page.getByLabel("Store").selectOption({ label: "Central store" });
  await page.getByRole("button", { name: "Save and assess" }).click();
  await expect(page).toHaveURL(/\/garments\/GR-/);
  const garmentId = new URL(page.url()).pathname.split("/").pop() ?? "";
  await expect(page.getByRole("heading", { level: 1, name: garmentId })).toBeVisible();
  await page.getByRole("button", { name: /Worn/ }).click();
  await page.getByRole("button", { name: "Save assessment" }).click();
  await expect(page.getByText("Third-party contractor")).toBeVisible();
  await page.getByRole("button", { name: "Confirm recommendation" }).click();
  await page.getByRole("dialog", { name: "Confirm the garment route" }).getByRole("button", { name: "Confirm decision" }).click();
  await expect(page.getByText("Confirmed. Condition, evidence, and route are read-only.")).toBeVisible();

  await page.getByRole("link", { name: "Pickup batches" }).click();
  await page.getByRole("link", { name: "Create the first batch" }).click();
  await page.getByLabel("Store").selectOption({ label: "Central store" });
  await page.getByLabel("Contractor").selectOption({ label: "Nora Contractor" });
  await page.getByLabel("Planned pickup").fill("2026-12-15T09:00");
  await page.getByRole("button", { name: "Create batch" }).click();
  await expect(page).toHaveURL(/\/batches\/PB-/);
  const batchId = new URL(page.url()).pathname.split("/").pop() ?? "";
  await expect(page.getByRole("heading", { level: 1, name: batchId })).toBeVisible();
  await expect(page.getByText("0.4 kg").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm batch" }).click();
  await page.getByRole("dialog", { name: "Confirm batch" }).getByRole("button", { name: "Confirm batch" }).click();
  await expect(page.getByText("Batch confirmed.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(0);
  await page.getByRole("button", { name: "Record pickup" }).click();
  await page.getByRole("dialog", { name: "Record pickup" }).getByRole("button", { name: "Record pickup" }).click();
  await expect(page.getByText("Pickup recorded.")).toBeVisible();
  await logout(page);

  await login(page, "omar.contractor@example.com", password);
  await expect(page.getByText("No pickup batches yet.")).toBeVisible();
  await page.goto(`/batches/${batchId}`);
  await expect(alertWith(page, "The batch was not found.")).toBeVisible();
  await logout(page);

  await login(page, "nora.contractor@example.com", password);
  await page.goto(`/batches/${batchId}`);
  await page.getByRole("button", { name: "Confirm receipt" }).click();
  await page.getByRole("dialog", { name: "Confirm receipt" }).getByRole("button", { name: "Confirm receipt" }).click();
  await expect(page.getByText("Receipt confirmed.")).toBeVisible();

  const sorting = page.locator("section").filter({ has: page.getByRole("heading", { name: "Sorting results" }) });
  await sorting.getByLabel("Resale").fill("0.1");
  await sorting.getByLabel("Fibre-to-fibre recycling").fill("0.1");
  await sorting.getByLabel("Downcycling").fill("0.1");
  await sorting.getByLabel("Unknown").fill("0.1");
  await sorting.getByRole("button", { name: "Review and submit" }).click();
  await page.getByRole("dialog", { name: "Submit sorting results" }).getByRole("button", { name: "Submit sorting" }).click();
  await expect(sorting.getByText("The record is read-only.")).toBeVisible();

  const outcomes = page.locator("section").filter({ has: page.getByRole("heading", { name: "Final outcomes" }) });
  await outcomes.getByRole("button", { name: "Add row" }).click();
  await outcomes.getByLabel("Weight (kg)").fill("0.4");
  await outcomes.getByLabel("Outcome evidence").setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not an image"),
  });
  await expect(alertWith(page, "Choose a JPEG, PNG, or WebP image up to 5 MB.")).toBeVisible();

  const uploaded = page.waitForResponse(
    (response) =>
      response.url().includes(`/batches/${batchId}/outcomes/evidence`) &&
      response.request().method() === "POST" &&
      response.ok(),
  );
  await outcomes.getByLabel("Outcome evidence").setInputFiles({
    name: "release-outcome.png",
    mimeType: "image/png",
    buffer: png,
  });
  const uploadResponse = await uploaded;
  const uploadBody = (await uploadResponse.json()) as {
    finalOutcome: { id: string; evidence: { id: string; filename: string }[] };
  };
  const evidence = uploadBody.finalOutcome.evidence[0];
  expect(evidence.filename).toBe("release-outcome.png");
  await expect(page.getByRole("button", { name: "release-outcome.png" })).toBeVisible();

  const retrieved = await page.evaluate(
    async ({ url }) => {
      const response = await fetch(url, { credentials: "include" });
      const bytes = new Uint8Array(await response.arrayBuffer());
      return {
        status: response.status,
        type: response.headers.get("content-type"),
        png: bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47,
        length: bytes.length,
      };
    },
    { url: `${apiURL}/batches/${batchId}/outcomes/evidence/${evidence.id}` },
  );
  expect(retrieved).toEqual({ status: 200, type: "image/png", png: true, length: png.length });

  await outcomes.getByRole("button", { name: "Review and submit" }).click();
  await page.getByRole("dialog", { name: "Submit final outcomes" }).getByRole("button", { name: "Submit outcomes" }).click();
  await expect(outcomes.getByText("The record is read-only.")).toBeVisible();
  await expect(outcomes.getByLabel("Outcome evidence")).toHaveCount(0);
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "release-outcome.png" }).click();
  const popup = await popupPromise;
  await expect.poll(() => popup.url()).toMatch(/^blob:/);
  await popup.close();
  await logout(page);

  await login(page, "lane.staff@example.com", password);
  await page.goto(`/garments/${garmentId}`);
  await expect(page.getByText("No evidence yet")).toBeVisible();
  await logout(page);

  await login(page, "helena.head@example.com", password);
  await page.goto(`/validation/${batchId}`);
  await expect(page.getByText("This batch is not fully verified.")).toBeVisible();
  await page.getByRole("button", { name: "Confirm valid" }).click();
  await expect(page.getByText("A reviewer confirmed that every check passed.")).toBeVisible();

  await page.goto("/reports");
  await page.getByLabel("Period start").fill("2026-12-01");
  await page.getByLabel("Period end").fill("2026-12-31");
  await page.getByLabel("Store").selectOption({ label: "Central store" });
  await page.getByLabel("Contractor").selectOption({ label: "Nora Contractor" });
  await page.getByRole("button", { name: "Count matching batches" }).click();
  await expect(page.getByText("Matching validated batches: 1")).toBeVisible();

  await page.getByRole("link", { name: "Data issues" }).click();
  await page.getByRole("button", { name: "Request correction" }).click();
  const issue = page.getByRole("dialog", { name: "Request correction" });
  await issue.getByLabel("Batch").selectOption({ label: `${batchId} · Central store` });
  await issue.getByLabel("Assignee").selectOption({ label: "Lane Staff · Store staff" });
  await issue.getByLabel("Request").fill("Please confirm the jacket weight.");
  await issue.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByText("Open", { exact: true })).toBeVisible();

  await page.goto(`/validation/${batchId}`);
  await expect(page.getByText("A reviewer confirmed that every check passed.")).toBeVisible();
  await page.goto("/reports");
  await page.getByLabel("Period start").fill("2026-12-01");
  await page.getByLabel("Period end").fill("2026-12-31");
  await page.getByLabel("Store").selectOption({ label: "Central store" });
  await page.getByLabel("Contractor").selectOption({ label: "Nora Contractor" });
  await page.getByRole("button", { name: "Count matching batches" }).click();
  await expect(page.getByText("Matching validated batches: 1")).toBeVisible();
});
