import { useEffect } from 'react';

interface ImageModalProps {
  src: string;
  alt: string;
  caption?: string;
  onClose: () => void;
}

export function ImageModal({
  src,
  alt,
  caption,
  onClose,
}: Readonly<ImageModalProps>) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <dialog
      open
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-0"
    >
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 cursor-default border-0 bg-transparent p-0"
        style={{ background: 'rgba(0,0,0,0.85)' }}
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[85vh] max-w-[90vw] flex-col items-center overflow-hidden rounded-xl">
        <img
          src={src}
          alt={`Imagen ampliada: ${alt}`}
          className={`max-w-[90vw] object-contain ${
            caption ? 'max-h-[calc(85vh-5rem)]' : 'max-h-[85vh]'
          }`}
        />
        {caption ? (
          <p
            className="max-w-[90vw] px-4 pb-4 text-center text-sm"
            style={{ color: '#ffffff' }}
          >
            {caption}
          </p>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 cursor-pointer rounded-full border-0 p-2 text-lg text-white"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>
    </dialog>
  );
}
