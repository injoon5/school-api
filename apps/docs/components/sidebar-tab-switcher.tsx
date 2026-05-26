'use client';

import { useMemo } from 'react';
import { usePathname } from 'fumadocs-core/framework';
import { SidebarTabsDropdown } from 'fumadocs-ui/components/sidebar/tabs/dropdown';
import { useDocsLayout } from 'fumadocs-ui/layouts/docs';
import { isLayoutTabActive } from 'fumadocs-ui/layouts/shared';

/** Shown on pages outside Client / HTTP API roots (e.g. `/docs`) where no tab is active. */
export function SidebarTabSwitcherFallback() {
  const {
    props: { tabs, tabMode },
  } = useDocsLayout();
  const pathname = usePathname();
  const selected = useMemo(
    () => tabs.findLast((item) => isLayoutTabActive(item, pathname)),
    [tabs, pathname],
  );

  if (tabMode !== 'auto' || selected || tabs.length === 0) return null;

  return (
    <SidebarTabsDropdown
      options={tabs}
      placeholder={
        <div>
          <p className="text-sm font-medium">Documentation</p>
          <p className="text-sm text-fd-muted-foreground md:hidden">
            Client or HTTP API
          </p>
        </div>
      }
    />
  );
}
