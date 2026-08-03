import { useEffect, useMemo, useState } from "react";
import { DEMO_CSV } from "./lib/demo";
import { detect, explain, timeline } from "./lib/detect";
import { AVAILABLE, detectLocale, formatters, t as dict } from "./lib/i18n";
import { decodeBuffer, emptyState, ingest, toTransactions } from "./lib/parse";
import { cadenceLabel, spending } from "./lib/spending";
import Drawer from "./screens/Drawer";
import Import from "./screens/Import";
import Mapping from "./screens/Mapping";
import Results from "./screens/Results";

const PREVIEW = 25;
const LANG_KEY = "miette:lang";
const THEME_KEY = "miette:theme";

const read = (k) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null; // navigation privée
  }
};
const write = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* rien à faire, le choix vaudra pour la session */
  }
};

export default function App() {
  const [s, setState] = useState(emptyState);
  const [lang, setLang] = useState(() =>
    detectLocale({ stored: read(LANG_KEY), navigatorLanguages: navigator.languages || [] }),
  );
  // Le thème a déjà été posé sur <html> par le script d'index.html, on le relit.
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme || "light",
  );

  const t = dict(lang);
  const fmt = useMemo(() => formatters(lang), [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t.docTitle;
    write(LANG_KEY, lang);
  }, [lang, t.docTitle]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    write(THEME_KEY, theme);
  }, [theme]);

  const patch = (p) => setState((prev) => ({ ...prev, ...p }));
  const reset = () => setState(emptyState());

  const readFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const { text, encoding } = decodeBuffer(reader.result);
      setState(ingest(text, file.name, encoding));
    };
    reader.readAsArrayBuffer(file);
  };

  const freqName = (step) => {
    const v = t.freq[step];
    return typeof v === "string" ? v : t.freq.other(step);
  };
  const reasonText = (reasons) =>
    reasons.length
      ? reasons
          .map(({ key, n }) => (typeof t[key] === "function" ? t[key](n) : t[key]))
          .join(t.reasonSep)
      : t.reasonToConfirm;

  // Tous les dérivés d'affichage, dans la langue courante.
  const view = useMemo(() => {
    if (s.screen === "import") return null;
    const { ok: txs, skipped } = toTransactions(s);
    const dates = txs.map((x) => x.d.getTime());
    const totalOut = txs.filter((x) => x.amt < 0).reduce((a, x) => a + x.amt, 0);

    const meta = [
      t.metaRows(s.rows.length),
      t.metaDelim(s.delim),
      s.encoding,
      s.headerLines > 0 ? t.metaSkippedHeader(s.headerLines) : null,
    ]
      .filter(Boolean)
      .join(" · ");

    const base = {
      fileName: s.fileName,
      meta,
      countOk: String(txs.length),
      period: dates.length
        ? `${fmt.dateShort(Math.min(...dates))} → ${fmt.dateShort(Math.max(...dates))}`
        : "·",
      totalOut: fmt.money(totalOut),
      skipped: skipped.slice(0, 6),
      skippedCount: String(skipped.length),
      canExpand: txs.length > PREVIEW,
      expandLabel: s.showAll ? t.collapse : t.expandAll(txs.length),
      shownLabel: txs.length
        ? s.showAll
          ? t.shownAll(txs.length)
          : t.shownPreview(Math.min(PREVIEW, txs.length), txs.length)
        : t.shownNone,
      rawView: (s.showAll ? txs : txs.slice(0, PREVIEW)).map((x) => ({
        date: fmt.date(x.d),
        label: x.label,
        norm: x.norm || "·",
        amount: fmt.money(x.amt),
        positive: x.amt > 0,
      })),
    };
    if (s.screen !== "result") return base;

    // Récurrence sûre → gardée sauf jetée à la main ; incertaine → à valider.
    const all = detect(txs);
    const kept = all.filter((c) =>
      c.confidence === "sure" ? s.decisions[c.key] !== "trashed" : s.decisions[c.key] === "kept",
    );
    const maybes = all.filter((c) => c.confidence === "maybe" && !s.decisions[c.key]);

    // Le gros chiffre ne compte que les abonnements : le loyer et les impôts sont
    // récurrents mais on ne les résilie pas.
    const abos = kept.filter((c) => c.category === "abonnement");
    const charges = kept.filter((c) => c.category === "charge");
    const others = kept.filter((c) => c.category === "depense" || c.category === "virement");
    const active = abos.filter((c) => !c.dormant);
    // Seules les lignes des deux tableaux : le bandeau dit « grisées plus bas », il ne
    // doit pas parler d'une ligne rangée dans le repli.
    const stopped = [...abos, ...charges].filter((c) => c.dormant);
    const activeTotal = active.reduce((a, c) => a + c.annual, 0);
    const chargesTotal = charges.filter((c) => !c.dormant).reduce((a, c) => a + c.annual, 0);

    const row = (c) => ({
      key: c.key,
      merchant: c.merchant,
      sub: c.sample,
      amount: fmt.money(c.amount),
      freq: freqName(c.freqStep),
      annual: fmt.money(c.annual),
      last: c.dormant ? t.lastStopped(fmt.date(c.last), c.daysSince) : fmt.date(c.last),
      isDormant: c.dormant,
      reason: reasonText(c.reasons),
      score: c.score,
      category: t.cat[c.category],
    });

    const card = all.find((c) => c.key === s.drawerKey);

    // Où part l'argent, abonnement ou pas : projection sur douze mois.
    const sp = spending(txs);
    const months = Math.round((sp.days / 30.44) * 10) / 10;

    return {
      ...base,
      annualTotal: fmt.money0(activeTotal),
      monthlyTotal: fmt.money(activeTotal / 12),
      activeCount: String(active.length),
      dormantCount: String(stopped.length),
      headlineSub: active.length
        ? t.headlineSub(fmt.money(activeTotal / 12), active.length)
        : t.headlineNone,
      dormantHeadline:
        stopped.length === 1
          ? t.stoppedOne(stopped[0].merchant, stopped[0].daysSince)
          : t.stoppedMany(stopped.length),
      rows: abos.map(row),
      charges: charges.map(row),
      chargesTotal: fmt.money0(chargesTotal),
      chargesIntro: t.chargesIntro(charges.length),
      others: others.map(row),
      othersIntro: others.length ? t.othersIntro(others.length) : "",
      spending: sp.rows.map((r) => ({
        key: r.key,
        merchant: r.merchant,
        count: t.timesCount(r.count),
        cadence: cadenceLabel(r.cadence, r.count, t.cad),
        average: fmt.money(r.average),
        spent: fmt.money(r.spent),
        annual: fmt.money0(r.annual),
        middleman: r.middleman,
      })),
      spendingTotal: fmt.money0(sp.annual),
      spendingIntro: t.spendingIntro(fmt.num(months)),
      spendingFoot: t.spendingFoot(
        fmt.money(sp.recurring),
        sp.days,
        sp.count,
        fmt.money(sp.total),
      ),
      maybes: maybes.map(row),
      showMaybe: s.showMaybe,
      maybeLabel: s.showMaybe ? t.maybeHide(maybes.length) : t.maybeShow(maybes.length),
      maybeIntro: t.maybeIntro(maybes.length),
      drawer: card && {
        merchant: card.merchant,
        freq: freqName(card.freqStep),
        annual: fmt.money(card.annual),
        amount: fmt.money(card.amount),
        norm: card.norm,
        count: String(card.count),
        score: card.score,
        category: t.cat[card.category],
        stopped: card.dormant,
        timeline: timeline(card, fmt, t),
        explain: explain(card, t, fmt),
      },
    };
  }, [s, t, fmt]); // eslint-disable-line react-hooks/exhaustive-deps

  const stepLabel = { import: t.stepImport, map: t.stepMap, result: t.stepResult }[s.screen];

  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <header className="sticky top-0 z-5 flex flex-wrap items-center gap-4 border-b-2 border-text bg-bg px-6 py-3.5">
        <span className="text-[22px] font-extrabold tracking-[-0.03em] uppercase">Miette</span>
        <span className="border-2 border-accent-700 px-1.5 py-0.5 text-[11px] font-semibold tracking-[0.1em] text-accent-700 uppercase">
          {t.badgeLocal}
        </span>
        <span className="flex-1" />
        <span className="caps text-xs">{stepLabel}</span>

        <div className="flex items-center gap-2">
          {AVAILABLE.map((code) => (
            <button
              key={code}
              onClick={() => setLang(code)}
              aria-pressed={lang === code}
              className={`btn px-2 py-[5px] text-[11px] tracking-[0.08em] ${
                lang === code ? "btn-primary" : "btn-outline"
              }`}
            >
              {code}
            </button>
          ))}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={theme === "dark" ? t.toLight : t.toDark}
            aria-label={theme === "dark" ? t.toLight : t.toDark}
            className="btn btn-outline px-2.5 py-[5px] text-[11px] tracking-[0.08em]"
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
        </div>

        {s.screen !== "import" && (
          <button
            onClick={reset}
            className="btn btn-outline px-2.5 py-[5px] text-[11px] tracking-[0.08em]"
          >
            {t.newFile}
          </button>
        )}
      </header>

      {s.screen === "import" && (
        <Import
          t={t}
          onFile={readFile}
          onDemo={() => setState(ingest(DEMO_CSV, "exemple-compte-2026.csv", "UTF-8"))}
        />
      )}

      {s.screen === "map" && (
        <Mapping
          t={t}
          s={s}
          patch={patch}
          view={view}
          onReset={reset}
          onAnalyse={() => patch({ screen: "result" })}
        />
      )}

      {s.screen === "result" && (
        <Results
          t={t}
          view={view}
          onOpen={(key) => patch({ drawerKey: key })}
          onDecide={(key, decision) => patch({ decisions: { ...s.decisions, [key]: decision } })}
          onToggleMaybe={() => patch({ showMaybe: !s.showMaybe })}
          onBack={() => patch({ screen: "map" })}
          onReset={reset}
        />
      )}

      {view?.drawer && (
        <Drawer t={t} drawer={view.drawer} onClose={() => patch({ drawerKey: null })} />
      )}
    </div>
  );
}
