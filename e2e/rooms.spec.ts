import { expect, test, type Page } from "@playwright/test";
import { newFriend } from "./fixtures";

// What a friend does, step by step, in their own browser.

const pickName = async (page: Page, name: string) => {
  await page.goto("/friends");
  await page.getByLabel("Your name").fill(name);
  await page.getByRole("button", { name: "Save my name" }).click();
  await expect(page.getByText(`Hi, ${name}`)).toBeVisible();
};

const startRoom = async (page: Page): Promise<string> => {
  await page.getByRole("button", { name: "Start a club" }).click();
  const code = page.getByLabel(/^Join code [A-Z] [A-Z] [A-Z] [A-Z]$/);
  await expect(code).toBeVisible();
  return ((await code.textContent()) ?? "").trim();
};

const joinRoom = async (page: Page, code: string) => {
  await page.getByPlaceholder("ABCD").fill(code);
  await page.getByRole("button", { name: "Join the club" }).click();
};

const here = (page: Page, count: number) => expect(page.getByText(`Here now (${count})`)).toBeVisible();

// "7 seconds until the walk starts" -> 7
const countdownOf = async (page: Page): Promise<number> => {
  const label = (await page.getByRole("timer").getAttribute("aria-label")) ?? "";
  const match = label.match(/^(\d+) seconds? until the walk starts$/);
  if (!match) throw new Error(`Not counting down: "${label}"`);
  return Number(match[1]);
};

// "2:41 left" -> 161
const secondsLeftOf = async (page: Page): Promise<number> => {
  const label = (await page.getByRole("timer").getAttribute("aria-label")) ?? "";
  const match = label.match(/^(\d+):(\d\d) left$/);
  if (!match) throw new Error(`Not walking: "${label}"`);
  return Number(match[1]) * 60 + Number(match[2]);
};

test("friends walk in step, even when a phone's clock is wrong", async ({ browser }) => {
  // The guest's phone clock is 45 seconds fast, and the late joiner's 30 slow.
  const host = await newFriend(browser, "Host Hana");
  const guest = await newFriend(browser, "Guest Gus", 45_000);
  const late = await newFriend(browser, "Late Lena", -30_000);

  await pickName(host.page, host.name);
  const code = await startRoom(host.page);

  await pickName(guest.page, guest.name);
  await joinRoom(guest.page, code);
  await here(host.page, 2);
  await here(guest.page, 2);
  await expect(guest.page.getByText("Waiting for the host to start the walk.")).toBeVisible();

  // The host starts the walk. Both phones count down to the same moment.
  await host.page.getByRole("button", { name: "Start the walk" }).click();
  await expect(host.page.getByRole("timer")).toBeVisible();
  await expect(guest.page.getByRole("timer")).toBeVisible();
  const [hostCountdown, guestCountdown] = await Promise.all([countdownOf(host.page), countdownOf(guest.page)]);
  expect(Math.abs(hostCountdown - guestCountdown), "countdowns differ").toBeLessThanOrEqual(1);

  // The first phase begins together.
  await expect(host.page.getByText("Walk fast")).toBeVisible({ timeout: 20_000 });
  await expect(guest.page.getByText("Walk fast")).toBeVisible({ timeout: 20_000 });
  const [hostLeft, guestLeft] = await Promise.all([secondsLeftOf(host.page), secondsLeftOf(guest.page)]);
  expect(Math.abs(hostLeft - guestLeft), "time left differs").toBeLessThanOrEqual(1);

  // Someone who joins late lands in the right place.
  await pickName(late.page, late.name);
  await joinRoom(late.page, code);
  await expect(late.page.getByText("Walk fast")).toBeVisible();
  const [laterHostLeft, lateLeft] = await Promise.all([secondsLeftOf(host.page), secondsLeftOf(late.page)]);
  expect(Math.abs(laterHostLeft - lateLeft), "late joiner is out of step").toBeLessThanOrEqual(2);

  for (const friend of [host, guest, late]) await friend.context.close();
});

test("the host is in charge of the room", async ({ browser }) => {
  const host = await newFriend(browser, "Host Hana");
  const anna = await newFriend(browser, "Guest Anna");
  const ben = await newFriend(browser, "Guest Ben");
  const twin = await newFriend(browser, "Host Hana");

  await pickName(host.page, host.name);
  const code = await startRoom(host.page);

  await pickName(anna.page, anna.name);
  await joinRoom(anna.page, code);
  await pickName(ben.page, ben.name);
  await joinRoom(ben.page, code);
  await here(host.page, 3);

  // Two people can't share a name in one room.
  await pickName(twin.page, twin.name);
  await joinRoom(twin.page, code);
  await expect(twin.page.getByText(/already goes by that name/)).toBeVisible();

  // The host removes Anna. She loses the room and can't slip back in.
  await host.page.getByRole("button", { name: "Remove Guest Anna" }).click();
  await here(host.page, 2);
  await expect(anna.page.getByText(/isn't available to you/)).toBeVisible();
  await anna.page.goto("/friends");
  await joinRoom(anna.page, code);
  await expect(anna.page.getByText(/The host has taken you out/)).toBeVisible();

  // Closing the room asks first, then closes it for everyone.
  await host.page.getByRole("button", { name: "Close the club" }).click();
  const dialog = host.page.getByRole("dialog");
  await expect(dialog).toContainText("closes the club for everyone");
  await dialog.getByRole("button", { name: "Close the club" }).click();
  await expect(ben.page.getByText(/This club has closed/)).toBeVisible();

  for (const friend of [host, anna, ben, twin]) await friend.context.close();
});
