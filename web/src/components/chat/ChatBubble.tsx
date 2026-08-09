import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ImageModal } from '~/components/chat/ImageModal';
import { useAppColors } from '~/hooks/useAppColors';
import { useAuth } from '~/hooks/useAuth';
import { useCanModifyMessage } from '~/hooks/chat/useCanModifyMessage';
import { mediaUrl } from '~/utils/mediaUrl';
import type { Message } from '@rassa/chat';
import { formatMessageTime } from '@rassa/chat';

async function handleDownload(url: string, name: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

function DownloadButton({
  src,
  name,
  label,
  color,
}: Readonly<{ src: string; name: string; label: string; color: string }>) {
  return (
    <button
      type="button"
      onClick={() => void handleDownload(src, name)}
      className="cursor-pointer border-none bg-transparent p-1 text-sm"
      style={{ color }}
      title={label}
      aria-label={label}
    >
      ⬇
    </button>
  );
}

function mixHex(hexA: string, hexB: string, weightB: number): string {
  const a = hexA.replace('#', '');
  const b = hexB.replace('#', '');
  const channels = [0, 2, 4].map((i) => {
    const channelA = parseInt(a.slice(i, i + 2), 16);
    const channelB = parseInt(b.slice(i, i + 2), 16);
    return Math.round(channelA * (1 - weightB) + channelB * weightB)
      .toString(16)
      .padStart(2, '0');
  });
  return `#${channels.join('')}`;
}

interface ChatBubbleProps {
  message: Message;
  onEdit: (message: Message) => void;
  onDelete: (messageId: number) => void;
  onMediaLoad?: () => void;
}

export function ChatBubble({
  message,
  onEdit,
  onDelete,
  onMediaLoad,
}: Readonly<ChatBubbleProps>) {
  const c = useAppColors();
  const { user } = useAuth();
  const { canEdit, canDelete } = useCanModifyMessage(message);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const isOwn = user?.id === message.remitente;
  const isActive = message.activo !== false;

  const lightMode = !c.isDark;
  const ownContentColor = lightMode ? c.fg : c.onBrand;

  const bubbleBackground = isOwn
    ? lightMode
      ? `linear-gradient(135deg, ${c.surface}, ${mixHex(c.surface, '#000000', 0.05)})`
      : `linear-gradient(135deg, #263028, ${mixHex('#263028', '#000000', 0.12)})`
    : lightMode
      ? `linear-gradient(135deg, ${c.surface}, ${mixHex(c.surface, c.brand, 0.06)})`
      : `linear-gradient(135deg, ${c.surface}, ${mixHex(c.surface, '#000000', 0.08)})`;

  if (!isActive) {
    // Deleted message: keep a visible placeholder (consistent with mobile, PR #66 review)
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
        <div
          className={`relative max-w-[75%] rounded-2xl px-4 py-2 italic text-sm ${
            isOwn ? 'rounded-br-md' : 'rounded-bl-md'
          }`}
          style={{
            background: lightMode
              ? 'rgba(0,0,0,0.05)'
              : 'rgba(255,255,255,0.05)',
            color: c.muted,
            border: `1px dashed ${c.border}`,
          }}
        >
          Mensaje eliminado
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
        <div
          className={`relative max-w-[75%] rounded-2xl px-4 py-2 ${
            isOwn ? 'rounded-br-md' : 'rounded-bl-md'
          }`}
          style={{
            backgroundImage: bubbleBackground,
            color: isOwn ? ownContentColor : c.fg,
            boxShadow: lightMode ? '0 2px 6px rgba(0,0,0,0.12)' : 'none',
            border: `2px solid ${
              lightMode ? mixHex(c.border, '#000000', 0.2) : c.border
            }`,
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
                {att.tipo === 'imagen' ? (
                  <div>
                    <div
                      className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg"
                      style={{
                        height: 240,
                        background: 'rgba(0,0,0,0.05)',
                      }}
                      onClick={() =>
                        setSelectedImage({
                          src,
                          alt: att.nombre || 'Imagen',
                        })
                      }
                    >
                      <img
                        src={src}
                        alt={att.nombre || 'Imagen'}
                        className="max-h-full max-w-full rounded-lg object-contain"
                        onLoad={onMediaLoad}
                        onError={onMediaLoad}
                      />
                    </div>
                    <div className="mt-1 flex justify-end">
                      <DownloadButton
                        src={src}
                        name={att.nombre || 'imagen.jpg'}
                        label="Descargar imagen"
                        color={isOwn ? ownContentColor : c.fg}
                      />
                    </div>
                  </div>
                ) : att.tipo === 'audio' ? (
                  <div className="flex items-center gap-2">
                    <audio
                      controls
                      preload="metadata"
                      src={src}
                      className="msg-audio max-w-full"
                      style={
                        {
                          width: 240,
                          height: 40,
                          '--msg-audio-accent': isOwn ? ownContentColor : c.fg,
                          '--msg-audio-panel': isOwn
                            ? lightMode
                              ? 'rgba(0,0,0,0.06)'
                              : 'rgba(0,0,0,0.25)'
                            : lightMode
                              ? 'rgba(0,0,0,0.05)'
                              : 'rgba(0,0,0,0.2)',
                          '--msg-audio-fg': isOwn ? ownContentColor : c.muted,
                        } as CSSProperties
                      }
                    />
                    <DownloadButton
                      src={src}
                      name={att.nombre || 'audio'}
                      label="Descargar audio"
                      color={isOwn ? ownContentColor : c.fg}
                    />
                  </div>
                ) : att.tipo === 'video' ? (
                  <div>
                    <div
                      className="flex items-center justify-center overflow-hidden rounded-lg bg-black"
                      style={{ height: 240 }}
                    >
                      <video
                        controls
                        preload="metadata"
                        src={src}
                        className="max-h-full max-w-full object-contain"
                        onLoadedMetadata={onMediaLoad}
                        onError={onMediaLoad}
                      />
                    </div>
                    <div className="mt-1 flex justify-end">
                      <DownloadButton
                        src={src}
                        name={att.nombre || 'video.mp4'}
                        label="Descargar video"
                        color={isOwn ? ownContentColor : c.fg}
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                    style={{
                      background:
                        isOwn && !lightMode
                          ? 'rgba(255,255,255,0.1)'
                          : 'rgba(0,0,0,0.05)',
                    }}
                  >
                    <span>📄</span>
                    <span className="truncate flex-1">
                      {att.nombre || 'Archivo'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Message content */}
          <div className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>
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
              isOwn ? 'justify-end' : 'justify-start'
            }`}
          >
            <span
              className="text-xs"
              style={{ opacity: 0.6, color: isOwn ? ownContentColor : c.muted }}
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
                  style={{ color: isOwn ? ownContentColor : c.muted }}
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
      {selectedImage && (
        <ImageModal
          src={selectedImage.src}
          alt={selectedImage.alt}
          caption={message.contenido}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </>
  );
}
