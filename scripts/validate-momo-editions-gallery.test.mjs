import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = dirname(fileURLToPath(import.meta.url));
const validator = join(root, 'validate-momo-editions-gallery.mjs');
const baseline = JSON.parse(
  await readFile(join(root, '..', 'data', 'momo-editions-gallery.json'), 'utf8')
);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function validate(value) {
  const directory = await mkdtemp(join(tmpdir(), 'momo-gallery-validation-'));
  const path = join(directory, 'gallery.json');
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
  return execFileAsync(process.execPath, [validator, path]);
}

async function rejects(value, pattern) {
  await assert.rejects(validate(value), pattern);
}

test('accepts the reviewed public manifest', async () => {
  const { stdout } = await validate(baseline);
  assert.match(stdout, /Validated 29 public Momo Editions\./);
  assert.deepEqual(
    baseline.items.slice().sort((a, b) => a.order - b.order).map((item) => item.sourceUid),
    [
      77, 618, 625, 528, 529, 486, 138, 92, 39, 222, 298, 112, 289, 460, 338,
      433, 350, 373, 327, 923, 1750, 426, 144, 1050, 559, 150, 184, 355, 177
    ]
  );
  assert.deepEqual(
    Object.fromEntries(
      [...new Set(baseline.items.map((item) => item.contentRating))]
        .sort()
        .map((rating) => [rating, baseline.items.filter((item) => item.contentRating === rating).length])
    ),
    { PG: 3, 'PG-13': 7, R: 19 }
  );
});

test('rejects unknown manifest keys', async () => {
  const value = clone(baseline);
  value.items[0].privateNote = 'not public';
  await rejects(value, /invalid keys/i);
});

test('rejects unsafe and missing image paths', async () => {
  const unsafe = clone(baseline);
  unsafe.items[0].image = '../private/original.png';
  await rejects(unsafe, /unsafe image path/i);

  const missing = clone(baseline);
  missing.items[0].image = 'assets/not-present.webp';
  await rejects(missing, /ENOENT/);

  const unsafeRail = clone(baseline);
  unsafeRail.items[0].railImage = '../private/rail.png';
  await rejects(unsafeRail, /unsafe rail image path/i);
});

test('rejects duplicate identity and ordering values', async () => {
  const duplicateId = clone(baseline);
  duplicateId.items[1].id = duplicateId.items[0].id;
  await rejects(duplicateId, /must be unique/i);

  const duplicateUid = clone(baseline);
  duplicateUid.items[1].sourceUid = duplicateUid.items[0].sourceUid;
  await rejects(duplicateUid, /must be unique/i);

  const duplicateOrder = clone(baseline);
  duplicateOrder.items[1].order = duplicateOrder.items[0].order;
  await rejects(duplicateOrder, /must be unique/i);
});

test('rejects invalid categories, framing, and discontinuous ordering', async () => {
  const genres = clone(baseline);
  genres.items[0].genres = [];
  await rejects(genres, /invalid genres/i);

  const longScienceFiction = clone(baseline);
  longScienceFiction.items[0].genres = ['Science Fiction'];
  await rejects(longScienceFiction, /must use Sci-Fi/i);

  const framing = clone(baseline);
  framing.items[0].railFraming.cropZoom = 2.6;
  await rejects(framing, /invalid cropZoom/i);

  const runtime = clone(baseline);
  runtime.items[0].runtimeMinutes = 0;
  await rejects(runtime, /runtimeMinutes/i);

  const contentRating = clone(baseline);
  contentRating.items[0].contentRating = 'TV-MA';
  await rejects(contentRating, /invalid content rating/i);

  const actors = clone(baseline);
  actors.items[0].actors = [];
  await rejects(actors, /actors/i);

  const order = clone(baseline);
  order.items[order.items.length - 1].order = 30;
  await rejects(order, /continuous sequence/i);
});
