import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InputGroupAddon } from './input-group';

describe('InputGroupAddon', () => {
  it('pulls its button to the edge without a negative margin — that made modal bodies scroll sideways', () => {
    render(
      <>
        <InputGroupAddon align="inline-start" data-testid="start">
          <button type="button">x</button>
        </InputGroupAddon>
        <InputGroupAddon align="inline-end" data-testid="end">
          <button type="button">x</button>
        </InputGroupAddon>
      </>
    );

    for (const id of ['start', 'end']) {
      expect(screen.getByTestId(id).className).not.toMatch(/\bm[lr]-\[-/);
    }
  });
});
