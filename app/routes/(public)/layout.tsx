import { Link, Outlet } from 'react-router';
import { ModeToggle } from '~/components/layout/ModeToggle';
import { BrandLogo } from '~/components/shared/BrandLogo';

// No auth check here on purpose — unlike (app)/layout.tsx, the landing page must stay
// reachable by anyone, logged in or not. Sign-in and sign-up live in (auth)/layout.tsx.
export default function PublicLayout() {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <Link to="/">
          <BrandLogo nameClassName="text-lg" />
        </Link>
        <ModeToggle />
      </header>
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
