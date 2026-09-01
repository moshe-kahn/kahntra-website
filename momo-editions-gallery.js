const ROOT_SELECTOR = '[data-momo-editions-gallery]';
const COLLECTION_KEYS = ['eyebrow', 'introduction', 'title'];
const ITEM_KEYS = [
  'actors',
  'alt',
  'contentRating',
  'director',
  'genres',
  'id',
  'image',
  'keywords',
  'order',
  'railFraming',
  'railImage',
  'runtimeMinutes',
  'sourceUid',
  'title',
  'year'
];
const FRAMING_KEYS = ['cropZoom', 'focalX', 'focalY'];

function hasExactKeys(value, keys) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join('|') === [...keys].sort().join('|')
  );
}

function isText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPercent(value) {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

function formatRuntime(totalMinutes, compact = false) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return compact ? `${hours}h` : `${hours} hr`;
  return compact ? `${hours}h ${minutes}m` : `${hours} hr ${minutes} min`;
}

function validateManifest(manifest) {
  if (!hasExactKeys(manifest, ['collection', 'items', 'schemaVersion'])) {
    throw new Error('The gallery manifest has unknown or missing top-level fields.');
  }
  if (manifest.schemaVersion !== 7 || !hasExactKeys(manifest.collection, COLLECTION_KEYS)) {
    throw new Error('The gallery manifest version or collection fields are invalid.');
  }
  if (!COLLECTION_KEYS.every((key) => isText(manifest.collection[key]))) {
    throw new Error('Every collection field must contain text.');
  }
  if (!Array.isArray(manifest.items) || manifest.items.length === 0) {
    throw new Error('The gallery must contain at least one Edition.');
  }

  const ids = new Set();
  const sourceUids = new Set();
  const orders = new Set();
  for (const item of manifest.items) {
    if (!hasExactKeys(item, ITEM_KEYS)) {
      throw new Error('An Edition has unknown or missing fields.');
    }
    if (
      !isText(item.id) ||
      !/^[a-z0-9-]+$/.test(item.id) ||
      !Number.isInteger(item.sourceUid) ||
      item.sourceUid < 1 ||
      !isText(item.title) ||
      !Number.isInteger(item.year) ||
      item.year < 1888 ||
      item.year > 2100 ||
      !Array.isArray(item.genres) ||
      item.genres.length < 1 ||
      item.genres.length > 4 ||
      !item.genres.every(isText) ||
      new Set(item.genres).size !== item.genres.length ||
      !Array.isArray(item.keywords) ||
      item.keywords.length !== 3 ||
      !item.keywords.every(isText) ||
      new Set(item.keywords).size !== item.keywords.length ||
      !Number.isInteger(item.runtimeMinutes) ||
      item.runtimeMinutes < 1 ||
      item.runtimeMinutes > 1000 ||
      !['G', 'PG', 'PG-13', 'R', 'NC-17', 'UNRATED'].includes(item.contentRating) ||
      !isText(item.director) ||
      !Array.isArray(item.actors) ||
      item.actors.length < 1 ||
      item.actors.length > 6 ||
      !item.actors.every(isText) ||
      new Set(item.actors).size !== item.actors.length ||
      !isText(item.image) ||
      !/^assets\/[a-z0-9-]+\.webp$/.test(item.image) ||
      !isText(item.railImage) ||
      !/^assets\/[a-z0-9-]+\.webp$/.test(item.railImage) ||
      !isText(item.alt) ||
      !Number.isInteger(item.order) ||
      item.order < 1
    ) {
      throw new Error(`Edition ${item.id || '(unknown)'} has invalid public fields.`);
    }
    if (ids.has(item.id) || sourceUids.has(item.sourceUid) || orders.has(item.order)) {
      throw new Error('Edition IDs, source UIDs, and ordering values must be unique.');
    }
    ids.add(item.id);
    sourceUids.add(item.sourceUid);
    orders.add(item.order);

    if (
      !hasExactKeys(item.railFraming, FRAMING_KEYS) ||
      !isPercent(item.railFraming.focalX) ||
      !isPercent(item.railFraming.focalY) ||
      !Number.isFinite(item.railFraming.cropZoom) ||
      item.railFraming.cropZoom < 1 ||
      item.railFraming.cropZoom > 2.5
    ) {
      throw new Error(`Edition ${item.id} has invalid framing.`);
    }
  }
  return manifest;
}

function element(tagName, className, text) {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function preloadImage(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = src;
  });
}

function setGalleryAccess(root, interactive) {
  root.toggleAttribute('inert', !interactive);
  if (interactive) root.removeAttribute('aria-hidden');
  else root.setAttribute('aria-hidden', 'true');
  root.querySelectorAll('button').forEach((button) => {
    button.disabled = !interactive;
  });
}

function renderGallery(root, manifest) {
  const items = manifest.items.slice().sort((a, b) => a.order - b.order);
  const assetPrefix = root.dataset.assetPrefix || '';
  const imageSource = (path) => `${assetPrefix}${path.replace(/^assets\//, '')}`;
  root.replaceChildren();
  root.classList.add('momo-gallery');

  const accessibleHeader = element('header', 'momo-gallery__accessible-header');
  accessibleHeader.append(
    element('p', '', manifest.collection.eyebrow),
    element('h1', '', manifest.collection.title),
    element('p', '', manifest.collection.introduction)
  );

  const shell = element('section', 'momo-gallery__shell');
  shell.setAttribute('aria-label', 'Momo Editions gallery');
  shell.setAttribute('aria-describedby', 'momo-gallery-instructions');

  const instructions = element(
    'p',
    'momo-gallery__accessible-header',
    'Use the artwork previews or arrow keys to choose an Edition. Select the large artwork to reveal its title and details.'
  );
  instructions.id = 'momo-gallery-instructions';
  const keywordSummary = element('p', 'momo-gallery__accessible-header');
  keywordSummary.id = 'momo-gallery-keyword-summary';

  const rail = element('aside', 'momo-gallery__film-rail');
  rail.setAttribute('aria-label', 'Momo Editions artwork');
  rail.append(
    element('div', 'momo-gallery__film-edge momo-gallery__film-edge--start'),
    element('div', 'momo-gallery__film-title', 'MOMO EDITIONS'),
    element('div', 'momo-gallery__film-code momo-gallery__film-code--editor', '01MEK-26'),
    element('div', 'momo-gallery__film-code momo-gallery__film-code--roll', 'ROLL 01 · NEW')
  );

  const strip = element('ul', 'momo-gallery__strip');
  strip.setAttribute('aria-label', 'Edition previews');
  const startSpacer = element('li', 'momo-gallery__strip-spacer');
  startSpacer.setAttribute('aria-hidden', 'true');
  strip.append(startSpacer);

  const buttons = items.map((item, index) => {
    const listItem = element('li', 'momo-gallery__frame-item');
    const button = element('button', 'momo-gallery__frame');
    button.type = 'button';
    button.dataset.index = String(index);
    button.setAttribute('aria-label', `Select ${item.title}`);

    const imageWrap = element('span', 'momo-gallery__frame-image');
    imageWrap.style.setProperty('--crop-x', `${item.railFraming.focalX}%`);
    imageWrap.style.setProperty('--crop-y', `${item.railFraming.focalY}%`);
    imageWrap.style.setProperty('--crop-zoom', item.railFraming.cropZoom);
    const image = element('img');
    image.src = imageSource(item.railImage);
    image.alt = '';
    image.loading = index < 4 ? 'eager' : 'lazy';
    image.decoding = 'async';
    image.addEventListener('load', () => image.classList.add('is-loaded'));
    if (image.complete && image.naturalWidth) image.classList.add('is-loaded');
    imageWrap.append(image);
    button.append(imageWrap);
    listItem.append(button);
    strip.append(listItem);
    return button;
  });
  const endSpacer = element('li', 'momo-gallery__strip-spacer');
  endSpacer.setAttribute('aria-hidden', 'true');
  strip.append(endSpacer);
  rail.append(strip, element('div', 'momo-gallery__film-edge momo-gallery__film-edge--end'));

  const stage = element('section', 'momo-gallery__stage');
  stage.setAttribute('aria-live', 'polite');
  const artwork = element('div', 'momo-gallery__artwork');
  const hitTarget = element('button', 'momo-gallery__artwork-hit-target');
  hitTarget.type = 'button';
  hitTarget.setAttribute('aria-expanded', 'false');
  hitTarget.setAttribute('aria-describedby', 'momo-gallery-keyword-summary');

  const glow = element('span', 'momo-gallery__projector-field');
  const imageStack = element('span', 'momo-gallery__image-stack');
  const mainImage = element('img', 'momo-gallery__main-image');
  mainImage.alt = '';
  mainImage.decoding = 'async';
  imageStack.append(glow, mainImage);

  const information = element('span', 'momo-gallery__information');
  const titleBlock = element('span', 'momo-gallery__artwork-title-block');
  const genreGroup = element('span', 'momo-gallery__genre-group');
  genreGroup.hidden = true;
  const title = element('strong', 'momo-gallery__artwork-title');
  const year = element('span', 'momo-gallery__artwork-year');
  titleBlock.append(genreGroup, title, year);
  const details = element('span', 'momo-gallery__details');
  details.setAttribute('role', 'region');
  const director = element('span', 'momo-gallery__director');
  const actors = element('span', 'momo-gallery__actors');
  const facts = element('span', 'momo-gallery__facts');
  details.append(director, actors);
  information.append(titleBlock, details, facts);

  const metadata = element('span', 'momo-gallery__metadata');
  metadata.setAttribute('aria-hidden', 'true');
  const metadataText = element('span', 'momo-gallery__metadata-text');
  metadata.append(metadataText);

  imageStack.append(information);
  artwork.append(imageStack, metadata, hitTarget);
  stage.append(artwork);

  shell.append(rail, stage);
  root.append(accessibleHeader, instructions, keywordSummary, shell);
  if (root.hasAttribute('inert')) setGalleryAccess(root, false);

  let selectedIndex = 0;
  let mode = 'base';
  let transitionToken = 0;
  let programmaticScroll = false;
  let scrollTimer;
  let resizeTimer;
  let creditFitFrame;
  let pointerStart = null;
  let suppressArtworkClick = false;

  function isMobile() {
    return window.matchMedia('(max-width: 650px)').matches;
  }

  function titleLineCount() {
    const lineHeight = Number.parseFloat(getComputedStyle(title).lineHeight);
    if (!Number.isFinite(lineHeight) || lineHeight === 0) return 1;
    return Math.ceil(title.getBoundingClientRect().height / lineHeight - 0.01);
  }

  function fitTitle() {
    title.classList.remove('is-long-title', 'is-extra-long-title');
    if (titleLineCount() > 2) title.classList.add('is-long-title');
    if (titleLineCount() > 2) title.classList.add('is-extra-long-title');
  }

  function positionDetailsBelowTitle() {
    details.style.removeProperty('top');
    if (mode !== 'info') return;

    const artworkBounds = artwork.getBoundingClientRect();
    const titleBounds = titleBlock.getBoundingClientRect();
    const defaultTop = details.getBoundingClientRect().top - artworkBounds.top;
    const titleBottom = titleBounds.bottom - artworkBounds.top;
    const clearance =
      titleLineCount() > 1 ? Math.max(44, artwork.clientHeight * 0.075) : Math.max(16, artwork.clientHeight * 0.03);
    details.style.top = `${Math.max(defaultTop, titleBottom + clearance)}px`;
  }

  function fitCredits() {
    creditFitFrame = undefined;
    if (mode !== 'info') return;

    fitTitle();

    const actorNames = [...actors.querySelectorAll('.momo-gallery__actor')];
    details.hidden = false;
    director.hidden = false;
    actors.hidden = false;
    actorNames.forEach((actor) => {
      actor.hidden = false;
    });

    positionDetailsBelowTitle();

    const detailsTop = details.getBoundingClientRect().top;
    const factsTop = facts.getBoundingClientRect().top;
    const clearance = Math.max(14, artwork.clientHeight * 0.025);
    const availableHeight = Math.max(0, factsTop - detailsTop - clearance);
    details.style.maxHeight = `${availableHeight}px`;

    while (actorNames.length > 0 && details.scrollHeight > availableHeight) {
      actorNames.pop().hidden = true;
    }

    if (actorNames.length === 0) {
      actors.hidden = true;
    }

    if (details.scrollHeight > availableHeight) {
      director.hidden = true;
    }

    if (director.hidden && actors.hidden) {
      details.hidden = true;
    }
  }

  function scheduleCreditFit() {
    if (creditFitFrame !== undefined) window.cancelAnimationFrame(creditFitFrame);
    creditFitFrame = window.requestAnimationFrame(fitCredits);
  }

  function setMode(nextMode) {
    mode = nextMode;
    genreGroup.hidden = mode !== 'info';
    if (mode !== 'info') {
      details.style.removeProperty('max-height');
      details.style.removeProperty('top');
    }
    artwork.classList.toggle('is-title-revealed', mode === 'title' || mode === 'info');
    artwork.classList.toggle('is-info-open', mode === 'info');
    hitTarget.setAttribute('aria-expanded', String(mode === 'info'));
    hitTarget.setAttribute(
      'aria-label',
      `${mode === 'info' ? 'Hide' : 'Show'} information for ${items[selectedIndex].title}`
    );
    if (mode === 'info') scheduleCreditFit();
  }

  function updateContent(item) {
    mainImage.src = imageSource(item.image);
    mainImage.alt = item.alt;
    title.textContent = item.title;
    fitTitle();
    year.textContent = String(item.year);
    director.replaceChildren(
      element('span', 'momo-gallery__director-label', 'Directed by'),
      element('b', 'momo-gallery__director-name', item.director)
    );
    actors.replaceChildren(
      element('span', 'momo-gallery__actors-label', 'Starring'),
      ...item.actors.map((actor) => element('b', 'momo-gallery__actor', actor))
    );
    const ratingGroup = element('span', 'momo-gallery__rating-group');
    ratingGroup.append(
      element('span', 'momo-gallery__fact-separator', '•'),
      element('span', 'momo-gallery__content-rating', item.contentRating)
    );
    facts.replaceChildren(
      element('span', 'momo-gallery__runtime momo-gallery__runtime--long', formatRuntime(item.runtimeMinutes)),
      element(
        'span',
        'momo-gallery__runtime momo-gallery__runtime--compact',
        formatRuntime(item.runtimeMinutes, true)
      ),
      ratingGroup
    );
    genreGroup.setAttribute('aria-label', `Genres: ${item.genres.join(', ')}`);
    genreGroup.replaceChildren(
      ...item.genres.flatMap((genre, index) =>
        index === 0
          ? [element('span', 'momo-gallery__genre-tag', genre)]
          : [
              element('span', 'momo-gallery__genre-separator', '•'),
              element('span', 'momo-gallery__genre-tag', genre)
            ]
      )
    );
    keywordSummary.textContent = `Keywords: ${item.keywords.join(', ')}.`;
    const labels = item.keywords;
    metadataText.replaceChildren(
      ...labels.flatMap((label, index) =>
        index === 0
          ? [element('span', '', label)]
          : [element('span', 'momo-gallery__metadata-separator', '•'), element('span', '', label)]
      )
    );
    details.setAttribute('aria-label', `Details for ${item.title}`);
    if (mode === 'info') scheduleCreditFit();
  }

  async function select(nextIndex, options = {}) {
    const normalizedIndex = (nextIndex + items.length) % items.length;
    const changed = normalizedIndex !== selectedIndex || options.initial;
    selectedIndex = normalizedIndex;
    setMode('base');
    buttons.forEach((button, index) => {
      const active = index === selectedIndex;
      button.classList.toggle('is-selected', active);
      if (active) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });

    if (options.center !== false) {
      programmaticScroll = true;
      centerSelectedFrame(options.initial || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
      window.setTimeout(() => {
        programmaticScroll = false;
      }, 260);
    }

    if (!changed) return;
    const token = ++transitionToken;
    const item = items[selectedIndex];
    if (!options.initial) {
      artwork.classList.add('is-changing');
      metadataText.classList.add('is-changing');
    }
    const loaded = await preloadImage(imageSource(item.image));
    if (token !== transitionToken) return;
    if (!loaded) {
      root.dataset.error = `Artwork unavailable for ${item.title}`;
      return;
    }
    updateContent(item);
    requestAnimationFrame(() => {
      if (token !== transitionToken) return;
      artwork.classList.remove('is-changing');
      metadataText.classList.remove('is-changing');
      artwork.classList.add('has-arrived');
      window.setTimeout(() => artwork.classList.remove('has-arrived'), 950);
    });
  }

  function advance(delta) {
    void select(selectedIndex + delta);
  }

  function centerSelectedFrame(behavior = 'auto') {
    const selectedButton = buttons[selectedIndex];
    if (!selectedButton) return;
    const selectedFrame = selectedButton.closest('.momo-gallery__frame-item');
    if (!selectedFrame) return;

    if (isMobile()) {
      strip.scrollTo({
        left: selectedFrame.offsetLeft - (strip.clientWidth - selectedFrame.offsetWidth) / 2,
        behavior
      });
      return;
    }

    strip.scrollTo({
      top: selectedFrame.offsetTop - (strip.clientHeight - selectedFrame.offsetHeight) / 2,
      behavior
    });
  }

  function activateArtwork() {
    if (suppressArtworkClick) {
      suppressArtworkClick = false;
      return;
    }
    setMode(mode === 'info' ? 'base' : 'info');
  }

  function handleKeydown(event) {
    if (event.key === 'Escape' && mode !== 'base') {
      event.preventDefault();
      setMode('base');
      return;
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      advance(-1);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      advance(1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      void select(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      void select(items.length - 1);
    }
  }

  function selectNearestFrame() {
    if (programmaticScroll) return;
    const horizontal = isMobile();
    const bounds = strip.getBoundingClientRect();
    const center = horizontal ? bounds.left + bounds.width / 2 : bounds.top + bounds.height / 2;
    let nearest = selectedIndex;
    let distance = Number.POSITIVE_INFINITY;
    buttons.forEach((button, index) => {
      const frame = button.getBoundingClientRect();
      const frameCenter = horizontal ? frame.left + frame.width / 2 : frame.top + frame.height / 2;
      const nextDistance = Math.abs(frameCenter - center);
      if (nextDistance < distance) {
        distance = nextDistance;
        nearest = index;
      }
    });
    if (nearest !== selectedIndex) void select(nearest, { center: false });
  }

  buttons.forEach((button, index) => button.addEventListener('click', () => void select(index)));
  hitTarget.addEventListener('click', activateArtwork);
  hitTarget.addEventListener('keydown', (event) => {
    event.stopPropagation();
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activateArtwork();
      return;
    }
    handleKeydown(event);
  });
  shell.addEventListener('keydown', handleKeydown);
  strip.addEventListener('scroll', () => {
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(selectNearestFrame, 130);
  });
  window.addEventListener('resize', () => {
    programmaticScroll = true;
    scheduleCreditFit();
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      centerSelectedFrame();
      window.setTimeout(() => {
        programmaticScroll = false;
      }, 100);
    }, 0);
  });

  if ('ResizeObserver' in window) {
    const creditFitObserver = new ResizeObserver(scheduleCreditFit);
    creditFitObserver.observe(artwork);
  }

  if (document.fonts?.ready) {
    void document.fonts.ready.then(scheduleCreditFit);
  }
  hitTarget.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' || mode !== 'base') return;
    pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
  });
  hitTarget.addEventListener('pointerup', (event) => {
    if (!pointerStart || pointerStart.id !== event.pointerId) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(dx) < 44 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    suppressArtworkClick = true;
    advance(dx < 0 ? 1 : -1);
    requestAnimationFrame(() => {
      suppressArtworkClick = false;
    });
  });
  hitTarget.addEventListener('pointercancel', () => {
    pointerStart = null;
  });

  // The first frame is already rendered in place; loading must not move the page.
  void select(0, { initial: true, center: false });
}

async function mountGallery(root) {
  const manifestUrl = root.dataset.manifest;
  if (!manifestUrl) throw new Error('The gallery container is missing a manifest path.');
  const response = await fetch(manifestUrl, { credentials: 'same-origin' });
  if (!response.ok) throw new Error(`Gallery data could not be loaded (${response.status}).`);
  renderGallery(root, validateManifest(await response.json()));
}

function addCurtainFeatureLockup(curtain) {
  const content = curtain.querySelector('.momo-gallery-curtain__content');
  if (!content || content.querySelector('.momo-gallery-curtain__feature')) return;

  const feature = element('span', 'momo-gallery-curtain__feature');
  feature.setAttribute('aria-hidden', 'true');
  const mark = element('span', 'momo-gallery-curtain__feature-logo-mark');
  const wordmark = document.createElement('img');
  wordmark.className = 'momo-gallery-curtain__feature-logo';
  wordmark.src = new URL('assets/momo-movies-logo-transparent.svg', window.location.href).href;
  wordmark.alt = '';
  wordmark.decoding = 'async';
  const wordmarkHighlight = wordmark.cloneNode();
  wordmarkHighlight.className = 'momo-gallery-curtain__feature-logo-momo';
  mark.append(wordmark, wordmarkHighlight);
  feature.append(element('span', '', 'A'), mark, element('span', '', 'feature'));
  content.prepend(feature);
}

for (const root of document.querySelectorAll(ROOT_SELECTOR)) {
  const portal = root.closest('[data-momo-gallery-portal]');
  const curtain = portal?.querySelector('[data-momo-gallery-curtain]');
  const enterButton = portal?.querySelector('[data-momo-gallery-enter]');
  if (portal && curtain && enterButton) setGalleryAccess(root, false);
  const ready = mountGallery(root);

  if (portal && curtain && enterButton) {
    addCurtainFeatureLockup(curtain);
    curtain.hidden = false;
    enterButton.addEventListener('click', async () => {
      try {
        await ready;
        setGalleryAccess(root, true);
        enterButton.setAttribute('aria-expanded', 'true');
        portal.classList.add('is-entered');
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          curtain.hidden = true;
        } else {
          curtain.classList.add('is-revealing');
          window.setTimeout(() => {
            curtain.hidden = true;
            curtain.classList.remove('is-revealing');
          }, 420);
        }
        root.querySelector('.momo-gallery__frame.is-selected')?.focus();
      } catch {
        // The mounted error state below remains visible and explains the failure.
      }
    });
  }

  ready.catch((error) => {
    setGalleryAccess(root, true);
    root.replaceChildren(element('p', 'momo-gallery__error', error.message));
    if (curtain) curtain.hidden = true;
  });
}

export { mountGallery, renderGallery, validateManifest };
