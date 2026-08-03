export default function Import({ t, onFile, onDemo }) {
  const handleDrop = (e) => {
    e.preventDefault();
    onFile(e.dataTransfer?.files?.[0]);
  };

  return (
    <>
      {/* flex-1 : le hero absorbe la hauteur restante, la bande des trois étapes reste
          collée en pied de fenêtre plutôt que de laisser du blanc en dessous. */}
      <div className="grid flex-1 grid-cols-12 border-b-2 border-text">
        <div className="col-span-12 flex flex-col justify-center gap-5 border-text px-6 py-14 lg:col-span-7 lg:border-r-2">
          <span className="text-xs font-semibold tracking-[0.14em] text-accent-700 uppercase">
            {t.heroKicker}
          </span>
          <h1 className="m-0 text-[clamp(44px,6vw,88px)] leading-[0.96] font-extrabold tracking-[-0.04em] text-balance uppercase">
            {t.heroTitle}
          </h1>
          <p className="m-0 max-w-[620px] text-[17px] text-neutral-800 text-pretty">{t.heroBody}</p>
          <p className="m-0 font-mono text-[11px] text-neutral-600">{t.gloss}</p>
        </div>

        <div className="col-span-12 flex flex-col lg:col-span-5">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="flex flex-1 flex-col items-start justify-center gap-4 border-b-2 border-text bg-surface px-6 py-8"
          >
            <span className="text-[22px] font-extrabold tracking-[-0.01em] uppercase">
              {t.dropTitle}
            </span>
            <span className="text-sm text-neutral-800">{t.dropBody}</span>
            <label htmlFor="csv-file" className="btn btn-primary w-full px-4 py-3.5 text-[15px]">
              {t.btnChoose}
            </label>
            <input
              id="csv-file"
              type="file"
              accept=".csv,.txt"
              onChange={(e) => onFile(e.target.files?.[0])}
              className="hidden"
            />
            <button onClick={onDemo} className="btn btn-outline w-full px-4 py-3 text-[15px]">
              {t.btnDemo}
            </button>
          </div>
          <div className="flex flex-col gap-1.5 px-6 py-4">
            <span className="caps">{t.privacyTitle}</span>
            <span className="text-[13px] text-neutral-800">{t.privacyBody}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3">
        {t.steps.map(([num, title, desc], i) => (
          <div
            key={num}
            className={`flex flex-col gap-1.5 p-6 ${i < 2 ? "border-r border-neutral-300" : ""}`}
          >
            <span className="text-[28px] font-extrabold text-accent-700">{num}</span>
            <span className="text-sm font-semibold uppercase">{title}</span>
            <span className="text-[13px] text-neutral-700">{desc}</span>
          </div>
        ))}
      </div>
    </>
  );
}
