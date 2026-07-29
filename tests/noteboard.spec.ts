import { expect, test } from "@playwright/test";

test("collection expansion moves smoothly and settles without a final jump", async ({
  page,
}) => {
  await page.goto("/");
  const group = page.locator(".note-group").first();
  await expect(group.locator(".note-motion-card")).toHaveCount(2);

  await group.locator(".group-toggle").click();
  await expect(group).toHaveClass(/is-collapsed/, { timeout: 2_000 });
  const result = await page.evaluate(async () => {
    const group = document.querySelector<HTMLElement>(".note-group")!;
    const content = group.querySelector<HTMLElement>(".note-group-content")!;
    const frames: Array<{
      time: number;
      expanding: boolean;
      points: Array<[number, number]>;
    }> = [];
    const start = performance.now();
    window.setTimeout(() => content.click(), 32);
    await new Promise<void>((resolve) => {
      const sample = (now: number) => {
        frames.push({
          time: now - start,
          expanding: group.classList.contains("is-expanding"),
          points: [
            ...group.querySelectorAll<HTMLElement>(".note-motion-card"),
          ].map((card) => {
            const rect = card.getBoundingClientRect();
            return [rect.left, rect.top];
          }),
        });
        if (now - start < 1_150) requestAnimationFrame(sample);
        else resolve();
      };
      requestAnimationFrame(sample);
    });
    const deltas = frames.slice(1).map((frame, index) => ({
      expanding: frame.expanding,
      delta: Math.max(
        ...frame.points.map((point, card) =>
          Math.hypot(
            point[0] - frames[index].points[card][0],
            point[1] - frames[index].points[card][1],
          ),
        ),
      ),
    }));
    const finalizingIndex = deltas.findIndex(
      (frame, index) =>
        index > 0 && !frame.expanding && deltas[index - 1].expanding,
    );
    return {
      moved: Math.max(
        ...deltas
          .filter((frame) => frame.expanding)
          .map((frame) => frame.delta),
      ),
      finalizingDelta:
        deltas[finalizingIndex]?.delta ?? Number.POSITIVE_INFINITY,
      tail: Math.max(
        ...deltas.slice(finalizingIndex + 1).map((frame) => frame.delta),
      ),
    };
  });

  expect(result.moved).toBeGreaterThan(1);
  expect(result.finalizingDelta).toBeLessThan(1);
  expect(result.tail).toBeLessThan(1);
  await expect(group).not.toHaveClass(/is-expanding/);
});

test("reduced motion changes collection state without waiting for an animation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const group = page.locator(".note-group").first();
  await group.locator(".group-toggle").click();
  await expect(group).toHaveClass(/is-collapsed/);
  await expect(group).not.toHaveClass(/is-collapsing/);
});

test("editor traps focus and closes with Escape", async ({ page }) => {
  await page.goto("/");
  const opener = page.getByRole("button", { name: "New note" });
  await opener.focus();
  await opener.click();
  await expect(page.getByRole("dialog", { name: "Note editor" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Note editor" })).toBeHidden();
  await expect(opener).toBeFocused();
});
