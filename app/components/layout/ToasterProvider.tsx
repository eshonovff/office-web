import { useTheme } from "next-themes";
import { Toaster } from "sonner";

export function ToasterProvider() {
  const { resolvedTheme } = useTheme();
  return <Toaster theme={resolvedTheme as "light" | "dark"} gap={8} visibleToasts={5} closeButton position="bottom-right" />;
}
