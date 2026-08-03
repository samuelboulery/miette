function ColSelect({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-1.5 border-r border-neutral-300 p-4">
      <span className="caps">{label}</span>
      <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>
            {o.label ?? o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Stat({ label, value, accent, last }) {
  return (
    <div className={`flex flex-col px-6 py-4 ${last ? "" : "border-r border-neutral-300"}`}>
      <span className="caps">{label}</span>
      <span
        className={`text-[30px] font-extrabold tracking-[-0.02em] tabular-nums ${accent ? "text-accent-700" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

const TH = ({ children, right }) => (
  <th className={`caps border-b-2 border-text px-4 py-2.5 ${right ? "text-right" : "text-left"}`}>
    {children}
  </th>
);

export default function Mapping({ t, s, patch, view, onReset, onAnalyse }) {
  return (
    <>
      <div className="grid grid-cols-[240px_1fr] border-b-2 border-text max-sm:grid-cols-1">
        <div className="flex flex-col gap-2 border-text p-6 sm:border-r-2">
          <span className="text-[32px] leading-none font-extrabold text-accent-700">01</span>
          <span className="caps text-xs">{t.mapSection}</span>
        </div>
        <div className="flex flex-col gap-2.5 p-6">
          <h1 className="m-0 text-[clamp(32px,4vw,52px)] leading-none font-extrabold tracking-[-0.03em] uppercase">{t.mapTitle}</h1>
          <p className="m-0 max-w-[640px] text-neutral-800 text-pretty">
            {t.mapIntro(s.fileName, view.meta)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-[240px_1fr] border-b-2 border-text max-sm:grid-cols-1">
        <div className="border-text p-6 sm:border-r-2">
          <span className="caps text-xs">{t.mapping}</span>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
          <ColSelect
            label={t.colDate}
            value={s.dateCol}
            onChange={(v) => patch({ dateCol: v })}
            options={s.headers}
          />
          <ColSelect
            label={t.colLabel}
            value={s.labelCol}
            onChange={(v) => patch({ labelCol: v })}
            options={s.headers}
          />
          <ColSelect
            label={t.colAmount}
            value={s.mode}
            onChange={(v) => patch({ mode: v })}
            options={[
              { value: "single", label: t.optSingle },
              { value: "split", label: t.optSplit },
            ]}
          />
          {s.mode === "single" ? (
            <label className="flex flex-col gap-1.5 p-4">
              <span className="caps">{t.colAmountPick}</span>
              <select
                className="field"
                value={s.amountCol}
                onChange={(e) => patch({ amountCol: e.target.value })}
              >
                {s.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="flex flex-col gap-1.5 p-4">
              <span className="caps">{t.colDebitCredit}</span>
              <div className="flex gap-2">
                <select
                  className="field min-w-0 flex-1"
                  value={s.debitCol}
                  onChange={(e) => patch({ debitCol: e.target.value })}
                >
                  {s.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <select
                  className="field min-w-0 flex-1"
                  value={s.creditCol}
                  onChange={(e) => patch({ creditCol: e.target.value })}
                >
                  {s.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] border-b-2 border-text">
        <Stat label={t.statRows} value={view.countOk} />
        <Stat label={t.statPeriod} value={view.period} />
        <Stat label={t.statDebits} value={view.totalOut} />
        <Stat label={t.statSkipped} value={view.skippedCount} accent last />
      </div>

      {view.skipped.length > 0 && (
        <div className="flex flex-col gap-1 border-b-2 border-text bg-accent-200 px-6 py-3.5">
          <span className="text-[13px] font-semibold text-accent-700">{t.skippedWarn}</span>
          {view.skipped.map((sk) => (
            <div
              key={sk.line}
              className="truncate font-mono text-xs whitespace-nowrap text-neutral-700"
            >
              {t.skippedLine(sk.line, sk.text)}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-[240px_1fr] border-b-2 border-text max-sm:grid-cols-1">
        <div className="flex flex-col items-start gap-2 border-text p-6 sm:border-r-2">
          <span className="caps text-xs">{t.rawRows}</span>
          <span className="text-[13px] text-neutral-700">{view.shownLabel}</span>
          {view.canExpand && (
            <button
              onClick={() => patch({ showAll: !s.showAll })}
              className="btn btn-outline px-3 py-2 text-[11px] tracking-[0.08em]"
            >
              {view.expandLabel}
            </button>
          )}
        </div>
        <div className="max-h-[460px] overflow-auto">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr className="sticky top-0 bg-bg">
                <TH>{t.colDate}</TH>
                <TH>{t.colLabel}</TH>
                <TH>{t.thNorm}</TH>
                <TH right>{t.colAmount}</TH>
              </tr>
            </thead>
            <tbody>
              {view.rawView.map((row, i) => (
                <tr key={i}>
                  <td className="border-b border-neutral-300 px-4 py-2 whitespace-nowrap tabular-nums text-neutral-700">
                    {row.date}
                  </td>
                  <td className="max-w-[340px] truncate border-b border-neutral-300 px-4 py-2 whitespace-nowrap">
                    {row.label}
                  </td>
                  <td className="max-w-[260px] truncate border-b border-neutral-300 px-4 py-2 font-mono text-xs whitespace-nowrap text-neutral-600">
                    {row.norm}
                  </td>
                  <td
                    className={`border-b border-neutral-300 px-4 py-2 text-right font-semibold whitespace-nowrap tabular-nums ${
                      row.positive ? "text-accent-700" : "text-text"
                    }`}
                  >
                    {row.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 px-6 py-5">
        <button
          onClick={onReset}
          className="btn btn-outline px-4 py-3 text-[13px] tracking-[0.06em]"
        >{t.btnChangeFile}</button>
        <span className="flex-1" />
        <button
          onClick={onAnalyse}
          disabled={view.countOk === "0"}
          className="btn btn-primary min-w-[380px] p-4 text-base"
        >{t.btnAnalyse}</button>
      </div>
    </>
  );
}
