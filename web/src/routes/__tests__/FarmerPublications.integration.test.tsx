import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { server } from '../../mocks/server';
import { ThemeProvider } from '../../providers/ThemeProvider';
import { FarmerPublications } from '../FarmerPublications';

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <QueryClientProvider client={qc}>
          <FarmerPublications />
        </QueryClientProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('FarmerPublications — integration', () => {
  it('fetches and displays publications from the API', async () => {
    renderPage();
    const semanaMatches = await screen.findAllByText('Semana 31');
    expect(semanaMatches.length).toBeGreaterThanOrEqual(1);
    const borradorMatches = await screen.findAllByText('Borrador');
    expect(borradorMatches.length).toBeGreaterThanOrEqual(1);
  });

  it('calls publish endpoint and shows success toast', async () => {
    let publishCalled = false;
    server.use(
      http.post('/api/publicaciones/:id/publish/', ({ params }) => {
        publishCalled = true;
        return HttpResponse.json({
          data: {
            id_publicacion: Number(params.id),
            fk_agricultor: 10,
            fecha_publicacion: '2026-07-27',
            semana: 31,
            estado: 'publicado',
            productos: [],
            creado_en: '2026-07-27T00:00:00Z',
          },
        });
      }),
    );

    renderPage();
    await screen.findAllByText('Semana 31');

    const publishBtn = screen.getAllByText('Publicar')[0]!;
    await userEvent.click(publishBtn);

    await waitFor(() => {
      expect(publishCalled).toBe(true);
    });
    expect(
      await screen.findByText('Publicación publicada.'),
    ).toBeInTheDocument();
  });

  it('shows error toast when publish fails', async () => {
    server.use(
      http.post('/api/publicaciones/:id/publish/', () =>
        HttpResponse.json(
          { detail: 'Error interno del servidor.' },
          { status: 500 },
        ),
      ),
    );

    renderPage();
    await screen.findAllByText('Semana 31');

    const publishBtn = screen.getAllByText('Publicar')[0]!;
    await userEvent.click(publishBtn);

    expect(
      await screen.findByText('Error interno del servidor.'),
    ).toBeInTheDocument();
  });
});
