import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSeekTime, VoiceNotePlayer } from './VoiceNotePlayer';

describe('VoiceNotePlayer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', { configurable: true, value: vi.fn() });
    Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function play(this: HTMLMediaElement) {
      this.dispatchEvent(new Event('play'));
      return Promise.resolve();
    });
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function pause(this: HTMLMediaElement) {
      this.dispatchEvent(new Event('pause'));
    });
  });

  it('draws waveform bars from server-provided peaks', () => {
    render(<VoiceNotePlayer src="blob:voice-1" durationSeconds={12} peaks={[0, 0.5, 1]} />);

    const bars = screen.getAllByTestId('voice-wave-bar');

    expect(bars).toHaveLength(3);
    expect(bars[0]).toHaveStyle({ height: '4px' });
    expect(bars[1]).toHaveStyle({ height: '12px' });
    expect(bars[2]).toHaveStyle({ height: '24px' });
  });

  it('calculates seek time from the waveform pointer position', () => {
    expect(getSeekTime(50, 0, 100, 20)).toBe(10);
    expect(getSeekTime(-10, 0, 100, 20)).toBe(0);
    expect(getSeekTime(120, 0, 100, 20)).toBe(20);
  });

  it('uses audio metadata duration when a backfilled message has no DTO duration', () => {
    render(<VoiceNotePlayer src="blob:voice-1" durationSeconds={null} peaks={[0.2, 0.4]} />);
    const audio = document.querySelector('audio')!;
    Object.defineProperty(audio, 'duration', { configurable: true, value: 9 });

    fireEvent.loadedMetadata(audio);

    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuemax', '9');
    expect(screen.getByText('0:09')).toBeInTheDocument();
  });

  it('pauses the previous voice note when another one starts', async () => {
    render(
      <>
        <VoiceNotePlayer src="blob:voice-1" durationSeconds={12} peaks={[0.2, 0.4]} />
        <VoiceNotePlayer src="blob:voice-2" durationSeconds={12} peaks={[0.4, 0.2]} />
      </>
    );
    const buttons = screen.getAllByRole('button');
    const [firstAudio] = document.querySelectorAll('audio');

    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);

    expect(firstAudio.pause).toHaveBeenCalled();
  });

  it('renders the retained waveform as disabled when playback is unavailable', () => {
    render(<VoiceNotePlayer src={null} durationSeconds={12} peaks={[0.2, 0.4]} disabled />);

    expect(screen.getAllByTestId('voice-wave-bar')).toHaveLength(2);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders a flat progress track with the file title for audio attachments without waveform data', () => {
    render(<VoiceNotePlayer src="blob:audio-1" durationSeconds={30} peaks={[]} title="song.mp3" />);

    expect(screen.getByText('song.mp3')).toBeInTheDocument();
    expect(screen.getByTestId('audio-progress-track')).toBeInTheDocument();
    expect(screen.queryByTestId('voice-wave-bar')).not.toBeInTheDocument();
  });

  it('opts the waveform track out of touch scrolling so dragging to seek does not also scroll the thread', () => {
    render(<VoiceNotePlayer src="blob:voice-1" durationSeconds={12} peaks={[0.2, 0.4]} />);
    expect(screen.getByRole('slider')).toHaveClass('touch-none');
  });

  it('opts the flat progress track out of touch scrolling too', () => {
    render(<VoiceNotePlayer src="blob:audio-1" durationSeconds={30} peaks={[]} />);
    expect(screen.getByTestId('audio-progress-track')).toHaveClass('touch-none');
  });

  it('reports a playback error from the underlying <audio> element to the caller', () => {
    const onPlaybackError = vi.fn();
    render(<VoiceNotePlayer src="blob:voice-1" durationSeconds={12} peaks={[0.2, 0.4]} onPlaybackError={onPlaybackError} />);

    fireEvent.error(document.querySelector('audio')!);

    expect(onPlaybackError).toHaveBeenCalledTimes(1);
  });
});
