import { http, HttpResponse } from 'msw';

const BASE = '/api';

const fakePub = {
  id_publicacion: 1,
  fk_agricultor: 10,
  fecha_publicacion: '2026-07-27',
  semana: 31,
  productos: [
    {
      id_producto_semanal: 100,
      fk_producto: 5,
      fk_unidad: 2,
      stock: 10,
      precio: '500.00',
      foto: null,
      estado: 'activo',
      creado_en: '2026-07-27T00:00:00Z',
    },
  ],
  creado_en: '2026-07-27T00:00:00Z',
};

export const handlers = [
  http.get(`${BASE}/publicaciones/`, () =>
    HttpResponse.json({
      data: {
        count: 1,
        next: null,
        previous: null,
        results: [{ ...fakePub, estado: 'borrador' }],
      },
    }),
  ),

  http.post(`${BASE}/publicaciones/:id/publish/`, ({ params }) =>
    HttpResponse.json({
      data: { ...fakePub, id_publicacion: Number(params.id), estado: 'publicado' },
    }),
  ),

  http.post(`${BASE}/publicaciones/:id/close/`, ({ params }) =>
    HttpResponse.json({
      data: { ...fakePub, id_publicacion: Number(params.id), estado: 'cerrado' },
    }),
  ),
];
