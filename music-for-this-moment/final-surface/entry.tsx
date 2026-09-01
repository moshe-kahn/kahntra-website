import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { MusicForThisMomentCurtain } from "./components/MusicForThisMomentCurtain.js";
import { MusicForThisMomentPrimaryPicker } from "./components/MusicForThisMomentPrimaryPicker.js";
import { approvedPublicPlaylistLandscapeArtwork } from "./approvedPublicPlaylistLandscapeArtwork.js";
import type { PublicPlaylistRecord } from "../features/musicForThisMoment/playlistSpace.js";
import "./musicForThisMoment.css";

function PublicPage() {
  const stageRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLElement>(null);
  const [showCurtain, setShowCurtain] = useState(true);
  const [records, setRecords] = useState<readonly PublicPlaylistRecord[] | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (showCurtain) stage.setAttribute("inert", "");
    else stage.removeAttribute("inert");
  }, [showCurtain]);

  useEffect(() => {
    const readLocalJson = (path: string) => fetch(path)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(`Local data unavailable (${response.status}).`)));
    Promise.all([
      readLocalJson("/data/music-for-this-moment/public-playlists.json?v=task-0064-public-links-1"),
      readLocalJson("/data/music-for-this-moment/owner-keywords.json?v=task-0064-keyword-slots-1"),
    ])
      .then(([playlistData, keywordData]) => {
        const keywordsByPlaylistId = new Map(
          (keywordData.keywords as Array<{ publicId: string; keywords: readonly string[] }>).map((entry) => [entry.publicId, entry.keywords]),
        );
        setRecords((playlistData.playlists as PublicPlaylistRecord[]).map((record) => ({
          ...record,
          keywords: keywordsByPlaylistId.get(record.publicId) ?? [],
          tags: [`affinity-${record.affinity.toLowerCase()}`, `energy-${record.energy.toLowerCase()}`, record.ordering],
        })));
      })
      .catch((cause: Error) => setError(cause.message));
  }, []);

  const dismissCurtain = () => {
    setShowCurtain(false);
    requestAnimationFrame(() => pickerRef.current?.focus({ preventScroll: true }));
  };

  return (
    <div className="music-moment-integration" data-music-moment-source="approved-static-public-v1">
      <div className="music-moment-curtain-stage" data-curtain-open={showCurtain || undefined}>
        <div aria-hidden={showCurtain} className="music-moment-curtain-stage-content" ref={stageRef}>
          {records ? <MusicForThisMomentPrimaryPicker landscapeArtworkByPlaylistId={approvedPublicPlaylistLandscapeArtwork} pickerRef={pickerRef} records={records} /> : <p className={error ? "music-moment-state music-moment-state-error" : "music-moment-state"} role={error ? "alert" : "status"}>{error ?? "Loading the public playlist guide…"}</p>}
        </div>
        {showCurtain ? <MusicForThisMomentCurtain onExplore={dismissCurtain} /> : null}
      </div>
    </div>
  );
}

const mount = document.querySelector("[data-mftm-primary-island]");
if (mount) createRoot(mount).render(<PublicPage />);
