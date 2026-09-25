import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { subscriptionRequestsApi } from '~/api/subscriptionRequests';
import { useIsMobile } from '~/hooks/use-mobile';
import { makeQueryClient } from '~/lib/query-client';
import type { ModeratorSubscriptionRequest } from '~/types/subscriptionRequests';
import SubscriptionsPage from './route';

vi.mock('~/api/subscriptionRequests', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/api/subscriptionRequests')>()),
  subscriptionRequestsApi: {
    list: vi.fn(),
    pendingCount: vi.fn(),
    getReceiptBlob: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('~/hooks/use-mobile', () => ({ useIsMobile: vi.fn(() => false) }));

function makeRequest(overrides: Partial<ModeratorSubscriptionRequest> = {}): ModeratorSubscriptionRequest {
  return {
    id: 'r1',
    customerId: 'c1',
    customerEmail: 'faridun@example.com',
    customerFullName: 'Faridun Test',
    tier: 'Pro',
    durationMonths: 3,
    expectedAmount: 564.37,
    currency: 'TJS',
    status: 'Pending',
    receiptUrl: '/api/subscription-requests/r1/receipt',
    receiptFileName: 'chek.png',
    paidToBank: 'Alif',
    paidToCardNumber: '5058270285104567',
    createdAt: '2026-09-24T10:00:00Z',
    submittedAt: '2026-09-24T10:03:00Z',
    reviewedByUserName: null,
    reviewedAt: null,
    reviewNote: null,
    ...overrides,
  };
}

function renderPage(initialPath = '/subscriptions') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <QueryClientProvider client={makeQueryClient()}>
        <SubscriptionsPage />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('SubscriptionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useIsMobile).mockReturnValue(false);
    vi.mocked(subscriptionRequestsApi.pendingCount).mockResolvedValue(1);
  });

  // jsdom has no object URLs; each test that needs them installs fakes, restored here.
  const { createObjectURL, revokeObjectURL } = URL;
  afterEach(() => {
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
  });

  it('opens on the queue and shows the exact amount and the card it went to', async () => {
    vi.mocked(subscriptionRequestsApi.list).mockResolvedValue([makeRequest()]);
    renderPage();

    await waitFor(() => expect(screen.getByText('Faridun Test')).toBeInTheDocument());
    expect(subscriptionRequestsApi.list).toHaveBeenCalledWith('Pending');
    expect(screen.getByText('564.37 TJS')).toBeInTheDocument();
    expect(screen.getByText('•••• 4567')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'actions.approve' })).toBeInTheDocument();
  });

  it('on a phone shows a card per request, with the amount and the buttons in view', async () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    vi.mocked(subscriptionRequestsApi.list).mockResolvedValue([makeRequest()]);
    renderPage();

    await waitFor(() => expect(screen.getByText('Faridun Test')).toBeInTheDocument());
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const card = screen.getByRole('listitem');
    expect(within(card).getByText('564.37 TJS')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'actions.approve' })).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'actions.reject' })).toBeInTheDocument();
  });

  it('shows the queue as empty when nothing is waiting', async () => {
    vi.mocked(subscriptionRequestsApi.list).mockResolvedValue([]);
    renderPage();

    await waitFor(() => expect(screen.getByText('empty.Pending')).toBeInTheDocument());
  });

  it('approves only after the confirmation, which repeats the amount and the full card', async () => {
    vi.mocked(subscriptionRequestsApi.list).mockResolvedValue([makeRequest()]);
    vi.mocked(subscriptionRequestsApi.approve).mockResolvedValue(makeRequest({ status: 'Approved' }));
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'actions.approve' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('564.37 TJS')).toBeInTheDocument();
    expect(within(dialog).getByText('5058 2702 8510 4567')).toBeInTheDocument();
    expect(subscriptionRequestsApi.approve).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: 'approve.confirm' }));

    await waitFor(() => expect(subscriptionRequestsApi.approve).toHaveBeenCalledWith('r1'));
    // The queue is re-read afterwards (success or a 409 from another moderator alike).
    await waitFor(() => expect(subscriptionRequestsApi.list).toHaveBeenCalledTimes(2));
  });

  it('will not reject without a reason, and sends the trimmed reason', async () => {
    vi.mocked(subscriptionRequestsApi.list).mockResolvedValue([makeRequest()]);
    vi.mocked(subscriptionRequestsApi.reject).mockResolvedValue(makeRequest({ status: 'Rejected' }));
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'actions.reject' }));
    const dialog = await screen.findByRole('dialog');

    await userEvent.click(within(dialog).getByRole('button', { name: 'reject.confirm' }));
    expect(within(dialog).getByText('reject.noteRequired')).toBeInTheDocument();

    await userEvent.type(within(dialog).getByRole('textbox'), '   ');
    await userEvent.click(within(dialog).getByRole('button', { name: 'reject.confirm' }));
    expect(subscriptionRequestsApi.reject).not.toHaveBeenCalled();

    await userEvent.type(within(dialog).getByRole('textbox'), 'Пул наомад  ');
    await userEvent.click(within(dialog).getByRole('button', { name: 'reject.confirm' }));

    await waitFor(() => expect(subscriptionRequestsApi.reject).toHaveBeenCalledWith('r1', 'Пул наомад'));
  });

  it('opens a reviewed tab from the URL, with who decided and why — and no actions', async () => {
    vi.mocked(subscriptionRequestsApi.list).mockResolvedValue([
      makeRequest({
        status: 'Rejected',
        reviewedByUserName: 'Owner',
        reviewedAt: '2026-09-24T11:00:00Z',
        reviewNote: 'Маблағ мувофиқ нест',
      }),
    ]);
    renderPage('/subscriptions?status=Rejected');

    await waitFor(() => expect(screen.getByText('Маблағ мувофиқ нест')).toBeInTheDocument());
    expect(subscriptionRequestsApi.list).toHaveBeenCalledWith('Rejected');
    expect(screen.queryByRole('button', { name: 'actions.approve' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'tabs.Rejected' })).toHaveAttribute('aria-selected', 'true');
  });

  it('falls back to the queue for an unknown ?status', async () => {
    vi.mocked(subscriptionRequestsApi.list).mockResolvedValue([]);
    renderPage('/subscriptions?status=<script>');

    await waitFor(() => expect(subscriptionRequestsApi.list).toHaveBeenCalledWith('Pending'));
  });

  it('shows an image receipt from an object URL and revokes it on close', async () => {
    const revoke = vi.fn();
    URL.createObjectURL = vi.fn(() => 'blob:receipt-1');
    URL.revokeObjectURL = revoke;
    vi.mocked(subscriptionRequestsApi.list).mockResolvedValue([makeRequest()]);
    vi.mocked(subscriptionRequestsApi.getReceiptBlob).mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'actions.receipt' }));

    const image = await screen.findByRole('img', { name: 'receipt.title' });
    expect(image).toHaveAttribute('src', 'blob:receipt-1');
    expect(subscriptionRequestsApi.getReceiptBlob).toHaveBeenCalledWith('r1');

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(revoke).toHaveBeenCalledWith('blob:receipt-1'));
  });

  it('refuses to display a receipt that is not an image or PDF', async () => {
    const create = vi.fn(() => 'blob:should-not-exist');
    URL.createObjectURL = create;
    vi.mocked(subscriptionRequestsApi.list).mockResolvedValue([makeRequest()]);
    vi.mocked(subscriptionRequestsApi.getReceiptBlob).mockResolvedValue(
      new Blob(['<script>alert(1)</script>'], { type: 'text/html' })
    );
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'actions.receipt' }));

    await waitFor(() => expect(screen.getByText('receipt.unsupported')).toBeInTheDocument());
    expect(create).not.toHaveBeenCalled();
    expect(screen.queryByRole('img', { name: 'receipt.title' })).not.toBeInTheDocument();
  });
});
