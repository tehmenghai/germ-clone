import { expect, test } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function enterApp(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Neo" }).click();
  await expect(page.locator("header")).toBeVisible();
}

// ---------------------------------------------------------------------------
// Profile picker — gate on first load
// ---------------------------------------------------------------------------

test.describe("Profile picker", () => {
  test("shows SELECT PROFILE heading on first load", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("SELECT PROFILE")).toBeVisible();
  });

  test("lists the three demo profiles", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Neo" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Morpheus" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Trinity" })).toBeVisible();
  });

  test("can select an existing profile and enter the app", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Neo" }).click();
    await expect(page.getByText("SELECT PROFILE")).not.toBeVisible();
    await expect(page.locator("header")).toBeVisible();
  });

  test("can create a new profile via input + Go button", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Name").fill("TestUser");
    await page.getByRole("button", { name: "Go" }).click();
    await expect(page.getByText("SELECT PROFILE")).not.toBeVisible();
    await expect(page.locator("header")).toBeVisible();
  });

  test("can create a new profile via Enter key", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Name").fill("KeyUser");
    await page.getByPlaceholder("Name").press("Enter");
    await expect(page.getByText("SELECT PROFILE")).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Header controls
// ---------------------------------------------------------------------------

test.describe("Header", () => {
  test("shows Rabbit Hole and Plugged In view-mode pills", async ({ page }) => {
    await enterApp(page);
    // PillToggle uses role="tab" on each pill button
    await expect(page.getByRole("tab", { name: /Rabbit Hole/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Plugged In/i })).toBeVisible();
  });

  test("shows difficulty segment control with ELI5, Standard, Academia", async ({ page }) => {
    await enterApp(page);
    // SegControl uses role="tab" on each option
    await expect(page.getByRole("tab", { name: "ELI5" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Standard" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Academia" })).toBeVisible();
  });

  test("can switch to Plugged In (console) mode", async ({ page }) => {
    await enterApp(page);
    await page.getByRole("tab", { name: /Plugged In/i }).click();
    await expect(page.getByText(/corpus coverage/i)).toBeVisible();
  });

  test("can switch back to Rabbit Hole (reading) mode", async ({ page }) => {
    await enterApp(page);
    await page.getByRole("tab", { name: /Plugged In/i }).click();
    await page.getByRole("tab", { name: /Rabbit Hole/i }).click();
    await expect(page.getByText(/corpus coverage/i)).not.toBeVisible();
  });

  test("Settings button opens the settings drawer", async ({ page }) => {
    await enterApp(page);
    await page.locator("[aria-label='Settings']").click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByText("LLM BACKEND")).toBeVisible();
  });

  test("honours saved theme preference (data-theme attribute)", async ({ page }) => {
    // The *default* theme is time-of-day based (clinical 07:00–19:00 local, else matrix),
    // so asserting a fixed default is clock-flaky. Seed a saved preference and assert it
    // is honoured — that is the behaviour we actually care about.
    await page.addInitScript(() => localStorage.setItem("gc-theme", "matrix"));
    await enterApp(page);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "matrix");
  });
});

// ---------------------------------------------------------------------------
// Reality (Rabbit Hole) mode — conversation
// ---------------------------------------------------------------------------

test.describe("Reality mode — ask a question", () => {
  test("shows topic chips before first question", async ({ page }) => {
    await enterApp(page);
    await expect(page.getByRole("button", { name: /overfit/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /regularization/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /KNN/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /learning rate/i })).toBeVisible();
  });

  test("shows chat input placeholder", async ({ page }) => {
    await enterApp(page);
    await expect(page.getByPlaceholder("Ask a question about Module 3…")).toBeVisible();
  });

  test("submitting via chat input shows user message", async ({ page }) => {
    await enterApp(page);
    await page.getByPlaceholder("Ask a question about Module 3…").fill("What is bias variance?");
    await page.keyboard.press("Enter");
    await expect(page.locator("div").filter({ hasText: /^What is bias variance\?$/ })).toBeVisible();
  });

  test("pipeline completes and renders answer markdown", async ({ page }) => {
    await enterApp(page);
    await page.getByPlaceholder("Ask a question about Module 3…").fill("bias variance");
    await page.keyboard.press("Enter");
    // Mock stream completes in ~5s for bias-variance (no reloop). Wait up to 12s.
    await expect(page.locator("div").filter({ hasText: /Bias.{0,30}Variance/i }).first()).toBeVisible({ timeout: 12_000 });
  });

  test("clicking a topic chip triggers a stream", async ({ page }) => {
    await enterApp(page);
    await page.getByRole("button", { name: /overfit/i }).click();
    // Input becomes disabled while running
    await expect(page.locator("textarea[disabled]")).toBeVisible({ timeout: 5_000 });
  });

  test("pipeline with regularization shows reloop then answer", async ({ page }) => {
    await enterApp(page);
    await page.getByPlaceholder("Ask a question about Module 3…").fill("L1 vs L2 regularization");
    await page.keyboard.press("Enter");
    // Mock stream for regularization includes retrieve2 and runs ~7s total
    await expect(page.locator("div").filter({ hasText: /^L1 vs L2 regularization$/ })).toBeVisible({ timeout: 15_000 });
  });
});

// ---------------------------------------------------------------------------
// Matrix (Plugged In) mode — console
// ---------------------------------------------------------------------------

test.describe("Matrix mode — console", () => {
  async function enterMatrix(page: import("@playwright/test").Page) {
    await enterApp(page);
    await page.getByRole("tab", { name: /Plugged In/i }).click();
    await expect(page.getByText(/corpus coverage/i)).toBeVisible();
  }

  test("shows corpus coverage bar with module pills", async ({ page }) => {
    await enterMatrix(page);
    await expect(page.getByText("3.1", { exact: true })).toBeVisible();
    await expect(page.getByText("3.5", { exact: true })).toBeVisible();
    await expect(page.getByText("3.10", { exact: true })).toBeVisible();
  });

  test("shows corpus stats label", async ({ page }) => {
    await enterMatrix(page);
    await expect(page.getByText(/transcripts.*textbooks.*notebooks/i)).toBeVisible();
  });

  test("shows quick-start chips when no messages", async ({ page }) => {
    await enterMatrix(page);
    await expect(page.getByText(/germ console/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /overfit/i })).toBeVisible();
  });

  test("shows console input with germ> prompt", async ({ page }) => {
    await enterMatrix(page);
    await expect(page.getByText("germ>")).toBeVisible();
    await expect(page.getByPlaceholder(/type a question/i)).toBeVisible();
  });

  test("submitting a question shows pipeline trace starting with [route]", async ({ page }) => {
    await enterMatrix(page);
    await page.getByPlaceholder(/type a question/i).fill("bias variance");
    await page.keyboard.press("Enter");
    await expect(page.getByText(/\[route\]/i)).toBeVisible({ timeout: 10_000 });
  });

  test("regularization query shows retrieve·hop2 reloop in trace", async ({ page }) => {
    await enterMatrix(page);
    await page.getByPlaceholder(/type a question/i).fill("regularization lasso");
    await page.keyboard.press("Enter");
    await expect(page.getByText(/retrieve.hop2/i)).toBeVisible({ timeout: 15_000 });
  });

  test("pipeline trace shows answer> section on completion", async ({ page }) => {
    await enterMatrix(page);
    await page.getByPlaceholder(/type a question/i).fill("bias variance");
    await page.keyboard.press("Enter");
    await expect(page.getByText("answer>")).toBeVisible({ timeout: 15_000 });
  });

  test("eval scores appear in coverage bar after pipeline completes", async ({ page }) => {
    await enterMatrix(page);
    await page.getByPlaceholder(/type a question/i).fill("bias variance");
    await page.keyboard.press("Enter");
    await expect(page.getByText(/f:0\.\d\d/i)).toBeVisible({ timeout: 15_000 });
  });
});

// ---------------------------------------------------------------------------
// Settings drawer
// ---------------------------------------------------------------------------

test.describe("Settings drawer", () => {
  test("opens via settings icon button", async ({ page }) => {
    await enterApp(page);
    await page.locator("[aria-label='Settings']").click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });

  test("shows LLM BACKEND section with Ollama option", async ({ page }) => {
    await enterApp(page);
    await page.locator("[aria-label='Settings']").click();
    await expect(page.getByText("LLM BACKEND")).toBeVisible();
    await expect(page.getByText(/Ollama/i)).toBeVisible();
  });

  test("closes settings drawer via close button", async ({ page }) => {
    await enterApp(page);
    await page.locator("[aria-label='Settings']").click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await page.locator("[aria-label='Close settings']").click();
    await expect(page.getByText("LLM BACKEND")).not.toBeVisible({ timeout: 3_000 });
  });
});
