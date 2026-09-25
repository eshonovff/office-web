import { Outlet, redirect } from "react-router";
import { authApi } from "~/api/auth";
import { AppSidebar } from "~/components/layout/Sidebar";
import Header from "~/components/layout/Header";
import { useRealtimeConnection } from "~/hooks/useRealtimeConnection";
import { isSessionRejected, ServerUnreachableError, withTransientRetry } from "~/lib/authFailure";
import { refreshAccessToken } from "~/lib/client";
import { SidebarProvider } from "~/components/ui/sidebar";
import { canAccessRoute } from "~/config/permissions";
import { useAuthStore } from "~/store/useAuthStore";
import type { Route } from "./+types/layout";

// Routes any authenticated user may reach regardless of ROUTE_PERMISSIONS — the dashboard
// landing page, the forced password-change page, and the denied-access page itself (denying
// access to /403 would be a dead end). /dashboard/stats is here too, but isn't actually open to
// everyone — its own clientLoader (dashboard/stats/route.tsx) enforces the real Owner/Admin
// check; a permission-string entry here wouldn't fit (it's a role check, not a permission one).
// "/" itself is no longer part of this layout — it's the public landing page now.
const ALWAYS_ALLOWED = new Set(["/dashboard", "/dashboard/stats", "/change-password", "/403"]);

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const pathname = new URL(request.url).pathname;

  // On a hard refresh the access token only lives in memory and is gone —
  // refresh it via the httpOnly cookie first so /auth/me never has to fire
  // (and 401) without a token. Only a REFUSED session goes to /login: if the
  // server is merely unreachable (a restart, a deploy) retry, then show the
  // "server unavailable" page — sending a logged-in user to /login for that
  // is what kicked people out every time the API restarted.
  if (!useAuthStore.getState().accessToken) {
    try {
      await withTransientRetry(refreshAccessToken);
    } catch (error) {
      if (isSessionRejected(error)) return redirect("/login");
      throw new ServerUnreachableError(error);
    }
  }

  let me;
  try {
    me = await withTransientRetry(() => authApi.me());
  } catch (error) {
    if (isSessionRejected(error)) return redirect("/login");
    throw new ServerUnreachableError(error);
  }

  useAuthStore.getState().setUser(me);

  if (me.mustChangePassword && pathname !== "/change-password") {
    return redirect("/change-password");
  }
  if (!me.mustChangePassword && pathname === "/change-password") {
    return redirect("/dashboard");
  }

  if (!ALWAYS_ALLOWED.has(pathname) && !canAccessRoute(pathname, me.permissions)) {
    return redirect("/403");
  }

  return { user: me };
}

export default function AppLayout() {
  useRealtimeConnection();

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
