import { createContext, ReactNode, useCallback, useMemo, useState } from "react";
import Toast from "../components/Toast";

const DEFAULT_TOAST_TIMEOUT = 2500; // milliseconds

export type ToastType = {
  id: string;
  message?: string;
  timeout?: number | "INFINITY"; // milliseconds
  type?: "information" | "error"
};

export const ToastContext = createContext({
  addToast: (newToast: ToastType) => console.error(`Unknown error while adding toast: ${newToast}`),
  removeToast: (toastId: string) => console.error(`Unknown error while removing toast: ${toastId}`)
});

export const ToastProvider = ({ children }: { children?: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastType[]>([]);

  const addToast = useCallback(
    (newToast: ToastType) => {
      const toastExists = toasts.find((el) => el.id == newToast.id);

      if (toastExists) return;

      setToasts((prev) => [...prev, newToast]);
      if (newToast.timeout === "INFINITY") return;

      setTimeout(() => {
        removeToast(newToast.id);
      }, newToast.timeout || DEFAULT_TOAST_TIMEOUT);
    },
    [toasts]
  );

  const removeToast = useCallback((toastId: string) => {
    document.getElementById(toastId)?.classList.add("fadeOut");
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id != toastId));
    }, 2000);
  }, []);

  const value = useMemo(() => ({ addToast, removeToast }), [removeToast, addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="absolute left-1/2 top-4 -translate-x-1/2 transform space-y-2">
        {toasts.map((toast, idx) => (
          <Toast key={`${toast.id}-${idx}`} {...toast} onClose={() => removeToast(toast.id)}></Toast>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
