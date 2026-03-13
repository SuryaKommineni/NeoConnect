export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[32px] border border-white/80 bg-white/80 p-8 shadow-sm backdrop-blur">
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-3 max-w-3xl text-slate-600">{description}</p>
    </div>
  );
}

