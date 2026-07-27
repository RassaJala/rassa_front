import { useEffect, useRef, useState } from "react";

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

  useEffect(() => {
    if (!toast) {
      setVisible(false);
      return;
    }
    // Small tick to trigger enter animation
    const tick = requestAnimationFrame(() => setVisible(true));
    const dismissTimer = setTimeout(() => {
      setVisible(false);
    }, 3000);
    return () => {
      cancelAnimationFrame(tick);
      clearTimeout(dismissTimer);
    };
  }, [toast]);

  useEffect(() => {
    if (!visible && toast) {
      const t = setTimeout(() => onDoneRef.current(), 300);
      return () => clearTimeout(t);
    }
  }, [visible, toast]);

  if (!toast) return null;

  const isError = toast.type === "error";
  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 9999,
        padding: "12px 20px",
        borderRadius: 10,
        background: isError ? colors.coral : colors.brand,
        color: "#fff",
        fontSize: 14,
        fontWeight: 600,
        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        transition: "opacity 0.3s, transform 0.3s",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-8px)",
        pointerEvents: "none",
        maxWidth: 360,
      }}
    >
      {toast.message}
    </div>
  );
}
