// Récurrence calendaire : un abonnement n'est pas « un écart médian de 30 jours »,
// c'est un prélèvement ancré sur une date du mois.

const DAY = 86400000;

export const median = (a) => {
  if (!a.length) return 0;
  const s = a.slice().sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export const stdev = (a) => {
  if (a.length < 2) return 0;
  const mean = a.reduce((x, y) => x + y, 0) / a.length;
  return Math.sqrt(a.reduce((acc, v) => acc + (v - mean) ** 2, 0) / a.length);
};

/** Valeur la plus fréquente ; à égalité, la plus petite. */
export function mode(a) {
  const tally = new Map();
  for (const v of a) tally.set(v, (tally.get(v) || 0) + 1);
  let best = a[0];
  let bestN = 0;
  for (const [v, n] of tally) {
    if (n > bestN || (n === bestN && v < best)) {
      best = v;
      bestN = n;
    }
  }
  return best;
}

/**
 * Écart en mois calendaires. La correction du quantième évite de compter deux mois
 * quand un prélèvement du 30/01 glisse au 02/03 : le mois de février est court, mais
 * une seule échéance s'est écoulée.
 */
export function monthsApart(a, b) {
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate() - 15) m -= 1;
  return m;
}

export const daysApart = (a, b) => Math.round((b - a) / DAY);

const daysInMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

/** Longueur moyenne d'un mois : sert à convertir un écart en jours en nombre de mois. */
export const MONTH_DAYS = 30.44;

/**
 * Écart en mois déduit de l'écart en jours.
 *
 * Plus robuste que l'arithmétique calendaire pour un prélèvement qui oscille autour du
 * 1er : entre le 02/03 et le 31/03 il n'y a aucune frontière de mois franchie, pourtant
 * une échéance s'est bien écoulée.
 */
export const stepFromDays = (a, b) => Math.round(daysApart(a, b) / MONTH_DAYS);

/**
 * Dispersion de l'ancrage dans le mois, en jours, mesurée **circulairement** : le 31 et
 * le 1er sont voisins, pas opposés. Chaque date devient une phase sur le cercle du mois
 * et on mesure la concentration du nuage.
 *
 * Indispensable pour un abonnement facturé « autour du 1er » (31/01, 02/03, 31/03, …) :
 * en linéaire sa dispersion est de 14 jours, en circulaire elle tombe sous 1.
 */
export function circularAnchor(dates) {
  if (dates.length < 2) return 0;
  let sx = 0;
  let sy = 0;
  for (const d of dates) {
    const phase = ((d.getDate() - 1) / daysInMonth(d)) * 2 * Math.PI;
    sx += Math.cos(phase);
    sy += Math.sin(phase);
  }
  // R proche de 1 = dates concentrées ; on le convertit en un écart-type en jours.
  const r = Math.hypot(sx, sy) / dates.length;
  return Math.sqrt(Math.max(0, -2 * Math.log(Math.max(r, 1e-9)))) * (MONTH_DAYS / (2 * Math.PI));
}

/** Pas reconnus, en mois. Rien en dessous du mois : voir `rhythm`. */
export const KNOWN_STEPS = [1, 2, 3, 4, 6, 12];

/**
 * Rythme d'une série de dates triées, ou null si elle n'a pas de récurrence mensuelle.
 *
 * Le pas est le mode des écarts en mois, eux-mêmes déduits des écarts en jours. Un mois
 * sauté produit un écart de 2 au milieu de 1 : le mode reste 1, la série reste mensuelle,
 * et le trou est compté au lieu de casser le rythme.
 *
 * Il n'y a **pas** de rythme infra-mensuel. Deux passages au bar à cinq jours d'écart ne
 * sont pas un abonnement hebdomadaire à 52 échéances par an — c'est une habitude de
 * consommation, qui relève des dépenses régulières.
 */
export function rhythm(dates) {
  if (dates.length < 2) return null;

  const gapsDays = [];
  for (let i = 1; i < dates.length; i++) gapsDays.push(daysApart(dates[i - 1], dates[i]));
  const medDays = median(gapsDays);

  const gapsMonths = [];
  for (let i = 1; i < dates.length; i++) gapsMonths.push(stepFromDays(dates[i - 1], dates[i]));
  const positive = gapsMonths.filter((m) => m > 0);
  if (!positive.length) return null;
  const step = mode(positive);
  if (!KNOWN_STEPS.includes(step)) return null;

  // Un écart multiple du pas = des échéances manquées, pas une rupture de rythme.
  const exact = gapsMonths.filter((m) => m === step).length / gapsMonths.length;
  const missed = gapsMonths.reduce(
    (acc, m) => acc + (m > 0 && m % step === 0 ? m / step - 1 : 0),
    0,
  );
  const span = stepFromDays(dates[0], dates[dates.length - 1]);
  const expected = Math.floor(span / step) + 1;

  // Pas de libellé ici : la couche calcul renvoie le pas, l'affichage le traduit.
  return {
    unit: "month",
    step,
    perYear: 12 / step,
    regularity: exact,
    anchor: circularAnchor(dates),
    missed,
    expected,
    medDays,
  };
}

/**
 * Sous-séries de montant strictement identique, au centime.
 *
 * C'est la signature d'un abonnement : un commerce ne facture jamais six fois exactement
 * 9,99 €. Découper ainsi isole aussi un abonnement noyé dans des achats à l'unité sous le
 * même libellé (Apple.com : 4,49 € × 7, plus des achats ponctuels).
 *
 * Retourne les sous-séries d'au moins `min` occurrences, triées par date, et le reliquat.
 */
export function exactSeries(occ, { min = 3 } = {}) {
  const buckets = new Map();
  for (const t of occ) {
    const k = Math.abs(t.amt).toFixed(2);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(t);
  }
  const series = [];
  const rest = [];
  for (const group of buckets.values()) {
    if (group.length >= min) series.push(group.slice().sort((a, b) => a.d - b.d));
    else rest.push(...group);
  }
  series.sort((a, b) => Math.abs(b[0].amt) - Math.abs(a[0].amt));
  return { series, rest };
}

/**
 * Paliers de montant.
 *
 * On trie les montants et on coupe au plus grand saut relatif, une seule fois, et
 * seulement s'il dépasse `jump`. Une série qui varie en continu (facture à la
 * consommation) ne présente pas de saut net et reste d'un seul tenant.
 *
 * ponytail: un seul point de coupe. Couvre hausse de prix et double abonnement ;
 * récursion à ajouter si un cas à trois paliers se présente.
 */
export function plateaus(occ, { jump = 1.25, overlap = 0.2 } = {}) {
  if (occ.length < 2) return { groups: [occ], relation: "single" };

  const byAmount = occ.slice().sort((a, b) => Math.abs(a.amt) - Math.abs(b.amt));
  let cut = -1;
  let ratio = 1;
  for (let i = 1; i < byAmount.length; i++) {
    const r = Math.abs(byAmount[i].amt) / Math.abs(byAmount[i - 1].amt);
    if (r > ratio) {
      ratio = r;
      cut = i;
    }
  }
  if (ratio < jump || cut < 1) return { groups: [occ], relation: "single", ratio };

  const low = byAmount.slice(0, cut);
  const high = byAmount.slice(cut);
  const [first, second] =
    Math.min(...low.map((t) => +t.d)) <= Math.min(...high.map((t) => +t.d))
      ? [low, high]
      : [high, low];
  const endFirst = Math.max(...first.map((t) => +t.d));
  const interleaved = second.filter((t) => +t.d < endFirst).length / second.length;

  return {
    groups: [first, second],
    relation: interleaved <= overlap ? "successive" : "interleaved",
    ratio,
    interleaved,
  };
}
