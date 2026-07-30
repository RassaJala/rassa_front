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
            tipo: 'privada',
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

  it('createPrivateConversation returns minimal Conversation without GET waterfall', async () => {
    const payload = { fk_usuario: 5 };
    mockApi.post.mockResolvedValueOnce({
      data: {
        ok: true,
        mensaje: 'La conversación ya existe.',
        data: { id_conversacion: 20 },
      },
    });

    const result = await chatApi.createPrivateConversation(payload);

    expect(mockApi.post).toHaveBeenCalledWith(
      '/chat/conversaciones/crear-privada/',
      payload,
    );
    expect(mockApi.get).not.toHaveBeenCalled();
    expect(result).toEqual({
      id: 20,
      nombre: '',
      tipo: 'privada',
      es_familia: false,
      ultimo_mensaje: null,
      ultimo_mensaje_fecha: null,
      no_leidos: 0,
      participante_nombre: '',
      participante_avatar: null,
    });
  });

  it('markConversationAsRead calls PATCH batch endpoint', async () => {
    mockApi.patch.mockResolvedValueOnce({
      data: { ok: true, mensaje: 'Conversación marcada como leída.' },
    });

    await chatApi.markConversationAsRead(5);

    expect(mockApi.patch).toHaveBeenCalledWith('/chat/conversaciones/5/leer/');
  });

  it('editMessage calls PATCH with contenido and returns mapped message', async () => {
    mockApi.patch.mockResolvedValueOnce({
      data: {
        ok: true,
        data: {
          id_mensaje: 10,
          emisor: { id_usuario: 1, nombre_completo: 'Test User' },
          contenido: 'Edited',
          leido: true,
          editado: true,
          creado_en: '2026-01-01T00:00:00Z',
        },
      },
    });

    const result = await chatApi.editMessage(10, 'Edited', 1);

    expect(mockApi.patch).toHaveBeenCalledWith('/chat/mensajes/10/editar/', {
      contenido: 'Edited',
    });
    expect(result).toEqual({
      id: 10,
      conversacion: 1,
      remitente: 1,
      remitente_nombre: 'Test User',
      contenido: 'Edited',
      creado_en: '2026-01-01T00:00:00Z',
      leido: true,
      editado: true,
    });
  });

  it('deleteMessage calls PATCH and unwraps without returning data', async () => {
    mockApi.patch.mockResolvedValueOnce({
      data: { ok: true, mensaje: 'Mensaje eliminado.' },
    });

    const result = await chatApi.deleteMessage(10);

    expect(mockApi.patch).toHaveBeenCalledWith('/chat/mensajes/10/inactivar/');
    expect(result).toBeUndefined();
  });

  it('getGroupMembers unwraps array and maps with mapGroupMember', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        ok: true,
        data: [
          {
            id_miembro: 1,
            id_usuario: 5,
            nombre_completo: 'Ana López',
            correo: 'ana@test.com',
            creado_en: '2026-01-01T00:00:00Z',
          },
        ],
      },
    });

    const result = await chatApi.getGroupMembers(2);

    expect(mockApi.get).toHaveBeenCalledWith(
      '/chat/conversaciones/2/integrantes/',
    );
    expect(result).toEqual([
      {
        id: 1,
        nombre: 'Ana López',
        rol: '',
        avatar: null,
      },
    ]);
  });

  it('createGroup sends POST and returns Conversation with payload.nombre', async () => {
    const payload = { nombre: 'Grupo Test', fk_usuarios: [1, 2] };
    mockApi.post.mockResolvedValueOnce({
      data: {
        ok: true,
        mensaje: 'Grupo creado.',
        data: { id_conversacion: 30 },
      },
    });

    const result = await chatApi.createGroup(payload);

    expect(mockApi.post).toHaveBeenCalledWith(
      '/chat/conversaciones/crear-grupal/',
      payload,
    );
    expect(result).toEqual({
      id: 30,
      nombre: 'Grupo Test',
      tipo: 'grupal',
      es_familia: false,
      ultimo_mensaje: null,
      ultimo_mensaje_fecha: null,
      no_leidos: 0,
      participante_nombre: 'Grupo Test',
      participante_avatar: null,
    });
  });

  it('renameGroup calls PATCH and returns Conversation with new nombre', async () => {
    mockApi.patch.mockResolvedValueOnce({
      data: {
        ok: true,
        data: { id_conversacion: 30, nombre: 'Renombrado' },
      },
    });

    const result = await chatApi.renameGroup(30, { nombre: 'Renombrado' });

    expect(mockApi.patch).toHaveBeenCalledWith(
      '/chat/conversaciones/30/renombrar/',
      { nombre: 'Renombrado' },
    );
    expect(result).toEqual({
      id: 30,
      nombre: 'Renombrado',
      tipo: 'grupal',
      es_familia: false,
      ultimo_mensaje: null,
      ultimo_mensaje_fecha: null,
      no_leidos: 0,
      participante_nombre: 'Renombrado',
      participante_avatar: null,
    });
  });

  it('addGroupMember sends POST and returns void', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: { ok: true, mensaje: 'Miembro agregado.' },
    });

    const result = await chatApi.addGroupMember(2, { fk_usuario: 5 });

    expect(mockApi.post).toHaveBeenCalledWith(
      '/chat/conversaciones/2/agregar-integrante/',
      { fk_usuario: 5 },
    );
    expect(result).toBeUndefined();
  });

  it('searchUsers sends GET with query and returns results', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        ok: true,
        data: [
          {
            id_usuario: 5,
            nombre_completo: 'Ana',
            correo: 'ana@test.com',
            rol: 'comprador',
          },
        ],
      },
    });

    const result = await chatApi.searchUsers('Ana');

    expect(mockApi.get).toHaveBeenCalledWith(
      '/chat/usuarios/buscar/?q=Ana',
      {},
    );
    expect(result).toEqual([
      {
        id_usuario: 5,
        nombre_completo: 'Ana',
        correo: 'ana@test.com',
        rol: 'comprador',
      },
    ]);
  });

  it('searchUsers returns empty array for short queries without calling API', async () => {
    const result = await chatApi.searchUsers('ab');

    expect(mockApi.get).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('sendMessageWithMedia calls POST with FormData and returns mapped message', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: {
        ok: true,
        data: {
          id_mensaje: 100,
          id_documento: 200,
          url_documento: 'media/test.jpg',
        },
      },
    });

    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const result = await chatApi.sendMessageWithMedia({
      conversacion: 1,
      tipo_documento: 'imagen',
      documento: file,
      remitente: 1,
      remitente_nombre: 'Test User',
    });

    expect(mockApi.post).toHaveBeenCalledWith(
      '/chat/mensajes/enviar-con-documento/',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    expect(result.id).toBe(100);
    expect(result.remitente).toBe(1);
    expect(result.remitente_nombre).toBe('Test User');
    expect(result.adjuntos).toHaveLength(1);
    expect(result.adjuntos?.[0]).toEqual({
      id: 200,
      mensaje: 100,
      archivo: 'media/test.jpg',
      tipo: 'imagen',
      nombre: '',
      tamaño: 0,
    });
  });

  it('throws when backend responds with ok: false', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { ok: false, message: 'Unauthorized' },
    });

    await expect(chatApi.getConversations()).rejects.toThrow('Unauthorized');
  });
});
