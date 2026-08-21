import { Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';

let activeAudio: HTMLAudioElement | null = null;

function formatDuration(seconds: number | null | undefined) {
  if (!seconds) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${rest}`;
}

function normalizedProgress(currentTime: number, durationSeconds: number | null) {
  const duration = durationSeconds || 0;
  if (duration <= 0) return 0;
  return Math.max(0, Math.min(1, currentTime / duration));
}

export function getSeekTime(clientX: number, left: number, width: number, durationSeconds: number) {
  if (!Number.isFinite(clientX) || width <= 0) return null;
  const percent = Math.max(0, Math.min(1, (clientX - left) / width));
  return percent * durationSeconds;
}

interface VoiceNotePlayerProps {
  src: string | null;
  durationSeconds: number | null;
  peaks: number[];
  disabled?: boolean;
  /** Track title shown above the progress bar for regular audio attachments (voice notes omit it). */
  title?: string;
  /** Fires on the native <audio> element's own error event — the fetch already succeeded, the bytes just aren't valid/decodable audio. */
  onPlaybackError?: () => void;
}

export function VoiceNotePlayer({ src, durationSeconds, peaks, disabled = false, title, onPlaybackError }: VoiceNotePlayerProps) {
  const { t } = useTranslation('inbox');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [mediaDuration, setMediaDuration] = useState<number | null>(null);
  const effectiveDuration = durationSeconds || mediaDuration;
  const progress = normalizedProgress(currentTime, effectiveDuration);
  const displayTime = playing || currentTime > 0 ? currentTime : effectiveDuration;
  const hasWaveform = peaks.length > 0;

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (activeAudio === audio) activeAudio = null;
    };
  }, []);

  function seekFromPointer(event: PointerEvent<HTMLDivElement>) {
    if (disabled || !src || !audioRef.current || !waveformRef.current || !effectiveDuration) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const nextTime = getSeekTime(event.clientX, rect.left, rect.width, effectiveDuration);
    if (nextTime === null) return;
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || disabled || !src) return;
    if (playing) {
      audio.pause();
      return;
    }
    if (activeAudio && activeAudio !== audio) activeAudio.pause();
    activeAudio = audio;
    await audio.play();
  }

  return (
    <div className={cn('flex w-64 max-w-full items-center gap-2', disabled && 'opacity-70')} data-testid="voice-note-player">
      {src && (
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          onLoadedMetadata={(event) => {
            const duration = event.currentTarget.duration;
            if (Number.isFinite(duration) && duration > 0) setMediaDuration(duration);
          }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setCurrentTime(0);
            if (activeAudio === audioRef.current) activeAudio = null;
          }}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onError={onPlaybackError}
        />
      )}
      <Button
        type="button"
        variant="secondary"
        size="icon-sm"
        className="h-8 w-8 shrink-0 rounded-full"
        disabled={disabled || !src}
        aria-label={playing ? t('voicePause') : t('voicePlay')}
        onClick={togglePlayback}>
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 translate-x-px" />}
      </Button>
      <div className="min-w-0 flex-1">
        {title && <p className="truncate text-2xs font-medium">{title}</p>}
        {hasWaveform ? (
          <div
            ref={waveformRef}
            role="slider"
            aria-label={t('voiceSeek')}
            aria-valuemin={0}
            aria-valuemax={effectiveDuration ?? 0}
            aria-valuenow={Math.floor(currentTime)}
            tabIndex={disabled || !src ? -1 : 0}
            className={cn('flex h-8 touch-none items-center gap-0.5', !disabled && src && 'cursor-pointer')}
            onPointerDown={(event) => {
              draggingRef.current = true;
              event.currentTarget.setPointerCapture(event.pointerId);
              seekFromPointer(event);
            }}
            onPointerMove={(event) => {
              if (draggingRef.current) seekFromPointer(event);
            }}
            onPointerUp={(event) => {
              draggingRef.current = false;
              event.currentTarget.releasePointerCapture(event.pointerId);
            }}>
            {peaks.map((peak, index) => {
              const filled = peaks.length <= 1 ? progress > 0 : index / (peaks.length - 1) <= progress;
              return (
                <span
                  key={`${index}-${peak}`}
                  data-testid="voice-wave-bar"
                  className={cn('w-1 rounded-full transition-colors', filled ? 'bg-current' : 'bg-current/30')}
                  style={{ height: `${Math.max(4, Math.round(peak * 24))}px` }}
                />
              );
            })}
          </div>
        ) : (
          <div
            ref={waveformRef}
            role="slider"
            aria-label={t('voiceSeek')}
            aria-valuemin={0}
            aria-valuemax={effectiveDuration ?? 0}
            aria-valuenow={Math.floor(currentTime)}
            tabIndex={disabled || !src ? -1 : 0}
            data-testid="audio-progress-track"
            className={cn('flex h-8 touch-none items-center', !disabled && src && 'cursor-pointer')}
            onPointerDown={(event) => {
              draggingRef.current = true;
              event.currentTarget.setPointerCapture(event.pointerId);
              seekFromPointer(event);
            }}
            onPointerMove={(event) => {
              if (draggingRef.current) seekFromPointer(event);
            }}
            onPointerUp={(event) => {
              draggingRef.current = false;
              event.currentTarget.releasePointerCapture(event.pointerId);
            }}>
            <div className="bg-current/20 h-1 w-full overflow-hidden rounded-full">
              <div className="bg-current h-full rounded-full transition-[width]" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        )}
        <div className="text-2xs tabular-nums opacity-75">{formatDuration(displayTime)}</div>
      </div>
    </div>
  );
}
