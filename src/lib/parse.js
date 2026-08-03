import Papa from "papaparse";

// Toute cette logique est reprise de la maquette « Miette Modernist.dc.html » (l. 465-691).
// Les seuils et les expressions régulières n'ont pas été touchés.

export const EUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

/** Décode un ArrayBuffer : UTF-8, repli Windows-1252 dès qu'un caractère de remplacement apparaît. */
export function decodeBuffer(buf) {
  const utf = new TextDecoder("utf-8").decode(buf);
  if (!utf.includes("\uFFFD")) return { text: utf, encoding: "UTF-8" };
  return { text: new TextDecoder("windows-1252").decode(buf), encoding: "Windows-1252" };
}

/** Séparateur le plus probable : celui dont le nombre d'occurrences par ligne est le plus stable. */
export function pickDelimiter(lines) {
  let best = ";";
  let bestScore = -1;
  for (const d of [";", ",", "\t", "|"]) {
    const counts = lines.map((l) => l.split(d).length - 1).filter((c) => c > 0);
    if (!counts.length) continue;
    const tally = {};
    counts.forEach((c) => {
      tally[c] = (tally[c] || 0) + 1;
    });
    const mode = Object.keys(tally).reduce((a, b) => (tally[b] > tally[a] ? b : a));
    const score = tally[mode] * Number(mode);
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}

/**
 * Une ligne ressemble-t-elle à des noms de colonnes ? Une ligne de données contient
 * au moins une date ou un montant ; une ligne d'en-tête n'en contient aucun et a
 * la majorité de ses cellules remplies.
 */
function looksLikeHeader(cells) {
  const filled = cells.filter((c) => c.trim() !== "");
  if (filled.length < Math.max(2, Math.ceil(cells.length / 2))) return false;
  return filled.every((c) => !parseDate(c) && parseAmount(c) === null);
}

/** On ne cherche l'en-tête que dans les premières lignes du fichier. */
const HEADER_SCAN = 12;

/**
 * Index de la vraie ligne de colonnes.
 *
 * On cherche d'abord une ligne qui ressemble à des intitulés dans les premières lignes,
 * quel que soit son nombre de champs : certains exports déclarent cinq colonnes en
 * en-tête alors que les lignes de débit n'en écrivent que quatre, et retenir le nombre
 * de champs modal ferait passer la première transaction pour l'en-tête.
 *
 * À défaut, on retombe sur les lignes au nombre de champs modal, ce qui écarte les
 * bandeaux parasites (« Relevé de compte au 30/06/2026 »).
 */
export function findHeaderIndex(lines, delim) {
  const cells = lines.map((l) => l.split(delim));
  const counts = cells.map((c) => c.length);

  const scan = Math.min(lines.length, HEADER_SCAN);
  for (let i = 0; i < scan; i++) {
    if (counts[i] > 1 && lines[i].trim() !== "" && looksLikeHeader(cells[i])) return i;
  }

  const tally = {};
  counts.forEach((c) => {
    if (c > 1) tally[c] = (tally[c] || 0) + 1;
  });
  const keys = Object.keys(tally);
  if (!keys.length) return 0;
  const modal = Number(keys.reduce((a, b) => (tally[b] > tally[a] ? b : a)));
  for (let i = 0; i < lines.length; i++) {
    if (counts[i] === modal && lines[i].trim() !== "") return i;
  }
  return 0;
}

const noAcc = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

function guess(headers, patterns) {
  for (const p of patterns) {
    for (const h of headers) if (p.test(noAcc(h))) return h;
  }
  return null;
}

/** JJ/MM/AAAA (et .- comme séparateurs, année sur 2 ou 4 chiffres) ou AAAA-MM-JJ. */
export function parseDate(v) {
  const s = String(v ?? "").trim();
  let m = s.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    let y = Number(m[3]);
    if (y < 100) y += y < 70 ? 2000 : 1900;
    const d = new Date(y, Number(m[2]) - 1, Number(m[1]));
    return isNaN(d) ? null : d;
  }
  m = s.match(/(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d) ? null : d;
  }
  return null;
}

/** Décimale à la virgule, espaces insécables, symboles, négatif en préfixe/suffixe/parenthèses. */
export function parseAmount(v) {
  if (v == null) return null;
  let t = String(v)
    .replace(/[\s   ]/g, "")
    .replace(/[€$£]/g, "")
    .replace(/EUR/gi, "");
  if (t === "" || t === "-") return null;
  const neg = /^\(.*\)$/.test(t) || /-$/.test(t) || /^-/.test(t);
  t = t.replace(/[()]/g, "").replace(/^-/, "").replace(/-$/, "");
  if (t.includes(",") && t.includes(".")) {
    // Le dernier séparateur rencontré est le séparateur décimal.
    t = t.indexOf(",") > t.indexOf(".") ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  } else if (t.includes(",")) {
    t = t.replace(/,/g, ".");
  }
  const n = parseFloat(t);
  if (isNaN(n)) return null;
  return neg ? -Math.abs(n) : n;
}

const TOOL_WORDS =
  /\b(CARTE|PRLV|PRELEVEMENT|SEPA|VIR|VIREMENT|ACHAT|PAIEMENT|CB|DE|DU|PAR|REF|MANDAT|ECH|FACTURE)\b/g;

const MONTH_WORDS =
  /\b(JANVIER|FEVRIER|MARS|AVRIL|MAI|JUIN|JUILLET|AOUT|SEPTEMBRE|OCTOBRE|NOVEMBRE|DECEMBRE)\b/g;

/**
 * Canal de paiement, lu sur le libellé BRUT avant que `normalizeLabel` ne le jette.
 * Un prélèvement SEPA traduit une intention d'abonnement ; un paiement carte non
 * ancré sur une date du mois est une habitude de consommation.
 */
export function extractChannel(raw) {
  const s = noAcc(raw);
  // L'ordre compte : « VIR SEPA … » est un virement, pas un prélèvement.
  if (/\b(VIR|VIREMENT)\b/.test(s)) return "vir";
  if (/\b(CARTE|CB|ACHAT|PAIEMENT)\b/.test(s)) return "carte";
  if (/\b(PRLV|PRELEVEMENT|SEPA)\b/.test(s)) return "prlv";
  return "autre";
}

/**
 * Clé marchand : majuscules, accents supprimés, dates, séquences de 4+ chiffres,
 * références alphanumériques, noms de mois, trimestres et mots-outils retirés.
 */
export function normalizeLabel(raw) {
  let s = noAcc(raw);
  s = s.replace(/\d{1,2}[/.-]\d{1,2}([/.-]\d{2,4})?/g, " ");
  s = s.replace(/\d{4,}/g, " ");
  s = s.replace(TOOL_WORDS, " ");
  s = s.replace(MONTH_WORDS, " ");
  s = s.replace(/\bT[1-4]\b/g, " ");
  s = s.replace(/[^A-Z0-9+&.]+/g, " ");
  // Références de mandat : un token qui mêle lettres et chiffres n'identifie pas
  // le marchand, il change à chaque échéance (« P2A31X », « ABC123 »).
  s = s
    .split(" ")
    .filter((t) => !(t.length >= 3 && /[A-Z]/.test(t) && /\d/.test(t)))
    .join(" ");
  s = s.replace(/\b\d{1,3}\b/g, " ");
  return s.replace(/\s+/g, " ").trim();
}

/** Heuristique de repli : devine le rôle des colonnes d'après leur contenu. */
function scoreColumns(headers, rows) {
  const sample = rows.slice(0, 25);
  const s = { date: null, label: null, num: [] };
  headers.forEach((h) => {
    let dates = 0;
    let nums = 0;
    let texts = 0;
    sample.forEach((r) => {
      const v = r[h];
      if (v == null || String(v).trim() === "") return;
      if (parseDate(v)) dates++;
      else if (parseAmount(v) !== null) nums++;
      else texts++;
    });
    if (dates > sample.length * 0.5 && !s.date) s.date = h;
    else if (nums > texts && nums > 2) s.num.push(h);
    else if (texts > 2 && !s.label) s.label = h;
  });
  return s;
}

export function emptyState() {
  return {
    screen: "import",
    fileName: "",
    encoding: "",
    delim: "",
    headerLines: 0,
    headers: [],
    rows: [],
    dateCol: "",
    labelCol: "",
    mode: "single",
    amountCol: "",
    debitCol: "",
    creditCol: "",
    showAll: false,
    // Écran résultats
    decisions: {}, // key du groupe → "kept" | "trashed"
    drawerKey: null,
    showMaybe: false,
  };
}

/** Texte CSV brut → état complet de l'écran de mapping, colonnes pré-remplies. */
export function ingest(text, fileName, encoding) {
  const lines = text.split(/\r?\n/);
  const delim = pickDelimiter(lines);
  const hIdx = findHeaderIndex(lines, delim);
  const res = Papa.parse(lines.slice(hIdx).join("\n"), {
    header: true,
    delimiter: delim,
    skipEmptyLines: true,
  });
  const fields = res.meta.fields || [];
  const headers = fields.map((f, i) => (f && f.trim() !== "" ? f : `colonne ${i + 1}`));
  const rows = res.data.map((r) => {
    const o = {};
    fields.forEach((f, i) => {
      o[headers[i]] = r[f];
    });
    return o;
  });

  const byName = {
    date: guess(headers, [/^DATE/, /DATE.*(OP|VAL|COMPTA)/, /DATE/]),
    label: guess(headers, [/LIBELL/, /INTITUL/, /DESCRIPT/, /NATURE/, /OPERATION/, /MOTIF/, /^LABEL/]),
    amount: guess(headers, [/^MONTANT$/, /MONTANT/, /^AMOUNT/, /VALEUR/]),
    debit: guess(headers, [/DEBIT/, /SORTIE/, /RETRAIT/]),
    credit: guess(headers, [/CREDIT/, /ENTREE/, /DEPOT/]),
  };
  const byContent = scoreColumns(headers, rows);
  const split = !!(byName.debit && byName.credit && byName.debit !== byName.credit);

  return {
    ...emptyState(),
    screen: "map",
    fileName,
    encoding,
    delim: delim === "\t" ? "tabulation" : delim,
    headerLines: hIdx,
    headers,
    rows,
    dateCol: byName.date || byContent.date || headers[0] || "",
    labelCol: byName.label || byContent.label || headers[1] || "",
    mode: split ? "split" : "single",
    amountCol: byName.amount || byContent.num[0] || headers[headers.length - 1] || "",
    debitCol: byName.debit || byContent.num[0] || "",
    creditCol: byName.credit || byContent.num[1] || "",
  };
}

/** État de mapping → { ok: transactions exploitables, skipped: lignes écartées }. */
export function toTransactions(s) {
  const ok = [];
  const skipped = [];
  s.rows.forEach((r, i) => {
    const d = parseDate(r[s.dateCol]);
    let amt = null;
    if (s.mode === "split") {
      const deb = parseAmount(r[s.debitCol]);
      const cred = parseAmount(r[s.creditCol]);
      if (deb !== null) amt = -Math.abs(deb);
      else if (cred !== null) amt = Math.abs(cred);
    } else {
      amt = parseAmount(r[s.amountCol]);
    }
    const label = String(r[s.labelCol] ?? "").trim();
    if (!d || amt === null) {
      skipped.push({
        line: i + s.headerLines + 2,
        text:
          s.headers
            .map((h) => r[h])
            .filter((v) => v != null && String(v).trim() !== "")
            .join(" · ")
            .slice(0, 130) || "(vide)",
      });
      return;
    }
    ok.push({
      d,
      label: label || "(sans libellé)",
      norm: normalizeLabel(label),
      channel: extractChannel(label),
      amt,
    });
  });
  return { ok, skipped };
}
