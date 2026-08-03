// node --test src/lib/recurrence.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { score } from "./classify.js";
import { detect } from "./detect.js";
import { normalizeLabel, extractChannel } from "./parse.js";
import {
  circularAnchor,
  exactSeries,
  monthsApart,
  plateaus,
  rhythm,
  stepFromDays,
} from "./recurrence.js";

const D = (iso) => new Date(iso);

/** n occurrences mensuelles à partir de `start`, même quantième. */
function monthly(start, n, amt, { label = "TRUC", channel = "prlv", step = 1 } = {}) {
  return Array.from({ length: n }, (_, i) => {
    const d = D(start);
    d.setMonth(d.getMonth() + i * step);
    return { d, label, norm: label, channel, amt: -amt };
  });
}

// ── Arithmétique calendaire ───────────────────────────────────────────────────

test("monthsApart — quantièmes de fin de mois et années bissextiles", () => {
  assert.equal(monthsApart(D("2026-01-31"), D("2026-02-28")), 1);
  assert.equal(monthsApart(D("2026-02-28"), D("2026-03-31")), 1);
  assert.equal(monthsApart(D("2026-01-31"), D("2026-03-31")), 2);
  assert.equal(monthsApart(D("2026-01-05"), D("2026-03-05")), 2);
  assert.equal(monthsApart(D("2026-01-15"), D("2026-02-14")), 1);
  // 29 février 2024 → 28 février 2025 : un abonnement annuel, pas onze mois.
  assert.equal(monthsApart(D("2024-02-29"), D("2025-02-28")), 12);
  // Prélèvement du 30/01 glissé au 02/03 : février est court, une seule échéance.
  assert.equal(monthsApart(D("2026-01-30"), D("2026-03-02")), 1);
});

test("stepFromDays — un pas déduit des jours, pas des frontières de mois", () => {
  assert.equal(stepFromDays(D("2026-01-31"), D("2026-02-28")), 1);
  // Aucune frontière de mois franchie, pourtant une échéance s'est écoulée.
  assert.equal(stepFromDays(D("2026-03-02"), D("2026-03-31")), 1);
  assert.equal(stepFromDays(D("2026-01-05"), D("2026-03-05")), 2);
  assert.equal(stepFromDays(D("2024-02-29"), D("2025-02-28")), 12);
  assert.equal(stepFromDays(D("2026-01-15"), D("2026-04-15")), 3);
});

test("circularAnchor — le 31 et le 1er sont voisins, pas opposés", () => {
  // Quantième instable (31, 28, 31) mais collé à la fin du mois.
  assert.ok(circularAnchor([D("2026-01-31"), D("2026-02-28"), D("2026-03-31")]) <= 1);
  // Quantième stable. Pas exactement 0 : le 5 d'un mois de 28 jours et celui d'un mois
  // de 31 ne tombent pas sur la même phase, l'écart résiduel est de l'ordre du dixième
  // de jour.
  assert.ok(circularAnchor([D("2026-01-05"), D("2026-02-05"), D("2026-03-05")]) <= 1);
  // Prélèvement « autour du 1er » qui bascule d'un mois sur l'autre : reconnu ancré.
  const autourDuPremier = [
    D("2026-01-31"), D("2026-03-02"), D("2026-03-31"),
    D("2026-05-02"), D("2026-06-01"), D("2026-07-01"),
  ];
  assert.ok(circularAnchor(autourDuPremier) <= 3, "doit être reconnu ancré");
  // Date qui se promène pour de bon.
  assert.ok(circularAnchor([D("2026-01-03"), D("2026-02-17"), D("2026-03-28")]) > 5);
});

test("exactSeries — isole un abonnement noyé dans des achats à l'unité", () => {
  // Apple.com : 4,49 € tous les mois, plus deux achats ponctuels.
  const occ = [
    ...[0, 1, 2, 3, 4, 5, 6].map((i) => {
      const d = D("2026-01-04");
      d.setMonth(d.getMonth() + i);
      return { d, amt: -4.49 };
    }),
    { d: D("2026-04-21"), amt: -59.99 },
    { d: D("2026-07-27"), amt: -11.99 },
  ];
  const { series, rest } = exactSeries(occ);
  assert.equal(series.length, 1);
  assert.equal(series[0].length, 7);
  assert.equal(rest.length, 2);
});

test("rhythm — pas dominant, trous comptés au lieu de casser le rythme", () => {
  const net = rhythm([D("2026-01-05"), D("2026-02-05"), D("2026-03-05")]);
  assert.equal(net.unit, "month");
  assert.equal(net.step, 1);
  assert.equal(net.step, 1);
  assert.equal(net.perYear, 12);
  assert.equal(net.regularity, 1);
  assert.equal(net.missed, 0);

  // Mars manquant : le mode reste 1, le trou est compté.
  const trou = rhythm([D("2026-01-05"), D("2026-02-05"), D("2026-04-05"), D("2026-05-05")]);
  assert.equal(trou.step, 1);
  assert.equal(trou.step, 1);
  assert.equal(trou.missed, 1);

  assert.equal(rhythm([D("2026-01-15"), D("2026-04-15"), D("2026-07-15")]).step, 3);
  assert.equal(rhythm([D("2026-01-20"), D("2027-01-20")]).step, 12);
});

test("rhythm — rien sous le mois : ce n'est pas un abonnement", () => {
  // Quatre passages hebdomadaires ne sont pas un abonnement à 52 échéances par an.
  assert.equal(rhythm([D("2026-01-05"), D("2026-01-12"), D("2026-01-19"), D("2026-01-26")]), null);
  // Trois sorties au bar en dix jours non plus.
  assert.equal(rhythm([D("2026-01-05"), D("2026-01-10"), D("2026-01-15")]), null);
});

// ── Paliers de montant ────────────────────────────────────────────────────────

test("plateaus — un montant qui varie en continu reste d'un seul tenant", () => {
  const edf = [89.4, 112.3, 74.9, 68.2, 95.1, 101.7].map((a, i) =>
    monthly("2026-01-15", 1, a)[0] && { ...monthly("2026-01-15", 1, a)[0], d: (() => {
      const d = D("2026-01-15");
      d.setMonth(d.getMonth() + i);
      return d;
    })() },
  );
  const p = plateaus(edf);
  assert.equal(p.relation, "single");
  assert.equal(p.groups.length, 1);
  assert.ok(p.ratio < 1.25);
});

test("plateaus — hausse de prix = successif, deux abonnements = entrelacé", () => {
  const orange = [...monthly("2026-01-07", 4, 19.99), ...monthly("2026-05-07", 4, 26.99)];
  assert.equal(plateaus(orange).relation, "successive");

  const icloud = [...monthly("2026-01-16", 6, 2.99), ...monthly("2026-01-20", 6, 29.99)];
  assert.equal(plateaus(icloud).relation, "interleaved");
});

// ── Clé marchand et canal ─────────────────────────────────────────────────────

test("normalizeLabel — les références de mandat ne font plus diverger la clé", () => {
  assert.equal(normalizeLabel("PRLV SEPA SPOTIFY P2A31X"), "SPOTIFY");
  assert.equal(normalizeLabel("PRLV SEPA OVH HOSTING ABC123"), "OVH HOSTING");
  assert.equal(normalizeLabel("PRLV SEPA LOYER SCI BELLECOUR 20260112"), "LOYER SCI BELLECOUR");
  assert.equal(normalizeLabel("PRLV SEPA DGFIP IMPOT REVENU T1"), "DGFIP IMPOT REVENU");
  assert.equal(normalizeLabel("ABONNEMENT NAVIGO SEPTEMBRE"), "ABONNEMENT NAVIGO");
});

test("extractChannel — canal lu sur le libellé brut", () => {
  assert.equal(extractChannel("PRLV SEPA SPOTIFY 8842103"), "prlv");
  assert.equal(extractChannel("CARTE 0202 MONOPRIX LYON 3"), "carte");
  assert.equal(extractChannel("ACHAT CB AMAZON EU"), "carte");
  assert.equal(extractChannel("VIR SALAIRE ATELIER NOVA"), "vir");
  assert.equal(extractChannel("RETRAIT DAB LYON"), "autre");
  // Un virement SEPA reste un virement : « VIR » l'emporte sur « SEPA ».
  assert.equal(extractChannel("VIR SEPA EPARGNE LIVRET A"), "vir");
  assert.equal(extractChannel("PRLV SEPA SPOTIFY"), "prlv");
});

// ── Les six défaillances ──────────────────────────────────────────────────────

test("défaillance 1 — EDF à montant variable : un seul abonnement, sûr", () => {
  const amts = [89.4, 112.3, 74.9, 68.2, 95.1, 101.7];
  const txs = amts.map((a, i) => {
    const d = D("2026-01-15");
    d.setMonth(d.getMonth() + i);
    return { d, label: "PRLV SEPA EDF", norm: "EDF", channel: "prlv", amt: -a };
  });
  const found = detect(txs);
  assert.equal(found.length, 1);
  assert.equal(found[0].count, 6);
  assert.equal(found[0].freqStep, 1);
  assert.equal(found[0].confidence, "sure");
  // Médiane 92,25 € × 12 — un seul coût annuel, pas deux séries additionnées.
  assert.ok(Math.abs(found[0].annual - 92.25 * 12) < 1);
});

test("défaillance 2 — un mois sauté ne dégrade plus la confiance", () => {
  const dates = ["2026-01-10", "2026-02-10", "2026-04-10", "2026-05-10", "2026-06-10"];
  const txs = dates.map((s) => ({
    d: D(s),
    label: "PRLV SEPA NETFLIX",
    norm: "NETFLIX",
    channel: "prlv",
    amt: -13.49,
  }));
  const [c] = detect(txs);
  assert.equal(c.freqStep, 1);
  assert.equal(c.rhythm.missed, 1);
  assert.equal(c.confidence, "sure");
});

test("défaillance 3 — deux passages en carte ne font pas un abonnement", () => {
  const txs = [
    { d: D("2026-01-15"), label: "CARTE MONOPRIX", norm: "MONOPRIX LYON", channel: "carte", amt: -51.2 },
    { d: D("2026-02-14"), label: "CARTE MONOPRIX", norm: "MONOPRIX LYON", channel: "carte", amt: -54.9 },
  ];
  const [c] = detect(txs);
  assert.equal(c.confidence, "weak");
  assert.ok(c.score <= 30);
});

test("défaillance 4 — une hausse de prix reste un seul abonnement", () => {
  const txs = [...monthly("2026-01-07", 4, 19.99, { label: "ORANGE" }), ...monthly("2026-05-07", 4, 26.99, { label: "ORANGE" })];
  const found = detect(txs);
  assert.equal(found.length, 1);
  assert.equal(found[0].count, 8);
  assert.equal(found[0].confidence, "sure");
  // Le coût annuel se base sur le tarif courant, pas sur la médiane des deux paliers.
  assert.ok(Math.abs(found[0].annual - 26.99 * 12) < 0.01);
  assert.equal(found[0].priceChange.from, 19.99);
  assert.equal(found[0].priceChange.to, 26.99);
});

test("défaillance 4 bis — deux abonnements parallèles restent séparés", () => {
  const txs = [
    ...monthly("2026-01-16", 6, 2.99, { label: "APPLE" }),
    ...monthly("2026-01-20", 6, 29.99, { label: "APPLE" }),
  ];
  const found = detect(txs);
  assert.equal(found.length, 2);
  assert.deepEqual(
    found.map((c) => c.amount),
    [29.99, 2.99],
  );
});

test("défaillance 5 — libellé qui dérive : une seule série", () => {
  const refs = ["ABC123", "DEF456", "GHI789", "JKL012", "MNO345", "PQR678"];
  const txs = refs.map((ref, i) => {
    const d = D("2026-01-03");
    d.setMonth(d.getMonth() + i);
    const label = `PRLV SEPA OVH HOSTING ${ref}`;
    return { d, label, norm: normalizeLabel(label), channel: extractChannel(label), amt: -12 };
  });
  const found = detect(txs);
  assert.equal(found.length, 1);
  assert.equal(found[0].count, 6);
  assert.equal(found[0].confidence, "sure");
});

test("défaillance 5 bis — fusion par préfixe, sans avaler un voisin plus cher", () => {
  // « FREE MOBILE » et « FREE MOBILE ABT » : même canal, même montant → fusionnés.
  const txs = [
    ...monthly("2026-01-23", 3, 19.99, { label: "FREE MOBILE" }),
    ...monthly("2026-04-23", 3, 19.99, { label: "FREE MOBILE ABT" }),
  ];
  assert.equal(detect(txs)[0].count, 6);

  // « AMAZON » et « AMAZON PRIME » : montants trop éloignés → pas de fusion.
  const amazon = [
    ...monthly("2026-01-10", 4, 5.99, { label: "AMAZON PRIME" }),
    ...monthly("2026-01-18", 4, 49.9, { label: "AMAZON" }),
  ];
  assert.equal(detect(amazon).length, 2);
});

// ── Barème ────────────────────────────────────────────────────────────────────

test("score — les quatre cas d'arbitrage", () => {
  const mensuel = { unit: "month", step: 1, regularity: 1, anchor: 0, missed: 0, expected: 6 };

  // EDF variable : le rythme porte le score, le montant ne le tue plus.
  assert.ok(
    score({ rhythm: mensuel, amounts: [89.4, 112.3, 74.9, 68.2, 95.1, 101.7], channel: "prlv", count: 6 }) >= 65,
  );
  // Deux passages en carte : plafonnés.
  assert.ok(score({ rhythm: mensuel, amounts: [51.2, 54.9], channel: "carte", count: 2 }) <= 30);
  // Assurance trimestrielle, deux occurrences en prélèvement : à valider.
  const trim = { ...mensuel, step: 3, expected: 2 };
  const s = score({ rhythm: trim, amounts: [112, 112], channel: "prlv", count: 2 });
  assert.ok(s >= 40 && s < 65, `attendu 40-64, obtenu ${s}`);
});

test("category — trois familles", () => {
  const txs = [
    ...monthly("2026-01-12", 6, 760, { label: "LOYER SCI BELLECOUR" }),
    ...monthly("2026-01-10", 6, 13.49, { label: "NETFLIX.COM" }),
  ];
  const found = detect(txs);
  assert.equal(found.find((c) => c.norm === "LOYER SCI BELLECOUR").category, "charge");
  assert.equal(found.find((c) => c.norm === "NETFLIX.COM").category, "abonnement");
});

test("dormance — plus de deux périodes sans prélèvement", () => {
  const txs = [
    ...monthly("2026-01-15", 5, 11.99, { label: "DEEZER" }),
    { d: D("2026-11-02"), label: "PRLV SEPA AUTRE", norm: "AUTRE CHOSE", channel: "prlv", amt: -12 },
  ];
  const deezer = detect(txs).find((c) => c.norm === "DEEZER");
  assert.equal(deezer.dormant, true);
});

// ── Classement des dépenses ───────────────────────────────────────────────────

test("spending — projection sur douze mois, postes récurrents seulement", async () => {
  const { spending, cadenceLabel } = await import("./spending.js");
  const D2 = (iso) => new Date(iso);
  const txs = [
    // 10 passages sur ~180 jours à 20 € = 200 € observés
    ...Array.from({ length: 10 }, (_, i) => ({
      d: new Date(D2("2026-01-01").getTime() + i * 20 * 86400000),
      label: "CARTE MONOPRIX",
      norm: "MONOPRIX",
      channel: "carte",
      amt: -20,
    })),
    // vue une seule fois : hors classement, mais comptée dans le total des débits
    { d: D2("2026-03-01"), label: "CARTE CANAPE", norm: "CANAPE", channel: "carte", amt: -900 },
    // un crédit ne doit jamais entrer dans les dépenses
    { d: D2("2026-03-02"), label: "VIR SALAIRE", norm: "SALAIRE", channel: "vir", amt: 2000 },
  ];
  const sp = spending(txs);
  assert.equal(sp.rows.length, 1);
  assert.equal(sp.rows[0].norm, "MONOPRIX");
  assert.equal(sp.rows[0].count, 10);
  assert.equal(sp.rows[0].spent, 200);
  assert.equal(sp.recurring, 200);
  assert.equal(sp.total, 1100); // le canapé compte dans les débits, pas dans le classement
  // 200 € sur 180 jours ≈ 406 € sur un an
  assert.ok(Math.abs(sp.rows[0].annual - (200 * 365) / 180) < 1);
  const { STRINGS } = await import("./i18n.js");
  assert.equal(cadenceLabel(sp.rows[0].cadence, 10, STRINGS.fr.cad), "toutes les 3 semaines");
  assert.equal(cadenceLabel(sp.rows[0].cadence, 10, STRINGS.en.cad), "every 3 weeks");
});

test("spending — les intermédiaires sont signalés", async () => {
  const { spending } = await import("./spending.js");
  const mk = (norm, i) => ({
    d: new Date(Date.parse("2026-01-05") + i * 30 * 86400000),
    label: norm,
    norm,
    channel: "prlv",
    amt: -10,
  });
  const sp = spending([mk("PAYPAL EUROPE", 0), mk("PAYPAL EUROPE", 1), mk("NETFLIX.COM", 0), mk("NETFLIX.COM", 1)]);
  assert.equal(sp.rows.find((r) => r.norm === "PAYPAL EUROPE").middleman, true);
  assert.equal(sp.rows.find((r) => r.norm === "NETFLIX.COM").middleman, false);
});
