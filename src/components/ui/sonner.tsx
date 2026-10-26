import { useTheme } from "next-themes";
import { Toaster as Sonner, toast as rawToast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

// Helper para filtrar llamadas a toast que vengan con 'undefined', null o strings vacíos
function sanitizeToastArgs(args: any[]): any[] | null {
  if (!args || args.length === 0) return null;
  const [first, ...rest] = args;
  if (first === undefined || first === null) return null;
  const str = String(first).trim();
  if (!str || str === "undefined" || str === "null" || str === "[object Object]") {
    return null;
  }
  return [first, ...rest];
}

const wrappedToast: any = (...args: any[]) => {
  const sanitized = sanitizeToastArgs(args);
  if (!sanitized) return;
  return (rawToast as any)(...sanitized);
};

// Proxificar métodos (toast.error, toast.success, toast.info, toast.warning, etc.)
["error", "success", "info", "warning", "message", "loading", "promise"].forEach((method) => {
  wrappedToast[method] = (...args: any[]) => {
    const sanitized = sanitizeToastArgs(args);
    if (!sanitized) return;
    return (rawToast as any)[method](...sanitized);
  };
});

wrappedToast.dismiss = rawToast.dismiss;
wrappedToast.custom = rawToast.custom;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, wrappedToast as toast };
