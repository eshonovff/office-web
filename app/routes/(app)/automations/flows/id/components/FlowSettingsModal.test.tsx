import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeQueryClient } from '~/lib/query-client';
import type { FlowDetail } from '~/types/flow';
import { FlowSettingsModal } from './FlowSettingsModal';

function flow(overrides: Partial<FlowDetail> = {}): FlowDetail {
  return {
    id: 'f1',
    channelId: 'ch1',
    name: 'Нарх',
    isActive: true,
    triggerType: 'instagram_comment',
    triggerConfig: { matchMode: 'all', keywords: [], postScope: 'all', postIds: [], publicReplies: ['  Навиштем 📩 '] },
    nodes: [],
    edges: [],
    createdAt: '2026-09-25T00:00:00Z',
    updatedAt: '2026-09-25T00:00:00Z',
    ...overrides,
  };
}

function renderModal(detail: FlowDetail) {
  const onSave = vi.fn();
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <FlowSettingsModal channelId="ch1" flow={detail} open onClose={vi.fn()} onSave={onSave} isSaving={false} />
    </QueryClientProvider>
  );
  return onSave;
}

describe('FlowSettingsModal — public replies', () => {
  it('saves a comment trigger’s variants trimmed', async () => {
    const user = userEvent.setup();
    const onSave = renderModal(flow());

    await user.click(screen.getByRole('button', { name: 'actions.save' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ triggerConfig: expect.objectContaining({ publicReplies: ['Навиштем 📩'] }) })
    );
  });

  it('will not save a blank variant', async () => {
    const user = userEvent.setup();
    renderModal(flow());

    await user.clear(screen.getByRole('textbox', { name: 'publicReplies.variant' }));

    expect(screen.getByRole('button', { name: 'actions.save' })).toBeDisabled();
  });

  it('a DM trigger has nothing to reply under: no field, and an empty list is saved', async () => {
    const user = userEvent.setup();
    const onSave = renderModal(flow({ triggerType: 'instagram_dm' }));

    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'actions.save' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ triggerConfig: expect.objectContaining({ publicReplies: [] }) })
    );
  });
});
