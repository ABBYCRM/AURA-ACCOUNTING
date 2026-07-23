/**
 * IRS Rules — Tax Year 2026
 *
 * SINGLE SOURCE OF TRUTH for every IRS constant used by AURA Accounting.
 * Every value here was verified against irs.gov on 2026-07-23. See
 * docs/IRS_REFERENCE.md for citations and source URLs.
 *
 * DO NOT modify these constants without first re-checking the official sources.
 */

export const IRS_TY_2026 = {
  // Social Security (FICA OASDI)
  SS_RATE_EMPLOYEE: 0.062,
  SS_RATE_EMPLOYER: 0.062,
  SS_WAGE_BASE: 184_500, // https://www.irs.gov/pub/irs-prior/p15a--2026.pdf

  // Medicare (FICA HI)
  MED_RATE_EMPLOYEE: 0.0145,
  MED_RATE_EMPLOYER: 0.0145,
  MED_ADDITIONAL_RATE: 0.009,
  MED_ADDITIONAL_THRESHOLD: 200_000,

  // FUTA
  FUTA_RATE: 0.06,
  FUTA_WAGE_BASE: 7_000, // per employee per year

  // Standard deduction (from IRS newsroom TY2026 — post-OBBBA)
  STD_DEDUCTION: {
    single: 16_100,
    married: 32_200, // married filing jointly
    hoh: 24_150, // head of household
    mfs: 16_100, // married filing separately
  },

  // Information-return threshold (Public Law 119-21 / OBBBA — effective payments after 2025)
  // Was $600, now $2,000. Will be inflation-adjusted annually starting 2027.
  // https://www.irs.gov/pub/irs-prior/p1099--2026.pdf
  THRESHOLD_1099_NEC: 2_000,
  THRESHOLD_1099_MISC: 2_000,
  THRESHOLD_1099_MISC_ROYALTIES: 10, // box 2 (different rule)
  THRESHOLD_1099_MISC_ATTORNEY: 600, // box 10
  THRESHOLD_BACKUP_WITHHOLDING: 2_000,

  // 2026 Federal income tax brackets (from Working Families Tax Cuts)
  // https://www.irs.gov/newsroom/working-families-tax-cuts-individuals-and-workers
  BRACKETS_SINGLE: [
    { upTo: 12_400, rate: 0.10 },
    { upTo: 50_400, rate: 0.12 },
    { upTo: 105_700, rate: 0.22 },
    { upTo: 201_775, rate: 0.24 },
    { upTo: 256_225, rate: 0.32 },
    { upTo: 640_600, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
  BRACKETS_MFJ: [
    { upTo: 24_800, rate: 0.10 },
    { upTo: 100_800, rate: 0.12 },
    { upTo: 211_400, rate: 0.22 },
    { upTo: 403_550, rate: 0.24 },
    { upTo: 512_450, rate: 0.32 },
    { upTo: 768_700, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
  BRACKETS_HOH: [
    { upTo: 17_700, rate: 0.10 },
    { upTo: 67_450, rate: 0.12 },
    { upTo: 105_700, rate: 0.22 },
    { upTo: 201_775, rate: 0.24 },
    { upTo: 256_200, rate: 0.32 },
    { upTo: 640_600, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],

  // 2026 deposit thresholds (from Form 941 instructions)
  DEPOSIT_THRESHOLD_QUARTERLY: 2_500, // if < this, can pay with return
  DEPOSIT_NEXT_DAY_TRIGGER: 100_000, // if unpaid tax reaches this, next-day deposit

  // Filing deadlines for 2026 tax year forms (filed in 2027)
  DEADLINES: {
    W2_TO_EMPLOYEE: '2027-02-01',
    W2_TO_SSA_PAPER: '2027-02-01',
    W2_TO_SSA_EFILE: '2027-02-01',
    FORM_1099_NEC: '2027-01-31',
    FORM_1099_MISC_PAPER: '2027-02-28',
    FORM_1099_MISC_EFILE: '2027-03-31',
    FORM_941_Q1: '2027-04-30',
    FORM_941_Q2: '2027-07-31',
    FORM_941_Q3: '2027-10-31',
    FORM_941_Q4: '2028-01-31',
    FORM_940: '2027-02-01',
  },

  // Penalties (inflation-adjusted; verify in current instructions)
  PENALTIES_2026: {
    W2_LATE_30_DAYS: 60,
    W2_LATE_31_TO_AUG_1: 120,
    W2_LATE_AFTER_AUG_1: 310,
    W2_INTENTIONAL_DISREGARD: 630,
    W2_FAIL_TO_FURNISH: 340,
    FORM_1099_LATE: 340,
    FORM_1099_INTENTIONAL_DISREGARD: 680,
  },
} as const;

/**
 * 2024 brackets — kept for backward-compatibility for any W-2 generated against
 * 2024 records. Per IRS, the form year matches the tax year of the wages paid.
 */
export const IRS_TY_2024 = {
  SS_WAGE_BASE: 168_600,
  STD_DEDUCTION: { single: 14_600, married: 29_200, hoh: 21_900, mfs: 14_600 },
  THRESHOLD_1099_NEC: 600, // pre-OBBBA
  THRESHOLD_1099_MISC: 600,
  BRACKETS_SINGLE: [
    { upTo: 11_600, rate: 0.10 },
    { upTo: 47_150, rate: 0.12 },
    { upTo: 100_525, rate: 0.22 },
    { upTo: 191_950, rate: 0.24 },
    { upTo: 243_725, rate: 0.32 },
    { upTo: 609_350, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
  BRACKETS_MFJ: [
    { upTo: 23_200, rate: 0.10 },
    { upTo: 94_300, rate: 0.12 },
    { upTo: 201_050, rate: 0.22 },
    { upTo: 383_900, rate: 0.24 },
    { upTo: 487_450, rate: 0.32 },
    { upTo: 731_200, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
} as const;

/** Pick the right year's rules based on tax year */
export function rulesForYear(taxYear: number) {
  if (taxYear >= 2026) return IRS_TY_2026 as any;
  if (taxYear >= 2024) return IRS_TY_2024 as any;
  return IRS_TY_2024 as any; // fallback for legacy years
}

export type FilingStatus = 'single' | 'married' | 'hoh' | 'mfs';

/**
 * Compute federal income tax for a given taxable income, filing status, and tax year.
 * Returns the tax owed. This is a simplified schedule (ignores credits, AMT, etc.).
 */
export function computeFedIncomeTax(
  taxableIncome: number,
  filingStatus: FilingStatus,
  taxYear: number
): number {
  const rules = rulesForYear(taxYear);
  const brackets =
    filingStatus === 'married' ? rules.BRACKETS_MFJ
      : filingStatus === 'hoh' ? (rules as any).BRACKETS_HOH ?? rules.BRACKETS_SINGLE
      : rules.BRACKETS_SINGLE;

  let tax = 0;
  let prev = 0;
  for (const b of brackets) {
    if (taxableIncome <= prev) break;
    const inBracket = Math.min(taxableIncome, b.upTo) - prev;
    tax += inBracket * b.rate;
    prev = b.upTo;
    if (taxableIncome <= b.upTo) break;
  }
  return tax;
}

/**
 * Compute Social Security tax (employee share only).
 * Caps at SS_WAGE_BASE for the tax year.
 */
export function computeSsTax(annualGross: number, taxYear: number): number {
  const rules = rulesForYear(taxYear);
  const base = Math.min(annualGross, rules.SS_WAGE_BASE);
  return base * rules.SS_RATE_EMPLOYEE;
}

/**
 * Compute Medicare tax (employee share only).
 * 1.45% on all wages + 0.9% on wages over $200,000.
 */
export function computeMedTax(annualGross: number, taxYear: number): number {
  const rules = rulesForYear(taxYear);
  const base = annualGross * rules.MED_RATE_EMPLOYEE;
  const addl = Math.max(0, annualGross - rules.MED_ADDITIONAL_THRESHOLD) * rules.MED_ADDITIONAL_RATE;
  return base + addl;
}
