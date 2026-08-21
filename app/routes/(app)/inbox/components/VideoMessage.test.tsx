import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VideoMessage } from './VideoMessage';

describe('VideoMessage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function play(this: HTMLMediaElement) {
      this.dispatchEvent(new Event('play'));
      return Promise.resolve();
    });
  });

  it('shows a play overlay over the poster instead of native controls until tapped', () => {
    render(<VideoMessage src="blob:video-1" posterUrl="blob:thumb-1" sizeLabel="4.2 MB" />);

    const video = document.querySelector('video')!;
    expect(video).not.toHaveAttribute('controls');
    expect(video).toHaveAttribute('poster', 'blob:thumb-1');
    expect(screen.getByTestId('video-play-button')).toBeInTheDocument();
    expect(screen.getByText('4.2 MB')).toBeInTheDocument();
  });

  it('hides the overlay and enables native controls once playback starts', () => {
    render(<VideoMessage src="blob:video-1" />);

    fireEvent.click(screen.getByTestId('video-play-button'));

    expect(screen.queryByTestId('video-play-button')).not.toBeInTheDocument();
    expect(document.querySelector('video')).toHaveAttribute('controls');
  });

  it('disables the play button while media is unavailable', () => {
    render(<VideoMessage src={null} disabled />);

    expect(screen.getByTestId('video-play-button')).toBeDisabled();
  });

  it('shows an inline playback-failed overlay (not the play button) when the video element itself cannot decode the fetched bytes', () => {
    const onPlaybackError = vi.fn();
    render(<VideoMessage src="blob:video-1" onPlaybackError={onPlaybackError} />);

    fireEvent.error(document.querySelector('video')!);

    expect(screen.getByTestId('video-playback-error')).toBeInTheDocument();
    expect(screen.queryByTestId('video-play-button')).not.toBeInTheDocument();
    expect(onPlaybackError).toHaveBeenCalledTimes(1);
  });

  it('clears the playback-failed overlay once a new src is supplied (e.g. after a retry)', () => {
    const { rerender } = render(<VideoMessage src="blob:video-1" />);
    fireEvent.error(document.querySelector('video')!);
    expect(screen.getByTestId('video-playback-error')).toBeInTheDocument();

    rerender(<VideoMessage src="blob:video-2" />);

    expect(screen.queryByTestId('video-playback-error')).not.toBeInTheDocument();
    expect(screen.getByTestId('video-play-button')).toBeInTheDocument();
  });
});
