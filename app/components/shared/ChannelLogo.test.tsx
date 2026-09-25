import { render } from '@testing-library/react';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ChannelType } from '~/types/conversation';
import { ChannelLogo } from './ChannelLogo';

const TYPES: ChannelType[] = ['Instagram', 'Facebook', 'WhatsApp'];

describe('ChannelLogo', () => {
  it.each(TYPES)('%s points to a logo that ships in public/', (type) => {
    const { container } = render(<ChannelLogo type={type} />);
    const src = container.querySelector('img')!.getAttribute('src')!;

    expect(src).toMatch(/^\/logos\/[a-z]+\.svg$/);
    expect(existsSync(resolve(process.cwd(), 'public', src.slice(1)))).toBe(true);
  });

  it('is hidden from screen readers unless given a label', () => {
    const { container, rerender } = render(<ChannelLogo type="Instagram" />);
    expect(container.querySelector('img')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('img')).toHaveAttribute('alt', '');

    rerender(<ChannelLogo type="Instagram" label="Instagram" />);
    expect(container.querySelector('img')).not.toHaveAttribute('aria-hidden');
    expect(container.querySelector('img')).toHaveAttribute('alt', 'Instagram');
  });
});
