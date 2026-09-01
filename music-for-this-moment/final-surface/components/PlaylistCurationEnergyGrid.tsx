import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  AFFINITY_ORDER,
  ENERGY_ORDER,
  type PlaylistGridCell,
  type SpatialRankingCategory,
} from "../../features/musicForThisMoment/playlistSpace.js";
import { nextCellIdForKey } from "./playlistPresentationModel.js";

export type CurationGridDisplayMode = "clean" | "hybrid" | "labels";

export const CURATION_LABELS: Record<SpatialRankingCategory, string> = {
  Low: "Buckets",
  Medium: "Collections",
  High: "Mixtapes",
};

interface PlaylistCurationEnergyGridProps {
  cells: readonly PlaylistGridCell[];
  describedBy?: string;
  displayMode: CurationGridDisplayMode;
  landscapeArtworkByPlaylistId?: Readonly<Record<string, string>>;
  onActivateCell: (cell: PlaylistGridCell) => void;
  onNavigateCell: (cell: PlaylistGridCell) => void;
  revealedCellId?: string;
  selectedCellId: string;
}

export function PlaylistCurationEnergyGrid({
  cells,
  describedBy,
  displayMode,
  landscapeArtworkByPlaylistId,
  onActivateCell,
  onNavigateCell,
  revealedCellId,
  selectedCellId,
}: PlaylistCurationEnergyGridProps) {
  const [hoveredCellId, setHoveredCellId] = useState<string | undefined>();
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, cellId: string) => {
    const nextCellId = nextCellIdForKey(cellId, event.key);
    if (nextCellId === cellId) return;
    const nextCell = cells.find((cell) => cell.id === nextCellId);
    if (!nextCell) return;
    event.preventDefault();
    onNavigateCell(nextCell);
    requestAnimationFrame(() => buttonRefs.current.get(nextCell.id)?.focus());
  };

  const handlePointerEnter = (event: PointerEvent<HTMLDivElement>, cellId: string) => {
    if (event.pointerType === "mouse") setHoveredCellId(cellId);
  };

  const handlePointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") setHoveredCellId(undefined);
  };

  return (
    <div
      className="music-moment-grid-stage music-moment-primary-grid-stage"
      data-view-mode="zoom"
      data-zoom-display={displayMode === "clean" ? "axis" : displayMode}
    >
      <span aria-hidden="true" className="music-moment-zoom-axis" data-axis="energy">Energy →</span>
      <span aria-hidden="true" className="music-moment-zoom-axis" data-axis="affinity">Curation →</span>
      <div
        aria-describedby={describedBy}
        aria-label="Curation by Energy playlist regions"
        className="music-moment-cell-grid"
        data-primary-curation-grid="true"
        data-view-mode="zoom"
        data-zoom-display={displayMode === "clean" ? "axis" : displayMode}
        role="grid"
      >
        {ENERGY_ORDER.map((energy) => (
          <div className="music-moment-cell-grid-row" key={energy} role="row">
            {AFFINITY_ORDER.map((affinity) => {
              const cell = cells.find((candidate) => candidate.affinity === affinity && candidate.energy === energy);
              if (!cell) return null;
              const curationLabel = CURATION_LABELS[affinity];
              const label = `${curationLabel}, ${energy} Energy, ${cell.playlists.length} playlists`;
              const hovered = hoveredCellId === cell.id;
              return (
                <span className="music-moment-gridcell" key={cell.id} role="gridcell">
                  <div
                    className="music-moment-cell-postcard-shell"
                    data-cell-id={cell.id}
                    data-expanded="false"
                    data-hovered={hovered}
                    data-revealed={cell.id === revealedCellId}
                    onPointerEnter={(event) => handlePointerEnter(event, cell.id)}
                    onPointerLeave={handlePointerLeave}
                  >
                    <span aria-hidden="true" className="music-moment-cell-postcard-preview">
                      {cell.playlists.map((playlist) => {
                        const landscapePath = landscapeArtworkByPlaylistId?.[playlist.publicId]
                          ?? playlist.artwork?.localPath;
                        return (
                          <span className="music-moment-cell-postcard-preview-item" key={playlist.publicId}>
                            {landscapePath ? (
                              <img alt="" src={`/${landscapePath}`} />
                            ) : (
                              <span className="music-moment-cell-postcard-preview-fallback">
                                {playlist.title.slice(0, 1).toUpperCase()}
                              </span>
                            )}
                          </span>
                        );
                      })}
                    </span>
                    <button
                      aria-label={`Open ${label}`}
                      className="music-moment-cell-postcard-summary"
                      data-primary-curation-cell={cell.id}
                      onClick={() => onActivateCell(cell)}
                      onKeyDown={(event) => handleKeyDown(event, cell.id)}
                      ref={(node) => {
                        if (node) buttonRefs.current.set(cell.id, node);
                        else buttonRefs.current.delete(cell.id);
                      }}
                      tabIndex={cell.id === selectedCellId ? 0 : -1}
                      type="button"
                    >
                      {displayMode !== "clean" ? (
                        <span className="music-moment-cell-postcard-coordinate-group">
                          <span className="music-moment-cell-postcard-coordinate" data-axis="energy">{energy} Energy</span>
                          <span className="music-moment-cell-postcard-coordinate" data-axis="affinity">{curationLabel}</span>
                        </span>
                      ) : null}
                    </button>
                  </div>
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
