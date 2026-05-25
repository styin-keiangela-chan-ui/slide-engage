'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { GoogleSlidesIcon, PowerPointIcon } from './IntegrationIcons';

const sidebarItems = [
  { icon: '📅', label: 'Events', href: '/lecturer/events' },
  { icon: '📜', label: 'Analytics', href: '/lecturer/analytics' },
  { icon: '🌐', label: 'Interactions', href: '/lecturer/interactions' },
  { icon: '📊', label: 'Live Results', href: '/live-results' },
  { icon: '🔗', label: 'Share Access', href: '/lecturer/share-access' },
  { icon: '👥', label: 'Team', href: '/lecturer/team' },
  { icon: '🧩', label: 'Integrations', href: '/lecturer/integrations', hasSubmenu: true },
];

const integrationItems = [
  { icon: <PowerPointIcon size="sm" />, label: 'PowerPoint', href: '/lecturer/integrations/powerpoint' },
  { icon: <GoogleSlidesIcon size="sm" />, label: 'Google Slides', href: '/lecturer/integrations/google-slides' },
];

function isRouteActive(pathname: string, href: string) {
  if (href === '/lecturer/interactions') {
    return pathname === href || (pathname.startsWith('/lecturer/events/') && !pathname.includes('/settings'));
  }

  if (href === '/lecturer/integrations') {
    return pathname === href || pathname.startsWith('/lecturer/integrations/');
  }

  return pathname === href;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { lecturer } = useAuth();
  const integrationsActive = pathname === '/lecturer/integrations' || pathname.startsWith('/lecturer/integrations/');
  const [integrationsOpen, setIntegrationsOpen] = useState(integrationsActive);

  return (
    <div className="w-[230px] bg-white border-r border-[#E2EBE6] flex flex-col shrink-0 overflow-y-auto">
      <div className="p-4 pb-3 border-b border-[#E2EBE6]">
        <div className="text-sm font-bold">{lecturer?.name || 'Lecturer'}</div>
        <div className="text-xs text-[#6B7B8D] mt-0.5">
          {lecturer?.email || 'No email available'}
        </div>
      </div>

      <div className="py-3">
        {sidebarItems.map(item => {
          const isActive = isRouteActive(pathname, item.href);

          if (item.hasSubmenu) {
            return (
              <div key={item.href}>
                <div className="flex">
                  <Link
                    href={item.href}
                    onClick={() => setIntegrationsOpen(true)}
                    className={`flex min-w-0 flex-1 items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium border-l-[3px] transition-colors ${
                      isActive
                        ? 'bg-[#EAF7EF] text-[#2D8A4E] border-l-[#2D8A4E] font-semibold'
                        : 'text-[#6B7B8D] border-l-transparent hover:bg-[#EAF7EF] hover:text-[#2D8A4E]'
                    }`}
                  >
                    <span className="text-[17px]">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setIntegrationsOpen(value => !value)}
                    className={`border-l-0 border-r-0 border-t-0 border-b-0 px-3 text-xs transition ${
                      isActive ? 'bg-[#EAF7EF] text-[#2D8A4E]' : 'text-[#6B7B8D] hover:bg-[#EAF7EF] hover:text-[#2D8A4E]'
                    }`}
                    aria-label={integrationsOpen ? 'Collapse integrations submenu' : 'Expand integrations submenu'}
                    aria-expanded={integrationsOpen}
                  >
                    <span className={`inline-block transition-transform duration-300 ${integrationsOpen ? 'rotate-90' : ''}`}>›</span>
                  </button>
                </div>

                <div
                  className={`grid transition-all duration-300 ease-out ${
                    integrationsOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="py-1">
                      {integrationItems.map(subItem => {
                        const subActive = pathname === subItem.href;
                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className={`ml-7 mr-3 flex items-center gap-2 rounded-[8px] px-3 py-2 text-[12px] font-medium transition ${
                              subActive
                                ? 'bg-[#EAF7EF] text-[#2D8A4E] font-semibold'
                                : 'text-[#7B8CA1] hover:bg-[#F3F8F5] hover:text-[#2D8A4E]'
                            }`}
                          >
                            <span className="grid h-5 min-w-5 place-items-center">
                              {subItem.icon}
                            </span>
                            {subItem.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium border-l-[3px] transition-colors ${
                isActive
                  ? 'bg-[#EAF7EF] text-[#2D8A4E] border-l-[#2D8A4E] font-semibold'
                  : 'text-[#6B7B8D] border-l-transparent hover:bg-[#EAF7EF] hover:text-[#2D8A4E]'
              }`}
            >
              <span className="text-[17px]">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
