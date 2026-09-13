import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
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
      ...(item.href ? { item: new URL(item.href, window.location.origin).toString() } : {})
    }))
  };

  return (
    <>
      <nav aria-label="Migas de pan" className="mb-4 overflow-x-auto">
        <ol className="flex min-w-max items-center gap-1 text-[11px] text-slate-500">
          {items.map((item, index) => (
            <React.Fragment key={`${item.label}-${index}`}>
              {index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-700" aria-hidden="true" />}
              <li>
                {item.href ? (
                  <a href={item.href} className="transition hover:text-blue-400">
                    {item.label}
                  </a>
                ) : (
                  <span aria-current="page" className="font-semibold text-slate-300">
                    {item.label}
                  </span>
                )}
              </li>
            </React.Fragment>
          ))}
        </ol>
      </nav>
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
    </>
  );
};
