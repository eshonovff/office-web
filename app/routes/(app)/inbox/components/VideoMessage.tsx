import { AlertCircle, Download, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
import { formatDownloadProgress } from '../formatMediaSize';
import type { DownloadProgress } from '../useMessageBlobUrl';
import { DownloadProgressRing } from './DownloadProgressRing';

interface VideoMessageProps {
  /** 'idle' = not yet fetched from our server (Telegram-style: thumbnail + download button first). */
  downloadState: 'idle' | 'downloading' | 'ready';
  objectUrl: string | null;
  progress: DownloadProgress | null;
  posterUrl?: string | null;
  disabled?: boolean;
  sizeLabel?: string;
  /**
   * Not populated by the backend yet (video thumbnails/duration were deferred, see PROGRESS.md) —
   * once MediaDownloadJob starts probing video duration, this switches the corner label from size
   * to duration automatically. Until then it's always null and sizeLabel is shown instead.
   */
  durationLabel?: string | null;
  onStartDownload: () => void;
  onCancelDownload: () => void;
  /**
   * Fires on the native <video> element's own error event — the fetch
   * (useMessageBlobUrl) already succeeded with a 200 and real bytes, but
   * the browser couldn't decode them as video. Distinct from every status
   * useMessageBlobUrl tracks, and the only way to catch e.g. a provider
   * having saved something that isn't actually a playable video file.
   */
  onPlaybackError?: () => void;
}

export function VideoMessage({
  downloadState,
  objectUrl,
  progress,
  posterUrl,
  disabled = false,
  sizeLabel,
  durationLabel,
  onStartDownload,
  onCancelDownload,
  onPlaybackError,
}: VideoMessageProps) {
  const { t } = useTranslation('inbox');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [decodeFailed, setDecodeFailed] = useState(false);

  useEffect(() => setDecodeFailed(false), [objectUrl]);

  function play() {
    if (disabled || !objectUrl || decodeFailed) return;
    void videoRef.current?.play();
  }

  const progressRatio = progress?.total ? progress.loaded / progress.total : null;
  const cornerLabel = downloadState === 'downloading' && progress ? formatDownloadProgress(progress.loaded, progress.total) : (durationLabel ?? sizeLabel);

  return (
    <div
      className={cn('relative max-h-64 max-w-full overflow-hidden rounded-md bg-black', disabled && 'opacity-70')}
      data-testid="video-message">
      <video
        ref={videoRef}
        src={objectUrl ?? undefined}
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
            aria-label={
              downloadState === 'idle' ? t('download') : downloadState === 'downloading' ? t('cancelDownload') : t('videoPlay')
            }
            disabled={disabled}
            onClick={downloadState === 'idle' ? onStartDownload : downloadState === 'downloading' ? onCancelDownload : play}
            data-testid="video-play-button"
            className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors hover:bg-black/25 disabled:cursor-default disabled:hover:bg-black/10">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white shadow-sm">
              {downloadState === 'idle' && <Download className="h-5 w-5" />}
              {downloadState === 'downloading' && <DownloadProgressRing progress={progressRatio} size={28} strokeWidth={2.5} />}
              {downloadState === 'ready' && <Play className="h-5 w-5 translate-x-0.5" fill="currentColor" />}
            </span>
          </button>
        )
      )}
      {!playing && !decodeFailed && cornerLabel && (
        <span className="absolute right-1.5 bottom-1.5 rounded bg-black/55 px-1.5 py-0.5 text-2xs text-white">{cornerLabel}</span>
      )}
    </div>
  );
}
