// Détection des prélèvements récurrents.
// La récurrence calendaire vit dans recurrence.js, le jugement dans classify.js ;
// ce fichier orchestre.

import { category, confidenceOf, score } from "./classify.js";
import { MONTH_DAYS, exactSeries, median, plateaus, rhythm, stdev } from "./recurrence.js";

const DAY = 86400000;

export { median, stdev };

export function titleCase(s) {
  return s
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => (w.length <= 2 && /^[a-z]+$/.test(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

/**
 * Fusionne les groupes dont une clé est préfixe de l'autre (« SPOTIFY » avale
 * « SPOTIFY AB »). Garde-fou : même canal et montants du même ordre, sinon
 * « AMAZON » avalerait « AMAZON PRIME ».
 */
function mergePrefixes(groups, tol) {
  const keys = Object.keys(groups).sort((a, b) => a.length - b.length);
  const gone = new Set();
  for (const short of keys) {
    if (gone.has(short)) continue;
    for (const long of keys) {
      if (long === short || gone.has(long)) continue;
      if (!long.startsWith(`${short} `)) continue;
      const a = groups[short];
      const b = groups[long];
      if (a[0].channel !== b[0].channel) continue;
      const ma = median(a.map((t) => Math.abs(t.amt)));
      const mb = median(b.map((t) => Math.abs(t.amt)));
      if (Math.abs(ma - mb) > Math.max(ma, mb) * tol) continue;
      groups[short] = a.concat(b);
      gone.add(long);
    }
  }
  for (const k of gone) delete groups[k];
  return groups;
}

const overlapRate = (a, b) => {
  const [x, y] = a[0].d <= b[0].d ? [a, b] : [b, a];
  const endX = Math.max(...x.map((t) => +t.d));
  return y.filter((t) => +t.d < endX).length / y.length;
};

/**
 * Fusionne les sous-séries exactes qui se **succèdent** dans le temps : c'est un même
 * abonnement dont le prix a changé (19,99 € puis 26,99 €). Celles qui se chevauchent
 * restent distinctes — sept montants mensuels simultanés chez un intermédiaire, ce sont
 * bien sept abonnements.
 */
function mergeSuccessive(series) {
  const sorted = series.slice().sort((a, b) => a[0].d - b[0].d);
  const out = [];
  for (const s of sorted) {
    const prev = out[out.length - 1];
    if (prev && overlapRate(prev.occ, s) <= 0.2) {
      prev.steps.push(Math.abs(s[0].amt));
      prev.occ = prev.occ.concat(s).sort((a, b) => a.d - b.d);
      prev.current = s;
    } else {
      out.push({ occ: s, steps: [Math.abs(s[0].amt)], current: s });
    }
  }
  return out;
}

/** Une série de transactions triées → une carte, ou null si le rythme est absent. */
function card({ key, norm, channel, occ, maxDate, priceChange, exact = false, merchantCadence = null }) {
  const dates = occ.map((t) => t.d);
  const r = rhythm(dates);
  if (!r) return null;

  const amounts = occ.map((t) => Math.abs(t.amt));
  // Après une hausse de prix, seul le palier courant décrit le coût à venir.
  const billed = priceChange ? priceChange.current : amounts;
  const amount = median(billed);

  const s = score({ rhythm: r, amounts, channel, count: occ.length, exact, merchantCadence });
  const last = occ[occ.length - 1].d;
  const daysSince = Math.round((maxDate - last.getTime()) / DAY);
  const periodDays = r.step * MONTH_DAYS;

  // Clés, pas de phrases : l'affichage les traduit.
  const reasons = [];
  if (r.regularity < 0.6) reasons.push({ key: "reasonIrregular" });
  if (occ.length < 3) reasons.push({ key: "reasonFewOcc", n: occ.length });
  if (r.anchor > 3) reasons.push({ key: "reasonWanders" });
  if (r.missed > 0) reasons.push({ key: "reasonMissed", n: r.missed });

  return {
    key,
    norm,
    channel,
    merchant: titleCase(norm),
    sample: occ[occ.length - 1].label,
    amount,
    count: occ.length,
    freqStep: r.step,
    perYear: r.perYear,
    annual: amount * r.perYear,
    last,
    daysSince,
    dormant: daysSince > periodDays * 2,
    rhythm: r,
    score: s,
    exact,
    confidence: confidenceOf(s),
    category: category({ norm, channel, rhythm: r, exact }),
    priceChange: priceChange || null,
    reasons,
    // Conservé pour l'existant : « sûr » remplace l'ancien booléen.
    high: confidenceOf(s) === "sure",
    occ,
  };
}

/**
 * Groupe les débits par clé marchand + canal, sépare les paliers de montant, mesure
 * le rythme calendaire, note et classe. Trié par coût annuel décroissant.
 */
export function detect(txs, { tolerance = 10 } = {}) {
  const tol = tolerance / 100;
  const debits = txs.filter((t) => t.amt < 0 && t.norm);
  if (!debits.length) return [];
  const maxDate = Math.max(...txs.map((t) => t.d.getTime()));

  // Regroupement par canal puis par libelle : la fusion par prefixe ne doit jamais
  // rapprocher un prelevement SEPA d un paiement carte.
  const byChannel = {};
  for (const t of debits) {
    const channel = t.channel || "autre";
    const byNorm = (byChannel[channel] = byChannel[channel] || {});
    (byNorm[t.norm] = byNorm[t.norm] || []).push(t);
  }
  const merged = [];
  for (const [channel, byNorm] of Object.entries(byChannel)) {
    for (const [norm, occ] of Object.entries(mergePrefixes(byNorm, tol))) {
      merged.push({ norm, channel, occ });
    }
  }

  const out = [];
  for (const { norm, channel, occ } of merged) {
    if (occ.length < 2) continue;
    const byDate = occ.slice().sort((a, b) => a.d - b.d);

    // Cadence globale du marchand, tous montants confondus : sert à repérer les
    // commerçants fréquentés, chez qui un montant répété est une coïncidence.
    const allGaps = [];
    for (let i = 1; i < byDate.length; i++) allGaps.push((byDate[i].d - byDate[i - 1].d) / DAY);
    const merchantCadence = allGaps.length ? median(allGaps) : null;

    // 1. Sous-séries de montant strictement identique : la signature d'un abonnement.
    // min: 2 pour que la fusion voie le palier court d'une hausse de prix récente
    // (19,99 € × 5 puis 22,99 € × 2) ; une carte n'est émise qu'à partir de 3 occurrences.
    const { series } = exactSeries(byDate, { min: 2 });
    const claimed = new Set();
    mergeSuccessive(series).forEach((m, i) => {
      if (m.occ.length < 3) return;
      const steps = m.steps;
      const priceChange =
        steps.length > 1
          ? { from: steps[0], to: steps[steps.length - 1], current: m.current.map((t) => Math.abs(t.amt)) }
          : null;
      const c = card({
        key: `${norm}#${channel}#=${i}`,
        norm,
        channel,
        occ: m.occ,
        maxDate,
        priceChange,
        exact: true,
        merchantCadence,
      });
      if (!c) return;
      out.push(c);
      for (const t of m.occ) claimed.add(t);
    });

    // 2. Le reliquat, plus les sous-séries exactes sans rythme : montants qui varient.
    const leftover = byDate.filter((t) => !claimed.has(t));
    if (leftover.length < 2) continue;
    const p = plateaus(leftover);

    if (p.relation === "interleaved") {
      // Deux abonnements distincts sous le même libellé (iCloud 2,99 € et 29,99 €).
      p.groups.forEach((g, i) => {
        const s = g.slice().sort((a, b) => a.d - b.d);
        if (s.length < 2) return;
        const c = card({ key: `${norm}#${channel}#~${i}`, norm, channel, occ: s, maxDate, merchantCadence });
        if (c) out.push(c);
      });
      continue;
    }

    // Palier unique, ou hausse de prix : une seule série dans les deux cas.
    let priceChange = null;
    if (p.relation === "successive") {
      const [first, second] = p.groups;
      const current = (+second[0].d > +first[0].d ? second : first).map((t) => Math.abs(t.amt));
      const before = (+second[0].d > +first[0].d ? first : second).map((t) => Math.abs(t.amt));
      priceChange = { from: median(before), to: median(current), current };
    }
    const c = card({ key: `${norm}#${channel}#~`, norm, channel, occ: leftover, maxDate, priceChange, merchantCadence });
    if (c) out.push(c);
  }

  return out.sort((a, b) => b.annual - a.annual);
}

/** Historique du plus récent au plus ancien, avec l'écart depuis le précédent. */
export function timeline(card_, { money, date }, tr) {
  return card_.occ
    .slice()
    .reverse()
    .map((t, i, arr) => {
      const prev = arr[i + 1];
      return {
        date: date(t.d),
        amount: money(Math.abs(t.amt)),
        gap: prev ? tr.gapDays(Math.round((t.d - prev.d) / DAY)) : tr.firstSeen,
      };
    });
}

/** Phrase expliquant ce que l'algorithme a mesuré, dans la langue courante. */
export function explain(c, tr, { money } = { money: (n) => String(n) }) {
  const r = c.rhythm;
  const unit = r.step === 1 ? tr.everyMonth : tr.everyNMonths(r.step);
  const anchor =
    r.anchor < 0.5 ? tr.anchorFixed : tr.anchorNear(Math.round(r.anchor * 10) / 10);

  let s = tr.explainBase(c.count, unit, Math.round(r.regularity * 100), anchor, c.score);
  if (r.missed > 0) s += tr.explainMissed(r.missed);
  if (c.priceChange) {
    s += tr.explainPrice(money(c.priceChange.from), money(c.priceChange.to));
  }
  if (c.dormant) s += tr.explainStopped(c.daysSince);
  return s;
}
