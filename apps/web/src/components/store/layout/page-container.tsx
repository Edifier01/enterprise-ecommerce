import { siteConfig } from "@/lib/store/site-config";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "main" | "section";
}

export function PageContainer({
  children,
  className,
  as: Component = "div",
}: PageContainerProps) {
  return (
    <Component
      className={cn(siteConfig.layout.containerClass, "py-6 sm:py-8", className)}
    >
      {children}
    </Component>
  );
}
