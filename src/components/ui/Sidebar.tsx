'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const sidebarItems = [
  { icon: '📅', label: 'Events', href: '/lecturer/events' },
  { icon: '📜', label: 'Analytics', href: '/lecturer/analytics' },
  { icon: '🌐', label: 'Interactions', href: '/lecturer/interactions' },
  { icon: '📊', label: 'Live Results', href: '/live-results' },
  { icon: '🔗', label: 'Share Access', href: '/lecturer/share-access' },
  { icon: '👥', label: 'Team', href: '/lecturer/team' },
  { icon: '🌎', label: 'Integrations', href: '/lecturer/integrations' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { lecturer, currentEvent } = useAuth();

  return (
    <div className="w-[230px] bg-white border-r border-[#E2EBE6] flex flex-col shrink-0 overflow-y-auto">
      <div className="p-4 pb-3 border-b border-[#E2EBE6]">
        <div className="text-sm font-bold">{lecturer?.name || 'Lecturer'}</div>
        <div className="text-xs text-[#6B7B8D] mt-0.5">
          {currentEvent?.event_name || 'No event selected'}
        </div>
      </div>

      <div className="py-3">
        {sidebarItems.map(item => {
          const isActive = pathname === item.href || (item.href === '/lecturer/interactions' && pathname.startsWith('/lecturer/events/') && !pathname.includes('/settings'));
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
