import { useState } from 'react';
import { useTheme } from '../providers/ThemeProvider';
import { getColors } from '../constants/colors';
// TODO: import api from '../services/api';
// Cuando los endpoints de papelera estén listos:
//   GET /api/municipios/trash/ → { data: [{ id_municipio, nombre }] }
//   GET /api/localidades/trash/ → { data: [{ id_localidad, nombre, municipio_id }] }
//   POST /api/municipios/{id}/restore/ → restaura
//   POST /api/municipios/{id}/permanent/ → elimina definitivo
//   POST /api/localidades/{id}/restore/ → restaura
//   POST /api/localidades/{id}/permanent/ → elimina definitivo

interface TrashMunicipio {
  id_municipio: number;
  nombre: string;
}

interface TrashLocalidad {
  id_localidad: number;
  nombre: string;
  municipio_id: number;
}

export function AdminTrash() {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const c = getColors(isDark);
  const { fg, muted, border, surface, bg, coral } = c;

  const [tab, setTab] = useState<'municipios' | 'localidades'>('municipios');
  const [municipios, setMunicipios] = useState<TrashMunicipio[]>([]);
  const [localidades, setLocalidades] = useState<TrashLocalidad[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: Reemplazar con llamada real al API cuando endpoint esté listo
  // Ejemplo:
  //   const res = await api.get('/municipios/trash/');
  //   setMunicipios(res.data.data ?? []);
  async function fetchTrashMunicipios() {
    setLoading(true);
    setError(null);
    try {
      // Placeholder: endpoint aún no existe
      setMunicipios([]);
    } catch {
      setError('Error al cargar papelera de municipios');
    } finally {
      setLoading(false);
    }
  }

  // TODO: Reemplazar con llamada real al API cuando endpoint esté listo
  async function fetchTrashLocalidades() {
    setLoading(true);
    setError(null);
    try {
      // Placeholder: endpoint aún no existe
      setLocalidades([]);
    } catch {
      setError('Error al cargar papelera de localidades');
    } finally {
      setLoading(false);
    }
  }

  // TODO: Reemplazar con llamada real al API
  // Ejemplo:
  //   await api.post(`/municipios/${id}/restore/`);
  //   setMunicipios((prev) => prev.filter((m) => m.id_municipio !== id));
  async function handleRestoreMunicipio(id: number) {
    try {
      // Placeholder
      setMunicipios((prev) => prev.filter((m) => m.id_municipio !== id));
    } catch {
      setError('Error al restaurar municipio');
    }
  }

  // TODO: Reemplazar con llamada real al API
  async function handlePermanentDeleteMunicipio(id: number) {
    try {
      // Placeholder
      setMunicipios((prev) => prev.filter((m) => m.id_municipio !== id));
    } catch {
      setError('Error al eliminar municipio definitivamente');
    }
  }

  // TODO: Reemplazar con llamada real al API
  async function handleRestoreLocalidad(id: number) {
    try {
      // Placeholder
      setLocalidades((prev) => prev.filter((l) => l.id_localidad !== id));
    } catch {
      setError('Error al restaurar localidad');
    }
  }

  // TODO: Reemplazar con llamada real al API
  async function handlePermanentDeleteLocalidad(id: number) {
    try {
      // Placeholder
      setLocalidades((prev) => prev.filter((l) => l.id_localidad !== id));
    } catch {
      setError('Error al eliminar localidad definitivamente');
    }
  }

  const btnStyle = {
    height: 40,
    padding: '0 18px',
    borderRadius: 10,
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    letterSpacing: '0.01em',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  } as const;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <h2
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: fg,
          }}
        >
          🗑️ Papelera
        </h2>
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(222,57,58,0.1)',
            border: '1px solid #DE393A',
            borderRadius: 10,
            padding: '10px 16px',
            marginBottom: 16,
            color: coral,
            fontSize: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              background: 'none',
              border: 'none',
              color: coral,
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          gap: 2,
          background: border,
          borderRadius: 12,
          padding: 3,
          marginBottom: 20,
          width: 'fit-content',
        }}
      >
        <button
          onClick={() => { setTab('municipios'); void fetchTrashMunicipios(); }}
          style={{
            padding: '8px 20px',
            border: 'none',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: 'pointer',
            background: tab === 'municipios' ? surface : 'transparent',
            color: tab === 'municipios' ? fg : muted,
            boxShadow:
              tab === 'municipios' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
          }}
        >
          🏛️ Municipios
        </button>
        <button
          onClick={() => { setTab('localidades'); void fetchTrashLocalidades(); }}
          style={{
            padding: '8px 20px',
            border: 'none',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: 'pointer',
            background: tab === 'localidades' ? surface : 'transparent',
            color: tab === 'localidades' ? fg : muted,
            boxShadow:
              tab === 'localidades' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
          }}
        >
          📍 Localidades
        </button>
      </div>

      {tab === 'municipios' && (
        <div
          style={{
            background: surface,
            borderRadius: 16,
            border: `1px solid ${border}`,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${border}`,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: fg }}>
              {loading ? 'Cargando…' : `${municipios.length} municipios en papelera`}
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Nombre', 'Acciones'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        fontSize: 11,
                        color: muted,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        fontWeight: 600,
                        padding: '12px 20px',
                        background: bg,
                        borderBottom: `1px solid ${border}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={2}
                      style={{
                        textAlign: 'center',
                        padding: '48px 24px',
                        color: muted,
                        fontSize: 14,
                      }}
                    >
                      Cargando datos…
                    </td>
                  </tr>
                ) : municipios.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      style={{
                        textAlign: 'center',
                        padding: '48px 24px',
                        color: muted,
                        fontSize: 14,
                      }}
                    >
                      No hay municipios en la papelera
                    </td>
                  </tr>
                ) : (
                  municipios.map((item) => (
                    <tr key={item.id_municipio} style={{ background: surface }}>
                      <td
                        style={{
                          padding: '14px 20px',
                          fontSize: 14,
                          borderBottom: `1px solid ${border}`,
                          fontWeight: 600,
                          color: fg,
                        }}
                      >
                        {item.nombre}
                      </td>
                      <td
                        style={{
                          padding: '14px 20px',
                          borderBottom: `1px solid ${border}`,
                        }}
                      >
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            onClick={() => void handleRestoreMunicipio(item.id_municipio)}
                            aria-label="Restaurar"
                            style={{
                              height: 32,
                              padding: '0 12px',
                              borderRadius: 8,
                              border: `1.5px solid #24563C`,
                              background: 'transparent',
                              color: '#24563C',
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            ↩️ Restaurar
                          </button>
                          <button
                            onClick={() => void handlePermanentDeleteMunicipio(item.id_municipio)}
                            aria-label="Eliminar definitivamente"
                            style={{
                              height: 32,
                              padding: '0 12px',
                              borderRadius: 8,
                              border: '1.5px solid #DE393A',
                              background: 'transparent',
                              color: '#DE393A',
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'localidades' && (
        <div
          style={{
            background: surface,
            borderRadius: 16,
            border: `1px solid ${border}`,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${border}`,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: fg }}>
              {loading ? 'Cargando…' : `${localidades.length} localidades en papelera`}
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Nombre', 'Acciones'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        fontSize: 11,
                        color: muted,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        fontWeight: 600,
                        padding: '12px 20px',
                        background: bg,
                        borderBottom: `1px solid ${border}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={2}
                      style={{
                        textAlign: 'center',
                        padding: '48px 24px',
                        color: muted,
                        fontSize: 14,
                      }}
                    >
                      Cargando datos…
                    </td>
                  </tr>
                ) : localidades.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      style={{
                        textAlign: 'center',
                        padding: '48px 24px',
                        color: muted,
                        fontSize: 14,
                      }}
                    >
                      No hay localidades en la papelera
                    </td>
                  </tr>
                ) : (
                  localidades.map((item) => (
                    <tr
                      key={item.id_localidad}
                      style={{ background: surface }}
                    >
                      <td
                        style={{
                          padding: '14px 20px',
                          fontSize: 14,
                          borderBottom: `1px solid ${border}`,
                          fontWeight: 600,
                          color: fg,
                        }}
                      >
                        {item.nombre}
                      </td>
                      <td
                        style={{
                          padding: '14px 20px',
                          borderBottom: `1px solid ${border}`,
                        }}
                      >
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            onClick={() => void handleRestoreLocalidad(item.id_localidad)}
                            aria-label="Restaurar"
                            style={{
                              height: 32,
                              padding: '0 12px',
                              borderRadius: 8,
                              border: `1.5px solid #24563C`,
                              background: 'transparent',
                              color: '#24563C',
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            ↩️ Restaurar
                          </button>
                          <button
                            onClick={() => void handlePermanentDeleteLocalidad(item.id_localidad)}
                            aria-label="Eliminar definitivamente"
                            style={{
                              height: 32,
                              padding: '0 12px',
                              borderRadius: 8,
                              border: '1.5px solid #DE393A',
                              background: 'transparent',
                              color: '#DE393A',
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
