import { useEffect, useRef, useState } from "react";
import { useAppColors } from "../hooks/useAppColors";
import type { Producto } from "../services/publications";
import { mediaUrl } from "../utils/mediaUrl";

export function ProductPickerModal({
  catalog,
  selectedIds,
  onSelect,
  onClose,
  colors,
}: {
  catalog: Producto[];
  selectedIds: Set<number>;
  onSelect: (p: Producto) => void;
  onClose: () => void;
  colors: ReturnType<typeof useAppColors>;
}) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const q = search.toLowerCase();
  const filtered = catalog.filter(
    (p) =>
      p.nombre_producto.toLowerCase().includes(q) &&
      !selectedIds.has(p.id_producto),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-[480px] flex-col overflow-hidden rounded-2xl"
        style={{
          background: colors.surface,
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${colors.border}` }}
        >
          <h3 className="text-lg font-bold" style={{ color: colors.fg }}>
            Seleccionar producto
          </h3>
          <button
            onClick={onClose}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-full border-none text-[15px]"
            style={{ background: colors.accentBg, color: colors.fg }}
          >
            ✕
          </button>
        </div>

        <div className="px-5 pt-4">
          <input
            ref={inputRef}
            type="search"
            placeholder="🔍 Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-[10px] px-3.5 font-[inherit] text-[14px] outline-none"
            style={{
              border: `1.5px solid ${colors.inputBorder}`,
              background: colors.surface,
              color: colors.fg,
            }}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {filtered.length === 0 ? (
            <p
              className="py-8 text-center text-[14px]"
              style={{ color: colors.muted }}
            >
              No hay productos disponibles.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((p) => {
                const img = mediaUrl(p.imagen_principal ?? p.imagen);
                return (
                  <button
                    key={p.id_producto}
                    onClick={() => {
                      onSelect(p);
                      onClose();
                    }}
                    className="flex items-center gap-3 rounded-xl p-3 text-left"
                    style={{
                      border: `1px solid ${colors.border}`,
                      background: colors.surface,
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = colors.accentBg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = colors.surface;
                    }}
                  >
                    <div
                      className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg"
                      style={{ background: colors.accentBg }}
                    >
                      {img ? (
                        <img
                          src={img}
                          alt={p.nombre_producto}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xl">🌿</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-[14px] font-semibold"
                        style={{ color: colors.fg }}
                      >
                        {p.nombre_producto}
                      </p>
                      <p
                        className="text-[13px]"
                        style={{ color: colors.muted }}
                      >
                        Stock: {p.stock}
                      </p>
                    </div>
                    <span
                      className="text-[14px] font-bold"
                      style={{ color: colors.brand }}
                    >
                      ${p.precio}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
