import { useEffect, useState } from "react";

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
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) {
      setVisible(false);
      return;
    }
    // Small tick to trigger enter animation
    const tick = requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 300);
    }, 3000);
    return () => {
      cancelAnimationFrame(tick);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

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
        background: isError ? "#DE393A" : "#24563C",
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
