import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CreateChannelModal } from './CreateChannelModal';

// Required fields render with a trailing "*" appended to the label text
// (FormInput/FormTextarea), so label queries need exact: false.
const label = (text: string) => screen.getByLabelText(text, { exact: false });
const queryLabel = (text: string) => screen.queryByLabelText(text, { exact: false });

function renderModal(onCreate = vi.fn()) {
  render(<CreateChannelModal open onClose={vi.fn()} onCreate={onCreate} isCreating={false} />);
  return { onCreate };
}

describe('CreateChannelModal', () => {
  it('shows the structured WhatsApp fields by default, access token as a password input', () => {
    renderModal();

    expect(label('fields.phoneNumberId')).toBeInTheDocument();
    expect(label('fields.wabaId')).toBeInTheDocument();
    expect(label('fields.accessToken')).toHaveAttribute('type', 'password');
  });

  it('derives externalId from phoneNumberId and submits WhatsApp credentials as JSON', async () => {
    const user = userEvent.setup();
    const { onCreate } = renderModal();

    await user.type(label('fields.name'), 'Test WA');
    await user.type(label('fields.phoneNumberId'), '1206432455895142');
    await user.type(label('fields.wabaId'), 'waba-1');
    await user.type(label('fields.accessToken'), 'secret-token');
    await user.click(screen.getByText('create'));

    expect(onCreate).toHaveBeenCalledWith({
      type: 'WhatsApp',
      name: 'Test WA',
      externalId: '1206432455895142',
      credentials: JSON.stringify({ phoneNumberId: '1206432455895142', wabaId: 'waba-1', accessToken: 'secret-token' }),
    });
  });

  it('does not submit an incomplete WhatsApp credentials set', async () => {
    const user = userEvent.setup();
    const { onCreate } = renderModal();

    await user.type(label('fields.name'), 'Test WA');
    await user.type(label('fields.phoneNumberId'), '123');
    // wabaId and accessToken left blank
    await user.click(screen.getByText('create'));

    expect(onCreate).not.toHaveBeenCalled();
  });

  it('switches to a generic externalId + credentials JSON field for non-WhatsApp types', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('channelType.Instagram'));

    expect(queryLabel('fields.phoneNumberId')).not.toBeInTheDocument();
    expect(label('fields.externalId')).toBeInTheDocument();
    expect(label('fields.credentials')).toBeInTheDocument();
  });
});
