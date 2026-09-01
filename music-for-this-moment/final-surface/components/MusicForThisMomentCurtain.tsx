interface MusicForThisMomentCurtainProps {
  onExplore: () => void;
}

export function MusicForThisMomentCurtain({ onExplore }: MusicForThisMomentCurtainProps) {
  return (
    <button aria-label="Explore Music for the Moment playlist guide" className="music-moment-curtain" onClick={onExplore} type="button">
      <span className="music-moment-curtain-credit">
        <span>A</span>
        <img alt="ListenLab" src="/assets/music-for-this-moment/brand/listenlab-wordmark-color-on-dark.svg" />
        <span>experiment</span>
      </span>
      <span className="music-moment-curtain-content">
        <span className="music-moment-curtain-title">Music for the Moment</span>
        <span className="music-moment-curtain-subtitle">Interactive playlist guide</span>
        <span className="music-moment-curtain-explore">Explore <span aria-hidden="true">→</span></span>
      </span>
    </button>
  );
}
