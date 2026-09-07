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

  const readStickyHeaderHeight = () => {
    const value = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sticky-header-height"));
    return Number.isFinite(value) ? value : 0;
  };

  const scrollToMomentsDirectory = () => {
    const directory = document.querySelector("[data-moments-directory]");
    if (!directory) return;

    const stickyTop = readStickyHeaderHeight();
    const targetTop = window.scrollY + directory.getBoundingClientRect().top - stickyTop - 12;
    window.scrollTo({ top: Math.max(0, targetTop), behavior: "auto" });
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

    requestAnimationFrame(() => {
      if (payload.restoreTarget === "moments-directory") scrollToMomentsDirectory();
    });
  };

  const buildBannerPicker = (locator, demo) => {
    const bannerPicker = document.createElement("div");
    bannerPicker.className = "portfolio-item portfolio-sequence__banner-picker";
    bannerPicker.dataset.portfolioItem = "banner-picker";
    bannerPicker.append(locator, demo);
    return bannerPicker;
  };

  const currentView = () => {
    try {
      if (window.location.pathname.replace(/\/+$/, "") === "/tech") return groupedView;
      return new URLSearchParams(window.location.search).get("view") === groupedView ? groupedView : "sequence";
    } catch {
      return "sequence";
    }
  };

  const applySequence = () => {
    const products = document.querySelector("#products");
    const groups = products?.querySelector(".product-groups");
    const showcase = document.querySelector(".showcase");
    const locator = products?.querySelector("[data-tech-demo-locator]");
    const demo = products?.querySelector("[data-tech-demo]");
    const items = {
      momomovies: products?.querySelector('[data-portfolio-item-shell="momomovies"]'),
      "momentum-tasks": products?.querySelector('[data-portfolio-item-shell="momentum-tasks"]'),
      "music-for-this-moment": showcase?.querySelector('[data-portfolio-item-shell="music-for-this-moment"]'),
      pathwise: products?.querySelector('[data-portfolio-item-shell="pathwise"]'),
      listenlab: products?.querySelector('[data-portfolio-item-shell="listenlab"]'),
      "meal-match": products?.querySelector('[data-portfolio-item-shell="meal-match"]'),
      "momo-editions": showcase?.querySelector('[data-portfolio-item-shell="momo-editions"]'),
      "momentum-management": products?.querySelector('[data-portfolio-item-shell="momentum-management"]'),
    };

    if (!products || !groups || !showcase || !locator || !demo || sequence.slice(0, -1).some((id) => !items[id])) return;
    syncDirectory(sequence);

    const container = document.createElement("div");
    container.className = "portfolio-sequence";
    container.dataset.portfolioSequence = "true";

    sequence.slice(0, -1).forEach((id) => {
      const item = items[id];
      item.dataset.portfolioItem = id;
      container.append(item);
    });

    container.append(buildBannerPicker(locator, demo));

    products.querySelector(".section-heading")?.after(container);
    groups.remove();
    showcase.remove();
    products.dataset.portfolioLayout = "sequence";
  };

  const applyGrouped = () => {
    const products = document.querySelector("#products");
    const showcase = document.querySelector(".showcase");
    const locator = products?.querySelector("[data-tech-demo-locator]");
    const demo = products?.querySelector("[data-tech-demo]");
    const items = document.querySelectorAll("[data-portfolio-item-shell]");

    if (!products || !showcase || !locator || !demo) return;
    syncDirectory(groupedSequence);

    items.forEach((item) => {
      const id = item.getAttribute("data-portfolio-item-shell");
      if (id) item.dataset.portfolioItem = id;
    });

    showcase.append(buildBannerPicker(locator, demo));
    products.dataset.portfolioLayout = "grouped";
  };

  const view = currentView();
  document.documentElement.dataset.portfolioLayout = view;
  if (view === groupedView) {
    applyGrouped();
  } else {
    applySequence();
  }
  watchItemLocators();
  alignFragmentTarget();
  restoreOrderPosition(view);

  window.addEventListener("popstate", () => {
    if (currentView() !== view) window.location.reload();
  });
})();
