import { useEffect, useRef, useState } from "react";
import { useAppColors } from "~/hooks/useAppColors";
import { useAuth } from "~/hooks/useAuth";
import { useCanModifyMessage } from "~/hooks/chat/useCanModifyMessage";
import { mediaUrl } from "~/utils/mediaUrl";
import type { Message } from "@rassa/chat";
import { formatMessageTime } from "@rassa/chat";

interface ChatBubbleProps {
  message: Message;
  onEdit: (message: Message) => void;
  onDelete: (messageId: number) => void;
}

export function ChatBubble({
  message,
  onEdit,
  onDelete,
}: Readonly<ChatBubbleProps>) {
  const c = useAppColors();
  const { user } = useAuth();
  const { canEdit, canDelete } = useCanModifyMessage(message);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const isOwn = user?.id === message.remitente;
  const isActive = message.activo !== false;

  if (!isActive) return null;

  const handleDownloadAudio = async (url: string, name: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={`relative max-w-[75%] rounded-2xl px-4 py-2 ${
          isOwn ? "rounded-br-md" : "rounded-bl-md"
        }`}
        style={{
          background: isOwn ? c.brand : c.surface,
          color: isOwn ? c.onBrand : c.fg,
        }}
      >
        {/* Sender name (others only) */}
        {!isOwn && (
          <div
            className="mb-1 text-xs font-semibold"
            style={{ color: c.muted }}
          >
            {message.remitente_nombre}
          </div>
        )}

        {/* Attachments */}
        {message.adjuntos?.map((att) => {
          const src = mediaUrl(att.archivo) ?? att.archivo;
          return (
            <div key={att.id} className="mb-1">
              {att.tipo === "imagen" ? (
                <img
                  src={src}
                  alt={att.nombre || "Imagen"}
                  className="max-w-full rounded-lg"
                  style={{ maxHeight: 240 }}
                />
              ) : att.tipo === "audio" ? (
                <div className="flex items-center gap-2">
                  <audio
                    controls
                    preload="metadata"
                    src={src}
                    className="max-w-full"
                    style={{ width: 240, height: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      void handleDownloadAudio(src, att.nombre || "audio")
                    }
                    className="cursor-pointer border-none bg-transparent p-1 text-sm"
                    style={{ color: isOwn ? c.onBrand : c.fg }}
                    title="Descargar audio"
                    aria-label="Descargar audio"
                  >
                    ⬇
                  </button>
                </div>
              ) : (
                <div
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                  style={{
                    background: isOwn
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.05)",
                  }}
                >
                  <span>{att.tipo === "audio" ? "🎵" : "🎬"}</span>
                  <span className="truncate flex-1">
                    {att.nombre || "Archivo"}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {/* Message content */}
        <div className="text-sm" style={{ whiteSpace: "pre-wrap" }}>
          {message.contenido}
          {message.editado && (
            <span className="ml-1 text-xs italic" style={{ opacity: 0.6 }}>
              (editado)
            </span>
          )}
        </div>

        {/* Timestamp + menu trigger */}
        <div
          className={`mt-1 flex items-center gap-2 ${
            isOwn ? "justify-end" : "justify-start"
          }`}
        >
          <span
            className="text-xs"
            style={{ opacity: 0.6, color: isOwn ? c.onBrand : c.muted }}
          >
            {formatMessageTime(message.creado_en)}
          </span>

          {/* Author menu: own + within window */}
          {isOwn && (canEdit || canDelete) && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                className="cursor-pointer border-none bg-transparent text-xs"
                style={{ color: isOwn ? c.onBrand : c.muted }}
                aria-label="Opciones de mensaje"
              >
                ⋯
              </button>
              {showMenu && (
                <div
                  ref={menuRef}
                  className="absolute bottom-full right-0 z-10 mb-1 min-w-[120px] overflow-hidden rounded-lg shadow-lg"
                  style={{
                    background: c.surface,
                    border: `1px solid ${c.border}`,
                  }}
                >
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        onEdit(message);
                        setShowMenu(false);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:opacity-80"
                      style={{ color: c.fg }}
                    >
                      Editar
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(message.id);
                        setShowMenu(false);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:opacity-80"
                      style={{ color: c.coral }}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
