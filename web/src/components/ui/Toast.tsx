import { useEffect, useRef, useState } from "react";

import { TOAST_DISMISS_MS, TOAST_EXIT_MS } from "../../constants/api";
import { useAppColors } from "../../hooks/useAppColors";

export interface ToastState {
  message: string;
  type: "success" | "error";
}

/** Auto-dismissing toast — call with setToast({ message, type }). */
export function Toast({
  toast,
  onDone,
}: {
  toast: ToastState | null;
  onDone: () => void;
}) {
  const colors = useAppColors();
  const [visible, setVisible] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const isError = toast?.type === "error";

  useEffect(() => {
    if (!toast) {
      setVisible(false);
      return;
    }
    const tick = requestAnimationFrame(() => setVisible(true));
    const delay = isError ? TOAST_DISMISS_MS * 2 : TOAST_DISMISS_MS;
    const dismissTimer = setTimeout(() => {
      setVisible(false);
    }, delay);
    return () => {
      cancelAnimationFrame(tick);
      clearTimeout(dismissTimer);
    };
  }, [toast]);

  useEffect(() => {
    if (!visible && toast) {
      const t = setTimeout(() => {
        // Only fire onDone if toast hasn't been replaced
        if (toastRef.current === toast) {
          onDoneRef.current();
        }
      }, TOAST_EXIT_MS);
      return () => clearTimeout(t);
    }
  }, [visible, toast]);

  if (!toast) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "12px 16px",
        borderRadius: 10,
        background: isError ? colors.coral : colors.brand,
        color: "#fff",
        fontSize: 14,
        fontWeight: 600,
        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        transition: "opacity 0.3s, transform 0.3s",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-8px)",
        pointerEvents: visible ? "auto" : "none",
        maxWidth: 360,
      }}
    >
      <span style={{ flex: 1 }}>{toast.message}</span>
      {isError && (
        <button
          onClick={() => setVisible(false)}
          style={{
            background: "none",
            border: "none",
            color: "#fff",
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
            padding: 0,
            opacity: 0.8,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "0.8";
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
