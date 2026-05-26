// Thin wrapper that delegates to sonner so toasts are properly dismissible
// and auto-close. Keeps the legacy `useToast()` / `toast()` API used across
// the app, but routes everything through sonner under the hood.
import { toast as sonnerToast } from "sonner";

function toast({ title, description, variant, duration, id, ...rest } = {}) {
  const message = title ?? description ?? "";
  const opts = {
    description: title ? description : undefined,
    duration: duration ?? (variant === "destructive" ? 7000 : 4000),
    id, // dedupes when the same id is reused
    ...rest,
  };
  const toastId =
    variant === "destructive"
      ? sonnerToast.error(message, opts)
      : sonnerToast(message, opts);
  return {
    id: toastId,
    dismiss: () => sonnerToast.dismiss(toastId),
    update: (next) => sonnerToast(next?.title ?? message, { ...opts, ...next, id: toastId }),
  };
}

function useToast() {
  return {
    toast,
    dismiss: (id) => sonnerToast.dismiss(id),
    toasts: [],
  };
}

export { useToast, toast };
