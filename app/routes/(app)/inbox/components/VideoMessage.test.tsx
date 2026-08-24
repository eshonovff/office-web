import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formatDownloadProgress } from '../formatMediaSize';
import { VideoMessage } from './VideoMessage';

// Most of these tests exercise the already-downloaded player (Telegram-style gating is covered
// separately in MessageBubble.test.tsx, where the gated hook itself is mocked).
const readyProps = { downloadState: 'ready' as const, progress: null, onStartDownload: vi.fn(), onCancelDownload: vi.fn() };

describe('VideoMessage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function play(this: HTMLMediaElement) {
      this.dispatchEvent(new Event('play'));
      return Promise.resolve();
    });
  });

  it('shows a play overlay over the poster instead of native controls until tapped', () => {
    render(<VideoMessage {...readyProps} objectUrl="blob:video-1" posterUrl="blob:thumb-1" sizeLabel="4.2 MB" />);

    const video = document.querySelector('video')!;
    expect(video).not.toHaveAttribute('controls');
    expect(video).toHaveAttribute('poster', 'blob:thumb-1');
    expect(screen.getByTestId('video-play-button')).toBeInTheDocument();
    expect(screen.getByText('4.2 MB')).toBeInTheDocument();
  });

  it('hides the overlay and enables native controls once playback starts', () => {
    render(<VideoMessage {...readyProps} objectUrl="blob:video-1" />);

    fireEvent.click(screen.getByTestId('video-play-button'));

    expect(screen.queryByTestId('video-play-button')).not.toBeInTheDocument();
    expect(document.querySelector('video')).toHaveAttribute('controls');
  });

  it('disables the play button while media is unavailable', () => {
    render(<VideoMessage {...readyProps} objectUrl={null} disabled />);

    expect(screen.getByTestId('video-play-button')).toBeDisabled();
  });

  it('shows an inline playback-failed overlay (not the play button) when the video element itself cannot decode the fetched bytes', () => {
    const onPlaybackError = vi.fn();
    render(<VideoMessage {...readyProps} objectUrl="blob:video-1" onPlaybackError={onPlaybackError} />);

    fireEvent.error(document.querySelector('video')!);

    expect(screen.getByTestId('video-playback-error')).toBeInTheDocument();
    expect(screen.queryByTestId('video-play-button')).not.toBeInTheDocument();
    expect(onPlaybackError).toHaveBeenCalledTimes(1);
  });

  it('clears the playback-failed overlay once a new src is supplied (e.g. after a retry)', () => {
    const { rerender } = render(<VideoMessage {...readyProps} objectUrl="blob:video-1" />);
    fireEvent.error(document.querySelector('video')!);
    expect(screen.getByTestId('video-playback-error')).toBeInTheDocument();

    rerender(<VideoMessage {...readyProps} objectUrl="blob:video-2" />);

    expect(screen.queryByTestId('video-playback-error')).not.toBeInTheDocument();
    expect(screen.getByTestId('video-play-button')).toBeInTheDocument();
  });

  it('shows a download button and size instead of a player before the browser has fetched the video', () => {
    const onStartDownload = vi.fn();
    render(
      <VideoMessage
        downloadState="idle"
        progress={null}
        onStartDownload={onStartDownload}
        onCancelDownload={vi.fn()}
        objectUrl={null}
        sizeLabel="12.4 MB"
      />
    );

    expect(screen.getByText('12.4 MB')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('video-play-button'));
    expect(onStartDownload).toHaveBeenCalledTimes(1);
  });

  it('shows a progress ring with loaded/total and cancels the download on click while downloading', () => {
    const onCancelDownload = vi.fn();
    render(
      <VideoMessage
        downloadState="downloading"
        progress={{ loaded: 3 * 1024 * 1024, total: 12 * 1024 * 1024 }}
        onStartDownload={vi.fn()}
        onCancelDownload={onCancelDownload}
        objectUrl={null}
        sizeLabel="12.4 MB"
      />
    );

    expect(screen.getByText(formatDownloadProgress(3 * 1024 * 1024, 12 * 1024 * 1024))).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('video-play-button'));
    expect(onCancelDownload).toHaveBeenCalledTimes(1);
  });
});
