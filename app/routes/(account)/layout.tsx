import { Outlet, redirect } from 'react-router';
import { customerAuthApi } from '~/api/customerAuth';
import { CustomerHeader } from '~/components/customerLayout/CustomerHeader';
import { CustomerSidebar } from '~/components/customerLayout/CustomerSidebar';
import { SidebarProvider } from '~/components/ui/sidebar';
import { isSessionRejected, ServerUnreachableError, withTransientRetry } from '~/lib/authFailure';
import { refreshCustomerAccessToken } from '~/lib/customerClient';
import { useCustomerAuthStore } from '~/store/useCustomerAuthStore';

// Same shape as (app)/layout.tsx (staff) — guard once here, every route nested under this
// layout inherits it. Runs before the child route's own loader/component, so by the time
// those run, useCustomerAuthStore already has the current customer.
export async function clientLoader() {
  // Same rule as (app)/layout.tsx: only a refused session goes to the login page; an
  // unreachable server is retried, then shown as "server unavailable".
  if (!useCustomerAuthStore.getState().accessToken) {
    try {
      await withTransientRetry(refreshCustomerAccessToken);
    } catch (error) {
      if (isSessionRejected(error)) return redirect('/account/login');
      throw new ServerUnreachableError(error);
    }
  }

  let customer;
  try {
    customer = await withTransientRetry(() => customerAuthApi.me());
  } catch (error) {
    if (isSessionRejected(error)) return redirect('/account/login');
    throw new ServerUnreachableError(error);
  }

  useCustomerAuthStore.getState().setCustomer(customer);
  return { customer };
}

export default function AccountLayout() {
  return (
    <SidebarProvider className="bg-sidebar h-dvh">
      <CustomerSidebar />
      <div className="m-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border shadow-sm">
        <CustomerHeader />
        <main className="bg-background min-h-0 flex-1 scrollbar-thin overflow-y-auto p-3 md:p-6">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}
