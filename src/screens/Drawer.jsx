import { useEffect } from "react";

export default function Drawer({ t, drawer, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-20 flex justify-end">
      {/* eslint-disable-next-line */}
      <div onClick={onClose} className="absolute inset-0 bg-scrim" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={drawer.merchant}
        className="relative h-full w-[min(560px,94vw)] overflow-auto border-l-2 border-text bg-bg"
      >
        <div className="sticky top-0 flex items-start gap-3 border-b-2 border-text bg-bg px-5 py-4">
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="caps text-accent-700">
              {drawer.category} · {drawer.freq}{drawer.stopped ? ` · ${t.badgeStopped}` : ""}
            </span>
            <span className="text-[26px] leading-[1.05] font-extrabold tracking-[-0.02em] uppercase">
              {drawer.merchant}
            </span>
          </div>
          <button
            onClick={onClose}
            className="btn btn-outline px-2.5 py-1 text-[11px] tracking-[0.08em]"
          >{t.btnClose}</button>
        </div>

        <div className="grid grid-cols-2 border-b-2 border-text">
          <div className="flex flex-col border-r border-neutral-300 px-5 py-3.5">
            <span className="caps">{t.drawerAnnual}</span>
            <span className="text-[34px] font-extrabold tracking-[-0.03em] tabular-nums">
              {drawer.annual}
            </span>
          </div>
          <div className="flex flex-col px-5 py-3.5">
            <span className="caps">{t.drawerMedian}</span>
            <span className="text-[34px] font-extrabold tracking-[-0.03em] tabular-nums">
              {drawer.amount}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1 border-b-2 border-text px-5 py-3.5">
          <span className="caps">{t.drawerSeen}</span>
          <span className="text-sm text-neutral-800 text-pretty">{drawer.explain}</span>
          <span className="font-mono text-[11px] text-neutral-600">{t.drawerKey(drawer.norm)}</span>
        </div>

        <div className="flex flex-col px-5 pt-3.5 pb-6">
          <span className="caps pb-2">{t.drawerHistory(drawer.count)}</span>
          {drawer.timeline.map((o, i) => (
            <div
              key={i}
              className="grid grid-cols-[96px_1fr_auto] items-baseline gap-3 border-b border-neutral-300 py-2.5"
            >
              <span className="text-[13px] font-semibold tabular-nums">{o.date}</span>
              <span className="truncate font-mono text-[11px] whitespace-nowrap text-neutral-600">
                {o.gap}
              </span>
              <span className="font-semibold tabular-nums">{o.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
