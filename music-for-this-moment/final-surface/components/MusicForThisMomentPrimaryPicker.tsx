import { useEffect, useId, useMemo, useRef, useState, type MouseEvent, type RefObject } from "react";
import {
  playlistGridCellId,
  type PublicPlaylistRecord,
  type SpatialRankingCategory,
} from "../../features/musicForThisMoment/playlistSpace.js";
import {
  AFFINITY_LABELS,
  PlaylistCurationEnergyGrid,
} from "./PlaylistCurationEnergyGrid.js";
import { PlaylistCurationFocusView } from "./PlaylistCurationFocusView.js";
import { createPlaylistPresentationModel } from "./playlistPresentationModel.js";

type PrimaryPickerViewMode = "1x1" | "3x3";

interface MusicForThisMomentPrimaryPickerProps {
  initialViewMode?: PrimaryPickerViewMode;
  landscapeArtworkByPlaylistId?: Readonly<Record<string, string>>;
  pickerRef?: RefObject<HTMLElement>;
  records: readonly PublicPlaylistRecord[];
  requireCompleteGrid?: boolean;
}

export function MusicForThisMomentPrimaryPicker({
  initialViewMode = "3x3",
  landscapeArtworkByPlaylistId,
  pickerRef: externalPickerRef,
  records,
  requireCompleteGrid = true,
}: MusicForThisMomentPrimaryPickerProps) {
  const headingId = useId();
  const helpId = useId();
  const infoButtonRef = useRef<HTMLButtonElement>(null);
  const infoPopoverRef = useRef<HTMLDivElement>(null);
  const internalPickerRef = useRef<HTMLElement>(null);
  const pickerRef = externalPickerRef ?? internalPickerRef;
  const singleViewRef = useRef<HTMLDivElement>(null);
  const focusSingleViewAfterMapSelectionRef = useRef(false);
  const [curation, setCuration] = useState<SpatialRankingCategory>("Medium");
  const [energy, setEnergy] = useState<SpatialRankingCategory>("Medium");
  const [revealedCellId, setRevealedCellId] = useState<string | undefined>();
  const [showInfo, setShowInfo] = useState(false);
  const [viewMode, setViewMode] = useState<PrimaryPickerViewMode>(initialViewMode);
  const selectedCellId = playlistGridCellId(curation, energy);
  const presentation = useMemo(
    () => createPlaylistPresentationModel(records, selectedCellId, requireCompleteGrid),
    [records, requireCompleteGrid, selectedCellId],
  );

  useEffect(() => {
    if (!showInfo) return;
    const handlePointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (infoButtonRef.current?.contains(target) || infoPopoverRef.current?.contains(target)) return;
      setShowInfo(false);
    };
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setShowInfo(false);
      infoButtonRef.current?.focus();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showInfo]);

  useEffect(() => {
    if (viewMode !== "1x1" || !focusSingleViewAfterMapSelectionRef.current) return;
    focusSingleViewAfterMapSelectionRef.current = false;
    requestAnimationFrame(() => singleViewRef.current?.focus());
  }, [viewMode]);

  if (presentation.status === "empty") {
    return (
      <section aria-label="Music for this moment primary picker" className="music-moment-state" role="status">
        <h2>No playlists available</h2>
        <p>No approved public playlists are available for this picker.</p>
      </section>
    );
  }

  if (presentation.status === "invalid") {
    return (
      <section aria-label="Music for this moment primary picker" className="music-moment-state music-moment-state-error" role="alert">
        <h2>Playlist view unavailable</h2>
        <p>{presentation.message}</p>
      </section>
    );
  }

  const selectedCell = presentation.selectedCell;
  const affinityLabel = AFFINITY_LABELS[curation];
  const primaryLocation = `${energy} Energy · ${affinityLabel} Curation`;
  const exploreRandomCell = () => {
    const alternatives = presentation.cells.filter((cell) => cell.id !== revealedCellId);
    const candidates = alternatives.length > 0 ? alternatives : presentation.cells;
    const nextCell = candidates[Math.floor(Math.random() * candidates.length)];
    if (!nextCell) return;
    setCuration(nextCell.affinity);
    setEnergy(nextCell.energy);
    setRevealedCellId(nextCell.id);
    focusSingleViewAfterMapSelectionRef.current = true;
    setViewMode("1x1");
  };
  const exitFocusView = (restoreCellFocus = false) => {
    setViewMode("3x3");
    requestAnimationFrame(() => {
      if (restoreCellFocus) {
        pickerRef.current
          ?.querySelector<HTMLButtonElement>('[data-primary-curation-cell][tabindex="0"]')
          ?.focus();
        return;
      }
      pickerRef.current?.focus({ preventScroll: true });
    });
  };
  const handlePickerSurfaceClick = (event: MouseEvent<HTMLElement>) => {
    if (viewMode !== "1x1") return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest(".music-moment-region-artwork")) return;
    if (target.closest(".music-moment-primary-neighbor")) return;
    if (target.closest(".music-moment-primary-map-control")) return;
    if (target.closest(".music-moment-info-control")) return;
    exitFocusView(false);
  };

  return (
    <section
      aria-label="Music for this moment Curation by Energy picker"
      className="music-moment-picker music-moment-primary-picker"
      data-primary-music-moment-picker="true"
      ref={pickerRef}
      tabIndex={-1}
    >
      <p aria-live="polite" className="music-moment-live-status">
        {`${affinityLabel} Curation, ${energy} Energy. ${selectedCell.playlists.length} playlists.`}
      </p>
      <section
        aria-labelledby={headingId}
        className="music-moment-map-section"
        data-background-action={viewMode === "1x1" ? "exit" : undefined}
        onClick={handlePickerSurfaceClick}
      >
        <header className="music-moment-section-heading">
          <div className="music-moment-primary-map-legend" data-view-mode={viewMode}>
            <div className="music-moment-map-title-row">
              <h2 id={headingId}>Curation × Energy</h2>
              <div className="music-moment-info-control">
                <button
                  aria-controls={helpId}
                  aria-expanded={showInfo}
                  aria-haspopup="dialog"
                  aria-label="About Curation and Energy"
                  className="music-moment-info-button"
                  onClick={() => setShowInfo((current) => !current)}
                  ref={infoButtonRef}
                  type="button"
                >
                  <span aria-hidden="true">i</span>
                </button>
                <div
                  aria-label="About Curation, Energy, and artwork"
                  className="music-moment-info-popover"
                  hidden={!showInfo}
                  id={helpId}
                  ref={infoPopoverRef}
                  role="dialog"
                >
                  <div className="music-moment-info-section">
                    <strong>Curation</strong>
                    <span>Personal attachment and familiarity. Low Curation does not mean dislike.</span>
                  </div>
                  <div className="music-moment-info-section">
                    <strong>Energy</strong>
                    <span>Perceived activation: how active or calm the music feels.</span>
                  </div>
                </div>
              </div>
            </div>
            {viewMode === "1x1" ? <p className="music-moment-primary-location">{primaryLocation}</p> : <span aria-hidden="true" />}
            {viewMode === "3x3" ? (
              <button
                aria-label="Focus a random playlist region"
                className="music-moment-primary-map-control music-moment-primary-map-control-explore"
                onClick={exploreRandomCell}
                type="button"
              >
                <span>Focus a random region</span>
                <span aria-hidden="true" className="music-moment-primary-map-control-arrow">→</span>
              </button>
            ) : (
              <button
                className="music-moment-primary-map-control"
                onClick={(event) => {
                  event.stopPropagation();
                  exitFocusView(event.detail === 0);
                }}
                type="button"
              >
                <span aria-hidden="true" className="music-moment-primary-map-control-arrow">←</span>
                <span>Back to map</span>
              </button>
            )}
          </div>
        </header>

        {viewMode === "3x3" ? (
          <PlaylistCurationEnergyGrid
            cells={presentation.cells}
            describedBy={showInfo ? helpId : undefined}
            displayMode="hybrid"
            landscapeArtworkByPlaylistId={landscapeArtworkByPlaylistId}
            onActivateCell={(cell) => {
              setCuration(cell.affinity);
              setEnergy(cell.energy);
              setRevealedCellId(cell.id);
              focusSingleViewAfterMapSelectionRef.current = true;
              setViewMode("1x1");
            }}
            onNavigateCell={(cell) => {
              setCuration(cell.affinity);
              setEnergy(cell.energy);
            }}
            revealedCellId={revealedCellId}
            selectedCellId={selectedCellId}
          />
        ) : (
          <PlaylistCurationFocusView
            cell={selectedCell}
            cells={presentation.cells}
            focusRef={singleViewRef}
            landscapeArtworkByPlaylistId={landscapeArtworkByPlaylistId}
            onExit={() => exitFocusView(true)}
            onSelectCell={(cell) => {
              setCuration(cell.affinity);
              setEnergy(cell.energy);
              setRevealedCellId(cell.id);
            }}
          />
        )}
      </section>
    </section>
  );
}
