// The legacy toaster is replaced with sonner so toasts are always
// dismissible (X button) and auto-close. Mount once at the app root.
import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      closeButton
      richColors
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            "group toast bg-background text-foreground border border-border shadow-lg",
          description: "text-muted-foreground",
          closeButton: "bg-background border border-border text-foreground",
        },
      }}
    />
  );
}
