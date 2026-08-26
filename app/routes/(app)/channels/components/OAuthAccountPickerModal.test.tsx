import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { useOAuthConnectFlow } from '../useOAuthConnectFlow';
import { OAuthAccountPickerModal } from './OAuthAccountPickerModal';

function makeFlow(overrides: Partial<ReturnType<typeof useOAuthConnectFlow>> = {}): ReturnType<typeof useOAuthConnectFlow> {
  return {
    phase: 'idle',
    accounts: [],
    selectedExternalId: null,
    begin: vi.fn(),
    selectAccount: vi.fn(),
    confirm: vi.fn(),
    cancel: vi.fn(),
    isAlreadyConnected: vi.fn().mockReturnValue(false),
    ...overrides,
  };
}

describe('OAuthAccountPickerModal', () => {
  it('renders nothing visible while idle', () => {
    render(<OAuthAccountPickerModal provider="Instagram" flow={makeFlow({ phase: 'idle' })} />);

    expect(screen.queryByText('connectInstagram')).not.toBeInTheDocument();
  });

  it('shows a waiting message while the popup is open, with no confirm button yet', () => {
    render(<OAuthAccountPickerModal provider="Instagram" flow={makeFlow({ phase: 'waiting' })} />);

    expect(screen.getByText('oauthWaitingBody')).toBeInTheDocument();
    expect(screen.queryByText('connect')).not.toBeInTheDocument();
  });

  it('lists every account, even a single one, and flags one that is already connected', () => {
    const flow = makeFlow({
      phase: 'accounts',
      accounts: [
        { externalId: 'a1', name: 'Account One' },
        { externalId: 'a2', name: 'Account Two' },
      ],
      isAlreadyConnected: vi.fn((id: string) => id === 'a1'),
    });

    render(<OAuthAccountPickerModal provider="Instagram" flow={flow} />);

    expect(screen.getByText('Account One')).toBeInTheDocument();
    expect(screen.getByText('Account Two')).toBeInTheDocument();
    expect(screen.getByText('oauthAlreadyConnected')).toBeInTheDocument();
  });

  it('calls selectAccount when a row is clicked', async () => {
    const user = userEvent.setup();
    const flow = makeFlow({ phase: 'accounts', accounts: [{ externalId: 'a1', name: 'Account One' }] });

    render(<OAuthAccountPickerModal provider="Instagram" flow={flow} />);
    await user.click(screen.getByText('Account One'));

    expect(flow.selectAccount).toHaveBeenCalledWith('a1');
  });

  it('disables the connect button until an account is selected', () => {
    const flow = makeFlow({ phase: 'accounts', accounts: [{ externalId: 'a1', name: 'Account One' }], selectedExternalId: null });

    render(<OAuthAccountPickerModal provider="Instagram" flow={flow} />);

    expect(screen.getByText('connect').closest('button')).toBeDisabled();
  });

  it('confirms the selected account on click', async () => {
    const user = userEvent.setup();
    const flow = makeFlow({ phase: 'accounts', accounts: [{ externalId: 'a1', name: 'Account One' }], selectedExternalId: 'a1' });

    render(<OAuthAccountPickerModal provider="Instagram" flow={flow} />);
    await user.click(screen.getByText('connect'));

    expect(flow.confirm).toHaveBeenCalledTimes(1);
  });

  it('closing the modal calls cancel', async () => {
    const user = userEvent.setup();
    const flow = makeFlow({ phase: 'accounts', accounts: [{ externalId: 'a1', name: 'Account One' }] });

    render(<OAuthAccountPickerModal provider="Instagram" flow={flow} />);
    await user.keyboard('{Escape}');

    expect(flow.cancel).toHaveBeenCalled();
  });
});
