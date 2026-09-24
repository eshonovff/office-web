import { Outlet, redirect } from 'react-router';
import { customerAuthApi } from '~/api/customerAuth';
import { CustomerHeader } from '~/components/customerLayout/CustomerHeader';
import { CustomerSidebar } from '~/components/customerLayout/CustomerSidebar';
import { SidebarProvider } from '~/components/ui/sidebar';
import { refreshCustomerAccessToken } from '~/lib/customerClient';
import { useCustomerAuthStore } from '~/store/useCustomerAuthStore';

// Same shape as (app)/layout.tsx (staff) — guard once here, every route nested under this
// layout inherits it. Runs before the child route's own loader/component, so by the time
// those run, useCustomerAuthStore already has the current customer.
export async function clientLoader() {
  if (!useCustomerAuthStore.getState().accessToken) {
    try {
      await refreshCustomerAccessToken();
    } catch {
      return redirect('/account/login');
    }
  }

  const customer = await customerAuthApi.me().catch(() => null);
  if (!customer) {
    return redirect('/account/login');
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
