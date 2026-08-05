(() => {
  const dismissedKey = "kahntra-welcome-dismissed";

  const initialize = () => {
    const overlay = document.querySelector("#welcome-overlay");
    const siteShell = document.querySelector(".site-shell");
    const closeButton = overlay?.querySelector("[data-welcome-close]");
    const choiceButtons = overlay?.querySelectorAll("[data-welcome-target]");

    if (!overlay || !siteShell || !closeButton || !choiceButtons?.length) return;

    try {
      if (sessionStorage.getItem(dismissedKey)) return;
    } catch {
      // If storage is unavailable, show the overlay for this page view only.
    }

    let previousFocus = document.activeElement;
    let fallbackFocusables = [];

    const focusableSelector = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])"
    ].join(",");

    const setBackgroundInert = (isInert) => {
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
    };

    const dismiss = ({ restoreFocus = true } = {}) => {
      try {
        sessionStorage.setItem(dismissedKey, "true");
      } catch {
        // Continue gracefully when session storage is unavailable.
      }

      overlay.classList.remove("is-open");
      document.body.classList.remove("welcome-overlay-open");
      setBackgroundInert(false);
      overlay.hidden = true;
      document.removeEventListener("keydown", handleKeydown);

      if (restoreFocus) {
        const target = previousFocus instanceof HTMLElement && previousFocus !== document.body && previousFocus.isConnected
          ? previousFocus
          : document.querySelector(".wordmark");
        target?.focus({ preventScroll: true });
      }
    };

    const navigateTo = (selector) => {
      const target = document.querySelector(selector);
      dismiss({ restoreFocus: false });
      if (!target) return;

      requestAnimationFrame(() => {
        target.focus?.({ preventScroll: true });
        target.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "start"
        });
      });
    };

    const handleKeydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = [...overlay.querySelectorAll(focusableSelector)]
        .filter((element) => !element.hasAttribute("hidden"));
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
    };

    closeButton.addEventListener("click", () => dismiss());
    choiceButtons.forEach((button) => {
      button.addEventListener("click", () => navigateTo(button.dataset.welcomeTarget));
    });

    overlay.hidden = false;
    previousFocus = document.activeElement;
    setBackgroundInert(true);
    document.body.classList.add("welcome-overlay-open");
    document.addEventListener("keydown", handleKeydown);

    requestAnimationFrame(() => {
      overlay.classList.add("is-open");
      choiceButtons[0].focus();
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
