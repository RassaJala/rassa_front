import { http, HttpResponse } from 'msw';

import { TRANSICIONES } from '../constants/recolecciones';
import type { Recoleccion, RecoleccionEstado } from '../types/recolecciones';
import {
  esRecoleccionDuplicada,
  isValidFecha,
  todayString,
} from '../utils/recolecciones';

const BASE = '/api';

const fakeAgricultores = [
  {
    id_usuario: 10,
    nombre: 'Juan',
    apellido_paterno: 'Pérez',
    apellido_materno: null,
    role: 'farmer',
    localidad: 1,
  },
  {
    id_usuario: 11,
    nombre: 'Ana',
    apellido_paterno: 'Ramírez',
    apellido_materno: null,
    role: 'farmer',
    localidad: 2,
  },
];

function nombreCompleto(a: {
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string | null;
}): string {
  return [a.nombre, a.apellido_paterno, a.apellido_materno]
    .filter(Boolean)
    .join(' ');
}

function inicialRecoleccion(): Recoleccion {
  const hoy = todayString();
  return {
    id_recoleccion: 1,
    fk_agricultor: 10,
    agricultor_nombre: 'Juan Pérez',
    fecha_recoleccion: hoy,
    hora_inicio: '08:00:00',
    hora_fin: '10:00:00',
    estado: 'pendiente',
    comentarios: null,
    creado_en: `${hoy}T00:00:00Z`,
  };
}

let recoleccionesStore: Recoleccion[] = [inicialRecoleccion()];
let nextRecoleccionId = 2;

export function resetRecoleccionesMock(): void {
  recoleccionesStore = [inicialRecoleccion()];
  nextRecoleccionId = 2;
}

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
      data: {
        ...fakePub,
        id_publicacion: Number(params.id),
        estado: 'publicado',
      },
    }),
  ),

  http.post(`${BASE}/publicaciones/:id/close/`, ({ params }) =>
    HttpResponse.json({
      data: {
        ...fakePub,
        id_publicacion: Number(params.id),
        estado: 'cerrado',
      },
    }),
  ),

  http.get(`${BASE}/recolecciones/`, ({ request }) => {
    const url = new URL(request.url);
    const estado = url.searchParams.get('estado');
    const fechaDesde = url.searchParams.get('fecha_desde');

    let results = recoleccionesStore;
    if (estado) results = results.filter((r) => r.estado === estado);
    if (fechaDesde) {
      results = results.filter((r) => r.fecha_recoleccion >= fechaDesde);
    }

    return HttpResponse.json({
      data: {
        count: results.length,
        next: null,
        previous: null,
        results,
      },
    });
  }),

  http.post(`${BASE}/recolecciones/`, async ({ request }) => {
    const body = (await request.json()) as {
      fk_agricultor?: number;
      fecha_recoleccion?: string;
      hora_inicio?: string | null;
      hora_fin?: string | null;
      comentarios?: string | null;
    };

    const fecha = body.fecha_recoleccion ?? '';

    if (!isValidFecha(fecha)) {
      return HttpResponse.json(
        { fecha_recoleccion: ['La fecha ingresada no es válida.'] },
        { status: 400 },
      );
    }
    if (fecha < todayString()) {
      return HttpResponse.json(
        { fecha_recoleccion: ['La fecha no puede ser anterior a hoy.'] },
        { status: 400 },
      );
    }

    const duplicado = esRecoleccionDuplicada(
      recoleccionesStore,
      body.fk_agricultor ?? null,
      fecha,
    );
    if (duplicado) {
      return HttpResponse.json(
        {
          fk_agricultor: [
            'El agricultor ya tiene una recolección programada para esta fecha.',
          ],
        },
        { status: 400 },
      );
    }

    const agricultor = fakeAgricultores.find(
      (a) => a.id_usuario === body.fk_agricultor,
    );
    const nueva: Recoleccion = {
      id_recoleccion: nextRecoleccionId++,
      fk_agricultor: body.fk_agricultor ?? null,
      agricultor_nombre: agricultor ? nombreCompleto(agricultor) : 'Agricultor',
      fecha_recoleccion: fecha,
      hora_inicio: body.hora_inicio ?? null,
      hora_fin: body.hora_fin ?? null,
      estado: 'pendiente',
      comentarios: body.comentarios ?? null,
      creado_en: `${fecha}T00:00:00Z`,
    };
    recoleccionesStore.push(nueva);

    return HttpResponse.json({ data: nueva }, { status: 201 });
  }),

  http.post(
    `${BASE}/recolecciones/:id/estado/`,
    async ({ params, request }) => {
      const body = (await request.json()) as { estado?: string };
      const item = recoleccionesStore.find(
        (r) => r.id_recoleccion === Number(params.id),
      );
      if (!item) {
        return HttpResponse.json(
          { id_recoleccion: 'Recolección no encontrada.' },
          { status: 404 },
        );
      }

      const estado = body.estado as RecoleccionEstado;
      if (estado === item.estado) {
        return HttpResponse.json(
          { non_field_errors: ['La recolección ya está en ese estado.'] },
          { status: 400 },
        );
      }
      if (!TRANSICIONES[item.estado].includes(estado)) {
        return HttpResponse.json(
          {
            non_field_errors: [
              `No se puede cambiar de '${item.estado}' a '${estado}'.`,
            ],
          },
          { status: 400 },
        );
      }
      if (estado !== 'cancelado' && item.fecha_recoleccion < todayString()) {
        return HttpResponse.json(
          {
            fecha_recoleccion:
              'La fecha de la recolección ya pasó; solo se permite cancelarla.',
          },
          { status: 400 },
        );
      }

      const updated: Recoleccion = { ...item, estado };
      recoleccionesStore = recoleccionesStore.map((r) =>
        r.id_recoleccion === item.id_recoleccion ? updated : r,
      );
      return HttpResponse.json({ data: updated });
    },
  ),

  http.post(`${BASE}/recolecciones/:id/cancelar/`, ({ params }) => {
    const item = recoleccionesStore.find(
      (r) => r.id_recoleccion === Number(params.id),
    );
    if (!item) {
      return HttpResponse.json(
        { id_recoleccion: 'Recolección no encontrada.' },
        { status: 404 },
      );
    }
    if (item.estado === 'cancelado') {
      return HttpResponse.json(
        { non_field_errors: ['La recolección ya está en ese estado.'] },
        { status: 400 },
      );
    }
    if (!TRANSICIONES[item.estado].includes('cancelado')) {
      return HttpResponse.json(
        {
          non_field_errors: [
            `No se puede cambiar de '${item.estado}' a 'cancelado'.`,
          ],
        },
        { status: 400 },
      );
    }

    const updated: Recoleccion = { ...item, estado: 'cancelado' };
    recoleccionesStore = recoleccionesStore.map((r) =>
      r.id_recoleccion === item.id_recoleccion ? updated : r,
    );
    return HttpResponse.json({ data: updated });
  }),

  http.get(`${BASE}/recolecciones/agricultores/`, () =>
    HttpResponse.json({
      data: {
        count: fakeAgricultores.length,
        next: null,
        previous: null,
        results: fakeAgricultores,
      },
    }),
  ),

  http.get(`${BASE}/municipios/`, () =>
    HttpResponse.json({
      data: [{ id_municipio: 1, nombre: 'Jalisco', estado: true }],
    }),
  ),

  http.get(`${BASE}/localidades/`, () =>
    HttpResponse.json({
      data: [
        {
          id_localidad: 1,
          nombre: 'Guadalajara',
          municipio_id: 1,
          estado: true,
        },
        {
          id_localidad: 2,
          nombre: 'Tlaquepaque',
          municipio_id: 1,
          estado: true,
        },
      ],
    }),
  ),
];
