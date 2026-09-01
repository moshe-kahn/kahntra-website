import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { MusicForThisMomentCurtain } from "./components/MusicForThisMomentCurtain.js";
import { MusicForThisMomentPrimaryPicker } from "./components/MusicForThisMomentPrimaryPicker.js";
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
    fetch("/data/music-for-this-moment/public-playlists.json?v=task-0064-public-links-1")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(`Local data unavailable (${response.status}).`)))
      .then((data) => setRecords((data.playlists as PublicPlaylistRecord[]).map((record) => ({
        ...record,
        tags: [`affinity-${record.affinity.toLowerCase()}`, `energy-${record.energy.toLowerCase()}`, record.ordering],
      }))))
      .catch((cause: Error) => setError(cause.message));
  }, []);

  const dismissCurtain = () => {
    setShowCurtain(false);
    requestAnimationFrame(() => pickerRef.current?.focus({ preventScroll: true }));
  };

  return (
    <main className="music-moment-integration" data-music-moment-source="approved-static-public-v1">
      <header className="music-moment-integration-header">
        <h1 id="music-for-this-moment-title">Music for the Moment</h1>
        <p className="music-moment-integration-subtitle">Interactive playlist guide</p>
      </header>
      <div className="music-moment-curtain-stage" data-curtain-open={showCurtain || undefined}>
        <div aria-hidden={showCurtain} className="music-moment-curtain-stage-content" ref={stageRef}>
          {records ? <MusicForThisMomentPrimaryPicker pickerRef={pickerRef} records={records} /> : <p className={error ? "music-moment-state music-moment-state-error" : "music-moment-state"} role={error ? "alert" : "status"}>{error ?? "Loading the public playlist guide…"}</p>}
        </div>
        {showCurtain ? <MusicForThisMomentCurtain onExplore={dismissCurtain} /> : null}
      </div>
      <p className="music-moment-kahntra-boundary">Public local artwork and metadata only. No listening service is connected.</p>
    </main>
  );
}

const mount = document.querySelector("[data-mftm-primary-island]");
if (mount) createRoot(mount).render(<PublicPage />);
