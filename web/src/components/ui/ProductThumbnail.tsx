import { useAppColors } from '../../hooks/useAppColors';

interface ProductThumbnailProps {
  src?: string | null;
  alt: string;
  fallbackEmoji?: string;
  size?: number;
}

const THUMB_BG = '#E8F5E9';
const THUMB_BG_DARK = '#1C2D22';

export function ProductThumbnail({
  src,
  alt,
  fallbackEmoji = '\u{1F4E6}',
  size = 36,
}: ProductThumbnailProps) {
  const { isDark } = useAppColors();

  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        overflow: 'hidden',
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        background: isDark ? THUMB_BG_DARK : THUMB_BG,
      }}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span style={{ fontSize: size * 0.44 }}>{fallbackEmoji}</span>
      )}
    </span>
  );
}
