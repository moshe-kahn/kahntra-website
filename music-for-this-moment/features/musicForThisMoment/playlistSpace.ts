export type SpatialRankingCategory = "Low" | "Medium" | "High";
export type CellNavigationDirection = "left" | "right" | "up" | "down";

export interface PublicArtwork {
  localPath: string;
  alt: string;
  credit: string;
  rightsStatement: string;
}

export interface PublicPlaylistRecord {
  publicId: string;
  title: string;
  shortDescription: string;
  outboundUrl?: string;
  affinity: SpatialRankingCategory;
  energy: SpatialRankingCategory;
  experienceConsistency: number;
  tags: readonly string[];
  ordering: "ordered" | "partially ordered" | "unordered";
  datasetVersion: string;
  artwork?: PublicArtwork;
}

export interface PlaylistGridCell {
  id: string;
  affinity: SpatialRankingCategory;
  energy: SpatialRankingCategory;
  playlists: readonly PublicPlaylistRecord[];
}

export const AFFINITY_ORDER = ["Low", "Medium", "High"] as const;
export const ENERGY_ORDER = ["High", "Medium", "Low"] as const;

export function playlistGridCellId(affinity: SpatialRankingCategory, energy: SpatialRankingCategory): string {
  return `affinity-${affinity.toLowerCase()}-energy-${energy.toLowerCase()}`;
}

export function buildPlaylistGrid(records: readonly PublicPlaylistRecord[], requireCompleteGrid = true): readonly PlaylistGridCell[] {
  const cells = ENERGY_ORDER.flatMap((energy) => AFFINITY_ORDER.map((affinity) => ({
    id: playlistGridCellId(affinity, energy),
    affinity,
    energy,
    playlists: records
      .filter((record) => record.affinity === affinity && record.energy === energy)
      .sort((left, right) => left.title.localeCompare(right.title, "en", { sensitivity: "base" }) || left.publicId.localeCompare(right.publicId)),
  })));
  if (requireCompleteGrid && cells.some((cell) => cell.playlists.length !== 4)) {
    throw new Error("The approved public playlist grid must contain four playlists in every Affinity and Energy cell.");
  }
  return cells;
}

export function navigatePlaylistGridCell(cellId: string, direction: CellNavigationDirection): string {
  const cell = /^affinity-(low|medium|high)-energy-(low|medium|high)$/.exec(cellId);
  if (!cell) return cellId;
  const affinity = cell[1].slice(0, 1).toUpperCase() + cell[1].slice(1) as SpatialRankingCategory;
  const energy = cell[2].slice(0, 1).toUpperCase() + cell[2].slice(1) as SpatialRankingCategory;
  const affinityIndex = AFFINITY_ORDER.indexOf(affinity);
  const energyIndex = ENERGY_ORDER.indexOf(energy);
  const nextAffinity = AFFINITY_ORDER[affinityIndex + (direction === "left" ? -1 : direction === "right" ? 1 : 0)] ?? affinity;
  const nextEnergy = ENERGY_ORDER[energyIndex + (direction === "up" ? -1 : direction === "down" ? 1 : 0)] ?? energy;
  return playlistGridCellId(nextAffinity, nextEnergy);
}
