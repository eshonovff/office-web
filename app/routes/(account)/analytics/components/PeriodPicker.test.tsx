import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PeriodPicker } from './PeriodPicker';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options && Object.keys(options).length > 0 ? `${key} ${JSON.stringify(options)}` : key,
    i18n: { language: 'tg' },
  }),
}));

const dateInputs = () => Array.from(document.querySelectorAll<HTMLInputElement>('input[readonly]'));

// The real date fields (flatpickr), not stand-ins — they must show the period's own dates.
describe('PeriodPicker — the real date fields', () => {
  it('shows picked dates in the fields', () => {
    render(
      <PeriodPicker
        period={{ from: '2026-09-01', to: '2026-09-10', preset: null }}
        today="2026-09-26"
        onPreset={() => undefined}
        onRange={() => undefined}
      />
    );

    expect(dateInputs().map((input) => input.value)).toEqual(['01.09.2026', '10.09.2026']);
  });

  it('opens the fields on the current period', async () => {
    const user = userEvent.setup();
    render(
      <PeriodPicker
        period={{ from: '2026-09-20', to: '2026-09-26', preset: 7 }}
        today="2026-09-26"
        onPreset={() => undefined}
        onRange={() => undefined}
      />
    );
    expect(dateInputs()).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'analytics.period.custom' }));

    expect(dateInputs().map((input) => input.value)).toEqual(['20.09.2026', '26.09.2026']);
  });
});
