(() => {
  const perspectiveKey = "kahntra-site-perspective-v1";
  const welcomeDismissedKey = "kahntra-welcome-perspective-dismissed-v1";
  const lenses = ["philosophy", "technical", "practical"];
  const defaultLens = "practical";

  const initialize = () => {
    const siteShell = document.querySelector(".site-shell");
    const overlay = document.querySelector("#welcome-overlay");
    const announcement = document.querySelector("#perspective-announcement");
    const globalButtons = [...document.querySelectorAll("[data-global-lens]")];
    const perspectiveBar = document.querySelector("[data-perspective-control]");
    const card = document.querySelector("[data-project-id='momomovies']");
    const closeButtons = overlay?.querySelectorAll("[data-welcome-close]") ?? [];
    const welcomeChoices = overlay?.querySelectorAll("[data-welcome-lens]") ?? [];

    if (!siteShell || !overlay || !announcement || !globalButtons.length || !perspectiveBar || !card || !closeButtons.length || !welcomeChoices.length) return;

    const cardControls = card.querySelector("[data-card-perspective]");
    const cardButtons = [...card.querySelectorAll("[data-card-lens]")];
    const overrideStatus = card.querySelector("[data-card-override]");
    const overrideLabel = card.querySelector("[data-card-override-label]");
    const followSiteButton = card.querySelector("[data-follow-site-perspective]");
    const cardOverrides = { momomovies: null };
    let globalLens = readStoredLens();
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
        button.setAttribute("aria-pressed", String(button.dataset.globalLens === activeLens || button.dataset.cardLens === activeLens));
      });
    }

    function updateCard() {
      const override = cardOverrides.momomovies;
      const activeLens = override ?? globalLens;
      const description = card.querySelector(".product-card__description");
      updateContent(description, activeLens);
      setButtonState(cardButtons, activeLens);
      overrideStatus.hidden = !override;
      if (override) overrideLabel.textContent = `Viewing ${capitalize(override)} locally.`;
    }

    function setGlobalLens(lens, { announce = true } = {}) {
      if (!lenses.includes(lens)) return;
      globalLens = lens;
      storeLens(lens);
      document.querySelectorAll("[data-lens-content-group]").forEach((container) => {
        if (!container.closest("[data-project-id]")) updateContent(container, lens);
      });
      setButtonState(globalButtons, lens);
      cardOverrides.momomovies = null;
      updateCard();
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

    function dismissWelcome({ selectedLens = null } = {}) {
      setGlobalLens(selectedLens ?? defaultLens, { announce: Boolean(selectedLens) });
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

    function handleKeydown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        dismissWelcome();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = [...overlay.querySelectorAll(focusableSelector)].filter((element) => !element.hasAttribute("hidden"));
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

    cardButtons.forEach((button) => {
      button.addEventListener("click", () => {
        cardOverrides.momomovies = button.dataset.cardLens;
        updateCard();
        announcement.textContent = `MomoMovies perspective: ${capitalize(button.dataset.cardLens)}. Local override active.`;
      });
    });

    followSiteButton.addEventListener("click", () => {
      cardOverrides.momomovies = null;
      updateCard();
      announcement.textContent = "MomoMovies now follows the site perspective.";
    });

    closeButtons.forEach((button) => button.addEventListener("click", () => dismissWelcome()));
    welcomeChoices.forEach((button) => {
      button.addEventListener("click", () => dismissWelcome({ selectedLens: button.dataset.welcomeLens }));
    });

    perspectiveBar.hidden = false;
    cardControls.hidden = false;
    setGlobalLens(globalLens, { announce: false });

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
      welcomeChoices[0].focus();
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
