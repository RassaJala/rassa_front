import type { ReactNode } from 'react';
import { useTheme } from '~/providers/ThemeProvider';
import { getColors } from '~/constants/colors';
import type { Role } from '~/types';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface DashboardLayoutProps {
  children: ReactNode;
  role: Exclude<Role, never>;
}

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const { resolved } = useTheme();
  const { bg } = getColors(resolved === 'dark');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: bg }}>
      <Sidebar role={role} />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Topbar role={role} />
        <main
          style={{
            flex: 1,
            padding: '28px 32px 40px',
            overflowY: 'auto',
            position: 'relative',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
