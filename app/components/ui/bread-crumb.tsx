import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router';

interface BreadCrumbLink {
  label: string;
  link?: string;
}

interface BreadCrumbProps {
  items: BreadCrumbLink[];
}

const MAX_VISIBLE = 4;

type Visible = BreadCrumbLink | 'ellipsis';

// Long chains collapse to first + … + last two, rather than overflowing.
function collapse(items: BreadCrumbLink[]): Visible[] {
  if (items.length <= MAX_VISIBLE) return items;
  return [items[0], 'ellipsis', ...items.slice(-2)];
}

const BreadCrumbs = ({ items }: BreadCrumbProps) => {
  const backItem = items.length >= 2 ? items[items.length - 2] : null;
  const visible = collapse(items);

  return (
    <nav aria-label="Breadcrumb">
      {/* Mobile: back button */}
      {backItem?.link && (
        <Link
          to={backItem.link}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors sm:hidden"
        >
          <ChevronLeft className="size-4" />
          {backItem.label}
        </Link>
      )}

      {/* Desktop: full breadcrumb trail */}
      <div className="text-muted-foreground hidden items-center gap-2 text-sm sm:flex">
        {visible.map((element, index) => {
          const isLast = index === visible.length - 1;

          if (element === 'ellipsis') {
            return (
              <div key="ellipsis" className="flex items-center gap-2">
                <span aria-hidden="true">…</span>
                {!isLast && <span aria-hidden="true">/</span>}
              </div>
            );
          }

          return (
            <div key={element.link || element.label} className="flex items-center gap-2">
              {element.link && !isLast ? (
                <Link to={element.link} className="hover:text-foreground transition-colors">
                  {element.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{element.label}</span>
              )}

              {!isLast && <span aria-hidden="true">/</span>}
            </div>
          );
        })}
      </div>
    </nav>
  );
};

export default BreadCrumbs;
