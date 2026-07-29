/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, no-undef, sonarjs/no-duplicate-string -- Test files are less strict */
import { createChatApi } from '@rassa/chat';
import api from '@/services/api';

jest.mock('@/services/api');

const mockApi = api as jest.Mocked<typeof api>;
const chatApi = createChatApi(mockApi);

describe('chat service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getConversations unwraps _ok and maps fields', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        ok: true,
        data: [
          {
            id_conversacion: 1,
            tipo: false,
            nombre: 'Juan Perez',
            ultimo_mensaje: 'Hola',
            ultimo_mensaje_creado_en: '2026-01-01T00:00:00Z',
            no_leidos: 2,
            es_familia: false,
          },
        ],
      },
    });

    const result = await chatApi.getConversations();

    expect(mockApi.get).toHaveBeenCalledWith('/chat/usuarios/conversaciones/');
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toEqual({
      id: 1,
      nombre: 'Juan Perez',
      tipo: 'privada',
      es_familia: false,
      ultimo_mensaje: 'Hola',
      ultimo_mensaje_fecha: '2026-01-01T00:00:00Z',
      no_leidos: 2,
      participante_nombre: 'Juan Perez',
      participante_avatar: null,
    });
  });

  it('getMessages unwraps _ok and maps id_mensaje to id', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        ok: true,
        data: {
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id_mensaje: 42,
              emisor: { id_usuario: 1, nombre_completo: 'Test User' },
              contenido: 'Hello',
              leido: true,
              editado: false,
              creado_en: '2026-01-01T00:00:00Z',
            },
          ],
        },
      },
    });

    const result = await chatApi.getMessages(1, 1);

    expect(mockApi.get).toHaveBeenCalledWith(
      '/chat/conversaciones/1/mensajes/?page=1',
    );
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toEqual({
      id: 42,
      conversacion: 1,
      remitente: 1,
      remitente_nombre: 'Test User',
      contenido: 'Hello',
      creado_en: '2026-01-01T00:00:00Z',
      leido: true,
      editado: false,
    });
  });

  it('sendMessage unwraps _ok and maps emisor fields', async () => {
    const payload = { conversacion: 1, contenido: 'Hola' };
    mockApi.post.mockResolvedValueOnce({
      data: {
        ok: true,
        data: {
          id_mensaje: 10,
          emisor: { id_usuario: 1, nombre_completo: 'Test User' },
          contenido: 'Hola',
          leido: false,
          editado: false,
          creado_en: '2026-01-01T00:00:00Z',
        },
      },
    });

    const result = await chatApi.sendMessage(payload);

    expect(mockApi.post).toHaveBeenCalledWith('/chat/mensajes/enviar/', {
      fk_conversacion: 1,
      contenido: 'Hola',
    });
    expect(result).toEqual({
      id: 10,
      conversacion: 1,
      remitente: 1,
      remitente_nombre: 'Test User',
      contenido: 'Hola',
      creado_en: '2026-01-01T00:00:00Z',
      leido: false,
      editado: false,
    });
  });

  it('createPrivateConversation fills fields from existing conversation', async () => {
    const payload = { fk_usuario: 5 };
    mockApi.post.mockResolvedValueOnce({
      data: {
        ok: true,
        mensaje: 'La conversación ya existe.',
        data: { id_conversacion: 20 },
      },
    });
    mockApi.get.mockResolvedValueOnce({
      data: {
        ok: true,
        data: [
          {
            id_conversacion: 20,
            tipo: false,
            nombre: 'Juan Perez',
            ultimo_mensaje: 'Hola',
            ultimo_mensaje_creado_en: '2026-01-01T00:00:00Z',
            no_leidos: 0,
            es_familia: false,
          },
        ],
      },
    });

    const result = await chatApi.createPrivateConversation(payload);

    expect(mockApi.post).toHaveBeenCalledWith(
      '/chat/conversaciones/crear-privada/',
      payload,
    );
    expect(mockApi.get).toHaveBeenCalledWith('/chat/usuarios/conversaciones/');
    expect(result.id).toBe(20);
    expect(result.tipo).toBe('privada');
    expect(result.participante_nombre).toBe('Juan Perez');
    expect(result.nombre).toBe('Juan Perez');
  });

  it('createPrivateConversation falls back to placeholder when conversation is not found', async () => {
    const payload = { fk_usuario: 5 };
    mockApi.post.mockResolvedValueOnce({
      data: {
        ok: true,
        mensaje: 'Conversación creada.',
        data: { id_conversacion: 21 },
      },
    });
    mockApi.get.mockResolvedValueOnce({
      data: {
        ok: true,
        data: [],
      },
    });

    const result = await chatApi.createPrivateConversation(payload);

    expect(result.id).toBe(21);
    expect(result.participante_nombre).toBe('');
  });

  it('markMessageAsRead calls PATCH and returns placeholder', async () => {
    mockApi.patch.mockResolvedValueOnce({
      data: { ok: true, mensaje: 'Mensaje marcado como leído.' },
    });

    const result = await chatApi.markMessageAsRead(10);

    expect(mockApi.patch).toHaveBeenCalledWith('/chat/mensajes/10/leer/');
    expect(result.id).toBe(10);
    expect(result.leido).toBe(true);
  });

  it('throws when backend responds with ok: false', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { ok: false, message: 'Unauthorized' },
    });

    await expect(chatApi.getConversations()).rejects.toThrow('Unauthorized');
  });
});
