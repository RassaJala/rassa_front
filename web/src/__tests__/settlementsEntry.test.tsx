import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminRoute } from '../components/guards/AdminRoute';
import { Sidebar } from '../components/layout/Sidebar';
import { ThemeProvider } from '../providers/ThemeProvider';
import { AdminSettlements } from '../routes/AdminSettlements';

let mockRole: 'admin' | 'agricultor' = 'admin';

vi.mock('~/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    user: { id: 1, nombre: 'Test', rol: mockRole },
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

// Renders the real admin nesting (AdminRoute guard + AdminSettlements) without
// pulling in the whole AppRouter graph, which would drag unrelated routes into
// the check compilation. The sidebar nav item is asserted separately below.
function renderGuardedPage(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider>
        <QueryClientProvider client={qc}>
          <Routes>
            <Route element={<AdminRoute />}>
              <Route
                path="/admin/liquidaciones"
                element={<AdminSettlements />}
              />
            </Route>
            {/* Stand-in for the "/" root redirect target (farmer dashboard). */}
            <Route path="/" element={<div>Mis Productos</div>} />
          </Routes>
        </QueryClientProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('settlements entry (R1)', () => {
  beforeEach(() => {
    mockRole = 'admin';
  });

  it('renders the sidebar item and the settlements list for an admin', async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <MemoryRouter initialEntries={['/admin/liquidaciones']}>
        <ThemeProvider>
          <QueryClientProvider client={qc}>
            <Sidebar role="admin" />
            <Routes>
              <Route element={<AdminRoute />}>
                <Route
                  path="/admin/liquidaciones"
                  element={<AdminSettlements />}
                />
              </Route>
            </Routes>
          </QueryClientProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    // Sidebar nav item pointing at the new admin route.
    const link = screen.getByRole('link', { name: /Liquidaciones/ });
    expect(link.getAttribute('href')).toBe('/admin/liquidaciones');

    // The list page actually loaded inside the admin guard.
    expect(await screen.findByText('12 liquidaciones')).toBeInTheDocument();
  });

  it('redirects a non-admin away from the admin settlements route', async () => {
    mockRole = 'agricultor';
    renderGuardedPage('/admin/liquidaciones');

    // AdminRoute bounces to "/" → the root fallback renders instead.
    await waitFor(() => {
      expect(screen.queryByText('12 liquidaciones')).not.toBeInTheDocument();
    });
    expect(await screen.findByText('Mis Productos')).toBeInTheDocument();
  });
});
