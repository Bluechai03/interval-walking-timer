import type { Browser, BrowserContext, Page } from "@playwright/test";

// A friend with their own phone. `clockOffsetMs` makes that phone's clock wrong, to
// prove a walk stays in step whatever the clock says.
export const newFriend = async (
  browser: Browser,
  name: string,
  clockOffsetMs = 0,
): Promise<{ context: BrowserContext; page: Page; name: string }> => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  });
  await context.addInitScript((offset) => {
    // Already answered, so the reminders offer never covers the screen.
    localStorage.setItem("phase-push-asked", "1");
    if (offset) {
      const realNow = Date.now.bind(Date);
      Date.now = () => realNow() + offset;
    }
  }, clockOffsetMs);
  const page = await context.newPage();
  return { context, page, name };
};
