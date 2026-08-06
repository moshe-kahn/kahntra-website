(() => {
  const perspectiveKey = "kahntra-site-perspective-v1";
  const detailKey = "kahntra-site-detail-v1";
  const controlsCollapsedKey = "kahntra-view-controls-collapsed-v1";
  const welcomeDismissedKey = "kahntra-welcome-perspective-detail-dismissed-v1";
  const perspectives = ["philosophy", "general", "technical"];
  const details = ["less", "regular", "more"];
  const defaultPerspective = "general";
  const defaultDetail = "regular";

  const initialize = () => {
    const siteShell = document.querySelector(".site-shell");
    const overlay = document.querySelector("#welcome-overlay");
    const announcement = document.querySelector("#perspective-announcement");
    const perspectiveButtons = [...document.querySelectorAll("[data-global-lens]")];
    const detailButtons = [...document.querySelectorAll("[data-global-detail]")];
    const siteToolbar = document.querySelector("[data-site-toolbar]");
    const viewControls = document.querySelector("[data-view-controls]");
    const viewControlsToggle = document.querySelector("[data-view-controls-toggle]");
    const backdrop = overlay?.querySelector("[data-welcome-dismiss]");
    const welcomeSubmit = overlay?.querySelector("[data-welcome-submit]");
    const welcomePerspectiveChoices = [...(overlay?.querySelectorAll("[data-welcome-lens]") ?? [])];
    const welcomeDetailChoices = [...(overlay?.querySelectorAll("[data-welcome-detail]") ?? [])];

    if (!siteShell || !overlay || !announcement || !perspectiveButtons.length || !detailButtons.length || !siteToolbar || !viewControls || !viewControlsToggle || !backdrop || !welcomeSubmit || !welcomePerspectiveChoices.length || !welcomeDetailChoices.length) return;

    let globalPerspective = readPerspective();
    let globalDetail = readDetail();
    let pendingPerspective = globalPerspective;
    let pendingDetail = globalDetail;
    let controlsCollapsed = readControlsCollapsed();
    let previousFocus = null;
    let fallbackFocusables = [];
    let contentTransitionTimer = null;
    let contentTransitionVersion = 0;
    const contentFadeOutDuration = 220;
    const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const focusableSelector = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])"
    ].join(",");

    function readPerspective() {
      try {
        const storedPerspective = sessionStorage.getItem(perspectiveKey);
        if (storedPerspective === "practical") {
          sessionStorage.setItem(perspectiveKey, defaultPerspective);
          return defaultPerspective;
        }
        return perspectives.includes(storedPerspective) ? storedPerspective : defaultPerspective;
      } catch {
        return defaultPerspective;
      }
    }

    function readDetail() {
      try {
        const storedDetail = sessionStorage.getItem(detailKey);
        return details.includes(storedDetail) ? storedDetail : defaultDetail;
      } catch {
        return defaultDetail;
      }
    }

    function readControlsCollapsed() {
      try {
        const storedValue = sessionStorage.getItem(controlsCollapsedKey);
        if (storedValue === "true") return true;
        if (storedValue === "false") return false;
      } catch {
        // The page remains usable when storage is unavailable.
      }

      return window.matchMedia("(max-width: 760px)").matches;
    }

    function storeValue(key, value) {
      try {
        sessionStorage.setItem(key, value);
      } catch {
        // The page remains usable when storage is unavailable.
      }
    }

    function updateContent(container) {
      container.querySelectorAll("[data-perspective][data-detail]").forEach((element) => {
        element.hidden = element.dataset.perspective !== globalPerspective || element.dataset.detail !== globalDetail;
      });
    }

    function updateApproachHeadings() {
      document.querySelectorAll("[data-perspective-heading]").forEach((heading) => {
        heading.hidden = heading.dataset.perspectiveHeading !== globalPerspective;
      });
    }

    function updateAllContent() {
      document.querySelectorAll("[data-content-group]").forEach(updateContent);
      updateApproachHeadings();
    }

    function transitionContent({ includeApproachHeading = false } = {}) {
      const contentGroups = [...document.querySelectorAll("[data-content-group]")];
      const approachHeadings = [...document.querySelectorAll("[data-perspective-heading]")];

      if (reduceMotionQuery.matches) {
        updateAllContent();
        return;
      }

      const fadingHeadings = approachHeadings.filter((heading) => heading.classList.contains("is-content-fading"));
      const transitionElements = [...contentGroups, ...(includeApproachHeading ? approachHeadings : fadingHeadings)];
      const version = ++contentTransitionVersion;

      if (contentTransitionTimer) window.clearTimeout(contentTransitionTimer);
      transitionElements.forEach((element) => element.classList.add("is-content-fading"));

      contentTransitionTimer = window.setTimeout(() => {
        if (version !== contentTransitionVersion) return;
        updateAllContent();
        requestAnimationFrame(() => {
          if (version !== contentTransitionVersion) return;
          transitionElements.forEach((element) => element.classList.remove("is-content-fading"));
          contentTransitionTimer = null;
        });
      }, contentFadeOutDuration);
    }

    function setButtonState(buttons, activeValue, dataKey) {
      buttons.forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset[dataKey] === activeValue));
      });
    }

    function updateViewControlsToggle() {
      const currentView = formatCollapsedView();
      const summary = `View: ${currentView}`;
      viewControlsToggle.textContent = controlsCollapsed ? summary : "Collapse";
      viewControlsToggle.setAttribute("aria-expanded", String(!controlsCollapsed));
      viewControlsToggle.setAttribute(
        "aria-label",
        controlsCollapsed
          ? `Expand view controls. Current view: ${currentView}.`
          : "Collapse view controls."
      );
    }

    function formatCollapsedView() {
      if (globalPerspective === "general" && globalDetail === "regular") return "Regular";
      if (globalDetail === "regular") return capitalize(globalPerspective);
      return `${capitalize(globalPerspective)} · ${capitalize(globalDetail)}`;
    }

    function setControlsCollapsed(collapsed, { persist = true } = {}) {
      const focusWasInsideControls = viewControls.contains(document.activeElement);
      controlsCollapsed = collapsed;
      viewControls.hidden = collapsed;
      document.body.classList.toggle("view-controls-collapsed", collapsed);
      updateViewControlsToggle();

      if (persist) storeValue(controlsCollapsedKey, String(collapsed));
      if (collapsed && focusWasInsideControls) viewControlsToggle.focus({ preventScroll: true });
    }

    function setPendingPerspective(perspective) {
      if (!perspectives.includes(perspective)) return;
      pendingPerspective = perspective;
      setButtonState(welcomePerspectiveChoices, pendingPerspective, "welcomeLens");
    }

    function setPendingDetail(detail) {
      if (!details.includes(detail)) return;
      pendingDetail = detail;
      setButtonState(welcomeDetailChoices, pendingDetail, "welcomeDetail");
    }

    function setGlobalPerspective(perspective, { announce = true } = {}) {
      if (!perspectives.includes(perspective)) return;
      globalPerspective = perspective;
      storeValue(perspectiveKey, perspective);
      transitionContent({ includeApproachHeading: true });
      setButtonState(perspectiveButtons, perspective, "globalLens");
      updateViewControlsToggle();
      if (announce) announcement.textContent = `Site perspective: ${capitalize(perspective)}.`;
    }

    function setGlobalDetail(detail, { announce = true } = {}) {
      if (!details.includes(detail)) return;
      globalDetail = detail;
      storeValue(detailKey, detail);
      transitionContent();
      setButtonState(detailButtons, detail, "globalDetail");
      updateViewControlsToggle();
      if (announce) announcement.textContent = `Detail: ${capitalize(detail)}.`;
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
      setGlobalPerspective(pendingPerspective);
      setGlobalDetail(pendingDetail);
      storeValue(welcomeDismissedKey, "true");

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

    perspectiveButtons.forEach((button) => {
      button.addEventListener("click", () => setGlobalPerspective(button.dataset.globalLens));
    });
    detailButtons.forEach((button) => {
      button.addEventListener("click", () => setGlobalDetail(button.dataset.globalDetail));
    });
    viewControlsToggle.addEventListener("click", () => setControlsCollapsed(!controlsCollapsed));
    welcomePerspectiveChoices.forEach((button) => {
      button.addEventListener("click", () => setPendingPerspective(button.dataset.welcomeLens));
    });
    welcomeDetailChoices.forEach((button) => {
      button.addEventListener("click", () => setPendingDetail(button.dataset.welcomeDetail));
    });
    welcomeSubmit.addEventListener("click", dismissWelcome);
    backdrop.addEventListener("click", dismissWelcome);

    siteToolbar.hidden = false;
    updateAllContent();
    setButtonState(perspectiveButtons, globalPerspective, "globalLens");
    setButtonState(detailButtons, globalDetail, "globalDetail");
    setPendingPerspective(globalPerspective);
    setPendingDetail(globalDetail);
    setControlsCollapsed(controlsCollapsed, { persist: false });

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
      welcomePerspectiveChoices.find((button) => button.dataset.welcomeLens === pendingPerspective)?.focus();
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
