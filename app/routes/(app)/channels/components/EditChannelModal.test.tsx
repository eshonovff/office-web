import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ChannelListItem } from '~/types/channel';
import { EditChannelModal } from './EditChannelModal';

const label = (text: string) => screen.getByLabelText(text, { exact: false });

function makeChannel(overrides: Partial<ChannelListItem> = {}): ChannelListItem {
  return {
    id: 'ch1',
    type: 'WhatsApp',
    name: 'WhatsApp Test',
    externalId: '1206432455895142',
    isActive: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderModal(channel: ChannelListItem, onSave = vi.fn()) {
  render(<EditChannelModal channel={channel} open onClose={vi.fn()} onSave={onSave} isSaving={false} />);
  return { onSave };
}

describe('EditChannelModal', () => {
  it('shows externalId read-only, pre-filled from the channel', () => {
    renderModal(makeChannel());

    const externalIdInput = label('fields.externalId');
    expect(externalIdInput).toHaveValue('1206432455895142');
    expect(externalIdInput).toBeDisabled();
  });

  it('keeps the current credentials when wabaId/accessToken are left blank', async () => {
    const user = userEvent.setup();
    const { onSave } = renderModal(makeChannel());

    await user.click(screen.getByText('actions.save'));

    expect(onSave).toHaveBeenCalledWith({ name: 'WhatsApp Test', isActive: true, credentials: undefined });
  });

  it('rejects a half-filled credentials pair instead of submitting it', async () => {
    const user = userEvent.setup();
    const { onSave } = renderModal(makeChannel());

    await user.type(label('fields.wabaId'), 'new-waba');
    // accessToken left blank
    await user.click(screen.getByText('actions.save'));

    expect(onSave).not.toHaveBeenCalled();
  });

  it('locks phoneNumberId to the channel externalId when both credential fields are filled', async () => {
    const user = userEvent.setup();
    const channel = makeChannel({ externalId: '999888777' });
    const { onSave } = renderModal(channel);

    await user.type(label('fields.wabaId'), 'new-waba');
    await user.type(label('fields.accessToken'), 'new-token');
    await user.click(screen.getByText('actions.save'));

    expect(onSave).toHaveBeenCalledWith({
      name: 'WhatsApp Test',
      isActive: true,
      credentials: JSON.stringify({ phoneNumberId: '999888777', wabaId: 'new-waba', accessToken: 'new-token' }),
    });
  });

  it('toggling isActive off submits isActive: false', async () => {
    const user = userEvent.setup();
    const { onSave } = renderModal(makeChannel({ isActive: true }));

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByText('actions.save'));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
  });

  it('shows a generic credentials JSON field for non-WhatsApp channels', () => {
    renderModal(makeChannel({ type: 'Instagram' }));

    expect(screen.queryByLabelText('fields.wabaId', { exact: false })).not.toBeInTheDocument();
    expect(label('fields.credentials')).toBeInTheDocument();
  });
});
