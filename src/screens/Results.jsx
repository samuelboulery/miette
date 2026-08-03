const TH = ({ children, right }) => (
  <th className={`caps border-b-2 border-text px-4 py-3 ${right ? "text-right" : "text-left"}`}>
    {children}
  </th>
);

function Kpi({ label, value, accent, last }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 px-6 py-3.5 ${last ? "" : "border-b border-neutral-300"}`}
    >
      <span className="caps">{label}</span>
      <span
        className={`text-[26px] font-extrabold tabular-nums ${accent ? "text-accent-700" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

/** Colonne de gauche + contenu, la trame de section du design Modernist. */
function Block({ num, title, desc, border, children }) {
  return (
    <div
      className={`grid grid-cols-[240px_1fr] max-sm:grid-cols-1 ${border ? "border-t-2 border-text" : ""}`}
    >
      <div className="flex flex-col gap-2 border-text p-6 sm:border-r-2">
        {num && <span className="text-[32px] leading-none font-extrabold text-accent-700">{num}</span>}
        <span className="caps text-xs">{title}</span>
        <span className="text-[13px] text-neutral-700">{desc}</span>
      </div>
      {children}
    </div>
  );
}

function RecurrenceTable({ rows, total, totalLabel, t, onOpen }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <TH>{t.thMerchant}</TH>
            <TH right>{t.colAmount}</TH>
            <TH>{t.thFreq}</TH>
            <TH right>{t.thAnnual}</TH>
            <TH>{t.thLast}</TH>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.key}
              onClick={() => onOpen(r.key)}
              className={`cursor-pointer hover:bg-surface ${r.isDormant ? "opacity-45" : ""}`}
            >
              <td className="border-b border-neutral-300 px-4 py-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-semibold">{r.merchant}</span>
                  {r.isDormant && (
                    <span className="border-2 border-accent-700 px-[5px] py-px text-[10px] font-semibold tracking-[0.08em] text-accent-700 uppercase">{t.badgeStopped}</span>
                  )}
                </div>
                <div className="max-w-[380px] truncate font-mono text-[11px] whitespace-nowrap text-neutral-600">
                  {r.sub}
                </div>
              </td>
              <td className="border-b border-neutral-300 px-4 py-3.5 text-right whitespace-nowrap tabular-nums">
                {r.amount}
              </td>
              <td className="border-b border-neutral-300 px-4 py-3.5 whitespace-nowrap">{r.freq}</td>
              <td
                className={`border-b border-neutral-300 px-4 py-3.5 text-right text-[17px] font-extrabold tracking-[-0.01em] whitespace-nowrap tabular-nums ${
                  r.isDormant ? "text-neutral-600" : "text-text"
                }`}
              >
                {r.annual}
              </td>
              <td className="border-b border-neutral-300 px-4 py-3.5 whitespace-nowrap tabular-nums text-neutral-700">
                {r.last}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="caps border-t-2 border-text px-4 py-3.5">
              {totalLabel}
            </td>
            <td className="border-t-2 border-text px-4 py-3.5 text-right text-[22px] font-extrabold tracking-[-0.02em] whitespace-nowrap tabular-nums">
              {total}
            </td>
            <td className="border-t-2 border-text" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function Results({ t, view, onOpen, onDecide, onToggleMaybe, onBack, onReset }) {
  return (
    <>
      <div className="grid grid-cols-12 border-b-2 border-text">
        <div className="col-span-12 flex flex-col gap-1 border-text px-6 pt-8 pb-7 lg:col-span-8 lg:border-r-2">
          <span className="text-xs font-semibold tracking-[0.14em] text-accent-700 uppercase">
            {t.resultKicker}
          </span>
          {/* pl-[0.03em] : au crénage serré, le symbole en préfixe (€2,680 en anglais)
              dépasse le bord et se fait rogner. */}
          <span className="pl-[0.03em] text-[clamp(64px,12vw,168px)] leading-[0.86] font-extrabold tracking-[-0.05em] tabular-nums">
            {view.annualTotal}
          </span>
          <span className="max-w-[640px] text-base text-neutral-800 text-pretty">
            {view.headlineSub}
          </span>
        </div>
        <div className="col-span-12 grid grid-rows-3 lg:col-span-4">
          <Kpi label={t.kpiMonthly} value={view.monthlyTotal} />
          <Kpi label={t.kpiActive} value={view.activeCount} />
          <Kpi label={t.kpiStopped} value={view.dormantCount} accent last />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-b-2 border-text bg-surface px-6 py-3">
        <span className="text-xs text-neutral-800">
          {view.fileName} · {view.meta}
        </span>
        <span className="flex-1" />
        <button
          onClick={onBack}
          className="btn btn-outline px-2.5 py-[5px] text-[11px] tracking-[0.08em]"
        >{t.btnBackToMap}</button>
      </div>

      {view.dormantCount !== "0" && (
        <div className="grid grid-cols-[240px_1fr] border-b-2 border-text bg-accent-200 max-sm:grid-cols-1">
          <div className="border-text px-6 py-4 sm:border-r-2">
            <span className="caps text-accent-700">{t.stoppedTitle}</span>
          </div>
          <div className="flex flex-col gap-0.5 px-6 py-4">
            <span className="text-[15px] font-semibold">{view.dormantHeadline}</span>
            <span className="text-[13px] text-accent-800">{t.stoppedBody}</span>
          </div>
        </div>
      )}

      <Block num="04" title={t.detailTitle} desc={t.detailBody}>
        <RecurrenceTable rows={view.rows} total={view.annualTotal} totalLabel={t.totalYearly} t={t} onOpen={onOpen} />
      </Block>

      {view.charges.length > 0 && (
        <Block title={t.chargesTitle} desc={view.chargesIntro} border>
          <RecurrenceTable
            rows={view.charges}
            total={view.chargesTotal}
            totalLabel={t.totalCharges}
            t={t}
            onOpen={onOpen}
          />
        </Block>
      )}

      {view.maybes.length > 0 && (
        <div className="grid grid-cols-[240px_1fr] border-t-2 border-text max-sm:grid-cols-1">
          <div className="flex flex-col gap-2 border-text p-6 sm:border-r-2">
            <span className="caps text-xs">{t.maybeTitle}</span>
            <span className="text-[13px] text-neutral-700">{view.maybeIntro}</span>
          </div>
          <div className="flex flex-col">
            <button
              onClick={onToggleMaybe}
              aria-expanded={view.showMaybe}
              className="btn flex justify-between gap-3 border-b border-neutral-300 bg-surface px-4 py-3.5 text-[13px] tracking-[0.06em] hover:bg-accent-200"
            >
              <span>{view.maybeLabel}</span>
              <span className="text-accent-700">{view.showMaybe ? "\u2212" : "+"}</span>
            </button>
            {view.showMaybe && (
              <div className="flex flex-col">
                {view.maybes.map((r) => (
                  <div
                    key={r.key}
                    className="flex flex-wrap items-center gap-4 border-b border-neutral-300 px-4 py-3.5"
                  >
                    <div className="flex min-w-[220px] flex-1 flex-col">
                      <button
                        onClick={() => onOpen(r.key)}
                        className="cursor-pointer text-left font-semibold hover:text-accent-700"
                      >
                        {r.merchant}
                      </button>
                      <span className="font-mono text-[11px] text-neutral-600">{r.reason}</span>
                    </div>
                    <span className="whitespace-nowrap tabular-nums">
                      {r.amount} · {r.freq}
                    </span>
                    <span className="font-extrabold whitespace-nowrap tabular-nums">
                      {t.perYear(r.annual)}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onDecide(r.key, "kept")}
                        className="btn btn-primary px-3 py-1.5 text-[11px] tracking-[0.08em]"
                      >{t.btnKeep}</button>
                      <button
                        onClick={() => onDecide(r.key, "trashed")}
                        className="btn btn-outline px-2.5 py-1 text-[11px] tracking-[0.08em]"
                      >{t.btnTrash}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {view.spending.length > 0 && (
        <Block num="05" title={t.spendingTitle} desc={view.spendingIntro} border>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <TH>{t.thPost}</TH>
                  <TH>{t.thRhythm}</TH>
                  <TH right>{t.thAverage}</TH>
                  <TH right>{t.thSpent}</TH>
                  <TH right>{t.thTwelve}</TH>
                </tr>
              </thead>
              <tbody>
                {view.spending.map((r) => (
                  <tr key={r.key}>
                    <td className="border-b border-neutral-300 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{r.merchant}</span>
                        {r.middleman && (
                          <span className="caps border border-neutral-400 px-1 text-[10px]">{t.badgeMiddleman}</span>
                        )}
                      </div>
                      <div className="font-mono text-[11px] text-neutral-600">{r.count}</div>
                    </td>
                    <td className="border-b border-neutral-300 px-4 py-3 whitespace-nowrap text-neutral-700">
                      {r.cadence}
                    </td>
                    <td className="border-b border-neutral-300 px-4 py-3 text-right whitespace-nowrap tabular-nums text-neutral-700">
                      {r.average}
                    </td>
                    <td className="border-b border-neutral-300 px-4 py-3 text-right whitespace-nowrap tabular-nums">
                      {r.spent}
                    </td>
                    <td className="border-b border-neutral-300 px-4 py-3 text-right text-[17px] font-extrabold tracking-[-0.01em] whitespace-nowrap tabular-nums">
                      {r.annual}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="caps border-t-2 border-text px-4 py-3.5">{t.spendingTotal}</td>
                  <td className="border-t-2 border-text px-4 py-3.5 text-right text-[22px] font-extrabold tracking-[-0.02em] whitespace-nowrap tabular-nums">
                    {view.spendingTotal}
                  </td>
                </tr>
              </tfoot>
            </table>
            <p className="m-0 px-4 py-3 text-[13px] text-neutral-700">{view.spendingFoot}</p>
          </div>
        </Block>
      )}

      {view.others.length > 0 && (
        <Block title={t.othersTitle} desc={view.othersIntro} border>
          <div className="flex flex-col">
            {view.others.map((r) => (
              <button
                key={r.key}
                onClick={() => onOpen(r.key)}
                className="flex cursor-pointer flex-wrap items-center gap-4 border-b border-neutral-300 px-4 py-3 text-left hover:bg-surface"
              >
                <span className="min-w-[220px] flex-1 font-semibold">{r.merchant}</span>
                <span className="caps">{r.category}</span>
                <span className="whitespace-nowrap tabular-nums">
                  {r.amount} · {r.freq}
                </span>
                <span className="whitespace-nowrap tabular-nums text-neutral-700">
                  {r.annual} / an
                </span>
              </button>
            ))}
          </div>
        </Block>
      )}

      <div className="flex flex-wrap items-center gap-4 border-t-2 border-text px-6 py-5">
        <span className="text-xs text-neutral-700">{t.footerNote(view.countOk)}</span>
        <span className="flex-1" />
        <button
          onClick={onReset}
          className="btn btn-outline px-3.5 py-2.5 text-xs tracking-[0.08em]"
        >{t.btnAnalyseAnother}</button>
      </div>
    </>
  );
}
