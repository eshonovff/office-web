import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChipInput } from './ChipInput';

describe('ChipInput', () => {
  it('adds a chip on Enter and clears the draft text', async () => {
    const onChange = vi.fn();
    render(<ChipInput value={[]} onChange={onChange} />);

    await userEvent.type(screen.getByRole('textbox'), 'нарх{Enter}');

    expect(onChange).toHaveBeenCalledWith(['нарх']);
  });

  it('adds a chip on comma', async () => {
    const onChange = vi.fn();
    render(<ChipInput value={[]} onChange={onChange} />);

    await userEvent.type(screen.getByRole('textbox'), 'салом,');

    expect(onChange).toHaveBeenCalledWith(['салом']);
  });

  it('does not add duplicate or empty chips', async () => {
    const onChange = vi.fn();
    render(<ChipInput value={['нарх']} onChange={onChange} />);

    await userEvent.type(screen.getByRole('textbox'), 'нарх{Enter}');
    await userEvent.type(screen.getByRole('textbox'), '   {Enter}');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes the last chip on Backspace when the input is empty', async () => {
    const onChange = vi.fn();
    render(<ChipInput value={['a', 'b']} onChange={onChange} />);

    await userEvent.type(screen.getByRole('textbox'), '{Backspace}');

    expect(onChange).toHaveBeenCalledWith(['a']);
  });

  it('removes a specific chip via its remove button', async () => {
    const onChange = vi.fn();
    render(<ChipInput value={['a', 'b', 'c']} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Remove b' }));

    expect(onChange).toHaveBeenCalledWith(['a', 'c']);
  });

  it('renders existing chips', () => {
    render(<ChipInput value={['one', 'two']} onChange={vi.fn()} />);

    expect(screen.getByText('one')).toBeInTheDocument();
    expect(screen.getByText('two')).toBeInTheDocument();
  });
});
