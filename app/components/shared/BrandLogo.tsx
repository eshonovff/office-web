import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';

interface BrandLogoProps {
  className?: string;
  /** Size of the square tile around the mark. */
  tileClassName?: string;
  /** e.g. `group-data-[collapsible=icon]:hidden` to keep only the mark in a collapsed sidebar. */
  nameClassName?: string;
}

// The Office Nizom mark always sits on a white tile: its right half is dark navy and would
// vanish on the dark theme. The name is live text (not the image's wordmark) so it follows
// the theme. Assets: public/brand/ (see docs/brand/README.md).
export function BrandLogo({ className, tileClassName, nameClassName }: BrandLogoProps) {
  const { t } = useTranslation('common');

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-sm ring-1 ring-black/5',
          tileClassName
        )}>
        <img src="/brand/mark.png" alt="" className="size-full object-contain" />
      </span>
      <span className={cn('font-bold tracking-tight whitespace-nowrap', nameClassName)}>{t('brand')}</span>
    </span>
  );
}
