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
      document.documentElement.dataset.visiblePerspective = visiblePerspective();
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
      document.documentElement.dataset.visiblePerspective = visiblePerspective();
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
      document.documentElement.dataset.visiblePerspective = visiblePerspective();
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

    function initializeDecisionField() {
      const field = document.querySelector("[data-decision-field]");
      const slider = field?.querySelector("[data-complexity-slider]");
      const softSymmetryToggle = field?.querySelector("[data-soft-symmetry]");
      const hardSymmetryToggle = field?.querySelector("[data-hard-symmetry]");
      const advanceButton = field?.querySelector("[data-demo-advance]");
      const backButton = field?.querySelector("[data-demo-back]");
      const caption = field?.querySelector("[data-demo-caption]");
      const focusCount = field?.querySelector("[data-focus-count]");
      const focusCountLabel = field?.querySelector("[data-focus-count-label]");
      const eligibleCount = field?.querySelector("[data-eligible-count]");
      const referenceShape = field?.querySelector("[data-reference-shape]");
      const averageShape = field?.querySelector("[data-average-shape]");
      const referenceMini = field?.querySelector("[data-reference-mini]");
      const averageMini = field?.querySelector("[data-average-mini]");
      const svg = field?.querySelector("[data-shape-space]");
      const candidateLayer = field?.querySelector("[data-shape-candidates]");
      if (!field || !svg || !slider || !softSymmetryToggle || !hardSymmetryToggle || !advanceButton || !backButton || !caption || !focusCount || !focusCountLabel || !eligibleCount || !referenceShape || !averageShape || !referenceMini || !averageMini || !candidateLayer) return;

      const viewBox = svg.viewBox.baseVal;
      const fieldBounds = { left: 32, right: 328, top: 34, bottom: 326 };
      const maxHarmonic = 10;
      const sampleCount = 120;
      const frequencyBins = [1, 2, 3, 4, 5, 7, 9, 10];
      const richnessBins = [0.04, 0.22, 0.4, 0.58, 0.76, 0.92];
      const variantsPerBin = 8;
      const focusThreshold = 0.66;
      const relevanceSigma = 0.1;
      const hardSymmetryThreshold = 0.96;
      const mapMaxDisplacement = 18;
      let frame = null;
      let committedSelection = { type: "complexity", complexity: Number(slider.value) / 100 };
      let phase = "idle";
      let layoutMode = "explore";
      let pointerPosition = null;
      let selectedCandidateId = null;
      let sliderAnimationFrame = null;
      let displayedFocusCount = 0;
      let displayedEligibleCount = 0;
      let averageAnimationFrame = null;
      let currentAveragePoints = null;
      let currentAverageTargetPath = "";

      const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
      const map = (value, inMin, inMax, outMin, outMax) => outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
      const seeded = (seed) => {
        const value = Math.sin(seed * 12.9898) * 43758.5453;
        return value - Math.floor(value);
      };

      const phaseCaptions = {
        idle: "What would help you choose?",
        structure: "What would help you choose?",
        summary: "What would help you choose?",
        soft: "What would help you choose?",
        hard: "What would help you choose?",
        final: "What would help you choose?",
      };

      field.dataset.phase = phase;
      field.dataset.layout = layoutMode;

      function xForFrequency(frequencyNorm) {
        return map(frequencyNorm, 0, 1, fieldBounds.left, fieldBounds.right);
      }

      function yForRichness(richness) {
        return map(richness, 1, 0, fieldBounds.top, fieldBounds.bottom);
      }

      function scatterPositions(count) {
        const positions = [];
        const minDistance = 45;
        const left = fieldBounds.left + 1;
        const right = fieldBounds.right - 1;
        const top = fieldBounds.top + 1;
        const bottom = fieldBounds.bottom - 1;

        for (let index = 0; index < count; index += 1) {
          let best = null;
          for (let attempt = 0; attempt < 220; attempt += 1) {
            const seed = index * 211 + attempt * 37 + 19;
            const candidate = {
              x: map(seeded(seed), 0, 1, left, right),
              y: map(seeded(seed + 13), 0, 1, top, bottom),
            };
            const nearest = positions.length
              ? Math.min(...positions.map((position) => Math.hypot(position.x - candidate.x, position.y - candidate.y)))
              : minDistance;
            const edgeBalance = Math.min(
              candidate.x - left,
              right - candidate.x,
              candidate.y - top,
              bottom - candidate.y
            ) * 0.05;
            const centerDistance = Math.hypot(
              candidate.x - (left + right) / 2,
              candidate.y - (top + bottom) / 2
            );
            const score = nearest + edgeBalance + centerDistance * 0.015;
            if (!best || score > best.score) best = { ...candidate, score };
            if (nearest >= minDistance) break;
          }
          positions.push({ x: best.x, y: best.y });
        }

        for (let iteration = 0; iteration < 120; iteration += 1) {
          for (let firstIndex = 0; firstIndex < positions.length; firstIndex += 1) {
            for (let secondIndex = firstIndex + 1; secondIndex < positions.length; secondIndex += 1) {
              const first = positions[firstIndex];
              const second = positions[secondIndex];
              let dx = second.x - first.x;
              let dy = second.y - first.y;
              let distance = Math.hypot(dx, dy);
              if (distance >= minDistance) continue;
              if (distance < 0.01) {
                dx = seeded(firstIndex * 17 + secondIndex * 31) - 0.5;
                dy = seeded(firstIndex * 23 + secondIndex * 29) - 0.5;
                distance = Math.hypot(dx, dy) || 1;
              }
              const push = (minDistance - distance) * 0.28;
              const nx = dx / distance;
              const ny = dy / distance;
              first.x = clamp(first.x - nx * push, left, right);
              first.y = clamp(first.y - ny * push, top, bottom);
              second.x = clamp(second.x + nx * push, left, right);
              second.y = clamp(second.y + ny * push, top, bottom);
            }
          }
        }

        return positions;
      }

      const displayedRichnessSlots = new Set([0, 2, 3, 5]);
      const displayedCandidateCount = frequencyBins.length * displayedRichnessSlots.size;
      const scatterLayout = scatterPositions(displayedCandidateCount);

      function buildHarmonics(dominantFrequency, richnessTarget, seed, variant) {
        const harmonics = Array.from({ length: maxHarmonic }, (_, index) => ({
          k: index + 1,
          amplitude: 0,
          phase: seeded(seed + index * 13) * Math.PI * 2,
        }));
        const dominant = harmonics[dominantFrequency - 1];
        const familyBias = seeded(seed + variant * 61);
        dominant.amplitude = map(dominantFrequency, 1, maxHarmonic, 0.052, 0.21) + richnessTarget * 0.038;

        harmonics.forEach((harmonic) => {
          if (harmonic.k === dominantFrequency) return;
          const distance = Math.abs(harmonic.k - dominantFrequency);
          const nearWeight = Math.max(0, 1 - distance / maxHarmonic);
          const sparseGate = seeded(seed + harmonic.k * 29 + variant * 11);
          const shouldCarry = sparseGate < 0.12 + richnessTarget * 0.62 + nearWeight * 0.12;
          if (!shouldCarry) return;
          const relative = map(richnessTarget, 0, 1, 0.04, 0.76) *
            (0.5 + seeded(seed + harmonic.k * 7 + variant * 17) * 0.68);
          harmonic.amplitude = dominant.amplitude * relative;
        });

        if (richnessTarget > 0.72) {
          const supportSets = [
            [2, 4, 6, 8],
            [1, 3, 5, 7, 9],
            [2, 5, 8, 10],
            [1, 4, 6, 10],
          ];
          supportSets[Math.floor(familyBias * supportSets.length)].forEach((k, index) => {
            if (k === dominantFrequency) return;
            const harmonic = harmonics[k - 1];
            harmonic.amplitude = Math.max(
              harmonic.amplitude,
              dominant.amplitude * (0.28 + richnessTarget * 0.33) * (0.72 + seeded(seed + index * 31 + variant * 19) * 0.42)
            );
          });
        }

        return harmonics;
      }

      function dominantFrequencyFor(harmonics) {
        return harmonics.reduce((strongest, harmonic) => {
          return harmonic.amplitude > strongest.amplitude ? harmonic : strongest;
        }, harmonics[0]).k;
      }

      function spectralFrequencyFor(harmonics) {
        const energies = harmonics.map((harmonic) => harmonic.amplitude * harmonic.amplitude);
        const total = energies.reduce((sum, energy) => sum + energy, 0);
        if (total <= 0) return { raw: 1, normalized: 0 };
        const raw = harmonics.reduce((sum, harmonic, index) => {
          return sum + harmonic.k * energies[index];
        }, 0) / total;
        return {
          raw,
          normalized: clamp((raw - 1) / (maxHarmonic - 1), 0, 1),
        };
      }

      function spectralRichnessFor(harmonics) {
        const energies = harmonics.map((harmonic) => harmonic.amplitude * harmonic.amplitude);
        const total = energies.reduce((sum, energy) => sum + energy, 0);
        if (total <= 0) return 0;
        const entropy = energies.reduce((sum, energy) => {
          if (energy <= 0) return sum;
          const share = energy / total;
          return sum - share * Math.log(share);
        }, 0);
        return clamp(entropy / Math.log(harmonics.length), 0, 1);
      }

      function canonicalCoefficientsFor(harmonics) {
        const dominant = harmonics.reduce((strongest, harmonic) => {
          return harmonic.amplitude > strongest.amplitude ? harmonic : strongest;
        }, harmonics[0]);
        const rotation = -dominant.phase / dominant.k;
        const rotated = harmonics.map((harmonic) => ({
          k: harmonic.k,
          amplitude: harmonic.amplitude,
          phase: harmonic.phase + harmonic.k * rotation,
        }));
        const secondary = rotated
          .filter((harmonic) => harmonic.k !== dominant.k && harmonic.amplitude > 0)
          .sort((a, b) => b.amplitude - a.amplitude)[0];
        const reflect = secondary ? Math.sin(secondary.phase) < 0 : false;
        return rotated.map((harmonic) => {
          const phase = reflect ? -harmonic.phase : harmonic.phase;
          return {
            k: harmonic.k,
            cos: harmonic.amplitude * Math.cos(phase),
            sin: harmonic.amplitude * Math.sin(phase),
          };
        });
      }

      function sampleFromCoefficients(coefficients, baseRadius = 16.5) {
        const points = [];
        for (let index = 0; index < sampleCount; index += 1) {
          const theta = (Math.PI * 2 * index) / sampleCount;
          const wave = coefficients.reduce((sum, coefficient) => {
            return sum + coefficient.cos * Math.cos(coefficient.k * theta) - coefficient.sin * Math.sin(coefficient.k * theta);
          }, 0);
          const radius = baseRadius * clamp(1 + wave, 0.46, 1.56);
          points.push({
            x: Math.cos(theta) * radius,
            y: Math.sin(theta) * radius,
          });
        }
        return points;
      }

      function sampleShape(harmonics, seed, variant) {
        const baseRadius = 15.5;
        const stretch = map(seeded(seed + variant * 31), 0, 1, 0.82, 1.2);
        const squeeze = map(seeded(seed + variant * 43), 0, 1, 0.86, 1.16);
        const points = [];
        for (let index = 0; index < sampleCount; index += 1) {
          const theta = (Math.PI * 2 * index) / sampleCount;
          const wave = harmonics.reduce((sum, harmonic) => {
            return sum + harmonic.amplitude * Math.cos(harmonic.k * theta + harmonic.phase);
          }, 0);
          const radius = baseRadius * clamp(1 + wave, 0.46, 1.56);
          points.push({
            x: Math.cos(theta) * radius * stretch,
            y: Math.sin(theta) * radius * squeeze,
          });
        }

        const center = points.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
        center.x /= points.length;
        center.y /= points.length;
        const rotation = (seeded(seed + variant * 23 + 97) - 0.5) * 0.46;
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        return points.map((point) => {
          const x = point.x - center.x;
          const y = point.y - center.y;
          return {
            x: x * cos - y * sin,
            y: x * sin + y * cos,
          };
        });
      }

      function pointsToPath(points, x, y) {
        return points
          .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
          .join(" ") + " Z";
      }

      function symmetryFor(points) {
        const radius = Math.max(...points.map((point) => Math.hypot(point.x, point.y)));
        const verticalError = points.reduce((sum, point) => {
          const reflected = { x: -point.x, y: point.y };
          const nearest = Math.min(...points.map((candidate) => Math.hypot(candidate.x - reflected.x, candidate.y - reflected.y)));
          return sum + nearest;
        }, 0) / points.length;
        const horizontalError = points.reduce((sum, point) => {
          const reflected = { x: point.x, y: -point.y };
          const nearest = Math.min(...points.map((candidate) => Math.hypot(candidate.x - reflected.x, candidate.y - reflected.y)));
          return sum + nearest;
        }, 0) / points.length;
        const bestError = Math.min(verticalError, horizontalError);
        return clamp(1 - bestError / Math.max(radius * 0.78, 1), 0, 1);
      }

      function contourComplexityFor(points) {
        const turns = points.map((point, index) => {
          const previous = points[(index - 1 + points.length) % points.length];
          const next = points[(index + 1) % points.length];
          const a = Math.atan2(point.y - previous.y, point.x - previous.x);
          const b = Math.atan2(next.y - point.y, next.x - point.x);
          let turn = b - a;
          while (turn > Math.PI) turn -= Math.PI * 2;
          while (turn < -Math.PI) turn += Math.PI * 2;
          return Math.abs(turn);
        });
        const average = turns.reduce((sum, turn) => sum + turn, 0) / turns.length;
        const variation = Math.sqrt(turns.reduce((sum, turn) => sum + Math.pow(turn - average, 2), 0) / turns.length);
        return clamp((variation - 0.015) / 0.16, 0, 1);
      }

      function radialVarianceFor(points) {
        const radii = points.map((point) => Math.hypot(point.x, point.y));
        const average = radii.reduce((sum, radius) => sum + radius, 0) / radii.length;
        const deviation = Math.sqrt(radii.reduce((sum, radius) => sum + Math.pow(radius - average, 2), 0) / radii.length);
        return clamp(deviation / Math.max(average * 0.35, 1), 0, 1);
      }

      function aspectRatioFor(points) {
        const xs = points.map((point) => point.x);
        const ys = points.map((point) => point.y);
        const width = Math.max(...xs) - Math.min(...xs);
        const height = Math.max(...ys) - Math.min(...ys);
        return clamp(Math.max(width, height) / Math.max(Math.min(width, height), 1), 1, 1.8);
      }

      function curvatureExtremaFor(points) {
        const radii = points.map((point) => Math.hypot(point.x, point.y));
        let extrema = 0;
        radii.forEach((radius, index) => {
          const previous = radii[(index - 1 + radii.length) % radii.length];
          const next = radii[(index + 1) % radii.length];
          if ((radius > previous && radius > next) || (radius < previous && radius < next)) extrema += 1;
        });
        return clamp(extrema / 42, 0, 1);
      }

      function complexityFor(frequencyNorm, richness, contourComplexity) {
        const base = frequencyNorm * 0.5 + richness * 0.35 + frequencyNorm * richness * 0.15;
        return clamp(base * 0.9 + contourComplexity * 0.1, 0, 1);
      }

      function pointerFromEvent(event) {
        const rect = svg.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        const x = ((event.clientX - rect.left) / rect.width) * viewBox.width;
        const y = ((event.clientY - rect.top) / rect.height) * viewBox.height;
        return { x, y };
      }

      function selectionFromPointer(event) {
        const point = pointerFromEvent(event);
        if (!point) return committedSelection;
        const frequencyNorm = clamp((point.x - fieldBounds.left) / (fieldBounds.right - fieldBounds.left), 0, 1);
        const richness = clamp(1 - (point.y - fieldBounds.top) / (fieldBounds.bottom - fieldBounds.top), 0, 1);
        return {
          type: "point",
          frequencyNorm,
          richness,
          complexity: complexityFor(frequencyNorm, richness, 0),
        };
      }

      function candidateFromSpec(dominantFrequency, richnessTarget, seed, variant) {
        const harmonics = buildHarmonics(dominantFrequency, richnessTarget, seed, variant);
        const resolvedDominant = dominantFrequencyFor(harmonics);
        const spectralFrequency = spectralFrequencyFor(harmonics);
        const frequencyNorm = spectralFrequency.normalized;
        const richness = spectralRichnessFor(harmonics);
        const points = sampleShape(harmonics, seed, variant);
        const contourComplexity = contourComplexityFor(points);
        const complexityScore = complexityFor(frequencyNorm, richness, contourComplexity);
        const symmetryScore = symmetryFor(points);
        const radialVariance = radialVarianceFor(points);
        const aspectRatio = aspectRatioFor(points);
        const curvatureExtrema = curvatureExtremaFor(points);
        return {
          dominantFrequency: resolvedDominant,
          spectralFrequencyRaw: spectralFrequency.raw,
          frequencyNorm,
          richness,
          contourComplexity,
          complexityScore,
          symmetryScore,
          radialVariance,
          aspectRatio,
          curvatureExtrema,
          points,
          harmonics,
          canonicalCoefficients: canonicalCoefficientsFor(harmonics),
          seed,
          variant,
        };
      }

      function descriptorDistance(a, b) {
        return Math.hypot(
          (a.symmetryScore - b.symmetryScore) / 0.32,
          (a.contourComplexity - b.contourComplexity) / 0.34,
          (a.radialVariance - b.radialVariance) / 0.32,
          (a.aspectRatio - b.aspectRatio) / 0.44,
          (a.curvatureExtrema - b.curvatureExtrema) / 0.3
        );
      }

      const generatedCandidates = [];
      frequencyBins.forEach((dominantFrequency, frequencyIndex) => {
        richnessBins.forEach((richnessTarget, richnessIndex) => {
          const pool = [];
          for (let variant = 0; variant < variantsPerBin; variant += 1) {
            const seed = 101 + frequencyIndex * 149 + richnessIndex * 37 + variant * 11;
            pool.push(candidateFromSpec(dominantFrequency, richnessTarget, seed, variant));
          }
          const targetFrequencyNorm = (dominantFrequency - 1) / (maxHarmonic - 1);
          const chosen = pool.reduce((best, candidate) => {
            const targetFit = Math.hypot((candidate.frequencyNorm - targetFrequencyNorm) / 0.24, (candidate.richness - richnessTarget) / 0.28);
            const diversity = generatedCandidates.length
              ? Math.min(...generatedCandidates.map((existing) => descriptorDistance(candidate, existing)))
              : 1.8;
            const score = diversity * 0.58 - targetFit * 0.42 + candidate.radialVariance * 0.16 + candidate.curvatureExtrema * 0.12;
            return score > best.score ? { candidate, score } : best;
          }, { candidate: pool[0], score: -Infinity }).candidate;
          generatedCandidates.push(chosen);
        });
      });

      const displayedCandidates = generatedCandidates.filter((_, index) => displayedRichnessSlots.has(index % richnessBins.length));
      const candidates = displayedCandidates.map((candidate, index) => {
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const mapPosition = {
          x: xForFrequency(candidate.frequencyNorm),
          y: yForRichness(candidate.richness),
        };
        const explore = scatterLayout[index];
        const resolved = {
          ...candidate,
          id: index + 1,
          mapX: clamp(mapPosition.x, fieldBounds.left + 8, fieldBounds.right - 8),
          mapY: clamp(mapPosition.y, fieldBounds.top + 8, fieldBounds.bottom - 8),
          exploreX: explore.x,
          exploreY: explore.y,
          group,
          ring,
          path,
        };

        group.setAttribute("class", "decision-field__candidate");
        group.dataset.candidateId = String(resolved.id);
        group.dataset.dominantFrequency = String(resolved.dominantFrequency);
        group.dataset.spectralFrequency = resolved.spectralFrequencyRaw.toFixed(3);
        group.dataset.frequencyNorm = resolved.frequencyNorm.toFixed(3);
        group.dataset.richness = resolved.richness.toFixed(3);
        group.dataset.contourComplexity = resolved.contourComplexity.toFixed(3);
        group.dataset.complexityScore = resolved.complexityScore.toFixed(3);
        group.dataset.symmetryScore = resolved.symmetryScore.toFixed(3);
        group.dataset.radialVariance = resolved.radialVariance.toFixed(3);
        group.dataset.aspectRatio = resolved.aspectRatio.toFixed(3);
        group.dataset.curvatureExtrema = resolved.curvatureExtrema.toFixed(3);
        ring.setAttribute("class", "decision-field__selection-ring");
        ring.setAttribute("r", "23.4");
        path.setAttribute("d", pointsToPath(resolved.points, 0, 0));
        group.append(ring, path);
        group.addEventListener("pointerdown", (event) => {
          event.stopPropagation();
          const wasSelected = selectedCandidateId === resolved.id;
          selectedCandidateId = wasSelected ? null : resolved.id;
          if (!wasSelected) animateSliderTo(resolved.complexityScore);
          queueUpdate();
        });
        candidateLayer.append(group);
        return resolved;
      });

      function constrainToAnchor(node, anchorX, anchorY) {
        const dx = node.x - anchorX;
        const dy = node.y - anchorY;
        const distance = Math.hypot(dx, dy);
        if (distance <= mapMaxDisplacement) return;
        const pull = mapMaxDisplacement / distance;
        node.x = anchorX + dx * pull;
        node.y = anchorY + dy * pull;
      }

      function relaxMapPositions(items) {
        const nodes = items.map((candidate) => ({
          candidate,
          x: candidate.mapX,
          y: candidate.mapY,
        }));
        const minDistance = 28;

        for (let iteration = 0; iteration < 72; iteration += 1) {
          nodes.forEach((node) => {
            node.x += (node.candidate.mapX - node.x) * 0.16;
            node.y += (node.candidate.mapY - node.y) * 0.16;
          });

          for (let a = 0; a < nodes.length; a += 1) {
            for (let b = a + 1; b < nodes.length; b += 1) {
              const first = nodes[a];
              const second = nodes[b];
              let dx = second.x - first.x;
              let dy = second.y - first.y;
              let distance = Math.hypot(dx, dy);
              if (distance >= minDistance) continue;
              if (distance < 0.01) {
                dx = seeded((a + 1) * 41 + (b + 1) * 17) - 0.5;
                dy = seeded((a + 1) * 53 + (b + 1) * 19) - 0.5;
                distance = Math.hypot(dx, dy);
              }
              const push = (minDistance - distance) * 0.22;
              const nx = dx / distance;
              const ny = dy / distance;
              first.x -= nx * push;
              first.y -= ny * push;
              second.x += nx * push;
              second.y += ny * push;
            }
          }

          nodes.forEach((node) => {
            constrainToAnchor(node, node.candidate.mapX, node.candidate.mapY);
            node.x = clamp(node.x, fieldBounds.left + 8, fieldBounds.right - 8);
            node.y = clamp(node.y, fieldBounds.top + 8, fieldBounds.bottom - 8);
          });
        }

        nodes.forEach((node) => {
          node.candidate.displayMapX = node.x;
          node.candidate.displayMapY = node.y;
          node.candidate.mapDisplacement = Math.hypot(node.x - node.candidate.mapX, node.y - node.candidate.mapY);
        });
      }

      relaxMapPositions(candidates);

      const candidateComplexities = candidates.map((candidate) => candidate.complexityScore);
      const complexityRange = {
        min: Math.min(...candidateComplexities),
        max: Math.max(...candidateComplexities),
      };

      function targetComplexityForSlider(value) {
        const normalized = clamp(Number(value) / 100, 0, 1);
        return complexityRange.min + normalized * (complexityRange.max - complexityRange.min);
      }

      function sliderValueForComplexity(complexity) {
        return Math.round(clamp((complexity - complexityRange.min) / Math.max(complexityRange.max - complexityRange.min, 0.001), 0, 1) * 100);
      }

      function animateSliderTo(nextValue) {
        const destination = sliderValueForComplexity(nextValue);
        if (sliderAnimationFrame !== null) cancelAnimationFrame(sliderAnimationFrame);
        if (reduceMotionQuery.matches || Number(slider.value) === destination) {
          slider.value = destination;
          committedSelection = { type: "complexity", complexity: targetComplexityForSlider(destination) };
          queueUpdate();
          return;
        }
        const origin = Number(slider.value);
        const startedAt = performance.now();
        const duration = 260;
        const step = (now) => {
          const progress = clamp((now - startedAt) / duration, 0, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const value = Math.round(origin + (destination - origin) * eased);
          slider.value = value;
          committedSelection = { type: "complexity", complexity: targetComplexityForSlider(value) };
          queueUpdate();
          if (progress < 1) {
            sliderAnimationFrame = requestAnimationFrame(step);
          } else {
            sliderAnimationFrame = null;
          }
        };
        sliderAnimationFrame = requestAnimationFrame(step);
      }

      committedSelection = { type: "complexity", complexity: targetComplexityForSlider(slider.value) };

      const referenceHarmonics = buildHarmonics(5, 0.58, 733, 3);
      const referenceCoefficients = canonicalCoefficientsFor(referenceHarmonics);
      const referencePoints = sampleFromCoefficients(referenceCoefficients, 17.2);
      const referenceFrequency = spectralFrequencyFor(referenceHarmonics);
      const referenceRichness = spectralRichnessFor(referenceHarmonics);
      const referenceContour = contourComplexityFor(referencePoints);
      const referenceFieldPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const averageFieldPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      referenceShape.append(referenceFieldPath);
      averageShape.append(averageFieldPath);
      const referenceComplexity = complexityFor(
        referenceFrequency.normalized,
        referenceRichness,
        referenceContour
      );

      function weightedAverageCoefficients(weights) {
        const total = weights.reduce((sum, weight) => sum + weight, 0);
        if (total <= 0) return referenceCoefficients;
        return Array.from({ length: maxHarmonic }, (_, index) => {
          const k = index + 1;
          return candidates.reduce((sum, candidate, candidateIndex) => {
            const coefficient = candidate.canonicalCoefficients[index] ?? { cos: 0, sin: 0 };
            const weight = weights[candidateIndex] / total;
            return {
              k,
              cos: sum.cos + coefficient.cos * weight,
              sin: sum.sin + coefficient.sin * weight,
            };
          }, { k, cos: 0, sin: 0 });
        });
      }

      function setPath(target, points) {
        target.setAttribute("d", pointsToPath(points, 0, 0));
      }

      function copyPoints(points) {
        return points.map((point) => ({ x: point.x, y: point.y }));
      }

      function interpolatePoints(from, to, progress) {
        return to.map((point, index) => {
          const start = from[index] ?? point;
          return {
            x: start.x + (point.x - start.x) * progress,
            y: start.y + (point.y - start.y) * progress,
          };
        });
      }

      function setAveragePaths(points) {
        setPath(averageMini, points);
        setPath(averageFieldPath, points);
      }

      function animateAverageTo(points) {
        const targetPath = pointsToPath(points, 0, 0);
        if (targetPath === currentAverageTargetPath) return;
        currentAverageTargetPath = targetPath;

        if (averageAnimationFrame !== null) {
          cancelAnimationFrame(averageAnimationFrame);
          averageAnimationFrame = null;
        }

        if (reduceMotionQuery.matches || !currentAveragePoints) {
          currentAveragePoints = copyPoints(points);
          setAveragePaths(currentAveragePoints);
          return;
        }

        const from = copyPoints(currentAveragePoints);
        const to = copyPoints(points);
        const startedAt = performance.now();
        const duration = 260;

        function step(now) {
          const progress = clamp((now - startedAt) / duration, 0, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          currentAveragePoints = interpolatePoints(from, to, eased);
          setAveragePaths(currentAveragePoints);
          if (progress < 1) {
            averageAnimationFrame = requestAnimationFrame(step);
          } else {
            averageAnimationFrame = null;
            currentAveragePoints = to;
          }
        }

        averageAnimationFrame = requestAnimationFrame(step);
      }

      setPath(referenceMini, referencePoints);
      setPath(referenceFieldPath, referencePoints);
      currentAveragePoints = copyPoints(referencePoints);
      currentAverageTargetPath = pointsToPath(currentAveragePoints, 0, 0);
      setAveragePaths(currentAveragePoints);
      referenceShape.setAttribute("transform", "matrix(1.18 0 0 1.18 610 72)");

      window.kahntraDecisionFieldAudit = {
        generated: frequencyBins.length * richnessBins.length * variantsPerBin,
        retained: candidates.length,
        reference: {
          spectralFrequency: Number(referenceFrequency.raw.toFixed(3)),
          frequencyNorm: Number(referenceFrequency.normalized.toFixed(3)),
          richness: Number(referenceRichness.toFixed(3)),
          contour: Number(referenceContour.toFixed(3)),
          complexity: Number(referenceComplexity.toFixed(3)),
        },
        candidates: candidates.map((candidate) => ({
          id: candidate.id,
          dominantFrequency: candidate.dominantFrequency,
          spectralFrequency: Number(candidate.spectralFrequencyRaw.toFixed(3)),
          frequencyNorm: Number(candidate.frequencyNorm.toFixed(3)),
          richness: Number(candidate.richness.toFixed(3)),
          complexity: Number(candidate.complexityScore.toFixed(3)),
          symmetry: Number(candidate.symmetryScore.toFixed(3)),
          contour: Number(candidate.contourComplexity.toFixed(3)),
          radialVariance: Number(candidate.radialVariance.toFixed(3)),
          aspectRatio: Number(candidate.aspectRatio.toFixed(3)),
          curvatureExtrema: Number(candidate.curvatureExtrema.toFixed(3)),
        })),
      };

      function queueUpdate() {
        if (frame !== null) return;
        frame = requestAnimationFrame(() => {
          frame = null;
          applyState();
        });
      }

      function setCount(element, currentValue, nextValue) {
        if (reduceMotionQuery.matches || currentValue === nextValue) {
          element.textContent = String(nextValue);
          return nextValue;
        }
        const direction = nextValue > currentValue ? 1 : -1;
        const updated = currentValue + direction * Math.min(Math.abs(nextValue - currentValue), 3);
        element.textContent = String(updated);
        if (updated !== nextValue) {
          window.setTimeout(queueUpdate, 38);
        }
        return updated;
      }

      function setFocusCountLabel(count) {
        focusCountLabel.textContent = count === 1 ? "option in focus" : "options in focus";
      }

      function applyState() {
        const target = committedSelection.complexity;
        slider.value = sliderValueForComplexity(committedSelection.complexity);
        layoutMode = "explore";
        field.dataset.phase = phase;
        field.dataset.layout = layoutMode;
        caption.textContent = phaseCaptions[phase];
        backButton.hidden = true;
        advanceButton.hidden = true;

        const summaryVisible = false;
        const softActive = false;
        const hardActive = false;
        const neutralField = false;
        const hardVisible = false;
        const states = candidates.map((candidate) => {
          const complexityDistance = candidate.complexityScore - target;
          const complexityFit = Math.exp(-Math.pow(complexityDistance, 2) / (2 * Math.pow(relevanceSigma, 2)));
          const symmetryFit = softActive ? 0.04 + Math.pow(candidate.symmetryScore, 3.2) * 0.96 : 1;
          const eligibleByHard = !hardActive || candidate.symmetryScore >= hardSymmetryThreshold;
          const relevance = clamp(complexityFit * symmetryFit, 0, 1);
          return { candidate, relevance, eligibleByHard };
        });
        const eligibleRelevances = states
          .filter((state) => state.eligibleByHard)
          .map((state) => state.relevance)
          .sort((a, b) => b - a);
        const comparisonFloor = hardVisible && eligibleRelevances.length
          ? Math.max(eligibleRelevances[Math.min(4, eligibleRelevances.length) - 1], 0)
          : focusThreshold;
        const weights = [];
        let focused = 0;
        let eligible = 0;

        states.forEach(({ candidate, relevance, eligibleByHard }) => {
          const averageWeight = summaryVisible && eligibleByHard ? relevance : 0;
          weights.push(averageWeight);
          if (summaryVisible && eligibleByHard) eligible += 1;
          if (
            summaryVisible &&
            eligibleByHard &&
            (relevance >= focusThreshold || (hardVisible && relevance >= comparisonFloor))
          ) {
            focused += 1;
          }
          const scale = neutralField ? 0.86 : 0.84 + relevance * 0.22;
          const basePosition = { x: candidate.exploreX, y: candidate.exploreY };
          const inspectDistance = pointerPosition
            ? Math.hypot(basePosition.x - pointerPosition.x, basePosition.y - pointerPosition.y)
            : Infinity;
          const inspect = pointerPosition ? Math.exp(-Math.pow(inspectDistance / 46, 2)) : 0;
          const inspectScale = 1 + inspect * 0.24;
          const selected = selectedCandidateId === candidate.id;
          const selectedScale = selected ? 1.07 : 1;
          const opacity = selected
            ? Math.max(neutralField ? 0.62 : eligibleByHard ? 0.1 + relevance * 0.9 : 0.055, 0.48)
            : neutralField ? 0.62 : eligibleByHard ? 0.1 + relevance * 0.9 : 0.055;

          candidate.currentX = basePosition.x;
          candidate.currentY = basePosition.y;
          candidate.group.classList.toggle("is-strong", !neutralField && relevance > 0.66 && eligibleByHard);
          candidate.group.classList.toggle("is-ineligible", !neutralField && !eligibleByHard);
          candidate.group.classList.toggle("is-selected", selected);
          candidate.group.setAttribute(
            "transform",
            `matrix(${(scale * inspectScale * selectedScale).toFixed(3)} 0 0 ${(scale * inspectScale * selectedScale).toFixed(3)} ${basePosition.x.toFixed(2)} ${basePosition.y.toFixed(2)})`
          );
          candidate.group.style.setProperty("--shape-opacity", opacity.toFixed(3));
          candidate.group.style.setProperty(
            "--shape-stroke",
            (selected ? 1.75 : neutralField ? 1.12 : 0.95 + relevance * 0.75).toFixed(2)
          );
          candidate.group.dataset.relevance = relevance.toFixed(3);
          candidate.group.dataset.inspect = inspect.toFixed(3);
          candidate.group.dataset.renderedX = basePosition.x.toFixed(2);
          candidate.group.dataset.renderedY = basePosition.y.toFixed(2);
        });

        if (summaryVisible) {
          const averageCoefficients = weightedAverageCoefficients(weights);
          const averagePoints = sampleFromCoefficients(averageCoefficients, 17.2);
          animateAverageTo(averagePoints);
        }
        averageShape.setAttribute("transform", "matrix(1.18 0 0 1.18 610 132)");
        referenceShape.hidden = !summaryVisible;
        averageShape.hidden = !summaryVisible;
        referenceShape.style.display = summaryVisible ? "" : "none";
        averageShape.style.display = summaryVisible ? "" : "none";
        displayedFocusCount = setCount(focusCount, displayedFocusCount, focused);
        setFocusCountLabel(focused);
        displayedEligibleCount = setCount(eligibleCount, displayedEligibleCount, eligible);

        [...candidates]
          .sort((a, b) => {
            if (a.id === selectedCandidateId) return 1;
            if (b.id === selectedCandidateId) return -1;
            return Number(a.group.dataset.inspect) - Number(b.group.dataset.inspect);
          })
          .forEach((candidate) => candidateLayer.append(candidate.group));

        window.kahntraDecisionFieldAudit.activeLayout = layoutMode;
        window.kahntraDecisionFieldAudit.rendered = candidates.map((candidate) => ({
          id: candidate.id,
          dominantFrequency: candidate.dominantFrequency,
          spectralFrequency: Number(candidate.spectralFrequencyRaw.toFixed(3)),
          richness: Number(candidate.richness.toFixed(3)),
          mapX: Number(candidate.mapX.toFixed(2)),
          mapY: Number(candidate.mapY.toFixed(2)),
          displayMapX: Number(candidate.displayMapX.toFixed(2)),
          displayMapY: Number(candidate.displayMapY.toFixed(2)),
          mapDisplacement: Number(candidate.mapDisplacement.toFixed(2)),
          exploreX: Number(candidate.exploreX.toFixed(2)),
          exploreY: Number(candidate.exploreY.toFixed(2)),
          finalX: Number(candidate.group.dataset.renderedX),
          finalY: Number(candidate.group.dataset.renderedY),
          transform: candidate.group.getAttribute("transform"),
          relevance: Number(candidate.group.dataset.relevance),
        }));
        window.kahntraDecisionFieldAudit.focusThreshold = focusThreshold;
        window.kahntraDecisionFieldAudit.relevanceSigma = relevanceSigma;
        window.kahntraDecisionFieldAudit.complexityRange = {
          min: Number(complexityRange.min.toFixed(3)),
          max: Number(complexityRange.max.toFixed(3)),
        };
        window.kahntraDecisionFieldAudit.sliderTargetComplexity = Number(target.toFixed(3));
        window.kahntraDecisionFieldAudit.hardSymmetryThreshold = hardSymmetryThreshold;
        window.kahntraDecisionFieldAudit.mapMaxDisplacement = mapMaxDisplacement;
        window.kahntraDecisionFieldAudit.focused = focused;
        window.kahntraDecisionFieldAudit.eligible = eligible;
      }

      function commitPoint(selection) {
        committedSelection = selection;
        slider.value = Math.round(committedSelection.complexity * 100);
        queueUpdate();
      }

      function advancePhase() {
        const order = ["idle", "structure", "summary", "soft", "hard", "final"];
        phase = order[Math.min(order.indexOf(phase) + 1, order.length - 1)];
        if (phase === "soft") softSymmetryToggle.setAttribute("aria-pressed", "true");
        if (phase === "hard") hardSymmetryToggle.setAttribute("aria-pressed", "true");
        queueUpdate();
      }

      function retreatPhase() {
        const order = ["idle", "structure", "summary", "soft", "hard", "final"];
        phase = order[Math.max(order.indexOf(phase) - 1, 0)];
        if (phase === "summary") softSymmetryToggle.setAttribute("aria-pressed", "false");
        if (phase === "soft") hardSymmetryToggle.setAttribute("aria-pressed", "false");
        if (phase === "idle" || phase === "structure") {
          softSymmetryToggle.setAttribute("aria-pressed", "false");
          hardSymmetryToggle.setAttribute("aria-pressed", "false");
        }
        queueUpdate();
      }

      slider.addEventListener("input", () => {
        committedSelection = { type: "complexity", complexity: targetComplexityForSlider(slider.value) };
        queueUpdate();
      });

      softSymmetryToggle.addEventListener("click", () => {
        const active = softSymmetryToggle.getAttribute("aria-pressed") === "true";
        softSymmetryToggle.setAttribute("aria-pressed", String(!active));
        queueUpdate();
      });

      hardSymmetryToggle.addEventListener("click", () => {
        const active = hardSymmetryToggle.getAttribute("aria-pressed") === "true";
        hardSymmetryToggle.setAttribute("aria-pressed", String(!active));
        queueUpdate();
      });

      advanceButton.addEventListener("click", advancePhase);
      backButton.addEventListener("click", retreatPhase);

      svg.addEventListener("pointermove", (event) => {
        if (event.pointerType === "touch" || reduceMotionQuery.matches) return;
        pointerPosition = pointerFromEvent(event);
        queueUpdate();
      });

      svg.addEventListener("pointerdown", (event) => {
        svg.setPointerCapture?.(event.pointerId);
        const candidateGroup = event.target.closest?.(".decision-field__candidate");
        if (candidateGroup) {
          const nextSelectedId = Number(candidateGroup.dataset.candidateId);
          selectedCandidateId = selectedCandidateId === nextSelectedId ? null : nextSelectedId;
          queueUpdate();
          return;
        }
        if (layoutMode === "map" && phase !== "idle") commitPoint(selectionFromPointer(event));
      });

      svg.addEventListener("pointerleave", () => {
        pointerPosition = null;
        queueUpdate();
      });

      applyState();
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
    initializeDecisionField();
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
