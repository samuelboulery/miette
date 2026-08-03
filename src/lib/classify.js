// Jugement : à quel point cette série est-elle une vraie récurrence, et de quelle
// famille relève-t-elle ?

/**
 * Plafonds sur les séries courtes. Deux points ne font pas un rythme, et trois
 * coïncidences non plus : sur un relevé de sept mois, trois passages au même prix chez
 * un commerçant se produisent sans arrêt. Un abonnement actif, lui, laisse une trace à
 * chaque échéance.
 */
const TWO_SHOT_CAP = { prlv: 45, default: 30 };
const THREE_SHOT_CAP = 60;

/**
 * Un commerçant fréquenté tous les deux jours finit par facturer quatre fois le même
 * montant, et ces quatre-là tombent parfois à un mois d'intervalle. On plafonne donc les
 * sous-séries issues d'un marchand à cadence rapide payé par carte. Les prélèvements
 * SEPA d'un intermédiaire (PayPal) sont épargnés : ce sont des échéances, pas des achats.
 */
const BUSY_MERCHANT_DAYS = 10;
const BUSY_MERCHANT_CAP = 60;

export const SURE = 65;
export const MAYBE = 40;

/**
 * Score 0-100. Le rythme et l'ancrage pèsent 60 points à eux seuls : c'est la
 * récurrence calendaire qui décide, pas la stabilité du montant. Une facture à la
 * consommation reste un abonnement.
 */
export function score({ rhythm, amounts, channel, count, exact = false, merchantCadence = null }) {
  if (!rhythm) return 0;
  let s = 0;

  s += 35 * rhythm.regularity;

  // Ancrage au quantième, mesuré circulairement : le 31 et le 1er sont voisins.
  if (rhythm.anchor <= 3) s += 20;
  else if (rhythm.anchor <= 6) s += 10;

  s += count >= 6 ? 15 : count >= 4 ? 12 : count >= 3 ? 10 : 0;

  // Le montant répété au centime est le signal le plus sûr : un commerce ne facture
  // jamais six fois exactement 9,99 €. Sinon, barème dégressif sur la dispersion.
  if (exact) s += 20;
  else {
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const cv = mean > 0 ? stdevOf(amounts) / mean : 1;
    s += cv <= 0.06 ? 15 : cv <= 0.15 ? 10 : cv <= 0.3 ? 6 : 0;
  }

  if (channel === "prlv") s += 10;

  // Trous : tolérés jusqu'à un quart des échéances attendues.
  const holeRate = rhythm.expected > 0 ? rhythm.missed / rhythm.expected : 0;
  if (holeRate > 0.5) s *= 0.6;
  else if (holeRate > 0.25) s *= 0.8;

  if (count <= 2) s = Math.min(s, TWO_SHOT_CAP[channel] ?? TWO_SHOT_CAP.default);
  // Le plafond des trois occurrences vise les coïncidences de commerce. Il épargne les
  // rythmes longs — trois échéances semestrielles couvrent au moins un an — et les
  // prélèvements SEPA au montant identique, qui ne doivent rien au hasard. Trois
  // passages au même prix chez un restaurant, eux, restent à valider.
  else if (count === 3 && rhythm.step < 6 && !(exact && channel === "prlv")) {
    s = Math.min(s, THREE_SHOT_CAP);
  }

  if (channel === "carte" && merchantCadence !== null && merchantCadence < BUSY_MERCHANT_DAYS) {
    s = Math.min(s, BUSY_MERCHANT_CAP);
  }

  return Math.max(0, Math.min(100, Math.round(s)));
}

function stdevOf(a) {
  if (a.length < 2) return 0;
  const mean = a.reduce((x, y) => x + y, 0) / a.length;
  return Math.sqrt(a.reduce((acc, v) => acc + (v - mean) ** 2, 0) / a.length);
}

export const confidenceOf = (s) => (s >= SURE ? "sure" : s >= MAYBE ? "maybe" : "weak");

// Récurrent mais non résiliable : ce n'est pas un abonnement, ça n'a rien à faire
// dans le total qu'on cherche à faire baisser.
const CHARGE_WORDS =
  /\b(LOYER|SCI|SYNDIC|COPRO|IMPOT|IMPOTS|DGFIP|TRESOR|FISC|URSSAF|TAXE|PRET|CREDIT|EMPRUNT|ECHEANCE|PENSION|ASSURANCE|MUTUELLE|MAIF|MACIF|MAAF|MATMUT|AXA|ALLIANZ|EDF|ENGIE|GDF|TOTALENERGIES|GAZ|ELECTRICITE|VEOLIA|SUEZ|EAU|CAF|CPAM)\b/;

/**
 * Trois familles. Un paiement carte qui n'est pas ancré sur une date du mois est une
 * habitude de consommation (les courses, le café), pas un abonnement.
 */
export function category({ norm, channel, rhythm, exact = false }) {
  if (channel === "vir") return "virement";
  if (CHARGE_WORDS.test(norm)) return "charge";
  // Un montant répété au centime et calé sur une date suffit à trancher, quel que soit
  // le canal : Prime Video et Uber One se paient par carte.
  const anchored = rhythm && rhythm.anchor <= 3;
  if (channel === "carte" && !anchored && !exact) return "depense";
  return "abonnement";
}

// Les libellés des catégories vivent dans src/lib/i18n.js (clé `cat`).
