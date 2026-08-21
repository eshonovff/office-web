import { AlertCircle, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';

interface VideoMessageProps {
  src: string | null;
  posterUrl?: string | null;
  disabled?: boolean;
  sizeLabel?: string;
  /**
   * Fires on the native <video> element's own error event — the fetch
   * (useMessageBlobUrl) already succeeded with a 200 and real bytes, but
   * the browser couldn't decode them as video. Distinct from every status
   * useMessageBlobUrl tracks, and the only way to catch e.g. a provider
   * having saved something that isn't actually a playable video file.
   */
  onPlaybackError?: () => void;
}

export function VideoMessage({ src, posterUrl, disabled = false, sizeLabel, onPlaybackError }: VideoMessageProps) {
  const { t } = useTranslation('inbox');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [decodeFailed, setDecodeFailed] = useState(false);

  useEffect(() => setDecodeFailed(false), [src]);

  function play() {
    if (disabled || !src || decodeFailed) return;
    void videoRef.current?.play();
  }

  return (
    <div
      className={cn('relative max-h-64 max-w-full overflow-hidden rounded-md bg-black', disabled && 'opacity-70')}
      data-testid="video-message">
      <video
        ref={videoRef}
        src={src ?? undefined}
        poster={posterUrl ?? undefined}
        controls={playing}
        playsInline
        preload="metadata"
        className="block max-h-64 max-w-full rounded-md object-contain"
        onPlay={() => setPlaying(true)}
        onEnded={() => setPlaying(false)}
        onError={() => {
          setDecodeFailed(true);
          onPlaybackError?.();
        }}
      />
      {decodeFailed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50 text-white" data-testid="video-playback-error">
          <AlertCircle className="h-5 w-5" />
          <span className="text-2xs">{t('videoPlaybackFailed')}</span>
        </div>
      ) : (
        !playing && (
          <button
            type="button"
            aria-label={t('videoPlay')}
            disabled={disabled || !src}
            onClick={play}
            data-testid="video-play-button"
            className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors hover:bg-black/25 disabled:cursor-default disabled:hover:bg-black/10">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white shadow-sm">
              <Play className="h-5 w-5 translate-x-0.5" fill="currentColor" />
            </span>
          </button>
        )
      )}
      {!playing && !decodeFailed && sizeLabel && (
        <span className="absolute right-1.5 bottom-1.5 rounded bg-black/55 px-1.5 py-0.5 text-2xs text-white">{sizeLabel}</span>
      )}
    </div>
  );
}
