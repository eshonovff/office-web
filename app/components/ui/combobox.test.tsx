import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CustomSelect } from '~/components/shared/CustomSelect';

describe('ComboboxInput', () => {
  it('composes its trigger as a native button without a Base UI contract warning', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    render(<CustomSelect value={null} options={[{ value: 'one', label: 'One' }]} onChange={() => undefined} />);

    const messages = [...error.mock.calls, ...warn.mock.calls].flat().join(' ');
    expect(messages).not.toContain('expected a non-<button>');

    error.mockRestore();
    warn.mockRestore();
  });
});
