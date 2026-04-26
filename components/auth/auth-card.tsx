import { cn } from "@/lib/utils";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function AuthCard({
  title,
  subtitle,
  footer,
  children,
  className,
}: AuthCardProps) {
  return (
    <div
      className={cn(
        "rounded-[20px] border border-border bg-surface p-8",
        "shadow-[0_12px_40px_-20px_rgba(13,40,24,.2)]",
        className,
      )}
    >
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-[13px] leading-5 text-muted">{subtitle}</p>
        ) : null}
      </div>
      <div>{children}</div>
      {footer ? (
        <div className="mt-6 border-t border-border pt-5 text-[13px] text-muted">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
