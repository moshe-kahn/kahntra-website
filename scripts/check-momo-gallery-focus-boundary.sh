#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8000}"
SESSION="momo-gallery-focus-boundary"

cleanup() {
  npx playwright cli -s="$SESSION" close >/dev/null 2>&1 || true
}
trap cleanup EXIT

npx playwright cli -s="$SESSION" open "$BASE_URL" >/tmp/momo-gallery-focus-open.txt
npx playwright cli -s="$SESSION" run-code --raw 'async (page) => {
  const root = page.locator("[data-momo-editions-gallery]");
  const entry = page.locator("[data-momo-gallery-enter]");
  await page.locator(".momo-gallery__frame.is-selected").waitFor();

  const preEntry = await root.evaluate((node) => ({
    inert: node.hasAttribute("inert"),
    ariaHidden: node.getAttribute("aria-hidden"),
    enabledControls: node.querySelectorAll("button:not(:disabled)").length
  }));
  if (!preEntry.inert || preEntry.ariaHidden !== "true" || preEntry.enabledControls !== 0) {
    throw new Error(`Gallery leaked interaction before entry: ${JSON.stringify(preEntry)}`);
  }

  await entry.focus();
  await page.keyboard.press("Tab");
  const tabEnteredGallery = await root.evaluate((node) => node.contains(document.activeElement));
  if (tabEnteredGallery) throw new Error("Tab focus entered the gallery before entry.");

  await entry.click();
  await page.waitForFunction(() => {
    const gallery = document.querySelector("[data-momo-editions-gallery]");
    return gallery && !gallery.hasAttribute("inert") && gallery.contains(document.activeElement);
  });

  const postEntry = await root.evaluate((node) => ({
    inert: node.hasAttribute("inert"),
    ariaHidden: node.getAttribute("aria-hidden"),
    enabledControls: node.querySelectorAll("button:not(:disabled)").length,
    focusedSelectedFrame: document.activeElement?.matches(".momo-gallery__frame.is-selected") || false
  }));
  if (postEntry.inert || postEntry.ariaHidden !== null || postEntry.enabledControls < 2 || !postEntry.focusedSelectedFrame) {
    throw new Error(`Gallery did not open its keyboard boundary correctly: ${JSON.stringify(postEntry)}`);
  }

  await page.keyboard.press("End");
  await page.waitForFunction(() => document.querySelector(".momo-gallery__frame.is-selected")?.dataset.index === "28");
  return { preEntry, tabEnteredGallery, postEntry, keyboardEndIndex: 28 };
}'

echo "Momo gallery focus-boundary regression passed."
