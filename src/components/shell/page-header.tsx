/** A page's title, a short line about it, and its main actions. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-pretty text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** The standard padding and width of a page inside the shell. */
export function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {children}
    </div>
  );
}
