(() => {
  const perspectiveKey = "kahntra-site-perspective-v1";
  const welcomeDismissedKey = "kahntra-welcome-perspective-dismissed-v1";
  const lenses = ["philosophy", "general", "technical"];
  const defaultLens = "general";

  const initialize = () => {
    const siteShell = document.querySelector(".site-shell");
    const overlay = document.querySelector("#welcome-overlay");
    const announcement = document.querySelector("#perspective-announcement");
    const globalButtons = [...document.querySelectorAll("[data-global-lens]")];
    const perspectiveBar = document.querySelector("[data-perspective-control]");
    const backdrop = overlay?.querySelector("[data-welcome-dismiss]");
    const welcomeSubmit = overlay?.querySelector("[data-welcome-submit]");
    const welcomeChoices = [...(overlay?.querySelectorAll("[data-welcome-lens]") ?? [])];
    const cards = [...document.querySelectorAll("[data-project-id]")];

    if (!siteShell || !overlay || !announcement || !globalButtons.length || !perspectiveBar || !backdrop || !welcomeSubmit || !welcomeChoices.length || !cards.length) return;

    const cardEntries = cards.map((card) => ({
      card,
      id: card.dataset.projectId,
      name: card.querySelector("h3")?.textContent.trim(),
      controls: card.querySelector("[data-card-perspective]"),
      buttons: [...card.querySelectorAll("[data-card-lens]")],
      description: card.querySelector(".product-card__description"),
      overrideStatus: card.querySelector("[data-card-override]"),
      overrideLabel: card.querySelector("[data-card-override-label]"),
      followSiteButton: card.querySelector("[data-follow-site-perspective]")
    }));

    if (cardEntries.some(({ id, name, controls, buttons, description, overrideStatus, overrideLabel, followSiteButton }) => !id || !name || !controls || !buttons.length || !description || !overrideStatus || !overrideLabel || !followSiteButton)) return;

    const cardOverrides = new Map(cardEntries.map(({ id }) => [id, null]));
    let globalLens = readStoredLens();
    let pendingLens = globalLens;
    let previousFocus = null;
    let fallbackFocusables = [];

    const focusableSelector = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])"
    ].join(",");

    function readStoredLens() {
      try {
        const storedLens = sessionStorage.getItem(perspectiveKey);
        if (storedLens === "practical") {
          sessionStorage.setItem(perspectiveKey, defaultLens);
          return defaultLens;
        }
        return lenses.includes(storedLens) ? storedLens : defaultLens;
      } catch {
        return defaultLens;
      }
    }

    function storeLens(lens) {
      try {
        sessionStorage.setItem(perspectiveKey, lens);
      } catch {
        // The page remains usable when storage is unavailable.
      }
    }

    function updateContent(container, lens) {
      container.querySelectorAll("[data-lens-content]").forEach((element) => {
        element.hidden = element.dataset.lensContent !== lens;
      });
    }

    function setButtonState(buttons, activeLens) {
      buttons.forEach((button) => {
        const buttonLens = button.dataset.globalLens ?? button.dataset.cardLens ?? button.dataset.welcomeLens;
        button.setAttribute("aria-pressed", String(buttonLens === activeLens));
      });
    }

    function setPendingLens(lens) {
      if (!lenses.includes(lens)) return;
      pendingLens = lens;
      setButtonState(welcomeChoices, pendingLens);
    }

    function updateCard(cardEntry) {
      const override = cardOverrides.get(cardEntry.id);
      const activeLens = override ?? globalLens;
      updateContent(cardEntry.description, activeLens);
      setButtonState(cardEntry.buttons, activeLens);
      cardEntry.overrideStatus.hidden = !override;
      if (override) cardEntry.overrideLabel.textContent = `Viewing ${capitalize(override)} locally.`;
    }

    function setGlobalLens(lens, { announce = true } = {}) {
      if (!lenses.includes(lens)) return;
      globalLens = lens;
      storeLens(lens);
      document.querySelectorAll("[data-lens-content-group]").forEach((container) => {
        if (!container.closest("[data-project-id]")) updateContent(container, lens);
      });
      setButtonState(globalButtons, lens);
      cardEntries.forEach((cardEntry) => {
        cardOverrides.set(cardEntry.id, null);
        updateCard(cardEntry);
      });
      if (announce) announcement.textContent = `Site perspective: ${capitalize(lens)}.`;
    }

    function capitalize(value) {
      return value.charAt(0).toUpperCase() + value.slice(1);
    }

    function setBackgroundInert(isInert) {
      if ("inert" in siteShell) {
        siteShell.inert = isInert;
      } else if (isInert) {
        fallbackFocusables = [...siteShell.querySelectorAll(focusableSelector)];
        fallbackFocusables.forEach((element) => {
          element.dataset.welcomeTabindex = element.getAttribute("tabindex") ?? "";
          element.setAttribute("tabindex", "-1");
        });
      } else {
        fallbackFocusables.forEach((element) => {
          const originalTabindex = element.dataset.welcomeTabindex;
          if (originalTabindex) element.setAttribute("tabindex", originalTabindex);
          else element.removeAttribute("tabindex");
          delete element.dataset.welcomeTabindex;
        });
        fallbackFocusables = [];
      }

      if (isInert) siteShell.setAttribute("aria-hidden", "true");
      else siteShell.removeAttribute("aria-hidden");
    }

    function dismissWelcome() {
      setGlobalLens(pendingLens);
      try {
        sessionStorage.setItem(welcomeDismissedKey, "true");
      } catch {
        // The page remains usable when storage is unavailable.
      }

      overlay.classList.remove("is-open");
      document.body.classList.remove("welcome-overlay-open");
      setBackgroundInert(false);
      overlay.hidden = true;
      document.removeEventListener("keydown", handleKeydown);

      const focusTarget = previousFocus instanceof HTMLElement && previousFocus !== document.body && previousFocus.isConnected
        ? previousFocus
        : document.querySelector(".wordmark");
      focusTarget?.focus({ preventScroll: true });
    }

    function getOverlayFocusables() {
      return [...overlay.querySelectorAll(focusableSelector)].filter((element) => !element.hasAttribute("hidden") && element.getAttribute("tabindex") !== "-1");
    }

    function handleKeydown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        dismissWelcome();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = getOverlayFocusables();
      const first = focusable[0];
      const last = focusable.at(-1);

      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    globalButtons.forEach((button) => {
      button.addEventListener("click", () => setGlobalLens(button.dataset.globalLens));
    });

    cardEntries.forEach((cardEntry) => {
      cardEntry.buttons.forEach((button) => {
        button.addEventListener("click", () => {
          cardOverrides.set(cardEntry.id, button.dataset.cardLens);
          updateCard(cardEntry);
          announcement.textContent = `${cardEntry.name} perspective: ${capitalize(button.dataset.cardLens)}. Local override active.`;
        });
      });

      cardEntry.followSiteButton.addEventListener("click", () => {
        cardOverrides.set(cardEntry.id, null);
        updateCard(cardEntry);
        announcement.textContent = `${cardEntry.name} now follows the site perspective.`;
      });
    });

    welcomeChoices.forEach((button) => {
      button.addEventListener("click", () => setPendingLens(button.dataset.welcomeLens));
    });
    welcomeSubmit.addEventListener("click", dismissWelcome);
    backdrop.addEventListener("click", dismissWelcome);

    perspectiveBar.hidden = false;
    cardEntries.forEach(({ controls }) => {
      controls.hidden = false;
    });
    setGlobalLens(globalLens, { announce: false });
    setPendingLens(globalLens);

    try {
      if (sessionStorage.getItem(welcomeDismissedKey)) return;
    } catch {
      // If storage is unavailable, show the overlay for this page view only.
    }

    overlay.hidden = false;
    previousFocus = document.activeElement;
    setBackgroundInert(true);
    document.body.classList.add("welcome-overlay-open");
    document.addEventListener("keydown", handleKeydown);
    requestAnimationFrame(() => {
      overlay.classList.add("is-open");
      welcomeChoices.find((button) => button.dataset.welcomeLens === pendingLens)?.focus();
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
