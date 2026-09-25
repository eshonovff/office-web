import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { customerAuthApi } from '~/api/customerAuth';
import { makeQueryClient } from '~/lib/query-client';
import { useCustomerAuthStore } from '~/store/useCustomerAuthStore';
import ResetPasswordPage from './route';

const navigate = vi.fn();

vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigate,
}));

vi.mock('~/api/customerAuth', () => ({ customerAuthApi: { resetPassword: vi.fn() } }));

function renderPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={makeQueryClient()}>
        <ResetPasswordPage />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

async function fill(password: string, confirm = password) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('resetPassword.newPassword'), password);
  await user.type(screen.getByLabelText('resetPassword.confirmPassword'), confirm);
  await user.click(screen.getByRole('button', { name: 'resetPassword.submit' }));
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCustomerAuthStore.setState({ accessToken: 'old-session' });
  });

  it('takes the token from the #fragment and drops it from the address bar', async () => {
    renderPage('/reset-password#token=abc_DEF-123');

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({ pathname: '/reset-password', search: '' }, { replace: true })
    );
    expect(screen.getByLabelText('resetPassword.newPassword')).toBeInTheDocument();
  });

  it('sets the new password, ends this browser’s session and goes to sign in', async () => {
    vi.mocked(customerAuthApi.resetPassword).mockResolvedValue(undefined);
    renderPage('/reset-password#token=abc_DEF-123');

    await fill('new-secret-1');

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/login?passwordReset=1', { replace: true }));
    expect(customerAuthApi.resetPassword).toHaveBeenCalledWith('abc_DEF-123', 'new-secret-1');
    expect(useCustomerAuthStore.getState().accessToken).toBeNull();
  });

  it('will not send two passwords that differ, or a short one', async () => {
    renderPage('/reset-password#token=abc');

    await fill('new-secret-1', 'new-secret-2');
    expect(await screen.findByText('passwordsMustMatch')).toBeInTheDocument();

    expect(customerAuthApi.resetPassword).not.toHaveBeenCalled();
  });

  it('offers a new link when the server refuses this one', async () => {
    vi.mocked(customerAuthApi.resetPassword).mockRejectedValue(
      Object.assign(new Error('400'), { response: { status: 400, data: { detail: 'invalid link' } } })
    );
    renderPage('/reset-password#token=used');

    await fill('new-secret-1');

    expect(await screen.findByText('resetPassword.invalidTitle')).toBeInTheDocument();
    expect(screen.getByText('resetPassword.requestNew').closest('a')).toHaveAttribute('href', '/forgot-password');
    expect(useCustomerAuthStore.getState().accessToken).toBe('old-session');
  });

  it('without a token there is nothing to fill in', () => {
    renderPage('/reset-password');

    expect(screen.getByText('resetPassword.invalidTitle')).toBeInTheDocument();
    expect(screen.queryByLabelText('resetPassword.newPassword')).not.toBeInTheDocument();
  });
});
