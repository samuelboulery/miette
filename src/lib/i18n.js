// Deux langues, deux dictionnaires, aucune dépendance.
//
// Les chaînes fixes sont des chaînes, les chaînes construites sont des fonctions qui
// reçoivent leurs variables : l'anglais peut ordonner ses mots autrement et gérer ses
// pluriels sans qu'on bricole des marques d'accord côté français.
//
// Règle de rédaction : aucun tiret cadratin. Deux-points, virgule ou point.

const s = (n) => (n > 1 ? "s" : "");

export const STRINGS = {
  fr: {
    locale: "fr-FR",
    langName: "Français",
    docTitle: "Miette : vos abonnements sur douze mois",

    // En-tête
    badgeLocal: "100 % local",
    stepImport: "Étape 01 : import",
    stepMap: "Étape 02 : colonnes",
    stepResult: "Étape 03 : le total",
    newFile: "Nouveau fichier",
    toDark: "Passer en sombre",
    toLight: "Passer en clair",

    // Accueil
    heroKicker: "Ce qui tombe de la table",
    heroTitle: "Personne ne compte les miettes.",
    heroBody:
      "11,99 par-ci, 4,49 par-là. Prises une par une, elles ne pèsent rien. Ramassées sur douze mois, elles pèsent. Miette les ramasse pour vous.",
    gloss: "miette (n. f.) : petit fragment qui tombe et qu'on ne ramasse pas",
    dropTitle: "Glissez votre relevé ici",
    dropBody:
      "Le CSV de n'importe quelle banque. Séparateur, accents Windows, virgules décimales : Miette se débrouille.",
    btnChoose: "Choisir un fichier",
    btnDemo: "Essayer avec un exemple",
    privacyTitle: "Ce que Miette ne fait pas",
    privacyBody:
      "Aucun compte, aucun serveur, aucune connexion bancaire, aucun cookie. Le fichier est lu dans votre navigateur et n'en sort pas. Fermez l'onglet, tout disparaît.",
    steps: [
      ["01", "Lecture", "Vous vérifiez les colonnes date, libellé et montant."],
      ["02", "Détection", "Miette nettoie les libellés, regroupe les montants, mesure les intervalles."],
      ["03", "Le total", "Un chiffre, puis le détail ligne par ligne."],
    ],

    // Écran des colonnes
    mapSection: "Lecture",
    mapTitle: "Vérifions les colonnes",
    mapIntro: (file, meta) =>
      `${file} : ${meta}. Les colonnes ci-dessous sont pré-remplies par détection, corrigez-les si un chiffre vous semble faux.`,
    metaRows: (n) => `${n} ligne${s(n)}`,
    metaDelim: (d) => `séparateur « ${d} »`,
    metaSkippedHeader: (n) => `${n} ligne${s(n)} d'en-tête sautée${s(n)}`,
    mapping: "Correspondance",
    colDate: "Date",
    colLabel: "Libellé",
    colAmount: "Montant",
    optSingle: "Une colonne",
    optSplit: "Débit et crédit séparés",
    colAmountPick: "Colonne montant",
    colDebitCredit: "Débit puis crédit",
    statRows: "Lignes lues",
    statPeriod: "Période",
    statDebits: "Débits",
    statSkipped: "Lignes ignorées",
    skippedWarn:
      "Ces lignes n'ont pas de date ou de montant lisible, elles sont écartées de l'analyse.",
    skippedLine: (line, text) => `ligne ${line} · ${text}`,
    rawRows: "Lignes brutes",
    thNorm: "Libellé normalisé",
    expandAll: (n) => `Tout voir (${n})`,
    collapse: "Réduire",
    shownPreview: (shown, total) => `Aperçu de ${shown} lignes sur ${total}`,
    shownAll: (n) => `${n} ligne${s(n)}`,
    shownNone: "Aucune ligne exploitable",
    btnChangeFile: "Changer de fichier",
    btnAnalyse: "C'est bon, cherchez les miettes",

    // Résultats
    resultKicker: "Voilà ce que pèsent les miettes",
    headlineSub: (monthly, n) =>
      `Soit ${monthly} par mois, répartis sur ${n} abonnement${s(n)} détecté${s(n)} dans ce relevé.`,
    headlineNone:
      "Aucun abonnement net dans ce relevé. Regardez les charges fixes et les détections incertaines plus bas.",
    kpiMonthly: "Par mois",
    kpiActive: "Abonnements actifs",
    kpiStopped: "Arrêtés en route",
    btnBackToMap: "Revoir les colonnes",
    stoppedTitle: "Ça s'est arrêté",
    stoppedOne: (m, d) => `Un prélèvement s'est arrêté : ${m}, plus rien depuis ${d} jours.`,
    stoppedMany: (n) => `${n} prélèvements se sont arrêtés en cours de route.`,
    stoppedBody:
      "Ces lignes sont grisées plus bas et ne comptent pas dans le total. Soit c'est résilié, soit le prélèvement a été rejeté.",
    badgeStopped: "Arrêté ?",
    detailTitle: "Le détail",
    detailBody: "Trié par coût annuel. Cliquez une ligne pour voir l'historique des prélèvements.",
    thMerchant: "Marchand",
    thFreq: "Fréquence",
    thAnnual: "Coût annuel",
    thLast: "Dernier",
    lastStopped: (date, d) => `${date}, il y a ${d} j`,
    totalYearly: "Total annuel, arrêtés exclus",
    chargesTitle: "Charges fixes",
    chargesIntro: (n) =>
      `${n} charge${s(n)} fixe${s(n)} : loyer, impôts, crédit, assurance, énergie. Ça revient tous les mois, mais ça ne se résilie pas. Hors du total du haut.`,
    totalCharges: "Total des charges fixes",
    maybeTitle: "Pas sûr",
    maybeIntro: (n) =>
      `${n} détection${s(n)} incertaine${s(n)} : montant qui bouge, rythme irrégulier ou trop peu d'occurrences.`,
    maybeShow: (n) => (n > 1 ? `Afficher les ${n} détections à valider` : "Afficher la détection à valider"),
    maybeHide: (n) => (n > 1 ? `Masquer les ${n} détections à valider` : "Masquer la détection à valider"),
    btnKeep: "Garder",
    btnTrash: "Jeter",
    perYear: (amount) => `${amount} / an`,
    spendingTitle: "Où part votre argent",
    spendingIntro: (months) =>
      `Les postes qui reviennent, abonnement ou non, projetés sur douze mois à partir des ${months} mois du relevé. C'est une estimation, pas une prévision.`,
    spendingFoot: (recurring, days, count, total) =>
      `${recurring} dépensés sur ${days} jours chez ${count} marchands revus au moins deux fois, sur ${total} de débits au total.`,
    thPost: "Poste",
    thRhythm: "Rythme",
    thAverage: "Panier moyen",
    thSpent: "Dépensé",
    thTwelve: "Sur 12 mois",
    badgeMiddleman: "marchand non identifiable",
    timesCount: (n) => `${n} fois`,
    spendingTotal: "Toutes dépenses confondues, projetées sur 12 mois",
    othersTitle: "Pas des abonnements",
    othersIntro: (n) =>
      n > 1
        ? `${n} lignes reviennent sans avoir l'allure d'un abonnement : paiements par carte non calés sur une date du mois, ou virements.`
        : "Une ligne revient sans avoir l'allure d'un abonnement : paiement par carte non calé sur une date du mois, ou virement.",
    footerNote: (n) =>
      `Analyse faite sur ${n} lignes, entièrement dans ce navigateur. Rien n'a été envoyé.`,
    btnAnalyseAnother: "Analyser un autre relevé",

    // Panneau de détail
    btnClose: "Fermer",
    drawerAnnual: "Coût annuel",
    drawerMedian: "Montant médian",
    drawerSeen: "Ce que Miette a vu",
    drawerKey: (k) => `clé : ${k}`,
    drawerHistory: (n) => `Historique : ${n} prélèvement${s(n)}`,
    gapDays: (n) => `+ ${n} jour${s(n)}`,
    firstSeen: "première occurrence vue",

    // Catégories
    cat: {
      abonnement: "Abonnement",
      charge: "Charge fixe",
      depense: "Dépense régulière",
      virement: "Virement",
    },

    // Fréquences
    freq: {
      1: "Mensuel",
      2: "Tous les 2 mois",
      3: "Trimestriel",
      4: "Tous les 4 mois",
      6: "Semestriel",
      12: "Annuel",
      other: (n) => `Tous les ${n} mois`,
    },

    // Rythme de dépense
    cad: {
      once: "une seule fois",
      almostDaily: "presque tous les jours",
      every2Days: "tous les 2 jours",
      everyNDays: (n) => `tous les ${n} jours`,
      every2Weeks: "toutes les 2 semaines",
      every3Weeks: "toutes les 3 semaines",
      monthly: "une fois par mois",
      everyNMonths: (n) => `tous les ${n} mois`,
    },

    // Explication du panneau de détail
    anchorFixed: "toujours à la même date",
    anchorNear: (j) => `date stable à ${j} jour${s(j)} près`,
    everyMonth: "tous les mois",
    everyNMonths: (n) => `tous les ${n} mois`,
    explainBase: (count, unit, regularity, anchor, score) =>
      `${count} prélèvements ${unit}, régularité ${regularity} %, ${anchor}. Score de récurrence ${score}/100.`,
    explainMissed: (n) => ` ${n} échéance${s(n)} manquante${s(n)} dans la série.`,
    explainPrice: (from, to) =>
      ` Le prix est passé de ${from} à ${to}, le coût annuel se base sur le tarif courant.`,
    explainStopped: (d) =>
      ` Rien depuis ${d} jours, soit plus de deux périodes : sans doute résilié.`,

    // Raisons d'une détection incertaine
    reasonIrregular: "rythme irrégulier",
    reasonFewOcc: (n) => `${n} occurrences seulement`,
    reasonWanders: "date qui se promène",
    reasonMissed: (n) => `${n} échéance${s(n)} manquée${s(n)}`,
    reasonToConfirm: "à confirmer",
    reasonSep: " · ",
  },

  en: {
    locale: "en-GB",
    langName: "English",
    docTitle: "Miette: your subscriptions over twelve months",

    badgeLocal: "100% local",
    stepImport: "Step 01: import",
    stepMap: "Step 02: columns",
    stepResult: "Step 03: the total",
    newFile: "New file",
    toDark: "Switch to dark",
    toLight: "Switch to light",

    heroKicker: "What falls off the table",
    heroTitle: "Nobody counts the crumbs.",
    heroBody:
      "€11.99 here, €4.49 there. One at a time they weigh nothing. Gathered over twelve months, they weigh. Miette gathers them for you.",
    gloss: "miette (n.) : a crumb, the small piece that falls and goes unnoticed",
    dropTitle: "Drop your statement here",
    dropBody:
      "A CSV from any bank. Separators, Windows accents, decimal commas: Miette works them out.",
    btnChoose: "Choose a file",
    btnDemo: "Try it with a sample",
    privacyTitle: "What Miette does not do",
    privacyBody:
      "No account, no server, no bank connection, no cookies. The file is read in your browser and never leaves it. Close the tab and everything is gone.",
    steps: [
      ["01", "Read", "You check the date, label and amount columns."],
      ["02", "Detect", "Miette cleans up labels, groups amounts, measures the gaps."],
      ["03", "The total", "One number, then the detail line by line."],
    ],

    mapSection: "Read",
    mapTitle: "Let us check the columns",
    mapIntro: (file, meta) =>
      `${file}: ${meta}. The columns below were filled in by detection, correct them if a number looks wrong.`,
    metaRows: (n) => `${n} row${s(n)}`,
    metaDelim: (d) => `separator "${d}"`,
    metaSkippedHeader: (n) => `${n} header row${s(n)} skipped`,
    mapping: "Column mapping",
    colDate: "Date",
    colLabel: "Label",
    colAmount: "Amount",
    optSingle: "One column",
    optSplit: "Separate debit and credit",
    colAmountPick: "Amount column",
    colDebitCredit: "Debit then credit",
    statRows: "Rows read",
    statPeriod: "Period",
    statDebits: "Debits",
    statSkipped: "Rows skipped",
    skippedWarn: "These rows have no readable date or amount, they are left out of the analysis.",
    skippedLine: (line, text) => `row ${line} · ${text}`,
    rawRows: "Raw rows",
    thNorm: "Cleaned label",
    expandAll: (n) => `Show all (${n})`,
    collapse: "Collapse",
    shownPreview: (shown, total) => `Showing ${shown} of ${total} rows`,
    shownAll: (n) => `${n} row${s(n)}`,
    shownNone: "No usable rows",
    btnChangeFile: "Change file",
    btnAnalyse: "Looks right, find the crumbs",

    resultKicker: "This is what the crumbs weigh",
    headlineSub: (monthly, n) =>
      `That is ${monthly} a month, across ${n} subscription${s(n)} found in this statement.`,
    headlineNone:
      "No clear subscription in this statement. Have a look at the fixed costs and the uncertain matches below.",
    kpiMonthly: "Per month",
    kpiActive: "Active subscriptions",
    kpiStopped: "Stopped along the way",
    btnBackToMap: "Back to columns",
    stoppedTitle: "These stopped",
    stoppedOne: (m, d) => `One payment stopped: ${m}, nothing for ${d} days.`,
    stoppedMany: (n) => `${n} payments stopped along the way.`,
    stoppedBody:
      "These rows are greyed out below and left out of the total. Either you cancelled, or the payment bounced.",
    badgeStopped: "Stopped?",
    detailTitle: "The detail",
    detailBody: "Sorted by yearly cost. Click a row to see the payment history.",
    thMerchant: "Merchant",
    thFreq: "Frequency",
    thAnnual: "Yearly cost",
    thLast: "Last seen",
    lastStopped: (date, d) => `${date}, ${d} days ago`,
    totalYearly: "Yearly total, stopped ones excluded",
    chargesTitle: "Fixed costs",
    chargesIntro: (n) =>
      `${n} fixed cost${s(n)}: rent, taxes, loan, insurance, utilities. They come back every month, but you cannot cancel them. Kept out of the total above.`,
    totalCharges: "Fixed costs total",
    maybeTitle: "Not sure",
    maybeIntro: (n) =>
      `${n} uncertain match${n > 1 ? "es" : ""}: the amount moves, the rhythm wanders, or there are too few occurrences.`,
    maybeShow: (n) => (n > 1 ? `Show the ${n} matches to review` : "Show the match to review"),
    maybeHide: (n) => (n > 1 ? `Hide the ${n} matches to review` : "Hide the match to review"),
    btnKeep: "Keep",
    btnTrash: "Discard",
    perYear: (amount) => `${amount} / year`,
    spendingTitle: "Where your money goes",
    spendingIntro: (months) =>
      `The places that come back, subscription or not, projected over twelve months from the ${months} months in this statement. An estimate, not a forecast.`,
    spendingFoot: (recurring, days, count, total) =>
      `${recurring} spent over ${days} days at ${count} merchants seen at least twice, out of ${total} in debits overall.`,
    thPost: "Where",
    thRhythm: "Rhythm",
    thAverage: "Average spend",
    thSpent: "Spent",
    thTwelve: "Over 12 months",
    badgeMiddleman: "merchant not identifiable",
    timesCount: (n) => `${n} time${s(n)}`,
    spendingTotal: "All spending, projected over 12 months",
    othersTitle: "Not subscriptions",
    othersIntro: (n) =>
      n > 1
        ? `${n} rows come back without looking like a subscription: card payments not tied to a date in the month, or transfers.`
        : "One row comes back without looking like a subscription: a card payment not tied to a date in the month, or a transfer.",
    footerNote: (n) => `Analysed ${n} rows, entirely in this browser. Nothing was sent anywhere.`,
    btnAnalyseAnother: "Analyse another statement",

    btnClose: "Close",
    drawerAnnual: "Yearly cost",
    drawerMedian: "Median amount",
    drawerSeen: "What Miette saw",
    drawerKey: (k) => `key: ${k}`,
    drawerHistory: (n) => `History: ${n} payment${s(n)}`,
    gapDays: (n) => `+ ${n} day${s(n)}`,
    firstSeen: "first one seen",

    cat: {
      abonnement: "Subscription",
      charge: "Fixed cost",
      depense: "Regular spending",
      virement: "Transfer",
    },

    freq: {
      1: "Monthly",
      2: "Every 2 months",
      3: "Quarterly",
      4: "Every 4 months",
      6: "Twice a year",
      12: "Yearly",
      other: (n) => `Every ${n} months`,
    },

    cad: {
      once: "once only",
      almostDaily: "almost every day",
      every2Days: "every 2 days",
      everyNDays: (n) => `every ${n} days`,
      every2Weeks: "every 2 weeks",
      every3Weeks: "every 3 weeks",
      monthly: "once a month",
      everyNMonths: (n) => `every ${n} months`,
    },

    anchorFixed: "always on the same date",
    anchorNear: (j) => `date steady to within ${j} day${s(j)}`,
    everyMonth: "every month",
    everyNMonths: (n) => `every ${n} months`,
    explainBase: (count, unit, regularity, anchor, score) =>
      `${count} payments ${unit}, ${regularity} % regular, ${anchor}. Recurrence score ${score}/100.`,
    explainMissed: (n) => ` ${n} missed instalment${s(n)} in the series.`,
    explainPrice: (from, to) =>
      ` The price went from ${from} to ${to}, the yearly cost uses the current one.`,
    explainStopped: (d) => ` Nothing for ${d} days, more than two periods: probably cancelled.`,

    reasonIrregular: "irregular rhythm",
    reasonFewOcc: (n) => `only ${n} occurrences`,
    reasonWanders: "the date wanders",
    reasonMissed: (n) => `${n} missed instalment${s(n)}`,
    reasonToConfirm: "to confirm",
    reasonSep: " · ",
  },
};

export const DEFAULT_LOCALE = "en";
export const AVAILABLE = ["fr", "en"];

/** Choix mémorisé, sinon langue du navigateur, sinon anglais. */
export function detectLocale({ stored = null, navigatorLanguages = [] } = {}) {
  if (stored && AVAILABLE.includes(stored)) return stored;
  for (const tag of navigatorLanguages) {
    const base = String(tag).toLowerCase().split("-")[0];
    if (AVAILABLE.includes(base)) return base;
  }
  return DEFAULT_LOCALE;
}

export const t = (lang) => STRINGS[lang] || STRINGS[DEFAULT_LOCALE];

/** Formateurs de montants et de dates accordés à la langue. La devise reste l'euro. */
export function formatters(lang) {
  const loc = t(lang).locale;
  const money = new Intl.NumberFormat(loc, { style: "currency", currency: "EUR" });
  const money0 = new Intl.NumberFormat(loc, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
  return {
    money: (n) => money.format(n),
    money0: (n) => money0.format(n),
    date: (d) => d.toLocaleDateString(loc),
    dateShort: (ms) => new Date(ms).toLocaleDateString(loc, { day: "2-digit", month: "short" }),
    num: (n) => n.toLocaleString(loc),
  };
}
