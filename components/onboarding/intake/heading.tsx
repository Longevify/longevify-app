"use client";

export function Heading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <h2 className="text-[20px] font-semibold leading-tight text-ink sm:text-[22px]">
        {title}
      </h2>
      {subtitle ? (
        <p className="text-[13px] text-muted">{subtitle}</p>
      ) : null}
    </div>
  );
}
