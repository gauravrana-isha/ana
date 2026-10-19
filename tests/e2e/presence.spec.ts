import { test, expect } from "./fixtures";

/* Presence holds people and things alike: what it is comes first, and only people have person fields. */

test("adding the river and a meal: their kind, no person fields, grouped, and in a moment's With", async ({ page }) => {
  await page.goto("/presence");
  await page.getByRole("button", { name: "Add", exact: true }).first().click();
  const form = page.getByRole("dialog", { name: "Add to Presence" });
  // A person, to begin with: their fields are there.
  await expect(form.getByText("Who they are to you")).toBeVisible();
  await form.getByRole("radio", { name: "Water" }).click();
  // Not a person: no relation, birthday or how you met.
  await expect(form.getByText("Who they are to you")).toHaveCount(0);
  await expect(form.getByText("Birthday")).toHaveCount(0);
  await form.getByPlaceholder("e.g. The Kaveri").fill("The Kaveri");
  await form.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("link", { name: /The Kaveri/ })).toBeVisible();

  await page.getByRole("button", { name: "Add", exact: true }).first().click();
  await page.getByRole("dialog", { name: "Add to Presence" }).getByRole("radio", { name: "Food" }).click();
  await page.getByPlaceholder("e.g. Amma's rasam").fill("Amma's rasam");
  await page.getByRole("dialog", { name: "Add to Presence" }).getByRole("button", { name: "Add", exact: true }).click();

  // Grouped by what they are.
  await expect(page.getByRole("region", { name: "Water" }).getByText("The Kaveri")).toBeVisible();
  await expect(page.getByRole("region", { name: "Food" }).getByText("Amma's rasam")).toBeVisible();

  // Its page says what it is; the kind survives a fresh load (sealed on the server).
  await page.getByRole("link", { name: /The Kaveri/ }).click();
  await expect(page.getByRole("heading", { name: "The Kaveri" })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Water", { exact: true })).toBeVisible();
  const raw = await (await page.request.get("/api/people")).json();
  const kaveri = (raw as { kind: string | null; name: string }[]).find((p) => p.kind && p.kind.startsWith("e1:"));
  expect(kaveri, "the kind is stored sealed").toBeTruthy();

  // A moment's With offers it, marked as what it is.
  await page.goto("/expressions");
  await page.locator("button:visible", { hasText: "New moment" }).first().click();
  await page.getByRole("combobox", { name: /Add who or what/ }).or(page.getByLabel("Add who or what was with you")).first().fill("Kav");
  await expect(page.getByRole("button", { name: /The Kaveri.*Water/ })).toBeVisible();
});
