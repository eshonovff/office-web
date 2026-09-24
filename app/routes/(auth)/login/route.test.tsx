import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '~/api/auth';
import { customerAuthApi } from '~/api/customerAuth';
import { makeQueryClient } from '~/lib/query-client';
import { useAuthStore } from '~/store/useAuthStore';
import { useCustomerAuthStore } from '~/store/useCustomerAuthStore';
import LoginPage from './route';

const navigate = vi.fn();

vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigate,
}));

vi.mock('~/api/auth', () => ({ authApi: { login: vi.fn() } }));
vi.mock('~/api/customerAuth', () => ({ customerAuthApi: { login: vi.fn(), externalLogin: vi.fn() } }));

const staffUser = { id: 'u1', fullName: 'Owner', username: 'owner', permissions: ['users.view'] };
const customer = { id: 'c1', email: 'faridun@example.com', fullName: 'Faridun' };

function httpError(status: number) {
  return Object.assign(new Error(`HTTP ${status}`), { response: { status } });
}

function renderPage(path = '/login') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={makeQueryClient()}>
        <LoginPage />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

async function signIn(identifier: string, password = 'secret123') {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('identifier'), identifier);
  await user.type(screen.getByLabelText('password'), password);
  await user.click(screen.getByRole('button', { name: 'signIn' }));
}

describe('LoginPage (shared by staff and мизоҷ)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ accessToken: null });
    useCustomerAuthStore.setState({ accessToken: null });
  });

  it('signs a staff member in with their username — the мизоҷ login is never called', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      accessToken: 'staff-t',
      mustChangePassword: false,
      user: staffUser,
    } as never);
    renderPage();

    await signIn('992927777777');

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard'));
    expect(authApi.login).toHaveBeenCalledWith({ username: '992927777777', password: 'secret123' });
    expect(customerAuthApi.login).not.toHaveBeenCalled();
    expect(useAuthStore.getState().accessToken).toBe('staff-t');
    expect(useCustomerAuthStore.getState().accessToken).toBeNull();
  });

  it('sends a staff member who must change the password there first', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      accessToken: 't',
      mustChangePassword: true,
      user: staffUser,
    } as never);
    renderPage();

    await signIn('owner');

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/change-password'));
  });

  it('signs a мизоҷ in with their email (trimmed) — the staff login is never called', async () => {
    vi.mocked(customerAuthApi.login).mockResolvedValue({ accessToken: 'cust-t', customer } as never);
    renderPage();

    await signIn('  faridun@example.com ');

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/account'));
    expect(customerAuthApi.login).toHaveBeenCalledWith({ email: 'faridun@example.com', password: 'secret123' });
    expect(authApi.login).not.toHaveBeenCalled();
    expect(useCustomerAuthStore.getState().accessToken).toBe('cust-t');
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('shows the same message for a wrong login in either system', async () => {
    vi.mocked(authApi.login).mockRejectedValue(httpError(401));
    vi.mocked(customerAuthApi.login).mockRejectedValue(httpError(401));

    const staff = renderPage();
    await signIn('992927777777');
    const staffMessage = (await screen.findByRole('alert')).textContent;
    staff.unmount();

    renderPage();
    await signIn('someone@example.com');
    const customerMessage = (await screen.findByRole('alert')).textContent;

    expect(staffMessage).toBe('loginError');
    expect(customerMessage).toBe(staffMessage);
  });

  it('offers to verify an unverified мизоҷ email', async () => {
    vi.mocked(customerAuthApi.login).mockRejectedValue(httpError(403));
    renderPage();

    await signIn('new@example.com');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('errors.notVerified');
    expect(screen.getByRole('link', { name: 'customerAuth:accountLogin.goVerify' })).toHaveAttribute(
      'href',
      '/verify-email?email=new%40example.com'
    );
  });

  it('says so when rate-limited or when the server is down', async () => {
    vi.mocked(authApi.login).mockRejectedValueOnce(httpError(429)).mockRejectedValueOnce(new Error('Network Error'));
    renderPage();

    await signIn('owner');
    expect(await screen.findByRole('alert')).toHaveTextContent('errors.tooMany');

    await userEvent.click(screen.getByRole('button', { name: 'signIn' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('errors.unavailable'));
  });

  it('never follows ?redirectTo out of the мизоҷ area', async () => {
    vi.mocked(customerAuthApi.login).mockResolvedValue({ accessToken: 't', customer } as never);
    renderPage('/login?redirectTo=//evil.com');

    await signIn('faridun@example.com');

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/account'));
  });

  it('never follows ?redirectTo to a staff page the account may not open', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      accessToken: 't',
      mustChangePassword: false,
      user: staffUser,
    } as never);
    renderPage('/login?redirectTo=/roles');

    await signIn('owner');

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard'));
  });

  it('refuses an empty identifier before calling anything', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'signIn' }));

    expect(await screen.findByText('identifierRequired')).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
    expect(customerAuthApi.login).not.toHaveBeenCalled();
  });
});
