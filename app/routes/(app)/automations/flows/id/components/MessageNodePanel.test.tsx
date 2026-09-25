import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { makeQueryClient } from '~/lib/query-client';
import type { MessageNodeConfig } from '~/types/flow';
import { MessageNodePanel } from './MessageNodePanel';

function Harness({ initial, onChange }: { initial: MessageNodeConfig; onChange?: (c: MessageNodeConfig) => void }) {
  const [config, setConfig] = useState(initial);
  return (
    <QueryClientProvider client={makeQueryClient()}>
      <MessageNodePanel
        config={config}
        channelId="ch1"
        customVariableKeys={[]}
        onChange={(next) => {
          setConfig(next);
          onChange?.(next);
        }}
      />
    </QueryClientProvider>
  );
}

const withText = (text: string, variants?: string[]): MessageNodeConfig => ({
  blocks: [{ type: 'text', text, mediaId: null, ...(variants ? { variants } : {}) }],
  buttons: [],
});

const last = (onChange: ReturnType<typeof vi.fn>) => onChange.mock.calls.at(-1)![0] as MessageNodeConfig;

describe('MessageNodePanel — text variants', () => {
  it('offers another wording only once the message has a text', async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ blocks: [], buttons: [] }} />);

    const add = screen.getByRole('button', { name: 'nodePanels.message.addVariant' });
    expect(add).toBeDisabled();

    await user.type(screen.getByPlaceholderText('nodePanels.message.textPlaceholder'), 'Салом');
    expect(add).toBeEnabled();
  });

  it('adds, fills and removes a variant — saved on the text block', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial={withText('Салом!')} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'nodePanels.message.addVariant' }));
    await user.type(screen.getByRole('textbox', { name: 'nodePanels.message.variant' }), 'Ассалом!');
    expect(last(onChange).blocks[0]).toMatchObject({ type: 'text', text: 'Салом!', variants: ['Ассалом!'] });

    await user.click(screen.getByRole('button', { name: 'nodePanels.message.removeVariant' }));
    expect(last(onChange).blocks[0].variants).toBeUndefined();
  });

  it('editing the main text keeps the variants', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial={withText('Салом', ['Ассалом'])} onChange={onChange} />);

    await user.type(screen.getByPlaceholderText('nodePanels.message.textPlaceholder'), '!');

    expect(last(onChange).blocks[0]).toMatchObject({ text: 'Салом!', variants: ['Ассалом'] });
  });

  it('stops at five wordings in all, each within Instagram’s 1000 characters', () => {
    render(<Harness initial={withText('A', ['B', 'C', 'D', 'E'])} />);

    expect(screen.queryByRole('button', { name: 'nodePanels.message.addVariant' })).not.toBeInTheDocument();
    for (const box of screen.getAllByRole('textbox')) expect(box).toHaveAttribute('maxLength', '1000');
  });
});
