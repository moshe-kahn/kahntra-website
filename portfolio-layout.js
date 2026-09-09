(() => {
  "use strict";

  const groupedView = "grouped";
  const orderRestoreKey = "kahntra-order-restore-v1";
  const sequence = [
    "momomovies",
    "momentum-tasks",
    "music-for-this-moment",
    "pathwise",
    "listenlab",
    "meal-match",
    "momo-editions",
    "momentum-management",
    "banner-picker",
  ];

  const groupedSequence = [
    "momomovies",
    "listenlab",
    "momentum-management",
    "meal-match",
    "pathwise",
    "momentum-tasks",
    "music-for-this-moment",
    "momo-editions",
    "banner-picker",
  ];

  const syncDirectory = (order) => {
    const directory = document.querySelector("[data-moments-directory]");
    if (!directory) return;

    const entries = new Map(
      Array.from(directory.querySelectorAll("[data-directory-item]")).map((entry) => [
        entry.getAttribute("data-directory-item"),
        entry,
      ]),
    );

    order.forEach((id) => {
      const entry = entries.get(id);
      if (entry) directory.append(entry);
    });
  };

  const getLocatorGap = (locator) => {
    const styles = getComputedStyle(locator);
    const columnGap = Number.parseFloat(styles.columnGap);
    if (Number.isFinite(columnGap)) return columnGap;

    const gap = Number.parseFloat(styles.gap);
    return Number.isFinite(gap) ? gap : 0;
  };

  const getMinimumConnectorWidth = () => {
    try {
      return window.matchMedia("(max-width: 760px)").matches ? 32 : 44;
    } catch {
      return 44;
    }
  };

  const updateItemLocator = (locator) => {
    const code = locator.querySelector(".item-locator__code");
    const descriptor = locator.querySelector(".item-locator__right, .item-locator__descriptor");
    if (!code || !descriptor) return;

    locator.classList.remove("item-locator--stacked");
    const gap = getLocatorGap(locator);
    const requiredWidth = code.scrollWidth + descriptor.scrollWidth + getMinimumConnectorWidth() + gap * 2;
    locator.classList.toggle("item-locator--stacked", requiredWidth > locator.clientWidth);
  };

  const watchItemLocators = () => {
    const locators = Array.from(document.querySelectorAll(".item-locator"));
    if (!locators.length) return;

    locators.forEach(updateItemLocator);

    if (!("ResizeObserver" in window)) {
      window.addEventListener("resize", () => locators.forEach(updateItemLocator));
      return;
    }

    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => updateItemLocator(entry.target));
    });
    locators.forEach((locator) => observer.observe(locator));
  };

  const alignFragmentTarget = () => {
    if (!window.location.hash) return;

    const target = document.getElementById(window.location.hash.slice(1));
    if (!target) return;

    requestAnimationFrame(() => {
      target.scrollIntoView({ block: "start" });
    });
  };

  const restoreOrderPosition = (view) => {
    let payload = null;

    try {
      payload = JSON.parse(sessionStorage.getItem(orderRestoreKey) || "null");
      sessionStorage.removeItem(orderRestoreKey);
    } catch {
      return;
    }

    if (!payload || payload.targetView !== view) return;

    if (!Number.isFinite(payload.scrollY)) return;

    const top = Math.max(0, payload.scrollY);
    const restore = () => window.scrollTo({ top, behavior: "auto" });
    restore();
    requestAnimationFrame(() => {
      restore();
      requestAnimationFrame(restore);
    });
    window.addEventListener("load", restore, { once: true });
  };

  const buildBannerPicker = (locator, demo) => {
    const bannerPicker = document.createElement("div");
    bannerPicker.className = "portfolio-item portfolio-sequence__banner-picker";
    bannerPicker.dataset.portfolioItem = "banner-picker";
    bannerPicker.append(locator, demo);
    return bannerPicker;
  };

  const insertBeforeStable = (parent, node, nextSibling) => {
    if (!parent || !node) return;
    parent.insertBefore(node, nextSibling?.parentNode === parent ? nextSibling : null);
  };

  const currentView = () => {
    try {
      if (window.location.pathname.replace(/\/+$/, "") === "/tech") return groupedView;
      return new URLSearchParams(window.location.search).get("view") === groupedView ? groupedView : "sequence";
    } catch {
      return "sequence";
    }
  };

  const products = document.querySelector("#products");
  const groups = products?.querySelector(".product-groups");
  const showcase = document.querySelector(".showcase");
  const sectionHeading = products?.querySelector(".section-heading");
  const groupsPlaceholder = document.createComment("product-groups-placeholder");
  const showcasePlaceholder = document.createComment("showcase-placeholder");
  const originalItemPositions = new Map();

  document.querySelectorAll("[data-portfolio-item-shell]").forEach((item) => {
    originalItemPositions.set(item, {
      parent: item.parentNode,
      nextSibling: item.nextSibling,
    });
  });

  if (groups) groups.before(groupsPlaceholder);
  if (showcase) showcase.before(showcasePlaceholder);

  let sequenceContainer = null;

  const restoreGroupedShells = () => {
    originalItemPositions.forEach(({ parent, nextSibling }, item) => {
      insertBeforeStable(parent, item, nextSibling);
    });
  };

  const showGroupedContainers = () => {
    if (groups && !groups.isConnected) groupsPlaceholder.replaceWith(groups);
    if (showcase && !showcase.isConnected) showcasePlaceholder.replaceWith(showcase);
  };

  const hideGroupedContainers = () => {
    if (groups?.isConnected) groups.replaceWith(groupsPlaceholder);
    if (showcase?.isConnected) showcase.replaceWith(showcasePlaceholder);
  };

  const ensureSequenceContainer = () => {
    if (!sequenceContainer) {
      sequenceContainer = document.createElement("div");
      sequenceContainer.className = "portfolio-sequence";
      sequenceContainer.dataset.portfolioSequence = "true";
    }

    if (!sequenceContainer.isConnected) sectionHeading?.after(sequenceContainer);
    return sequenceContainer;
  };

  const visibleLocator = () => document.querySelector("[data-tech-demo-locator]");
  const visibleDemo = () => document.querySelector("[data-tech-demo]");

  const updateVisibleItemLocators = () => {
    document.querySelectorAll(".item-locator").forEach(updateItemLocator);
  };

  const applySequence = () => {
    const locator = visibleLocator();
    const demo = visibleDemo();
    const items = {
      momomovies: document.querySelector('[data-portfolio-item-shell="momomovies"]'),
      "momentum-tasks": document.querySelector('[data-portfolio-item-shell="momentum-tasks"]'),
      "music-for-this-moment": document.querySelector('[data-portfolio-item-shell="music-for-this-moment"]'),
      pathwise: document.querySelector('[data-portfolio-item-shell="pathwise"]'),
      listenlab: document.querySelector('[data-portfolio-item-shell="listenlab"]'),
      "meal-match": document.querySelector('[data-portfolio-item-shell="meal-match"]'),
      "momo-editions": document.querySelector('[data-portfolio-item-shell="momo-editions"]'),
      "momentum-management": document.querySelector('[data-portfolio-item-shell="momentum-management"]'),
    };

    if (!products || !groups || !showcase || !sectionHeading || !locator || !demo || sequence.slice(0, -1).some((id) => !items[id])) return;
    syncDirectory(sequence);

    const container = ensureSequenceContainer();
    container.replaceChildren();

    sequence.slice(0, -1).forEach((id) => {
      const item = items[id];
      item.dataset.portfolioItem = id;
      container.append(item);
    });

    container.append(buildBannerPicker(locator, demo));

    hideGroupedContainers();
    products.dataset.portfolioLayout = "sequence";
  };

  const applyGrouped = () => {
    const locator = visibleLocator();
    const demo = visibleDemo();
    const items = document.querySelectorAll("[data-portfolio-item-shell]");

    if (!products || !groups || !showcase || !locator || !demo) return;
    syncDirectory(groupedSequence);
    showGroupedContainers();
    restoreGroupedShells();

    items.forEach((item) => {
      const id = item.getAttribute("data-portfolio-item-shell");
      if (id) item.dataset.portfolioItem = id;
    });

    showcase.querySelectorAll(".portfolio-sequence__banner-picker").forEach((item) => item.remove());
    showcase.append(buildBannerPicker(locator, demo));
    sequenceContainer?.remove();
    products.dataset.portfolioLayout = "grouped";
  };

  const setPortfolioView = (view) => {
    const resolvedView = view === groupedView ? groupedView : "sequence";
    document.documentElement.dataset.portfolioLayout = resolvedView;
    if (resolvedView === groupedView) {
      applyGrouped();
    } else {
      applySequence();
    }
    updateVisibleItemLocators();
    return resolvedView;
  };

  const view = setPortfolioView(currentView());
  window.kahntraSetPortfolioView = setPortfolioView;
  watchItemLocators();
  alignFragmentTarget();
  restoreOrderPosition(view);

  window.addEventListener("popstate", () => {
    setPortfolioView(currentView());
  });
})();
