import { Outlet, redirect } from "react-router";
import { authApi } from "~/api/auth";
import { AppSidebar } from "~/components/layout/Sidebar";
import Header from "~/components/layout/Header";
import { refreshAccessToken } from "~/lib/client";
import { SidebarProvider } from "~/components/ui/sidebar";
import { canAccessRoute } from "~/config/permissions";
import { useAuthStore } from "~/store/useAuthStore";
import type { Route } from "./+types/layout";

// Routes any authenticated user may reach regardless of ROUTE_PERMISSIONS —
// the dashboard landing page, the forced password-change page, and the
// denied-access page itself (denying access to /403 would be a dead end).
const ALWAYS_ALLOWED = new Set(["/", "/change-password", "/403"]);

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const pathname = new URL(request.url).pathname;

  // On a hard refresh the access token only lives in memory and is gone —
  // refresh it via the httpOnly cookie first so /auth/me never has to fire
  // (and 401) without a token, then quietly bounce to /login if the
  // refresh cookie itself is dead.
  if (!useAuthStore.getState().accessToken) {
    try {
      await refreshAccessToken();
    } catch {
      return redirect("/login");
    }
  }

  const me = await authApi.me().catch(() => null);
  if (!me) {
    return redirect("/login");
  }

  useAuthStore.getState().setUser(me);

  if (me.mustChangePassword && pathname !== "/change-password") {
    return redirect("/change-password");
  }
  if (!me.mustChangePassword && pathname === "/change-password") {
    return redirect("/");
  }

  if (!ALWAYS_ALLOWED.has(pathname) && !canAccessRoute(pathname, me.permissions)) {
    return redirect("/403");
  }

  return { user: me };
}

export default function AppLayout() {
  return (
    <SidebarProvider className="bg-sidebar h-dvh">
      <AppSidebar />
      <div className="m-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border shadow-sm">
        <Header />
        <main className="bg-background scrollbar-thin min-h-0 flex-1 overflow-y-auto p-3 md:p-6">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}
