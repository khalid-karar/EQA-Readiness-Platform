"use client";

import { useToast } from "@/hooks/use-toast";
import { uiLabel } from "@/lib/ui-labels";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

export function Toaster({ locale = "en" }: { locale?: "en" | "ar" }): React.ReactNode {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, ...props }) => (
        <Toast key={id} {...props}>
          <div className="grid gap-1 pe-6">
            {title ? <ToastTitle>{title}</ToastTitle> : null}
            {description ? (
              <ToastDescription>{description}</ToastDescription>
            ) : null}
          </div>
          {action}
          <ToastClose aria-label={uiLabel("closeToast", locale)} />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
