import type { PublicPlaylistRecord } from "../../features/musicForThisMoment/playlistSpace.js";

interface PlaylistArtworkProps {
  landscape?: boolean;
  localPath?: string;
  playlist: PublicPlaylistRecord;
}

export function PlaylistArtwork({ landscape = false, localPath, playlist }: PlaylistArtworkProps) {
  const resolvedPath = localPath ?? playlist.artwork?.localPath;
  if (!resolvedPath) {
    return (
      <span
        aria-hidden="true"
        className={`music-moment-artwork-fallback${landscape ? " music-moment-artwork-landscape" : ""}`}
      >
        {playlist.title.slice(0, 1).toUpperCase()}
      </span>
    );
  }
  return (
    <img
      alt={playlist.artwork?.alt ?? `Artwork for the ${playlist.title} playlist`}
      className={`music-moment-artwork${landscape ? " music-moment-artwork-landscape" : ""}`}
      decoding="async"
      loading="lazy"
      src={`/${resolvedPath}`}
    />
  );
}
