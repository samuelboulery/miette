// node --test src/lib/i18n.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { AVAILABLE, STRINGS, detectLocale, formatters, t } from "./i18n.js";

/** Chemins de toutes les feuilles d'un dictionnaire, pour comparer les deux langues. */
function keyPaths(obj, prefix = "") {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) out.push(...keyPaths(v, path));
    else out.push(path);
  }
  return out.sort();
}

/** Toutes les valeurs affichables, fonctions appelées avec des arguments d'exemple. */
function renderedValues(obj) {
  const out = [];
  const walk = (v) => {
    if (typeof v === "string") out.push(v);
    else if (typeof v === "function") out.push(String(v(2, "x", 3, "y", 5)));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(obj);
  return out;
}

test("les deux dictionnaires ont exactement les mêmes clés", () => {
  const fr = keyPaths(STRINGS.fr);
  const en = keyPaths(STRINGS.en);
  const manquantEn = fr.filter((k) => !en.includes(k));
  const manquantFr = en.filter((k) => !fr.includes(k));
  assert.deepEqual(manquantEn, [], `absentes de l'anglais : ${manquantEn.join(", ")}`);
  assert.deepEqual(manquantFr, [], `absentes du français : ${manquantFr.join(", ")}`);
});

test("aucun tiret cadratin nulle part", () => {
  for (const lang of AVAILABLE) {
    for (const v of renderedValues(STRINGS[lang])) {
      assert.ok(!v.includes("—"), `tiret cadratin en ${lang} : ${v}`);
      assert.ok(!v.includes("–"), `tiret demi-cadratin en ${lang} : ${v}`);
    }
  }
});

test("aucune chaîne vide", () => {
  for (const lang of AVAILABLE) {
    for (const v of renderedValues(STRINGS[lang])) {
      assert.ok(v.trim().length > 0, `chaîne vide en ${lang}`);
    }
  }
});

test("detectLocale — mémorisé, puis navigateur, puis anglais", () => {
  assert.equal(detectLocale({ navigatorLanguages: ["fr-FR", "en-US"] }), "fr");
  assert.equal(detectLocale({ navigatorLanguages: ["fr-CA"] }), "fr");
  assert.equal(detectLocale({ navigatorLanguages: ["en-US"] }), "en");
  assert.equal(detectLocale({ navigatorLanguages: ["de-DE"] }), "en");
  // Une langue inconnue en tête ne masque pas une langue connue derrière.
  assert.equal(detectLocale({ navigatorLanguages: ["de-DE", "fr"] }), "fr");
  // Le choix mémorisé l'emporte sur le navigateur.
  assert.equal(detectLocale({ stored: "en", navigatorLanguages: ["fr-FR"] }), "en");
  assert.equal(detectLocale({ stored: "fr", navigatorLanguages: ["en-US"] }), "fr");
  // Une valeur mémorisée farfelue est ignorée.
  assert.equal(detectLocale({ stored: "xx", navigatorLanguages: ["fr-FR"] }), "fr");
  assert.equal(detectLocale({}), "en");
});

test("formatters — montants et dates suivent la langue", () => {
  const fr = formatters("fr");
  const en = formatters("en");
  // Espace insécable et virgule décimale d'un côté, virgule de milliers de l'autre.
  assert.match(fr.money(1234.56), /1\s?234,56/);
  assert.match(en.money(1234.56), /1,234\.56/);
  assert.equal(fr.date(new Date("2026-03-05")), "05/03/2026");
  assert.equal(en.date(new Date("2026-03-05")), "05/03/2026"); // en-GB : jour d'abord
  assert.equal(t("fr").locale, "fr-FR");
  assert.equal(t("xx").locale, "en-GB"); // repli
});
