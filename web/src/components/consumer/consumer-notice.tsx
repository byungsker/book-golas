import type { ReactNode } from "react";

type ConsumerNoticeProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function ConsumerNotice({
  title,
  description,
  action,
}: ConsumerNoticeProps) {
  return (
    <section
      className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl shadow-black/20"
      role="status"
    >
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-400/15 text-2xl">
        📚
      </div>
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/60">
        {description}
      </p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </section>
  );
}
