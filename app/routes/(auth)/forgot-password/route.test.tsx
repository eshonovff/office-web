import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { customerAuthApi } from '~/api/customerAuth';
import { makeQueryClient } from '~/lib/query-client';
import ForgotPasswordPage from './route';

vi.mock('~/api/customerAuth', () => ({ customerAuthApi: { forgotPassword: vi.fn() } }));

function renderPage(path = '/forgot-password') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={makeQueryClient()}>
        <ForgotPasswordPage />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends the trimmed email and then says to check the mail — with a resend that waits', async () => {
    vi.mocked(customerAuthApi.forgotPassword).mockResolvedValue({ message: 'ok' });
    renderPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('forgotPassword.email'), '  faridun@example.com ');
    await user.click(screen.getByRole('button', { name: 'forgotPassword.submit' }));

    expect(await screen.findByText('forgotPassword.sentTitle')).toBeInTheDocument();
    expect(customerAuthApi.forgotPassword).toHaveBeenCalledWith('faridun@example.com');
    expect(screen.getByRole('button', { name: 'forgotPassword.resendCooldown' })).toBeDisabled();
  });

  it('starts with the email the sign-in page already had', () => {
    renderPage('/forgot-password?email=faridun%40example.com');

    expect(screen.getByLabelText('forgotPassword.email')).toHaveValue('faridun@example.com');
  });

  it('refuses something that is not an email before calling anything', async () => {
    renderPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('forgotPassword.email'), '992927777777');
    await user.click(screen.getByRole('button', { name: 'forgotPassword.submit' }));

    // The email field's own validation (or the schema behind it) stops it — nothing is sent.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(customerAuthApi.forgotPassword).not.toHaveBeenCalled();
    expect(screen.queryByText('forgotPassword.sentTitle')).not.toBeInTheDocument();
  });

  it('says so when rate-limited', async () => {
    vi.mocked(customerAuthApi.forgotPassword).mockRejectedValue(
      Object.assign(new Error('429'), { response: { status: 429 } })
    );
    renderPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('forgotPassword.email'), 'faridun@example.com');
    await user.click(screen.getByRole('button', { name: 'forgotPassword.submit' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('auth:errors.tooMany'));
  });

  it('tells staff where their password is reset', () => {
    renderPage();

    expect(screen.getByText('forgotPassword.staffHint')).toBeInTheDocument();
  });
});
