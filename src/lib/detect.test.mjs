// node --test src/lib/detect.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_CSV } from "./demo.js";
import { detect, median, stdev } from "./detect.js";
import { ingest, toTransactions } from "./parse.js";

const DAY = 86400000;

/** Fabrique n prélèvements espacés de `gap` jours à partir de `start`. */
function series({ label, amount, gap, count, start = "2026-01-05", jitter = () => 0 }) {
  const t0 = new Date(start).getTime();
  return Array.from({ length: count }, (_, i) => ({
    d: new Date(t0 + (i * gap + jitter(i)) * DAY),
    label,
    norm: label,
    amt: -amount,
  }));
}

test("median / stdev", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 2, 3]), 2.5);
  assert.equal(median([]), 0);
  assert.equal(stdev([5]), 0);
  assert.equal(stdev([2, 4]), 1);
});

test("classement des fréquences : mensuel, trimestriel, annuel", () => {
  const cases = [
    { gap: 30, count: 6, step: 1, per: 12 },
    { gap: 91, count: 4, step: 3, per: 4 },
    { gap: 365, count: 3, step: 12, per: 1 },
  ];
  for (const { gap, count, step, per } of cases) {
    const [c] = detect(series({ label: "NETFLIX", amount: 10, gap, count }));
    assert.equal(c.freqStep, step);
    assert.equal(c.perYear, per);
    assert.equal(c.annual, 10 * per);
    assert.equal(c.high, true);
  }
});

test("confiance faible : trop peu d'occurrences, rythme ou montant instable", () => {
  const [few] = detect(series({ label: "SPOTIFY", amount: 12, gap: 30, count: 2 }));
  assert.equal(few.high, false);
  assert.deepEqual(few.reasons.map((r) => r.key), ["reasonFewOcc"]);

  // Vraiment irrégulier : 12, 47, 25, 63 jours. Aucun pas mensuel ne s'en dégage.
  const [wobbly] = detect(
    series({ label: "GYM", amount: 30, gap: 0, count: 5, jitter: (i) => [0, 12, 59, 84, 147][i] }),
  );
  assert.equal(wobbly.high, false);

  // À l'inverse, une série mensuelle avec UN mois sauté (30, 30, 30, 60) est
  // maintenant fiable : le trou est compté, il ne casse plus le rythme.
  const [trou] = detect(
    series({ label: "CANAL", amount: 30, gap: 30, count: 5, jitter: (i) => (i === 4 ? 30 : 0) }),
  );
  assert.equal(trou.high, true);
  assert.equal(trou.rhythm.missed, 1);
});

test("le montant sépare deux abonnements sous le même libellé", () => {
  const txs = [
    ...series({ label: "APPLE", amount: 2.99, gap: 30, count: 5 }),
    ...series({ label: "APPLE", amount: 29.99, gap: 30, count: 5 }),
  ];
  const found = detect(txs);
  assert.equal(found.length, 2);
  assert.deepEqual(
    found.map((c) => c.amount),
    [29.99, 2.99], // trié par coût annuel décroissant
  );
});

test("tolérance ±10 % : une hausse de prix reste le même abonnement", () => {
  const txs = [
    ...series({ label: "ORANGE", amount: 29.99, gap: 30, count: 3 }),
    ...series({ label: "ORANGE", amount: 31.99, gap: 30, count: 3, start: "2026-04-05" }),
  ];
  const found = detect(txs);
  assert.equal(found.length, 1);
  assert.equal(found[0].count, 6);
});

test("isDormant quand le dernier prélèvement dépasse deux périodes", () => {
  // 5 prélèvements mensuels, puis un débit isolé 90 jours après le dernier
  // pour fixer la date de référence du relevé.
  const txs = [
    ...series({ label: "CANAL", amount: 24.9, gap: 30, count: 5 }),
    { d: new Date("2026-08-01"), label: "COURSES", norm: "COURSES", amt: -12 },
  ];
  const [canal] = detect(txs).filter((c) => c.norm === "CANAL");
  assert.equal(canal.dormant, true);
  assert.ok(canal.daysSince > 60);
});

test("relevé de démonstration : abonnements attendus, salaire exclu", () => {
  const { ok } = toTransactions(ingest(DEMO_CSV, "demo.csv", "UTF-8"));
  const found = detect(ok);

  // Les crédits ne sont jamais des abonnements.
  assert.equal(
    found.some((c) => /SALAIRE/.test(c.norm)),
    false,
  );

  const loyer = found.find((c) => c.norm === "LOYER SCI BELLECOUR");
  assert.equal(loyer.freqStep, 1);
  assert.equal(loyer.count, 6);
  assert.equal(loyer.amount, 760);
  assert.equal(loyer.annual, 9120);
  assert.equal(loyer.high, true);
  assert.equal(found[0].key, loyer.key); // le plus cher en tête

  const netflix = found.find((c) => c.norm === "NETFLIX.COM");
  assert.equal(netflix.high, true);
  assert.equal(netflix.annual, 13.49 * 12);

  // Trimestriel : 2 occurrences seulement dans ce relevé → confiance faible.
  const macif = found.find((c) => c.norm === "ASSURANCE HABITATION MACIF");
  assert.equal(macif.freqStep, 3);
  assert.equal(macif.high, false);

  // Aucun abonnement dormant : le relevé s'arrête juste après le dernier prélèvement.
  assert.equal(
    found.filter((c) => c.high && c.dormant).length,
    0,
  );
});
