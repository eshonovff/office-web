import { useTranslation } from 'react-i18next';
import { Link, Outlet } from 'react-router';
import { LanguageSwitcher } from '~/components/layout/LanguageSwitcher';
import { ModeToggle } from '~/components/layout/ModeToggle';
import { cn } from '~/lib/utils';

// One look for every way in: sign in (staff and мизоҷ alike), register, verify the email.
// No auth check on purpose — these pages must stay reachable by anyone.
export default function AuthLayout() {
  const { t } = useTranslation('auth');

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="bg-foreground text-background hidden flex-col justify-between p-12 lg:flex">
        <Link to="/" className="text-2xl font-bold tracking-tight">
          {t('brand')}
        </Link>
        <div className="space-y-4">
          <h1 className="text-4xl leading-tight font-bold">{t('hero.title')}</h1>
          <p className="text-background/60 text-lg">{t('hero.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          {(['w-4', 'w-8', 'w-12', 'w-16', 'w-20'] as const).map((w, i) => (
            <div key={i} className={cn('bg-background/20 h-1 rounded-full', w)} />
          ))}
        </div>
      </div>

      <div className="bg-background flex flex-col">
        <div className="flex items-center justify-between gap-2 p-4">
          {/* On a phone the left panel is hidden — the brand moves up here. */}
          <Link to="/" className="text-lg font-bold tracking-tight lg:invisible">
            {t('brand')}
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ModeToggle />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-8 sm:px-8">
          <div className="w-full max-w-sm">
            <Outlet />
          </div>
        </div>
        <div className="p-4" />
      </div>
    </div>
  );
}
