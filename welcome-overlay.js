(() => {
  const perspectiveKey = "kahntra-site-perspective-v1";
  const detailKey = "kahntra-site-detail-v1";
  const controlsCollapsedKey = "kahntra-view-controls-collapsed-v1";
  const perspectives = ["technical", "design-philosophy"];
  const legacyPerspectiveAliases = {
    philosophy: "design-philosophy",
    general: "design-philosophy",
    "design-philosophy": "design-philosophy",
    technical: "technical",
  };
  const perspectiveLabelMap = {
    technical: "Technical",
    "design-philosophy": "Design & Philosophy",
  };
  const details = ["concise", "verbose"];
  const detailAliases = {
    concise: "concise",
    verbose: "verbose",
    less: "concise",
    regular: "verbose",
    more: "verbose",
  };
  const defaultPerspective = "technical";
  const defaultDetail = "concise";

  const initialize = () => {
    const announcement = document.querySelector("#perspective-announcement");
    const perspectiveButtons = [...document.querySelectorAll("[data-global-lens]")];
    const detailButtons = [...document.querySelectorAll("[data-global-detail]")];
    const siteToolbar = document.querySelector("[data-site-toolbar]");
    const viewControls = document.querySelector("#view-controls");
    const viewControlsToggle = document.querySelector("[data-view-controls-toggle]");
    const contextToggles = [...document.querySelectorAll("[data-context-toggle], [data-mobile-context-toggle]")];
    const mobilePerspectiveSelector = document.querySelector(".mobile-perspective-selector");
    const siteHeaderSystem = document.querySelector(".site-header-system");

    if (!announcement || !perspectiveButtons.length || !detailButtons.length || !siteToolbar || !viewControls || !viewControlsToggle) return;

    let globalPerspective = readPerspective();
    let globalDetail = readDetail();
    let controlsCollapsed = readControlsCollapsed();
    let contentTransitionTimer = null;
    let contentTransitionVersion = 0;
    const contentFadeOutDuration = 220;
    const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    function normalizePerspective(value) {
      const mappedValue = legacyPerspectiveAliases[value];
      if (!value) return null;
      if (value === "practical") return defaultPerspective;
      return perspectives.includes(mappedValue || value) ? (mappedValue || value) : null;
    }

    function readPerspectiveFromUrl() {
      const params = new URLSearchParams(window.location.search);
      return normalizePerspective(params.get("perspective"));
    }

    function writePerspectiveToUrl() {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("perspective", globalPerspective);
        url.searchParams.set("detail", globalDetail);
        history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      } catch {
        // URL state is optional when the environment does not support it.
      }
    }

    function resolveVisiblePerspective(value) {
      return value === "design-philosophy" ? "general" : value;
    }

    function perspectiveLabel(value) {
      return perspectiveLabelMap[value] || capitalize(value);
    }

    function normalizeDetail(value) {
      return detailAliases[value] || null;
    }

    function readPerspective() {
      const urlPerspective = readPerspectiveFromUrl();
      if (urlPerspective) {
        storeValue(perspectiveKey, urlPerspective);
        return urlPerspective;
      }

      try {
        const storedPerspective = sessionStorage.getItem(perspectiveKey);
        const normalizedPerspective = normalizePerspective(storedPerspective);
        if (normalizedPerspective) {
          if (storedPerspective !== normalizedPerspective) {
            sessionStorage.setItem(perspectiveKey, normalizedPerspective);
          }
          return normalizedPerspective;
        }
        return defaultPerspective;
      } catch {
        return defaultPerspective;
      }
    }

    function readDetail() {
      try {
        const params = new URLSearchParams(window.location.search);
        const resolvedDetail = normalizeDetail(params.get("detail"));
        if (details.includes(resolvedDetail)) {
          sessionStorage.setItem(detailKey, resolvedDetail);
          return resolvedDetail;
        }
      } catch {
        // URL state is optional when history APIs are unavailable.
      }

      try {
        const storedDetail = sessionStorage.getItem(detailKey);
        const resolvedDetail = normalizeDetail(storedDetail);
        if (storedDetail && resolvedDetail && storedDetail !== resolvedDetail) {
          sessionStorage.setItem(detailKey, resolvedDetail);
        }
        return details.includes(resolvedDetail) ? resolvedDetail : defaultDetail;
      } catch {
        return defaultDetail;
      }
    }

    function mappedDetailOrder(detailState) {
      if (detailState === "verbose") {
        return ["regular", "more", "less"];
      }
      return ["less", "regular", "more"];
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
      const visiblePerspective = resolveVisiblePerspective(globalPerspective);
      const detailCandidates = mappedDetailOrder(globalDetail);

      const visibleElements = [...container.querySelectorAll("[data-perspective][data-detail]")].filter(
        (element) => element.dataset.perspective === visiblePerspective
      );

      visibleElements.forEach((element) => {
        element.hidden = true;
      });

      const selectedDetail = detailCandidates.find((detail) =>
        visibleElements.some((element) => element.dataset.detail === detail)
      );

      visibleElements
        .filter((element) => element.dataset.detail === selectedDetail)
        .forEach((element) => {
          element.hidden = false;
        });

      [...container.querySelectorAll("[data-perspective][data-detail]")].forEach((element) => {
        if (element.dataset.perspective !== visiblePerspective) element.hidden = true;
      });
      container.querySelectorAll("[data-detail-content]").forEach((element) => {
        element.hidden = element.dataset.detailContent !== globalDetail;
      });
    }

    function updateApproachHeadings() {
      const visiblePerspective = resolveVisiblePerspective(globalPerspective);
      document.querySelectorAll("[data-perspective-heading]").forEach((heading) => {
        heading.hidden = heading.dataset.perspectiveHeading !== visiblePerspective;
      });
    }

    function updateAllContent() {
      document.querySelectorAll("[data-content-group]").forEach(updateContent);
      updateApproachHeadings();
    }

    function transitionContent({ includeApproachHeading = false, includeDetailOnlyGroups = true } = {}) {
      const contentGroups = [...document.querySelectorAll("[data-content-group]")].filter((group) => {
        return includeDetailOnlyGroups || Boolean(group.querySelector("[data-perspective]"));
      });
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
      return `${perspectiveLabel(globalPerspective)} · ${capitalize(globalDetail)}`;
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

    function updateContextToggles() {
      const showingVerbose = globalDetail === "verbose";
      contextToggles.forEach((toggle) => {
        toggle.setAttribute("aria-pressed", String(showingVerbose));
        toggle.setAttribute(
          "aria-label",
          showingVerbose ? "Show concise details" : "Show verbose details"
        );
      });
    }

    function updateMobileHeaderDivider() {
      if (!mobilePerspectiveSelector || !siteHeaderSystem || !window.matchMedia("(max-width: 640px)").matches) return;
      const activeButton = mobilePerspectiveSelector.querySelector('button[aria-pressed="true"]');
      if (!activeButton) return;
      const activeLabel = activeButton.querySelector("span");
      if (!activeLabel) return;
      const activeRect = activeLabel.getBoundingClientRect();
      const headerRect = siteHeaderSystem.getBoundingClientRect();
      siteHeaderSystem.style.setProperty("--mobile-divider-left", `${activeRect.left - headerRect.left}px`);
      siteHeaderSystem.style.setProperty("--mobile-divider-width", `${activeRect.width}px`);
    }

    function setControlsCollapsed(collapsed, { persist = true } = {}) {
      const focusWasInsideControls = viewControls.contains(document.activeElement);
      controlsCollapsed = collapsed;
      viewControls.hidden = collapsed;
      document.documentElement.dataset.viewControls = collapsed ? "collapsed" : "expanded";
      siteToolbar.dataset.viewControlsState = collapsed ? "collapsed" : "expanded";
      updateViewControlsToggle();

      if (persist) storeValue(controlsCollapsedKey, String(collapsed));
      if (collapsed && focusWasInsideControls) viewControlsToggle.focus({ preventScroll: true });
    }

    function setGlobalPerspective(perspective, { announce = true } = {}) {
      if (!perspectives.includes(perspective)) return;
      globalPerspective = perspective;
      storeValue(perspectiveKey, perspective);
      writePerspectiveToUrl();
      transitionContent({ includeApproachHeading: true, includeDetailOnlyGroups: false });
      setButtonState(perspectiveButtons, perspective, "globalLens");
      requestAnimationFrame(updateMobileHeaderDivider);
      updateViewControlsToggle();
      updateContextToggles();
      if (announce) announcement.textContent = `Site perspective: ${perspectiveLabel(perspective)}.`;
    }

    function setGlobalDetail(detail, { announce = true } = {}) {
      if (!details.includes(detail)) return;
      globalDetail = detail;
      storeValue(detailKey, detail);
      writePerspectiveToUrl();
      transitionContent();
      setButtonState(detailButtons, detail, "globalDetail");
      updateViewControlsToggle();
      updateContextToggles();
      if (announce) announcement.textContent = `Detail: ${capitalize(detail)}.`;
    }

    function handleDocumentPointerDown(event) {
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
    contextToggles.forEach((toggle) => {
      toggle.addEventListener("click", () => {
        setGlobalDetail(globalDetail === "verbose" ? "concise" : "verbose");
      });
    });
    viewControlsToggle.addEventListener("click", () => {
      setControlsCollapsed(!controlsCollapsed);
    });
    document.addEventListener("pointerdown", handleDocumentPointerDown);
    document.addEventListener("keydown", handleDocumentKeydown);
    window.addEventListener("resize", updateMobileHeaderDivider);

    siteToolbar.hidden = false;
    updateAllContent();
    setButtonState(perspectiveButtons, globalPerspective, "globalLens");
    updateMobileHeaderDivider();
    setButtonState(detailButtons, globalDetail, "globalDetail");
    writePerspectiveToUrl();
    updateContextToggles();
    setControlsCollapsed(controlsCollapsed, { persist: false });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
