(() => {
  const perspectiveKey = "kahntra-site-perspective-v1";
  const detailKey = "kahntra-site-detail-v1";
  const orderKey = "kahntra-site-order-v1";
  const controlsCollapsedKey = "kahntra-view-controls-collapsed-v1";
  const orderRestoreKey = "kahntra-order-restore-v1";
  const perspectives = ["technical", "design-philosophy"];
  const legacyPerspectiveAliases = {
    philosophy: "design-philosophy",
    general: "design-philosophy",
    "design-philosophy": "design-philosophy",
    technical: "technical",
  };
  const perspectiveLabelMap = {
    technical: "Technical",
    "design-philosophy": "General",
  };
  const details = ["concise", "verbose"];
  const detailAliases = {
    concise: "concise",
    verbose: "verbose",
    less: "concise",
    regular: "verbose",
    more: "verbose",
  };
  const defaultPerspective = "design-philosophy";
  const defaultDetail = "concise";
  const orders = ["curated", "grouped"];
  const defaultOrder = "curated";
  const detailLabelMap = {
    concise: "Concise",
    verbose: "Verbose",
  };
  const orderLabelMap = {
    curated: "Curated order",
    grouped: "Grouped by type",
  };

  const initialize = () => {
    const announcement = document.querySelector("#perspective-announcement");
    const perspectiveButtons = [...document.querySelectorAll("[data-global-lens]")];
    const detailButtons = [...document.querySelectorAll("[data-global-detail]")];
    const orderButtons = [...document.querySelectorAll("[data-global-order]")];
    const lensControl = document.querySelector("[data-lens-control]");
    const lensToggle = document.querySelector("[data-lens-toggle]");
    const lensPanel = document.querySelector("[data-lens-panel]");
    const wordmarkLink = document.querySelector(".wordmark");
    const siteToolbar = document.querySelector("[data-site-toolbar]");
    const viewControls = document.querySelector("#view-controls");
    const viewControlsToggle = document.querySelector("[data-view-controls-toggle]");
    const contextToggles = [...document.querySelectorAll("[data-context-toggle], [data-mobile-context-toggle]")];
    const mobilePerspectiveSelector = document.querySelector(".mobile-perspective-selector");
    const siteHeaderSystem = document.querySelector(".site-header-system");
    const aboutDialog = document.querySelector("#about-dialog");
    const aboutSurface = aboutDialog?.querySelector(".about-dialog__surface");
    const aboutOpenButtons = [...document.querySelectorAll("[data-about-open]")];
    const aboutCloseButton = document.querySelector("[data-about-close]");
    const aboutTabs = [...document.querySelectorAll("[data-about-tab]")];
    const unavailableLinks = [...document.querySelectorAll(".product-card__unavailable")];
    const projectTabGroups = [...document.querySelectorAll("[data-project-tabs]")];

    if (!announcement || !perspectiveButtons.length || !detailButtons.length || !siteToolbar || !viewControls || !viewControlsToggle) return;

    let globalPerspective = readPerspective();
    let globalDetail = readDetail();
    let globalOrder = readOrder();
    let lensPanelOpen = false;
    let controlsCollapsed = readControlsCollapsed();
    let contentTransitionTimer = null;
    let contentTransitionVersion = 0;
    let aboutOpener = null;
    const unavailableTimers = new WeakMap();
    const contentFadeOutDuration = 220;
    const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    function normalizePerspective(value) {
      const mappedValue = legacyPerspectiveAliases[value];
      if (!value) return null;
      if (value === "practical") return defaultPerspective;
      return perspectives.includes(mappedValue || value) ? (mappedValue || value) : null;
    }

    function isTechnicalResumePath() {
      return window.location.pathname.replace(/\/+$/, "") === "/tech";
    }

    function readPerspectiveFromUrl() {
      if (isTechnicalResumePath()) return "technical";

      const params = new URLSearchParams(window.location.search);
      return normalizePerspective(params.get("perspective"));
    }

    function writePerspectiveToUrl() {
      // Lens selections are session-only. Inbound query params still initialize
      // the view, but changing controls should not rewrite the address.
    }

    function resolveVisiblePerspective(value) {
      return value === "design-philosophy" ? "general" : value;
    }

    function perspectiveLabel(value) {
      return perspectiveLabelMap[value] || capitalize(value);
    }

    function detailLabel(value) {
      return detailLabelMap[value] || capitalize(value);
    }

    function orderLabel(value) {
      return orderLabelMap[value] || capitalize(value);
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
      if (isTechnicalResumePath()) {
        storeValue(detailKey, "verbose");
        return "verbose";
      }

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

    function readOrder() {
      if (isTechnicalResumePath()) {
        storeValue(orderKey, "grouped");
        return "grouped";
      }

      try {
        const params = new URLSearchParams(window.location.search);
        const urlOrder = params.get("view") === "grouped" ? "grouped" : defaultOrder;
        storeValue(orderKey, urlOrder);
        return urlOrder;
      } catch {
        // URL state is optional when history APIs are unavailable.
      }

      try {
        const storedOrder = sessionStorage.getItem(orderKey);
        return orders.includes(storedOrder) ? storedOrder : defaultOrder;
      } catch {
        return defaultOrder;
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

    function storeOrderRestoreState(targetOrder) {
      const payload = {
        targetView: targetOrder === "grouped" ? "grouped" : "sequence",
        scrollY: window.scrollY,
      };

      try {
        if ("scrollRestoration" in history) history.scrollRestoration = "manual";
        sessionStorage.setItem(orderRestoreKey, JSON.stringify(payload));
      } catch {
        // Order switching still works when storage is unavailable.
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

    function defaultProjectTab() {
      return globalPerspective === "technical" ? "technical" : "features";
    }

    function shouldAutoExpandProjectDetails() {
      return globalDetail === "verbose";
    }

    function setProjectTab(group, tabName) {
      const buttons = [...group.querySelectorAll("[data-project-tab-button]")];
      const panels = [...group.querySelectorAll("[data-project-tab-panel]")];
      if (!buttons.length || !panels.length) return;
      const selectedTab = buttons.some((button) => button.dataset.projectTabButton === tabName)
        ? tabName
        : buttons[0].dataset.projectTabButton;

      buttons.forEach((button) => {
        const active = button.dataset.projectTabButton === selectedTab;
        button.setAttribute("aria-selected", String(active));
        button.tabIndex = active ? 0 : -1;
      });
      panels.forEach((panel) => {
        panel.hidden = panel.dataset.projectTabPanel !== selectedTab;
      });
    }

    function setProjectDetailsExpanded(group, expanded) {
      const card = group.closest(".product-card");
      const moreButton = card?.querySelector("[data-project-more]");
      group.hidden = !expanded;
      if (moreButton) {
        moreButton.hidden = expanded;
        moreButton.setAttribute("aria-expanded", String(expanded));
      }
    }

    function updateProjectTabsForPerspective() {
      projectTabGroups.forEach((group) => {
        setProjectTab(group, defaultProjectTab());
      });
    }

    function updateProjectDetailsForDetail() {
      projectTabGroups.forEach((group) => {
        setProjectTab(group, defaultProjectTab());
        setProjectDetailsExpanded(group, shouldAutoExpandProjectDetails());
      });
    }

    function initializeProjectTabs() {
      projectTabGroups.forEach((group) => {
        setProjectTab(group, defaultProjectTab());
        setProjectDetailsExpanded(group, shouldAutoExpandProjectDetails());
        group.closest(".product-card")?.querySelector("[data-project-more]")?.addEventListener("click", () => {
          setProjectTab(group, defaultProjectTab());
          setProjectDetailsExpanded(group, true);
        });
        group.querySelectorAll("[data-project-tab-button]").forEach((button) => {
          button.addEventListener("click", () => {
            setProjectTab(group, button.dataset.projectTabButton);
          });
          button.addEventListener("keydown", (event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            const buttons = [...group.querySelectorAll("[data-project-tab-button]")];
            const currentIndex = buttons.indexOf(event.currentTarget);
            if (currentIndex === -1) return;

            event.preventDefault();
            let nextIndex = currentIndex;
            if (event.key === "Home") nextIndex = 0;
            else if (event.key === "End") nextIndex = buttons.length - 1;
            else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
            else if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % buttons.length;

            const nextButton = buttons[nextIndex];
            setProjectTab(group, nextButton.dataset.projectTabButton);
            nextButton.focus({ preventScroll: true });
          });
        });
      });
    }

    function initializeProjectBacklinks() {
      document.querySelectorAll("[data-project-backlink]").forEach((link) => {
        link.addEventListener("click", () => {
          const projectId = link.dataset.projectBacklink;
          const tabName = link.dataset.projectBacklinkTab;
          const card = document.querySelector(`[data-project-id="${projectId}"]`);
          const group = card?.querySelector("[data-project-tabs]");
          if (!group) return;

          setProjectDetailsExpanded(group, true);
          if (tabName) setProjectTab(group, tabName);
        });
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
      return `${perspectiveLabel(globalPerspective)} · ${detailLabel(globalDetail)}`;
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
          showingVerbose ? "Show concise view" : "Show verbose view"
        );
      });
    }

    function updateLensToggle() {
      if (!lensToggle) return;
      lensToggle.setAttribute("aria-expanded", String(lensPanelOpen));
      lensToggle.setAttribute(
        "aria-label",
        `Lens. Perspective: ${perspectiveLabel(globalPerspective)}. Detail: ${detailLabel(globalDetail)}.`
      );
    }

    function setLensPanelOpen(open, { returnFocus = false } = {}) {
      if (!lensToggle || !lensPanel) return;
      lensPanelOpen = open;
      lensPanel.hidden = !open;
      updateLensToggle();
      if (!open && returnFocus) {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => lensToggle.focus({ preventScroll: true }));
        });
      }
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
      updateProjectTabsForPerspective();
      transitionContent({ includeApproachHeading: true, includeDetailOnlyGroups: false });
      setButtonState(perspectiveButtons, perspective, "globalLens");
      requestAnimationFrame(updateMobileHeaderDivider);
      updateViewControlsToggle();
      updateContextToggles();
      updateLensToggle();
      window.dispatchEvent(new CustomEvent("kahntra-perspective-change", { detail: { perspective } }));
      if (announce) announcement.textContent = `Site perspective: ${perspectiveLabel(perspective)}.`;
    }

    function setGlobalDetail(detail, { announce = true } = {}) {
      if (!details.includes(detail)) return;
      globalDetail = detail;
      document.documentElement.dataset.detailMode = detail;
      storeValue(detailKey, detail);
      writePerspectiveToUrl();
      updateProjectDetailsForDetail();
      transitionContent();
      setButtonState(detailButtons, detail, "globalDetail");
      updateViewControlsToggle();
      updateContextToggles();
      updateLensToggle();
      window.dispatchEvent(new CustomEvent("kahntra-detail-change", { detail: { detail } }));
      if (announce) announcement.textContent = `Detail: ${detailLabel(detail)}.`;
    }

    function setGlobalOrder(order, { announce = true } = {}) {
      if (!orders.includes(order)) return;
      globalOrder = order;
      storeValue(orderKey, order);
      setButtonState(orderButtons, order, "globalOrder");
      updateLensToggle();
      window.dispatchEvent(new CustomEvent("kahntra-order-change", { detail: { order } }));
      if (announce) announcement.textContent = `View: ${orderLabel(order)}.`;

      try {
        const url = new URL(window.location.href);
        if (isTechnicalResumePath()) url.pathname = "/";
        if (order === "grouped") {
          url.searchParams.set("view", "grouped");
        } else {
          url.searchParams.delete("view");
        }
        if (url.href !== window.location.href) {
          if (url.pathname === window.location.pathname && window.kahntraSetPortfolioView) {
            history.pushState({}, "", url.href);
          } else {
            storeOrderRestoreState(order);
            window.location.assign(url.href);
            return;
          }
        }
        window.kahntraSetPortfolioView?.(order === "grouped" ? "grouped" : "sequence");
      } catch {
        // The control state still updates when URL rewriting is unavailable.
      }
    }

    function handleDocumentPointerDown(event) {
      if (lensPanelOpen && lensControl && !lensControl.contains(event.target)) {
        setLensPanelOpen(false, { returnFocus: true });
      }
      if (!controlsCollapsed && isCompactViewport() && !siteToolbar.contains(event.target)) {
        setControlsCollapsed(true);
      }
      unavailableLinks.forEach((notice) => {
        if (notice.open && !notice.contains(event.target)) notice.open = false;
      });
    }

    function handleDocumentKeydown(event) {
      if (event.key === "Escape" && lensPanelOpen) {
        event.preventDefault();
        setLensPanelOpen(false, { returnFocus: true });
        return;
      }
      if (event.key === "Escape" && !controlsCollapsed && isCompactViewport()) {
        event.preventDefault();
        setControlsCollapsed(true);
      }
    }

    function handleWordmarkClick(event) {
      event.preventDefault();
      setLensPanelOpen(false);
      window.scrollTo({
        top: 0,
        behavior: reduceMotionQuery.matches ? "auto" : "smooth",
      });
    }

    function setAboutTab(tabName) {
      if (!aboutTabs.length) return;

      aboutTabs.forEach((tab) => {
        const selected = tab.dataset.aboutTab === tabName;
        tab.setAttribute("aria-selected", String(selected));
      });
      document.querySelectorAll("[data-about-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.aboutPanel !== tabName;
      });
    }

    function closeAbout() {
      if (aboutDialog?.open) aboutDialog.close();
    }

    function openAbout(event) {
      if (!aboutDialog) return;
      aboutOpener = event.currentTarget;
      setAboutTab("kahntra");
      if (!aboutDialog.open) {
        aboutDialog.showModal();
        document.documentElement.dataset.aboutDialog = "open";
      }
      requestAnimationFrame(() => aboutTabs[0]?.focus());
    }

    function handleAboutTabKeydown(event) {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      const currentIndex = aboutTabs.indexOf(event.currentTarget);
      if (currentIndex === -1) return;

      event.preventDefault();
      const nextIndex = event.key === "Home"
        ? 0
        : event.key === "End"
          ? aboutTabs.length - 1
          : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + aboutTabs.length) % aboutTabs.length;
      const nextTab = aboutTabs[nextIndex];
      setAboutTab(nextTab.dataset.aboutTab);
      nextTab.focus();
    }

    perspectiveButtons.forEach((button) => {
      button.addEventListener("click", () => setGlobalPerspective(button.dataset.globalLens));
    });
    detailButtons.forEach((button) => {
      button.addEventListener("click", () => setGlobalDetail(button.dataset.globalDetail));
    });
    orderButtons.forEach((button) => {
      button.addEventListener("click", () => setGlobalOrder(button.dataset.globalOrder));
    });
    lensToggle?.addEventListener("click", () => {
      setLensPanelOpen(!lensPanelOpen);
    });
    wordmarkLink?.addEventListener("click", handleWordmarkClick);
    contextToggles.forEach((toggle) => {
      toggle.addEventListener("click", () => {
        setGlobalDetail(globalDetail === "verbose" ? "concise" : "verbose");
      });
    });
    viewControlsToggle.addEventListener("click", () => {
      setControlsCollapsed(!controlsCollapsed);
    });
    aboutOpenButtons.forEach((button) => {
      button.addEventListener("click", openAbout);
    });
    aboutCloseButton?.addEventListener("click", closeAbout);
    aboutTabs.forEach((tab) => {
      tab.addEventListener("click", () => setAboutTab(tab.dataset.aboutTab));
      tab.addEventListener("keydown", handleAboutTabKeydown);
    });
    // Keep all taps within the panel from reaching the backdrop handler. This
    // matters on mobile, where dialog click targets can be retargeted.
    aboutSurface?.addEventListener("click", (event) => event.stopPropagation());
    aboutDialog?.addEventListener("click", (event) => {
      if (event.target === aboutDialog) closeAbout();
    });
    aboutDialog?.addEventListener("close", () => {
      delete document.documentElement.dataset.aboutDialog;
      aboutOpener?.focus({ preventScroll: true });
      aboutOpener = null;
    });
    unavailableLinks.forEach((notice) => {
      notice.addEventListener("toggle", () => {
        window.clearTimeout(unavailableTimers.get(notice));
        if (notice.open) unavailableTimers.set(notice, window.setTimeout(() => { notice.open = false; }, 2000));
      });
    });
    document.addEventListener("pointerdown", handleDocumentPointerDown);
    document.addEventListener("keydown", handleDocumentKeydown);
    window.addEventListener("resize", updateMobileHeaderDivider);

    siteToolbar.hidden = false;
    initializeProjectTabs();
    initializeProjectBacklinks();
    updateAllContent();
    setButtonState(perspectiveButtons, globalPerspective, "globalLens");
    updateMobileHeaderDivider();
    setButtonState(detailButtons, globalDetail, "globalDetail");
    setButtonState(orderButtons, globalOrder, "globalOrder");
    document.documentElement.dataset.detailMode = globalDetail;
    writePerspectiveToUrl();
    updateContextToggles();
    updateLensToggle();
    setControlsCollapsed(controlsCollapsed, { persist: false });
    window.dispatchEvent(new CustomEvent("kahntra-perspective-change", { detail: { perspective: globalPerspective } }));
    window.dispatchEvent(new CustomEvent("kahntra-detail-change", { detail: { detail: globalDetail } }));
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
