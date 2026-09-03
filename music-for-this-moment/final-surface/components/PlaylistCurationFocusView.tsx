import type { KeyboardEvent, RefObject } from "react";
import {
  AFFINITY_ORDER,
  ENERGY_ORDER,
  type PlaylistGridCell,
} from "../../features/musicForThisMoment/playlistSpace.js";
import { mobileFocusPlaylists } from "./playlistPresentationModel.js";
import { PlaylistCurationFocusDetails } from "./PlaylistCurationFocusDetails.js";
import { CURATION_LABELS } from "./PlaylistCurationEnergyGrid.js";

type NeighborDirection =
  | "top-left"
  | "top"
  | "top-right"
  | "right"
  | "bottom-right"
  | "bottom"
  | "bottom-left"
  | "left";

const NEIGHBOR_DIRECTIONS: readonly NeighborDirection[] = [
  "top-left",
  "top-right",
  "bottom-right",
  "bottom-left",
  "top",
  "right",
  "bottom",
  "left",
];

const NEIGHBOR_DELTAS: Readonly<Record<NeighborDirection, readonly [number, number]>> = {
  "top-left": [-1, -1],
  top: [0, -1],
  "top-right": [1, -1],
  right: [1, 0],
  "bottom-right": [1, 1],
  bottom: [0, 1],
  "bottom-left": [-1, 1],
  left: [-1, 0],
};

const VISIBLE_PLAYLIST_INDEXES: Readonly<Record<NeighborDirection, readonly number[]>> = {
  "top-left": [3],
  top: [2, 3],
  "top-right": [2],
  right: [0, 2],
  "bottom-right": [0],
  bottom: [0, 1],
  "bottom-left": [1],
  left: [1, 3],
};

interface PlaylistCurationFocusViewProps {
  cell: PlaylistGridCell;
  cells: readonly PlaylistGridCell[];
  focusRef: RefObject<HTMLDivElement>;
  landscapeArtworkByPlaylistId?: Readonly<Record<string, string>>;
  onExit: () => void;
  onSelectCell: (cell: PlaylistGridCell) => void;
  useMobilePresentation?: boolean;
}

function neighborCell(
  cells: readonly PlaylistGridCell[],
  cell: PlaylistGridCell,
  direction: NeighborDirection,
): PlaylistGridCell | undefined {
  const affinityIndex = AFFINITY_ORDER.indexOf(cell.affinity);
  const energyIndex = ENERGY_ORDER.indexOf(cell.energy);
  const [affinityDelta, energyDelta] = NEIGHBOR_DELTAS[direction];
  const nextAffinityIndex = affinityIndex + affinityDelta;
  const nextEnergyIndex = energyIndex + energyDelta;
  const nextAffinity = AFFINITY_ORDER[nextAffinityIndex];
  const nextEnergy = ENERGY_ORDER[nextEnergyIndex];
  if (!nextAffinity || !nextEnergy) return undefined;
  return cells.find((candidate) => candidate.affinity === nextAffinity && candidate.energy === nextEnergy);
}

export function PlaylistCurationFocusView({
  cell,
  cells,
  focusRef,
  landscapeArtworkByPlaylistId,
  onExit,
  onSelectCell,
  useMobilePresentation = false,
}: PlaylistCurationFocusViewProps) {
  const curationLabel = CURATION_LABELS[cell.affinity];

  const selectNeighbor = (neighbor: PlaylistGridCell) => {
    onSelectCell(neighbor);
    requestAnimationFrame(() => focusRef.current?.focus());
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Escape") {
      event.preventDefault();
      onExit();
      return;
    }
    const directionByKey: Partial<Record<string, NeighborDirection>> = {
      ArrowUp: "top",
      ArrowRight: "right",
      ArrowDown: "bottom",
      ArrowLeft: "left",
    };
    const direction = directionByKey[event.key];
    if (!direction) return;
    const neighbor = neighborCell(cells, cell, direction);
    if (!neighbor) return;
    event.preventDefault();
    onSelectCell(neighbor);
  };

  return (
    <div
      aria-label={`${cell.energy} Energy, ${curationLabel}, 1 by 1 view. Use arrow keys for neighboring regions or Escape for the map.`}
      className="music-moment-primary-focused-view music-moment-primary-region-surface"
      data-curation={cell.affinity.toLowerCase()}
      data-energy={cell.energy.toLowerCase()}
      onKeyDown={handleKeyDown}
      ref={focusRef}
      tabIndex={-1}
    >
      {NEIGHBOR_DIRECTIONS.map((direction) => {
        const neighbor = neighborCell(cells, cell, direction);
        if (!neighbor) return null;
        const neighborCurationLabel = CURATION_LABELS[neighbor.affinity];
        const neighborPlaylists = useMobilePresentation ? mobileFocusPlaylists(neighbor) : neighbor.playlists;
        const visiblePlaylists = VISIBLE_PLAYLIST_INDEXES[direction]
          .map((index) => neighborPlaylists[index])
          .filter((playlist) => playlist !== undefined);
        return (
          <button
            aria-label={`Move ${direction} to ${neighborCurationLabel}, ${neighbor.energy} Energy`}
            className="music-moment-primary-neighbor music-moment-primary-region-surface"
            data-curation={neighbor.affinity.toLowerCase()}
            data-direction={direction}
            data-energy={neighbor.energy.toLowerCase()}
            key={direction}
            onClick={() => selectNeighbor(neighbor)}
            type="button"
            >
            <span aria-hidden="true" className="music-moment-primary-neighbor-preview">
              {visiblePlaylists.map((playlist) => {
                const landscapePath = landscapeArtworkByPlaylistId?.[playlist.publicId]
                  ?? playlist.artwork?.localPath;
                return (
                  <span className="music-moment-primary-neighbor-preview-item" key={playlist.publicId}>
                    {landscapePath ? (
                      <img alt="" src={`/${landscapePath}`} />
                    ) : (
                      <span>{playlist.title.slice(0, 1).toUpperCase()}</span>
                    )}
                  </span>
                );
              })}
              </span>
              <span aria-hidden="true" className="music-moment-primary-neighbor-caret">
                ›
              </span>
            </button>
        );
      })}

      <div className="music-moment-primary-focus-center">
        <PlaylistCurationFocusDetails
          cell={cell}
          landscapeArtworkByPlaylistId={landscapeArtworkByPlaylistId}
          useMobilePresentation={useMobilePresentation}
        />
      </div>
    </div>
  );
}
