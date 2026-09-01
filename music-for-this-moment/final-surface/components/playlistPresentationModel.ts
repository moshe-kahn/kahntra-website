import type {
  CellNavigationDirection,
  PlaylistGridCell,
  PublicPlaylistRecord,
} from "../../features/musicForThisMoment/playlistSpace.js";
import {
  buildPlaylistGrid,
  navigatePlaylistGridCell,
  playlistGridCellId,
} from "../../features/musicForThisMoment/playlistSpace.js";

export type PlaylistPresentationModel =
  | { status: "empty" }
  | { status: "invalid"; message: string }
  | {
      status: "ready";
      cells: readonly PlaylistGridCell[];
      selectedCell: PlaylistGridCell;
      selectedCellId: string;
    };

const DEFAULT_CELL_ID = playlistGridCellId("Medium", "Medium");

export function createPlaylistPresentationModel(
  records: readonly PublicPlaylistRecord[],
  requestedCellId?: string,
  requireCompleteGrid = true,
): PlaylistPresentationModel {
  if (records.length === 0) return { status: "empty" };
  try {
    const cells = buildPlaylistGrid(records, requireCompleteGrid);
    const requested = requestedCellId
      ? cells.find((cell) => cell.id === requestedCellId)
      : cells.find((cell) => cell.id === DEFAULT_CELL_ID && cell.playlists.length > 0)
        ?? cells.find((cell) => cell.playlists.length > 0);
    if (!requested || requested.playlists.length === 0) {
      return { status: "invalid", message: "Requested Curation and Energy cell has no eligible playlists." };
    }
    return {
      status: "ready",
      cells,
      selectedCell: requested,
      selectedCellId: requested.id,
    };
  } catch {
    return { status: "invalid", message: "Playlist presentation data is invalid." };
  }
}

export function navigationDirectionForKey(key: string): CellNavigationDirection | null {
  if (key === "ArrowLeft") return "left";
  if (key === "ArrowRight") return "right";
  if (key === "ArrowUp") return "up";
  if (key === "ArrowDown") return "down";
  return null;
}

export function nextCellIdForKey(cellId: string, key: string): string {
  const direction = navigationDirectionForKey(key);
  return direction ? navigatePlaylistGridCell(cellId, direction) : cellId;
}
