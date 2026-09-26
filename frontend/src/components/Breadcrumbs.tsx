import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.href
        ? {
            item: new URL(
              item.href,
              window.location.origin
            ).toString()
          }
        : {})
    }))
  };

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-1.5">
          {items.map((item, index) => (
            <React.Fragment key={`${item.label}-${index}`}>
              {index > 0 && (
                <ChevronRight
                  className="w-3.5 h-3.5 text-slate-700 flex-shrink-0"
                  aria-hidden="true"
                />
              )}

              <li>
                {item.onClick ? (
                  <button
                    type="button"
                    onClick={item.onClick}
                    className="
                      text-xs text-slate-400
                      hover:text-white
                      transition-colors
                      cursor-pointer
                    "
                  >
                    {item.label}
                  </button>
                ) : item.href ? (
                  <a
                    href={item.href}
                    className="
                      text-xs text-slate-400
                      hover:text-white
                      transition-colors
                    "
                  >
                    {item.label}
                  </a>
                ) : (
                  <span className="text-xs text-white font-medium">
                    {item.label}
                  </span>
                )}
              </li>
            </React.Fragment>
          ))}
        </ol>
      </nav>

      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </>
  );
};