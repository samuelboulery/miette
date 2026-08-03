// node --test src/lib/parse.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_CSV } from "./demo.js";
import {
  findHeaderIndex,
  ingest,
  normalizeLabel,
  parseAmount,
  parseDate,
  pickDelimiter,
  toTransactions,
} from "./parse.js";

test("parseAmount — décimale à la virgule et espaces insécables", () => {
  assert.equal(parseAmount("1 234,56"), 1234.56);
  assert.equal(parseAmount("1 234,56 €"), 1234.56);
  assert.equal(parseAmount("1.234,56"), 1234.56);
  assert.equal(parseAmount("1,234.56"), 1234.56);
  assert.equal(parseAmount("12,90-"), -12.9);
  assert.equal(parseAmount("(12,90)"), -12.9);
  assert.equal(parseAmount(""), null);
});

test("parseDate — JJ/MM/AAAA sans confusion avec le format US", () => {
  const d = parseDate("03/02/2026");
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 1); // février, pas mars
  assert.equal(d.getDate(), 3);
  assert.equal(parseDate("2026-02-03").getMonth(), 1);
  assert.equal(parseDate("date illisible"), null);
});

test("normalizeLabel — dates, 4+ chiffres et mots-outils retirés", () => {
  assert.equal(normalizeLabel("PRLV SEPA NETFLIX.COM 12/01 REF 4839201"), "NETFLIX.COM");
  assert.equal(normalizeLabel("CARTE 0202 MONOPRIX LYON 3"), "MONOPRIX LYON");
  // Deux occurrences du même marchand doivent tomber sur la même clé.
  assert.equal(
    normalizeLabel("PRLV SEPA SPOTIFY AB 8842103"),
    normalizeLabel("PRLV SEPA SPOTIFY AB 8912440"),
  );
});

test("pickDelimiter / findHeaderIndex — en-têtes parasites sautés", () => {
  const lines = DEMO_CSV.split("\n");
  assert.equal(pickDelimiter(lines), ";");
  assert.equal(findHeaderIndex(lines, ";"), 3); // 3 lignes parasites avant "Date;Libelle;..."
});

test("findHeaderIndex — une ligne parasite de même largeur n'est pas prise pour l'en-tête", () => {
  const lines = [
    "BANQUE POPULAIRE - RELEVE",
    "Solde précédent;;;1 240,55", // même nombre de champs que l'en-tête
    "Date;Libelle;Debit;Credit",
    "05/01/2026;PRLV SEPA EDF 4471203;89,40;",
  ];
  assert.equal(findHeaderIndex(lines, ";"), 2);
});

test("ingest — mapping pré-rempli en mode débit/crédit séparés", () => {
  const s = ingest(DEMO_CSV, "demo.csv", "UTF-8");
  assert.equal(s.screen, "map");
  assert.equal(s.headerLines, 3);
  assert.deepEqual(s.headers, ["Date", "Libelle", "Debit", "Credit"]);
  assert.equal(s.mode, "split");
  assert.equal(s.dateCol, "Date");
  assert.equal(s.labelCol, "Libelle");
  assert.equal(s.debitCol, "Debit");
  assert.equal(s.creditCol, "Credit");
});

test("toTransactions — débits négatifs, crédits positifs, ligne corrompue écartée", () => {
  const { ok, skipped } = toTransactions(ingest(DEMO_CSV, "demo.csv", "UTF-8"));
  assert.equal(skipped.length, 1);
  assert.match(skipped[0].text, /LIGNE CORROMPUE/);
  assert.equal(ok.filter((t) => t.amt > 0).length, 2); // les deux virements de salaire
  assert.ok(ok.every((t) => t.amt !== 0));
  const spotify = ok.filter((t) => t.norm === "SPOTIFY AB");
  assert.equal(spotify.length, 6);
  assert.equal(spotify[0].amt, -11.99);
});
