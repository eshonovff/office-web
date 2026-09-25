import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MAX_PUBLIC_REPLIES, MAX_PUBLIC_REPLY_LENGTH, publicRepliesValid } from '~/lib/publicReplies';
import { PublicRepliesField } from './PublicRepliesField';

function Harness({ initial = [], onChange }: { initial?: string[]; onChange?: (v: string[]) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <PublicRepliesField
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

describe('publicRepliesValid', () => {
  it('accepts off (empty) and filled variants within the backend bounds', () => {
    expect(publicRepliesValid([])).toBe(true);
    expect(publicRepliesValid(['Ба Direct навиштем 📩'])).toBe(true);
  });

  it('refuses a blank variant, too many, or too long — as the server would', () => {
    expect(publicRepliesValid(['ok', '   '])).toBe(false);
    expect(publicRepliesValid(Array(MAX_PUBLIC_REPLIES + 1).fill('ok'))).toBe(false);
    expect(publicRepliesValid(['x'.repeat(MAX_PUBLIC_REPLY_LENGTH + 1)])).toBe(false);
  });
});

describe('PublicRepliesField', () => {
  it('turning it on fills three default variants; off empties the list', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await user.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenLastCalledWith([
      'publicReplies.default1',
      'publicReplies.default2',
      'publicReplies.default3',
    ]);
    expect(screen.getAllByRole('textbox')).toHaveLength(3);

    await user.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenLastCalledWith([]);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('adds variants up to the limit, and never removes the last one', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['a']} />);

    expect(screen.getByRole('button', { name: 'publicReplies.remove' })).toBeDisabled();
    for (let i = 1; i < MAX_PUBLIC_REPLIES; i++) {
      await user.click(screen.getByRole('button', { name: 'publicReplies.add' }));
    }
    expect(screen.getAllByRole('textbox')).toHaveLength(MAX_PUBLIC_REPLIES);
    expect(screen.queryByRole('button', { name: 'publicReplies.add' })).not.toBeInTheDocument();
  });
});
