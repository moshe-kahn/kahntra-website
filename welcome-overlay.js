(() => {
  const detailKey = "kahntra-site-detail-v1";
  const perspectiveKey = "kahntra-site-perspective-v1";
  const details = ["concise", "verbose"];
  const routePresets = {
    general: {
      perspective: "design-philosophy",
      detail: "concise",
      order: "curated",
      path: "/",
    },
    technical: {
      perspective: "technical",
      detail: "verbose",
      order: "grouped",
      path: "/tech",
    },
  };

  const initialize = () => {
    const announcement = document.querySelector("#perspective-announcement");
    const detailButtons = [...document.querySelectorAll("[data-global-detail]")];
    const contextToggles = [...document.querySelectorAll("[data-context-toggle]")];
    const emphasisSwitchButtons = [...document.querySelectorAll("[data-emphasis-switch]")];
    const wordmarkControl = document.querySelector("[data-wordmark-control]");
    const wordmarkTrigger = document.querySelector("[data-wordmark-trigger]");
    const wordmarkPopover = document.querySelector("[data-wordmark-popover]");
    const wordmarkLink = document.querySelector(".wordmark");
    const aboutDialog = document.querySelector("#about-dialog");
    const aboutSurface = aboutDialog?.querySelector(".about-dialog__surface");
    const aboutContent = aboutDialog?.querySelector(".about-dialog__content");
    const aboutOpenButtons = [...document.querySelectorAll("[data-about-open]")];
    const aboutCloseButton = document.querySelector("[data-about-close]");
    const projectTabGroups = [...document.querySelectorAll("[data-project-tabs]")];

    if (!announcement) return;

    let globalPerspective = readPerspective();
    let globalDetail = readInitialDetail(globalPerspective);
    let globalOrder = orderForPerspective(globalPerspective);
    let wordmarkPopoverOpen = false;
    let contentTransitionTimer = null;
    let contentTransitionVersion = 0;
    let aboutOpener = null;
    const contentFadeOutDuration = 220;
    const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    function isTechnicalPath() {
      return window.location.pathname.replace(/\/+$/, "") === "/tech";
    }

    function normalizePerspective(value) {
      if (value === "technical") return "technical";
      if (["general", "philosophy", "design-philosophy", "practical"].includes(value)) return "design-philosophy";
      return null;
    }

    function readPerspective() {
      if (isTechnicalPath()) return "technical";

      try {
        const params = new URLSearchParams(window.location.search);
        const urlPerspective = normalizePerspective(params.get("perspective"));
        if (urlPerspective) return urlPerspective;
      } catch {
        // URL state is optional when history APIs are unavailable.
      }

      return routePresets.general.perspective;
    }

    function normalizeDetail(value) {
      return details.includes(value) ? value : null;
    }

    function readInitialDetail(perspective) {
      try {
        const params = new URLSearchParams(window.location.search);
        const resolvedDetail = normalizeDetail(params.get("detail"));
        if (details.includes(resolvedDetail)) return resolvedDetail;
      } catch {
        // URL state is optional when history APIs are unavailable.
      }

      return perspective === "technical" ? routePresets.technical.detail : routePresets.general.detail;
    }

    function storeValue(key, value) {
      try {
        sessionStorage.setItem(key, value);
      } catch {
        // The page remains usable when storage is unavailable.
      }
    }

    function orderForPerspective(perspective) {
      return perspective === "technical" ? routePresets.technical.order : routePresets.general.order;
    }

    function visiblePerspective() {
      return globalPerspective === "technical" ? "technical" : "general";
    }

    function setButtonState(buttons, activeValue, dataKey) {
      buttons.forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset[dataKey] === activeValue));
      });
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

    function updateContent(container) {
      const perspective = visiblePerspective();
      const visibleElements = [...container.querySelectorAll("[data-perspective][data-detail]")].filter(
        (element) => element.dataset.perspective === perspective
      );

      visibleElements.forEach((element) => {
        element.hidden = true;
      });

      const selectedDetail = details.includes(globalDetail) &&
        visibleElements.some((element) => element.dataset.detail === globalDetail)
        ? globalDetail
        : routePresets.general.detail;

      visibleElements
        .filter((element) => element.dataset.detail === selectedDetail)
        .forEach((element) => {
          element.hidden = false;
        });

      [...container.querySelectorAll("[data-perspective][data-detail]")].forEach((element) => {
        if (element.dataset.perspective !== perspective) element.hidden = true;
      });
      container.querySelectorAll("[data-detail-content]").forEach((element) => {
        element.hidden = element.dataset.detailContent !== globalDetail;
      });
    }

    function updateApproachHeadings() {
      const perspective = visiblePerspective();
      document.querySelectorAll("[data-perspective-heading]").forEach((heading) => {
        heading.hidden = heading.dataset.perspectiveHeading !== perspective;
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

    function updateProjectDetailsForDetail() {
      projectTabGroups.forEach((group) => {
        setProjectTab(group, defaultProjectTab());
        setProjectDetailsExpanded(group, shouldAutoExpandProjectDetails());
      });
    }

    function setGlobalDetail(detail, { announce = true } = {}) {
      if (!details.includes(detail)) return;
      globalDetail = detail;
      document.documentElement.dataset.detailMode = detail;
      storeValue(detailKey, detail);
      updateProjectDetailsForDetail();
      transitionContent();
      setButtonState(detailButtons, detail, "globalDetail");
      updateContextToggles();
      window.dispatchEvent(new CustomEvent("kahntra-detail-change", { detail: { detail } }));
      if (announce) announcement.textContent = `Detail: ${detail === "verbose" ? "Verbose" : "Concise"}.`;
    }

    function setRouteForPerspective(perspective, { replace = false } = {}) {
      const path = perspective === "technical" ? routePresets.technical.path : routePresets.general.path;
      const url = new URL(window.location.href);
      url.pathname = path;
      url.search = "";
      url.hash = "";
      if (url.href === window.location.href) return;
      history[replace ? "replaceState" : "pushState"]({}, "", url.href);
    }

    function applyEmphasisPreset(target, { pushUrl = true, announce = true } = {}) {
      const preset = routePresets[target] || routePresets.general;
      globalPerspective = preset.perspective;
      globalDetail = preset.detail;
      globalOrder = preset.order;
      document.documentElement.dataset.detailMode = globalDetail;
      storeValue(perspectiveKey, globalPerspective);
      storeValue(detailKey, globalDetail);
      setButtonState(detailButtons, globalDetail, "globalDetail");
      updateContextToggles();
      updateProjectDetailsForDetail();
      transitionContent({ includeApproachHeading: true });
      window.kahntraSetPortfolioView?.(globalOrder === "grouped" ? "grouped" : "sequence");
      if (pushUrl) setRouteForPerspective(globalPerspective);
      window.dispatchEvent(new CustomEvent("kahntra-perspective-change", { detail: { perspective: globalPerspective } }));
      window.dispatchEvent(new CustomEvent("kahntra-detail-change", { detail: { detail: globalDetail } }));
      if (announce) announcement.textContent = target === "technical" ? "Technical emphasis." : "General view.";
    }

    function setWordmarkPopoverOpen(open, { returnFocus = false } = {}) {
      if (!wordmarkTrigger || !wordmarkPopover) return;
      wordmarkPopoverOpen = open;
      wordmarkPopover.hidden = !open;
      wordmarkTrigger.setAttribute("aria-expanded", String(open));
      wordmarkTrigger.setAttribute("aria-label", open ? "Close Kahntra brand information" : "Open Kahntra brand information");
      if (!open && returnFocus) {
        requestAnimationFrame(() => wordmarkTrigger.focus({ preventScroll: true }));
      }
    }

    function handleDocumentPointerDown(event) {
      if (wordmarkPopoverOpen && wordmarkControl && !wordmarkControl.contains(event.target)) {
        setWordmarkPopoverOpen(false, { returnFocus: true });
      }
    }

    function handleDocumentKeydown(event) {
      if (event.key === "Escape" && wordmarkPopoverOpen) {
        event.preventDefault();
        setWordmarkPopoverOpen(false, { returnFocus: true });
      }
    }

    function handleWordmarkClick(event) {
      event.preventDefault();
      setWordmarkPopoverOpen(!wordmarkPopoverOpen);
    }

    function handleWordmarkKeydown(event) {
      if (event.key !== " ") return;
      event.preventDefault();
      setWordmarkPopoverOpen(!wordmarkPopoverOpen);
    }

    function closeAbout() {
      if (aboutDialog?.open) aboutDialog.close();
    }

    function openAbout(event) {
      if (!aboutDialog) return;
      setWordmarkPopoverOpen(false);
      aboutOpener = event.currentTarget;
      const wasOpen = aboutDialog.open;
      if (!aboutDialog.open) {
        aboutDialog.showModal();
        document.documentElement.dataset.aboutDialog = "open";
      }
      requestAnimationFrame(() => {
        if (!wasOpen && aboutContent) aboutContent.scrollTop = 0;
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

    detailButtons.forEach((button) => {
      button.addEventListener("click", () => setGlobalDetail(button.dataset.globalDetail));
    });
    contextToggles.forEach((toggle) => {
      toggle.addEventListener("click", () => {
        setGlobalDetail(globalDetail === "verbose" ? "concise" : "verbose");
      });
    });
    emphasisSwitchButtons.forEach((button) => {
      button.addEventListener("click", () => {
        applyEmphasisPreset(button.dataset.emphasisSwitch === "technical" ? "technical" : "general");
      });
    });
    wordmarkLink?.addEventListener("click", handleWordmarkClick);
    wordmarkLink?.addEventListener("keydown", handleWordmarkKeydown);
    aboutOpenButtons.forEach((button) => {
      button.addEventListener("click", openAbout);
    });
    aboutCloseButton?.addEventListener("click", closeAbout);
    aboutSurface?.addEventListener("click", (event) => event.stopPropagation());
    aboutDialog?.addEventListener("click", (event) => {
      if (event.target === aboutDialog) closeAbout();
    });
    aboutDialog?.addEventListener("close", () => {
      delete document.documentElement.dataset.aboutDialog;
      aboutOpener?.focus({ preventScroll: true });
      aboutOpener = null;
    });
    document.addEventListener("pointerdown", handleDocumentPointerDown);
    document.addEventListener("keydown", handleDocumentKeydown);
    window.addEventListener("popstate", () => {
      applyEmphasisPreset(isTechnicalPath() ? "technical" : "general", { pushUrl: false, announce: false });
    });

    initializeProjectTabs();
    initializeProjectBacklinks();
    updateAllContent();
    setButtonState(detailButtons, globalDetail, "globalDetail");
    updateContextToggles();
    document.documentElement.dataset.detailMode = globalDetail;
    window.kahntraSetPortfolioView?.(globalOrder === "grouped" ? "grouped" : "sequence");
    window.dispatchEvent(new CustomEvent("kahntra-perspective-change", { detail: { perspective: globalPerspective } }));
    window.dispatchEvent(new CustomEvent("kahntra-detail-change", { detail: { detail: globalDetail } }));
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
