import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[28px] border border-border/60 bg-card/90 p-6 shadow-sm backdrop-blur xl:p-7", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">{eyebrow}</p> : null}
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h2>
            {description ? <p className="mt-2 max-w-3xl text-sm text-muted-foreground md:text-base">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
