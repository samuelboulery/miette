// Où part l'argent : le classement des postes de dépense, abonnement ou pas.

import { titleCase } from "./detect.js";
import { median } from "./recurrence.js";

const DAY = 86400000;

/**
 * Intermédiaires de paiement : le libellé porte leur nom, jamais celui du marchand.
 * Le montant compte, mais on ne prétend pas savoir à quoi il correspond.
 */
const MIDDLEMEN = /\b(PAYPAL|SWILE|LYDIA|SUMUP|ZETTLE|WERO|STRIPE|REVOLUT|SUMUP)\b/;

/**
 * Agrège tous les débits par marchand et projette la dépense sur douze mois.
 *
 * L'extrapolation `total × 365 / joursCouverts` met le classement à la même échelle que
 * le coût annuel des abonnements. C'est une estimation, à présenter comme telle : sept
 * mois de relevé ne disent rien des cinq autres.
 */
export function spending(txs, { top = 15, minOccurrences = 2 } = {}) {
  const debits = txs.filter((t) => t.amt < 0 && t.norm);
  if (!debits.length) return { rows: [], days: 0, total: 0, annual: 0 };

  const times = debits.map((t) => t.d.getTime());
  const days = Math.max(1, Math.round((Math.max(...times) - Math.min(...times)) / DAY));
  const factor = 365 / days;

  const groups = new Map();
  for (const t of debits) {
    if (!groups.has(t.norm)) groups.set(t.norm, []);
    groups.get(t.norm).push(t);
  }

  const rows = [];
  let total = 0;
  for (const [norm, occ] of groups) {
    const spent = occ.reduce((a, t) => a + Math.abs(t.amt), 0);
    total += spent;
    // Projeter sur douze mois une dépense vue une seule fois n'a pas de sens : ce
    // classement porte sur ce qui revient.
    if (occ.length < minOccurrences) continue;
    const dates = occ.map((t) => t.d).sort((a, b) => a - b);
    const gaps = [];
    for (let i = 1; i < dates.length; i++) gaps.push((dates[i] - dates[i - 1]) / DAY);
    rows.push({
      key: `dep:${norm}`,
      norm,
      merchant: titleCase(norm) || "Sans libellé",
      channel: occ[0].channel,
      count: occ.length,
      spent,
      annual: spent * factor,
      average: spent / occ.length,
      cadence: gaps.length ? median(gaps) : null,
      middleman: MIDDLEMEN.test(norm),
      last: dates[dates.length - 1],
    });
  }

  rows.sort((a, b) => b.annual - a.annual);
  // Le total projeté ne compte que les postes récurrents, comme le classement.
  const recurring = rows.reduce((a, r) => a + r.spent, 0);
  return {
    rows: rows.slice(0, top),
    days,
    total,
    recurring,
    annual: recurring * factor,
    count: rows.length,
  };
}

/**
 * Rythme d'un poste de dépense, sous forme de clé et d'un éventuel paramètre.
 * La traduction se fait à l'affichage, pas ici.
 */
export function cadenceKey(cadence, count) {
  if (count < 2 || cadence == null) return { key: "once" };
  if (cadence < 1.5) return { key: "almostDaily" };
  if (cadence < 3) return { key: "every2Days" };
  if (cadence < 10) return { key: "everyNDays", n: Math.round(cadence) };
  if (cadence < 17) return { key: "every2Weeks" };
  if (cadence < 24) return { key: "every3Weeks" };
  if (cadence < 45) return { key: "monthly" };
  return { key: "everyNMonths", n: Math.round(cadence / 30.44) };
}

/** Applique le dictionnaire `cad` à une clé de rythme. */
export function cadenceLabel(cadence, count, cad) {
  const { key, n } = cadenceKey(cadence, count);
  const v = cad[key];
  return typeof v === "function" ? v(n) : v;
}
