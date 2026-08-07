(() => {
  const perspectiveKey = "kahntra-site-perspective-v1";
  const detailKey = "kahntra-site-detail-v1";
  const controlsCollapsedKey = "kahntra-view-controls-collapsed-v1";
  const introCompleteKey = "kahntra-header-intro-complete-v1";
  const legacyWelcomeDismissedKey = "kahntra-welcome-perspective-detail-dismissed-v1";
  const perspectives = ["philosophy", "general", "technical"];
  const details = ["less", "regular", "more"];
  const defaultPerspective = "general";
  const defaultDetail = "regular";

  const initialize = () => {
    const announcement = document.querySelector("#perspective-announcement");
    const perspectiveButtons = [...document.querySelectorAll("[data-global-lens]")];
    const detailButtons = [...document.querySelectorAll("[data-global-detail]")];
    const siteToolbar = document.querySelector("[data-site-toolbar]");
    const viewControls = document.querySelector("[data-view-controls]");
    const viewControlsToggle = document.querySelector("[data-view-controls-toggle]");
    const introVeil = document.querySelector("[data-intro-veil]");

    if (!announcement || !perspectiveButtons.length || !detailButtons.length || !siteToolbar || !viewControls || !viewControlsToggle || !introVeil) return;

    let globalPerspective = readPerspective();
    let globalDetail = readDetail();
    let controlsCollapsed = readControlsCollapsed();
    let introActive = false;
    let introTimer = null;
    let contentTransitionTimer = null;
    let contentTransitionVersion = 0;
    const contentFadeOutDuration = 220;
    const introFadeDuration = 720;
    const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

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

    function isCompactViewport() {
      return window.matchMedia("(max-width: 760px)").matches;
    }

    function readControlsCollapsed() {
      const prepaintState = document.documentElement.dataset.viewControls;
      if (prepaintState === "collapsed") return true;
      if (prepaintState === "expanded") return false;

      try {
        const storedValue = sessionStorage.getItem(controlsCollapsedKey);
        if (storedValue === "true") return true;
        if (storedValue === "false") return false;
      } catch {
        // The page remains usable when storage is unavailable.
      }

      return isCompactViewport();
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

    function capitalize(value) {
      return value.charAt(0).toUpperCase() + value.slice(1);
    }

    function formatCollapsedView() {
      if (globalPerspective === "general" && globalDetail === "regular") return "Regular";
      if (globalDetail === "regular") return capitalize(globalPerspective);
      return `${capitalize(globalPerspective)} · ${capitalize(globalDetail)}`;
    }

    function updateViewControlsToggle() {
      const currentView = formatCollapsedView();
      viewControlsToggle.textContent = controlsCollapsed ? `View: ${currentView}` : "Collapse";
      viewControlsToggle.setAttribute("aria-expanded", String(!controlsCollapsed));
      viewControlsToggle.setAttribute(
        "aria-label",
        controlsCollapsed
          ? `Expand view controls. Current view: ${currentView}.`
          : "Collapse view controls."
      );
    }

    function setControlsCollapsed(collapsed, { persist = true } = {}) {
      const focusWasInsideControls = viewControls.contains(document.activeElement);
      controlsCollapsed = collapsed;
      viewControls.hidden = collapsed;
      document.documentElement.dataset.viewControls = collapsed ? "collapsed" : "expanded";
      document.body.classList.toggle("view-controls-collapsed", collapsed);
      document.body.classList.toggle("view-controls-panel-open", !collapsed && isCompactViewport());
      updateViewControlsToggle();

      if (persist) storeValue(controlsCollapsedKey, String(collapsed));
      if (collapsed && focusWasInsideControls) viewControlsToggle.focus({ preventScroll: true });
    }

    function completeIntro({ keepPanel = false } = {}) {
      if (!introActive) return;
      introActive = false;
      if (introTimer) window.clearTimeout(introTimer);
      storeValue(introCompleteKey, "true");
      document.documentElement.dataset.headerIntro = "complete";
      introVeil.classList.remove("is-visible");

      const finish = () => {
        introVeil.hidden = true;
      };

      if (reduceMotionQuery.matches) finish();
      else window.setTimeout(finish, introFadeDuration);

      if (isCompactViewport() && !keepPanel && !controlsCollapsed) {
        setControlsCollapsed(true, { persist: false });
      }
    }

    function beginIntro() {
      try {
        sessionStorage.removeItem(legacyWelcomeDismissedKey);
        if (document.documentElement.dataset.headerIntro === "complete" || sessionStorage.getItem(introCompleteKey)) return;
      } catch {
        // If storage is unavailable, show the introduction for this page view only.
      }

      if (reduceMotionQuery.matches) {
        storeValue(introCompleteKey, "true");
        return;
      }

      introActive = true;
      document.documentElement.dataset.headerIntro = "active";
      if (isCompactViewport()) {
        viewControls.classList.add("is-intro-entering");
        setControlsCollapsed(false, { persist: false });
      }
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          viewControls.classList.remove("is-intro-entering");
          introVeil.classList.add("is-visible");
        });
      });
      introTimer = window.setTimeout(() => completeIntro(), 4500);
    }

    function markIntroInteraction() {
      if (introActive) completeIntro({ keepPanel: true });
    }

    function setGlobalPerspective(perspective, { announce = true } = {}) {
      if (!perspectives.includes(perspective)) return;
      markIntroInteraction();
      globalPerspective = perspective;
      storeValue(perspectiveKey, perspective);
      transitionContent({ includeApproachHeading: true });
      setButtonState(perspectiveButtons, perspective, "globalLens");
      updateViewControlsToggle();
      if (announce) announcement.textContent = `Site perspective: ${capitalize(perspective)}.`;
    }

    function setGlobalDetail(detail, { announce = true } = {}) {
      if (!details.includes(detail)) return;
      markIntroInteraction();
      globalDetail = detail;
      storeValue(detailKey, detail);
      transitionContent();
      setButtonState(detailButtons, detail, "globalDetail");
      updateViewControlsToggle();
      if (announce) announcement.textContent = `Detail: ${capitalize(detail)}.`;
    }

    function handleDocumentPointerDown(event) {
      if (introActive && !siteToolbar.contains(event.target)) completeIntro();
      if (!controlsCollapsed && isCompactViewport() && !siteToolbar.contains(event.target)) {
        setControlsCollapsed(true);
      }
    }

    function handleDocumentKeydown(event) {
      if (event.key === "Escape" && !controlsCollapsed && isCompactViewport()) {
        event.preventDefault();
        setControlsCollapsed(true);
      }
    }

    perspectiveButtons.forEach((button) => {
      button.addEventListener("click", () => setGlobalPerspective(button.dataset.globalLens));
    });
    detailButtons.forEach((button) => {
      button.addEventListener("click", () => setGlobalDetail(button.dataset.globalDetail));
    });
    viewControlsToggle.addEventListener("click", () => {
      if (introActive) markIntroInteraction();
      setControlsCollapsed(!controlsCollapsed);
    });
    document.addEventListener("pointerdown", handleDocumentPointerDown);
    document.addEventListener("keydown", handleDocumentKeydown);
    window.addEventListener("scroll", () => completeIntro(), { passive: true, once: true });

    siteToolbar.hidden = false;
    updateAllContent();
    setButtonState(perspectiveButtons, globalPerspective, "globalLens");
    setButtonState(detailButtons, globalDetail, "globalDetail");
    setControlsCollapsed(controlsCollapsed, { persist: false });
    beginIntro();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
