import { access, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = process.argv[2]
  ? resolve(process.argv[2])
  : join(root, 'data', 'momo-editions-gallery.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const exact = (value, keys) =>
  value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).sort().join('|') === [...keys].sort().join('|');
const text = (value) => typeof value === 'string' && value.trim().length > 0;
const percent = (value) => Number.isFinite(value) && value >= 0 && value <= 100;
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(exact(manifest, ['collection', 'items', 'schemaVersion']), 'Invalid top-level keys.');
assert(manifest.schemaVersion === 6, 'Unsupported schemaVersion.');
assert(exact(manifest.collection, ['eyebrow', 'introduction', 'title']), 'Invalid collection keys.');
assert(Object.values(manifest.collection).every(text), 'Collection copy must be nonblank.');
assert(Array.isArray(manifest.items) && manifest.items.length > 0, 'At least one item is required.');

const ids = new Set();
const uids = new Set();
const orders = new Set();
const itemKeys = [
  'actors',
  'alt',
  'contentRating',
  'director',
  'genres',
  'id',
  'image',
  'order',
  'railFraming',
  'railImage',
  'runtimeMinutes',
  'sourceUid',
  'title',
  'year'
];
for (const item of manifest.items) {
  assert(exact(item, itemKeys), `${item.id || 'Unknown item'} has invalid keys.`);
  assert(text(item.id) && /^[a-z0-9-]+$/.test(item.id), 'Invalid item ID.');
  assert(Number.isInteger(item.sourceUid) && item.sourceUid > 0, `${item.id} has an invalid sourceUid.`);
  assert(
    text(item.title) &&
      text(item.alt) &&
      text(item.director),
    `${item.id} has blank public text.`
  );
  assert(
    Array.isArray(item.genres) &&
      item.genres.length >= 1 &&
      item.genres.length <= 4 &&
      item.genres.every(text) &&
      new Set(item.genres).size === item.genres.length,
    `${item.id} has invalid genres.`
  );
  assert(!item.genres.includes('Science Fiction'), `${item.id} must use Sci-Fi instead of Science Fiction.`);
  assert(
    Array.isArray(item.actors) &&
      item.actors.length >= 1 &&
      item.actors.length <= 6 &&
      item.actors.every(text) &&
      new Set(item.actors).size === item.actors.length,
    `${item.id} has invalid actors.`
  );
  assert(Number.isInteger(item.year) && item.year >= 1888 && item.year <= 2100, `${item.id} has an invalid year.`);
  assert(
    Number.isInteger(item.runtimeMinutes) && item.runtimeMinutes > 0 && item.runtimeMinutes <= 1000,
    `${item.id} has invalid runtimeMinutes.`
  );
  assert(
    ['G', 'PG', 'PG-13', 'R', 'NC-17', 'UNRATED'].includes(item.contentRating),
    `${item.id} has an invalid content rating.`
  );
  assert(Number.isInteger(item.order) && item.order > 0, `${item.id} has an invalid order.`);
  assert(/^assets\/[a-z0-9-]+\.webp$/.test(item.image), `${item.id} has an unsafe image path.`);
  assert(/^assets\/[a-z0-9-]+\.webp$/.test(item.railImage), `${item.id} has an unsafe rail image path.`);
  assert(!ids.has(item.id) && !uids.has(item.sourceUid) && !orders.has(item.order), 'IDs, source UIDs, and orders must be unique.');
  ids.add(item.id);
  uids.add(item.sourceUid);
  orders.add(item.order);

  assert(exact(item.railFraming, ['cropZoom', 'focalX', 'focalY']), `${item.id} has invalid rail-framing keys.`);
  assert(
    percent(item.railFraming.focalX) && percent(item.railFraming.focalY),
    `${item.id} has invalid focal coordinates.`
  );
  assert(
    Number.isFinite(item.railFraming.cropZoom) &&
      item.railFraming.cropZoom >= 1 &&
      item.railFraming.cropZoom <= 2.5,
    `${item.id} has an invalid cropZoom.`
  );
  const localImagePath = item.image.replace(/^assets\//, 'assets/momo-editions/');
  const localRailImagePath = item.railImage.replace(/^assets\//, 'assets/momo-editions/');
  await access(join(root, localImagePath));
  await access(join(root, localRailImagePath));
}

const continuousOrders = [...orders].sort((a, b) => a - b).every((value, index) => value === index + 1);
assert(continuousOrders, 'Orders must form one continuous sequence beginning at 1.');
console.log(`Validated ${manifest.items.length} public Momo Editions.`);
