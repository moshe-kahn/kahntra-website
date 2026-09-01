import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const fail = (message) => {
  throw new Error(`TASK-0064 corrected-picker check: ${message}`);
};
const manifest = JSON.parse(await readFile(resolve(root, "data/music-for-this-moment/public-playlists.json"), "utf8"));
const playlists = manifest.playlists;
const keywordManifest = JSON.parse(await readFile(resolve(root, "data/music-for-this-moment/owner-keywords.json"), "utf8"));

if (!Array.isArray(playlists) || playlists.length !== 36) fail("expected exactly 36 public playlists");
const keywordEntries = keywordManifest.keywords;
if (!Array.isArray(keywordEntries) || keywordEntries.length !== playlists.length
  || keywordEntries.some((entry) => !Array.isArray(entry.keywords) || entry.keywords.length !== 0)
  || new Set(keywordEntries.map((entry) => entry.publicId)).size !== playlists.length
  || keywordEntries.some((entry) => !playlists.some((playlist) => playlist.publicId === entry.publicId))) {
  fail("keywords must remain owner-editable and blank at this stage");
}
const urls = playlists.map((playlist) => playlist.outboundUrl);
if (urls.some((url) => typeof url !== "string" || !/^https:\/\/open\.spotify\.com\/playlist\/[A-Za-z0-9]+$/.test(url))) {
  fail("each playlist needs one exact public Spotify playlist URL");
}
if (new Set(urls).size !== playlists.length) fail("public playlist URLs must be unique");

const artwork = await readdir(resolve(root, "assets/music-for-this-moment/artwork"));
if (artwork.filter((entry) => entry.endsWith(".jpg")).length !== 36) fail("expected exactly 36 approved local artwork files");
const banners = await readdir(resolve(root, "assets/music-for-this-moment/banner"));
if (banners.filter((entry) => entry.endsWith(".jpg")).length !== 36) fail("expected exactly 36 approved 3:2 banner crops");

const index = await readFile(resolve(root, "index.html"), "utf8");
if (!index.includes('data-mftm-primary-island') || !index.includes('music-for-this-moment/playlist-showcase.island.js')) {
  fail("primary picker island is not mounted in the Showcase");
}
if (index.includes("Previous explorations")) fail("experimental lower picker must not be mounted");
if (!index.includes('class="showcase__card showcase__card--music"') || !index.includes('music-for-this-moment__anchor')) {
  fail("picker needs its own Momo-style Showcase heading rather than a nested card");
}

const entry = await readFile(resolve(root, "music-for-this-moment/final-surface/entry.tsx"), "utf8");
const picker = await readFile(resolve(root, "music-for-this-moment/final-surface/components/MusicForThisMomentPrimaryPicker.tsx"), "utf8");
const pickerStyles = await readFile(resolve(root, "music-for-this-moment/final-surface/musicForThisMoment.css"), "utf8");
const landscapeArtwork = await readFile(resolve(root, "music-for-this-moment/final-surface/approvedPublicPlaylistLandscapeArtwork.ts"), "utf8");
const curtain = await readFile(resolve(root, "music-for-this-moment/final-surface/components/MusicForThisMomentCurtain.tsx"), "utf8");
if (entry.includes("No listening service is connected")) fail("removed boundary sentence is still mounted");
if (!picker.includes("Curation × Energy") || picker.includes("Affinity × Energy")) fail("public axis language must use Curation");
if (!picker.includes("Buckets are open groupings") || !picker.includes("Collections gather music") || !picker.includes("Mixtapes are deliberately sequenced") || picker.includes("Personal attachment and familiarity")) {
  fail("Curation needs Bucket, Collection, and Mixtape language rather than inherited Affinity copy");
}
if (!pickerStyles.includes(".music-moment-primary-focus-card .music-moment-artwork-landscape {\n  height: 100%;\n  object-fit: cover;")) {
  fail("focus artwork must use the approved 3:2 crop treatment");
}
if (playlists.some((playlist) => !landscapeArtwork.includes(`assets/music-for-this-moment/banner/${playlist.publicId}.jpg`))) {
  fail("each playlist must resolve to its supplied 3:2 banner crop");
}
if (!curtain.includes("listenlab-wordmark-color-on-dark.svg")) fail("curtain must use the dark-background ListenLab wordmark");

console.log("TASK-0064 corrected picker: 36 public records, blank keyword slots, exact direct links, local artwork, and one primary mount verified.");
