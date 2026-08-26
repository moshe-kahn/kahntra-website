#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8000}"
SESSION="momo-gallery-accessible-roles"

cleanup() {
  npx playwright cli -s="$SESSION" close >/dev/null 2>&1 || true
}
trap cleanup EXIT

npx playwright cli -s="$SESSION" open "$BASE_URL" >/tmp/momo-gallery-accessible-roles-open.txt
npx playwright cli -s="$SESSION" run-code --raw 'async (page) => {
  const root = page.locator("[data-momo-editions-gallery]");
  const entry = page.locator("[data-momo-gallery-enter]");
  await page.locator(".momo-gallery__frame.is-selected").waitFor();

  const hiddenButtons = await root.getByRole("button", { name: /^Select / }).count();
  if (hiddenButtons !== 0) {
    throw new Error(`Preview buttons entered the accessibility tree before entry: ${hiddenButtons}`);
  }

  await entry.click();
  await page.waitForFunction(() => {
    const gallery = document.querySelector("[data-momo-editions-gallery]");
    return gallery && !gallery.hasAttribute("inert") && !gallery.hasAttribute("aria-hidden");
  });

  const previewButtons = root.getByRole("button", { name: /^Select / });
  const previewList = root.getByRole("list", { name: "Edition previews" });
  const listItems = previewList.getByRole("listitem");
  const buttonCount = await previewButtons.count();
  const listItemCount = await listItems.count();
  if (buttonCount !== 29 || listItemCount !== 29) {
    throw new Error(`Unexpected accessible preview structure: ${JSON.stringify({ buttonCount, listItemCount })}`);
  }

  const controls = await previewButtons.evaluateAll((buttons) =>
    buttons.map((button) => ({
      tagName: button.tagName,
      explicitRole: button.getAttribute("role"),
      name: button.getAttribute("aria-label")
    }))
  );
  const names = controls.map((control) => control.name);
  const uniqueNames = new Set(names);
  if (
    controls.some((control) => control.tagName !== "BUTTON" || control.explicitRole !== null) ||
    names.some((name) => !name || !name.startsWith("Select ")) ||
    uniqueNames.size !== 29
  ) {
    throw new Error(`Preview buttons lost native role or unique accessible names: ${JSON.stringify(controls)}`);
  }

  return {
    hiddenButtons,
    buttonCount,
    listItemCount,
    firstName: names[0],
    lastName: names[names.length - 1]
  };
}'

echo "Momo gallery accessible-role regression passed."
