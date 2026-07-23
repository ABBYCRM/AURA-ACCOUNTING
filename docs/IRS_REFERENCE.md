# AURA Accounting — IRS Forms & Rules Reference (Tax Year 2026)

This document is the **single source of truth** for all IRS rules and form references used
in the AURA Accounting system. Every number, link, and threshold here was verified directly
against `irs.gov`. **Do not modify the constants in this file or in
`backend/src/services/irs-rules.ts` without first checking the official IRS sources cited
below.**

All PDFs in `docs/IRS/` were downloaded from `https://www.irs.gov/pub/irs-pdf/` on **2026-07-23**
and verified with `pdftotext` to confirm they are the correct forms, not 404 pages.

---

## 1. Tax Year 2026 Constants (Verified from IRS)

| Constant | Value | IRS Source |
|---|---|---|
| Social Security tax rate (employee) | 6.2% | [Pub. 15 (2026)](https://www.irs.gov/pub/irs-pdf/p15.pdf) |
| Social Security tax rate (employer) | 6.2% | [Pub. 15 (2026)](https://www.irs.gov/pub/irs-pdf/p15.pdf) |
| Social Security wage base limit | **$184,500** | [Pub. 15-A (2026)](https://www.irs.gov/pub/irs-prior/p15a--2026.pdf) |
| Medicare tax rate (employee) | 1.45% | [Pub. 15 (2026)](https://www.irs.gov/pub/irs-pdf/p15.pdf) |
| Medicare tax rate (employer) | 1.45% | [Pub. 15 (2026)](https://www.irs.gov/pub/irs-pdf/p15.pdf) |
| Additional Medicare Tax | 0.9% over $200,000 | [Pub. 15 (2026)](https://www.irs.gov/pub/irs-pdf/p15.pdf) |
| FUTA tax rate | 6.0% on first $7,000 | [Form 940](https://www.irs.gov/pub/irs-pdf/f940.pdf) |
| Standard deduction — single / MFS | **$16,100** | [Newsroom TY2026](https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill) |
| Standard deduction — MFJ | **$32,200** | [Newsroom TY2026](https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill) |
| Standard deduction — HoH | **$24,150** | [Newsroom TY2026](https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill) |
| Top marginal rate (single over) | 37% over **$640,600** | [Working Families Tax Cuts](https://www.irs.gov/newsroom/working-families-tax-cuts-individuals-and-workers) |
| Top marginal rate (MFJ over) | 37% over **$768,700** | [Working Families Tax Cuts](https://www.irs.gov/newsroom/working-families-tax-cuts-individuals-and-workers) |
| AMT exemption — single | $90,100 (phaseout $500,000) | [Working Families Tax Cuts](https://www.irs.gov/newsroom/working-families-tax-cuts-individuals-and-workers) |
| AMT exemption — MFJ | $140,200 (phaseout $1,000,000) | [Working Families Tax Cuts](https://www.irs.gov/newsroom/working-families-tax-cuts-individuals-and-workers) |

### 2026 Federal Income Tax Brackets (from [Working Families Tax Cuts](https://www.irs.gov/newsroom/working-families-tax-cuts-individuals-and-workers))

**Single:**
- 10% up to $12,400
- 12% over $12,400
- 22% over $50,400
- 24% over $105,700
- 32% over $201,775
- 35% over $256,225
- 37% over $640,600

**Married Filing Jointly:**
- 10% up to $24,800
- 12% over $24,800
- 22% over $100,800
- 24% over $211,400
- 32% over $403,550
- 35% over $512,450
- 37% over $768,700

---

## 2. Filing Thresholds (Public Law 119-21 / OBBBA)

**Critical change effective for payments after 2025:**
The information-return threshold was raised from **$600 to $2,000** (will be inflation-adjusted
annually beginning 2027). This applies to Forms 1099-NEC, 1099-MISC, W-2 (when no income/SS/Medicare
tax is withheld), and backup withholding.

| Form | Threshold (TY 2026) | IRS Source |
|---|---|---|
| 1099-NEC | **$2,000** | [Pub. 1099 (2026)](https://www.irs.gov/pub/irs-prior/p1099--2026.pdf) |
| 1099-MISC (most boxes) | **$2,000** | [Pub. 1099 (2026)](https://www.irs.gov/pub/irs-prior/p1099--2026.pdf) |
| 1099-MISC royalties (box 2) | $10 | [i1099mec (Rev. 12-2026)](https://www.irs.gov/pub/irs-pdf/i1099mec.pdf) |
| 1099-MISC attorney payments (box 10) | $600 | [i1099mec (Rev. 12-2026)](https://www.irs.gov/pub/irs-pdf/i1099mec.pdf) |
| W-2 (no tax withheld) | $2,000 in wages | [iw2w3 (2026)](https://www.irs.gov/pub/irs-pdf/iw2w3.pdf) |
| W-2 (any tax withheld) | All amounts | [iw2w3 (2026)](https://www.irs.gov/pub/irs-pdf/iw2w3.pdf) |
| Backup withholding | $2,000 | [Pub. 1099 (2026)](https://www.irs.gov/pub/irs-prior/p1099--2026.pdf) |
| 1099-LPS | $2,000 | [Pub. 1099 (2026)](https://www.irs.gov/pub/irs-prior/p1099--2026.pdf) |

---

## 3. Filing Deadlines (2026 tax year → 2027 filings)

| Form | Deadline | Notes |
|---|---|---|
| **W-2 / W-2c to employees** | **Feb 1, 2027** | Copies B, C, 2 to employee |
| **W-2 / W-3 to SSA** (paper) | **Feb 1, 2027** | 30-day extension via Form 8809 (no auto-ext) |
| **W-2 / W-3 to SSA** (e-file) | **Feb 1, 2027** | Required if 10+ info returns |
| **1099-NEC to IRS** (paper or e-file) | **Jan 31, 2027** | No automatic extension |
| **1099-NEC to recipient** | **Jan 31, 2027** | |
| **1099-MISC to IRS** (paper) | **Feb 28, 2027** | |
| **1099-MISC to IRS** (e-file) | **Mar 31, 2027** | |
| **1096 (transmittal)** | Same as 1099 it's transmitting | Paper only, do NOT use for e-filed 1099s |
| **Form 941 (Q1)** | **Apr 30, 2027** | Q2: Jul 31, Q3: Oct 31, Q4: Jan 31, 2028 |
| **Form 940 (FUTA)** | **Feb 1, 2027** | Annual |

---

## 4. Form-by-Form Reference (with Official URLs)

### 4.1 Form W-2 — Wage and Tax Statement
- **PDF:** https://www.irs.gov/pub/irs-pdf/fw2.pdf
- **About:** https://www.irs.gov/forms-pubs/about-form-w-2
- **Local copy:** `docs/IRS/fw2-2026.pdf`
- **Revision:** 2026
- **Who files:** Every employer engaged in a trade or business who pays remuneration (including
  noncash payments of $600 or more for 2026 / $2,000 for 2027+ if no tax withheld) to an employee.
- **Boxes:**
  - a: Employee's SSN
  - b: Employer EIN
  - c: Employer name, address, ZIP
  - d: Control number
  - e: Employee first name, middle initial, last name
  - f: Employee address, ZIP
  - 1: Wages, tips, other compensation
  - 2: Federal income tax withheld
  - 3: Social security wages
  - 4: Social security tax withheld
  - 5: Medicare wages and tips
  - 6: Medicare tax withheld
  - 7: Social security tips
  - 8: Allocated tips
  - 10: Dependent care benefits
  - 11: Nonqualified plans
  - 12: Codes (up to 4) — see [iw2w3](https://www.irs.gov/pub/irs-pdf/iw2w3.pdf) for full list
  - 13: Retirement plan / Third-party sick pay checkboxes
  - 14: Other (state-specific)
  - 15–20: State and local
- **Important:** Copy A must be on official scannable red-ink form. PDF self-prints are NOT
  scannable and may incur penalty. Order at https://www.irs.gov/orderforms.

### 4.2 Form W-2c — Corrected Wage and Tax Statement
- **PDF:** https://www.irs.gov/pub/irs-pdf/fw2c.pdf
- **About:** https://www.irs.gov/forms-pubs/about-form-w-2-c
- **Local copy:** `docs/IRS/fw2c-2026.pdf`
- **Revision:** January 2026

### 4.3 Form W-3 — Transmittal of Wage and Tax Statements
- **PDF:** https://www.irs.gov/pub/irs-pdf/fw3.pdf
- **About:** https://www.irs.gov/forms-pubs/about-form-w-3
- **Local copy:** `docs/IRS/fw3-2026.pdf`
- **Revision:** 2026
- **Note:** Required ONLY for paper-filed W-2s. If you e-file W-2s via SSA BSO, do not submit W-3.

### 4.4 Form W-4 — Employee's Withholding Certificate
- **PDF:** https://www.irs.gov/pub/irs-pdf/fw4.pdf
- **About:** https://www.irs.gov/forms-pubs/about-form-w-4
- **Local copy:** `docs/IRS/fw4-2026.pdf`
- **Revision:** 2026
- **W-4 App (withholding estimator):** https://www.irs.gov/W4App

### 4.5 Form 1099-NEC — Nonemployee Compensation
- **PDF:** https://www.irs.gov/pub/irs-pdf/f1099nec.pdf
- **About:** https://www.irs.gov/forms-pubs/about-form-1099-nec
- **Local copy:** `docs/IRS/f1099nec-2026.pdf`
- **Revision:** December 2026 (continuous-use; first filings Jan 2027 for 2026 tax year)
- **Threshold:** $2,000 (changed from $600 effective for payments after 2025)
- **Deadline:** January 31, 2027
- **Boxes (new in 2026):**
  - 1a: Nonemployee compensation
  - 1b: Total cash tips (NEW for 2026)
  - 1c: Treasury Tipped Occupation Code(s) — TTOC (NEW for 2026)
  - 1d: Total qualified overtime compensation (NEW for 2026)
  - 2: Direct sales of consumer products totaling $5,000+
  - 3: Excess golden parachute payments (subject to 20% excise tax)
  - 4: Federal income tax withheld
  - 5–7: State info

### 4.6 Form 1099-MISC — Miscellaneous Information
- **PDF:** https://www.irs.gov/pub/irs-pdf/f1099msc.pdf
- **About:** https://www.irs.gov/forms-pubs/about-form-1099-misc
- **Local copy:** `docs/IRS/f1099msc-2026.pdf`
- **Revision:** December 2026
- **Boxes:** 1 (rents), 2 (royalties), 3 (other income), 5 (fishing boat), 6 (medical/health), 7 (direct sales), 8 (substitute payments), 9 (crop insurance), 10 (attorney), 12 (409A), 15 (NQ deferred comp)

### 4.7 Form 1096 — Annual Summary and Transmittal
- **PDF:** https://www.irs.gov/pub/irs-pdf/f1096.pdf
- **About:** https://www.irs.gov/forms-pubs/about-form-1096
- **Local copy:** `docs/IRS/f1096-2026.pdf`
- **Revision:** 2026
- **Note:** Paper transmittal ONLY. Do not use for e-filed 1099s.

### 4.8 Form 941 — Employer's Quarterly Federal Tax Return
- **PDF:** https://www.irs.gov/pub/irs-pdf/f941.pdf
- **Instructions:** https://www.irs.gov/pub/irs-pdf/i941.pdf
- **About:** https://www.irs.gov/forms-pubs/about-form-941
- **Local copies:** `docs/IRS/f941-2026.pdf`, `docs/IRS/i941-2026.pdf`
- **Revision:** March 2026
- **Quarterly deadlines:** Q1 Apr 30, Q2 Jul 31, Q3 Oct 31, Q4 Jan 31 (next year)
- **If line 12 < $2,500:** can pay with return. If ≥ $2,500: must deposit on schedule.
- **$100,000 next-day deposit rule:** If accumulated unpaid tax reaches $100,000, deposit by next business day.

### 4.9 Form 940 — Employer's Annual Federal Unemployment (FUTA) Tax Return
- **PDF:** https://www.irs.gov/pub/irs-pdf/f940.pdf
- **Instructions:** https://www.irs.gov/pub/irs-pdf/i940.pdf
- **About:** https://www.irs.gov/forms-pubs/about-form-940
- **Local copies:** `docs/IRS/f940-2025.pdf`, `docs/IRS/i940-2025.pdf`
- **Note:** 2025 form used for the 2025 tax year (filed in early 2026). The 2026 form
  (Form 940 for 2026) is still in draft.
- **Who files:** Paid $1,500+ wages in any calendar quarter of 2024 OR 2025, OR had 1+ employees
  on at least some day in each of 20 weeks.

### 4.10 Form 944 — Employer's ANNUAL Federal Tax Return
- **PDF:** https://www.irs.gov/pub/irs-pdf/f944.pdf
- **About:** https://www.irs.gov/forms-pubs/about-form-944
- **Local copy:** `docs/IRS/f944-2025.pdf`
- **Who files:** Only if IRS notified you in writing. Otherwise file Form 941 quarterly.

### 4.11 Publication 1099 — General Instructions for Certain Information Returns
- **PDF:** https://www.irs.gov/pub/irs-pdf/p1099.pdf
- **Local copy:** `docs/IRS/p1099-2026.pdf`
- **Revision:** March 27, 2026

---

## 5. Filing Channels

| Channel | Use For | Cost |
|---|---|---|
| **SSA Business Services Online (BSO)** | W-2/W-2c e-file | Free (https://www.ssa.gov/bso) |
| **IRS FIRE (Filing Information Returns Electronically)** | 1099 series, 1096 not used for e-file | Free (https://www.irs.gov/ein-responsible-party) |
| **IRS e-file for employment taxes** | 941, 940, 944, 945 | Free (https://www.irs.gov/efile) |
| **Mail paper forms** | Last resort | Postage only; penalty risk for self-printed W-2/1099 Copy A |
| **Order official scannable forms** | Required for paper Copy A | Free (https://www.irs.gov/orderforms or 800-829-3676) |

---

## 6. Penalty Reference (per [iw2w3 2026](https://www.irs.gov/pub/irs-pdf/iw2w3.pdf))

| Issue | Penalty |
|---|---|
| Failure to file W-2 (paper) | $60/return if ≤30 days late, $120/return if 31 days–Aug 1, $310/return if after Aug 1 or never |
| Intentional disregard | $630/return, no cap |
| Failure to furnish W-2 to employee | $340/return |
| Failure to file 1099 / furnish to recipient | $340/return (2026) |
| Failure to file e-file when required | $340/return (2026) |

These penalty amounts are inflation-adjusted annually; verify in current instructions.

---

## 7. AURA Accounting — What This System Computes vs. What IRS Requires

This system produces a **draft/preview** of the following (not scannable, not for direct IRS filing):

| Output | AURA Computes | For IRS Filing |
|---|---|---|
| W-2 PDF | All 20 boxes via custom layout | Must use official scannable form (order from IRS) or e-file via SSA BSO |
| 1099-NEC PDF | All boxes including new 1b/1c/1d | Must use official scannable form or e-file via IRS FIRE |
| W-3 PDF | Totals only | Generated alongside W-2s when paper-filing |
| 1096 PDF | Totals only | Paper transmittal for 1099s |
| 941 worksheet | Quarterly totals with deposit schedule | Must file official 941 via IRS e-file or paper |
| 940 worksheet | Annual FUTA | Must file official 940 via IRS e-file or paper |

**To file for real:** the user must either (a) order official scannable forms from
https://www.irs.gov/orderforms, (b) e-file via the official channels above, or (c) use a
certified payroll/1099 service. The PDFs this system generates are reference documents and
should not be submitted to the SSA or IRS.
