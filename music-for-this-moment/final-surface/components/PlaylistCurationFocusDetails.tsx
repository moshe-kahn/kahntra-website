import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import type { PlaylistGridCell } from "../../features/musicForThisMoment/playlistSpace.js";
import { PlaylistArtwork } from "./PlaylistArtwork.js";
import { mobileFocusPlaylists } from "./playlistPresentationModel.js";
import { SpotifyIcon } from "./SpotifyIcon.js";

interface PlaylistCurationFocusDetailsProps {
  cell: PlaylistGridCell;
  landscapeArtworkByPlaylistId?: Readonly<Record<string, string>>;
  useMobilePresentation?: boolean;
}

export function PlaylistCurationFocusDetails({
  cell,
  landscapeArtworkByPlaylistId,
  useMobilePresentation = false,
}: PlaylistCurationFocusDetailsProps) {
  const detailsRef = useRef<HTMLElement>(null);
  const lastImagePointerTypeRef = useRef("mouse");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | undefined>();
  const playlists = useMobilePresentation ? mobileFocusPlaylists(cell) : cell.playlists;

  useEffect(() => {
    if (!selectedPlaylistId) return;
    const dismissOutside = (event: globalThis.PointerEvent) => {
      const target = event.target;
      const targetCard = target instanceof Element
        ? target.closest("[data-playlist-region-detail]")
        : null;
      if (
        targetCard
        && detailsRef.current?.contains(targetCard)
        && targetCard.getAttribute("data-playlist-region-detail") === selectedPlaylistId
      ) return;
      setSelectedPlaylistId(undefined);
    };
    document.addEventListener("pointerdown", dismissOutside);
    return () => document.removeEventListener("pointerdown", dismissOutside);
  }, [selectedPlaylistId]);

  const handleImagePointerDown = (event: PointerEvent<HTMLAnchorElement>) => {
    lastImagePointerTypeRef.current = event.pointerType;
  };
  const handleImageClick = (event: MouseEvent<HTMLAnchorElement>, playlistId: string) => {
    if (event.detail === 0 || lastImagePointerTypeRef.current === "mouse") return;
    if (selectedPlaylistId === playlistId) return;
    event.preventDefault();
    setSelectedPlaylistId(playlistId);
  };
  const handleFallbackPointerUp = (event: PointerEvent<HTMLElement>, playlistId: string) => {
    if (event.pointerType === "mouse") return;
    const target = event.target;
    if (target instanceof Element && target.closest("a, button")) return;
    setSelectedPlaylistId((current) => current === playlistId ? undefined : playlistId);
  };
  return (
    <section
      aria-label="Single Curation and Energy playlist result"
      className="music-moment-primary-focus-details"
      data-show-controls="false"
      ref={detailsRef}
    >
      <div className="music-moment-card-grid">
        {playlists.map((playlist) => {
          const actionRevealed = selectedPlaylistId === playlist.publicId;
          const keywords = playlist.keywords ?? [];
          return (
            <article
              className="music-moment-playlist-card music-moment-primary-focus-card"
              data-action-revealed={actionRevealed}
              data-playlist-region-detail={playlist.publicId}
              key={playlist.publicId}
              onPointerUp={playlist.outboundUrl
                ? undefined
                : (event) => handleFallbackPointerUp(event, playlist.publicId)}
            >
              <div className="music-moment-region-artwork">
                <PlaylistArtwork
                  landscape
                  localPath={landscapeArtworkByPlaylistId?.[playlist.publicId]}
                  playlist={playlist}
                />
                {playlist.outboundUrl ? (
                  <a
                    aria-label={`Open ${playlist.title} on Spotify`}
                    className="music-moment-primary-image-link"
                    href={playlist.outboundUrl}
                    onClick={(event) => handleImageClick(event, playlist.publicId)}
                    onPointerDown={handleImagePointerDown}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {keywords.length > 0 ? <span aria-hidden="true" className="music-moment-primary-keywords">{keywords.join(" · ")}</span> : null}
                    <SpotifyIcon />
                  </a>
                ) : null}
              </div>
              <div className="music-moment-primary-focus-caption">
                <div className="music-moment-primary-focus-title-row">
                  <h3 className="playlist-title">{playlist.title}</h3>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
