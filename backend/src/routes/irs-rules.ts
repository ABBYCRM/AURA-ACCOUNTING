/**
 * IRS Rules + Form Reference endpoint.
 * Surfaces the canonical 2026 rules and form reference so the frontend
 * can show users exactly what the system is using.
 */
import { Router } from 'express';
import { IRS_TY_2026, IRS_TY_2024, rulesForYear } from '../services/irs-rules';

const router = Router();

// Public — no auth required so the login page can show current rules
router.get('/rules', (_req, res) => {
  res.json({
    currentYear: 2026,
    rules: IRS_TY_2026,
    priorYear: 2024,
    priorRules: IRS_TY_2024,
    source: 'https://www.irs.gov',
    lastVerified: '2026-07-23',
  });
});

router.get('/forms', (_req, res) => {
  res.json({
    forms: [
      {
        id: 'w2',
        name: 'Form W-2',
        title: 'Wage and Tax Statement',
        revision: '2026',
        url: 'https://www.irs.gov/pub/irs-pdf/fw2.pdf',
        about: 'https://www.irs.gov/forms-pubs/about-form-w-2',
        filingChannel: 'SSA BSO e-file (https://www.ssa.gov/bso) or paper with W-3',
        deadline: '2027-02-01',
        boxCount: 20,
      },
      {
        id: 'w2c',
        name: 'Form W-2c',
        title: 'Corrected Wage and Tax Statement',
        revision: 'January 2026',
        url: 'https://www.irs.gov/pub/irs-pdf/fw2c.pdf',
        about: 'https://www.irs.gov/forms-pubs/about-form-w-2-c',
        filingChannel: 'SSA BSO e-file or paper with W-3c',
      },
      {
        id: 'w3',
        name: 'Form W-3',
        title: 'Transmittal of Wage and Tax Statements',
        revision: '2026',
        url: 'https://www.irs.gov/pub/irs-pdf/fw3.pdf',
        about: 'https://www.irs.gov/forms-pubs/about-form-w-3',
        filingChannel: 'Paper only with W-2s (not required if e-filed)',
        deadline: '2027-02-01',
      },
      {
        id: 'w4',
        name: 'Form W-4',
        title: 'Employee\'s Withholding Certificate',
        revision: '2026',
        url: 'https://www.irs.gov/pub/irs-pdf/fw4.pdf',
        about: 'https://www.irs.gov/forms-pubs/about-form-w-4',
        estimator: 'https://www.irs.gov/W4App',
        use: 'Employee fills out and gives to employer',
      },
      {
        id: '1099nec',
        name: 'Form 1099-NEC',
        title: 'Nonemployee Compensation',
        revision: 'December 2026',
        url: 'https://www.irs.gov/pub/irs-pdf/f1099nec.pdf',
        about: 'https://www.irs.gov/forms-pubs/about-form-1099-nec',
        filingChannel: 'IRS FIRE e-file or paper with Form 1096',
        deadline: '2027-01-31',
        threshold: 2000,
        thresholdNote: '$2,000 (changed from $600 by Public Law 119-21 effective for payments after 2025)',
      },
      {
        id: '1099misc',
        name: 'Form 1099-MISC',
        title: 'Miscellaneous Information',
        revision: 'December 2026',
        url: 'https://www.irs.gov/pub/irs-pdf/f1099msc.pdf',
        about: 'https://www.irs.gov/forms-pubs/about-form-1099-misc',
        filingChannel: 'IRS FIRE e-file or paper with Form 1096',
        deadlinePaper: '2027-02-28',
        deadlineEFile: '2027-03-31',
        threshold: 2000,
      },
      {
        id: '1096',
        name: 'Form 1096',
        title: 'Annual Summary and Transmittal of U.S. Information Returns',
        revision: '2026',
        url: 'https://www.irs.gov/pub/irs-pdf/f1096.pdf',
        about: 'https://www.irs.gov/forms-pubs/about-form-1096',
        use: 'Paper transmittal ONLY for 1097/1098/1099/3921/3922/5498/W-2G series',
      },
      {
        id: '941',
        name: 'Form 941',
        title: 'Employer\'s QUARTERLY Federal Tax Return',
        revision: 'March 2026',
        url: 'https://www.irs.gov/pub/irs-pdf/f941.pdf',
        instructions: 'https://www.irs.gov/pub/irs-pdf/i941.pdf',
        about: 'https://www.irs.gov/forms-pubs/about-form-941',
        filingChannel: 'IRS e-file (https://www.irs.gov/efile) or paper',
        deadlines: {
          Q1: '2027-04-30',
          Q2: '2027-07-31',
          Q3: '2027-10-31',
          Q4: '2028-01-31',
        },
      },
      {
        id: '940',
        name: 'Form 940',
        title: 'Employer\'s Annual Federal Unemployment (FUTA) Tax Return',
        revision: '2025 (2026 form in draft)',
        url: 'https://www.irs.gov/pub/irs-pdf/f940.pdf',
        instructions: 'https://www.irs.gov/pub/irs-pdf/i940.pdf',
        about: 'https://www.irs.gov/forms-pubs/about-form-940',
        filingChannel: 'IRS e-file or paper',
        deadline: '2027-02-01',
        rate: '6.0% on first $7,000 per employee (5.4% credit if state paid)',
      },
      {
        id: '944',
        name: 'Form 944',
        title: 'Employer\'s ANNUAL Federal Tax Return',
        revision: '2025',
        url: 'https://www.irs.gov/pub/irs-pdf/f944.pdf',
        about: 'https://www.irs.gov/forms-pubs/about-form-944',
        use: 'Only if IRS notified you in writing',
      },
      {
        id: 'p1099',
        name: 'Publication 1099',
        title: 'General Instructions for Certain Information Returns',
        revision: '2026 (rev. 03/26/2026)',
        url: 'https://www.irs.gov/pub/irs-pdf/p1099.pdf',
        about: 'https://www.irs.gov/forms-pubs/about-form-1099',
        use: 'Authoritative reference for 1097/1098/1099/3921/3922/5498/W-2G filers',
      },
      {
        id: 'p15',
        name: 'Publication 15',
        title: 'Employer\'s Tax Guide',
        url: 'https://www.irs.gov/pub/irs-pdf/p15.pdf',
        about: 'https://www.irs.gov/publications/p15',
        use: 'Current-year federal income tax withholding, FICA rates, deposit rules',
      },
      {
        id: 'p15a',
        name: 'Publication 15-A',
        title: 'Employer\'s Supplemental Tax Guide',
        revision: '2026',
        url: 'https://www.irs.gov/pub/irs-prior/p15a--2026.pdf',
        about: 'https://www.irs.gov/publications/p15a',
        use: 'Wage base limits and special FICA situations',
      },
    ],
    localCopies: {
      note: 'PDF copies of every form above are committed to docs/IRS/ in this repo for offline reference.',
      path: 'docs/IRS/',
    },
    keyChanges: {
      infoReturnThreshold: {
        before: '$600 (Forms 1099-NEC, 1099-MISC, W-2 without withholding)',
        after: '$2,000 effective for payments after 2025 (Public Law 119-21, OBBBA)',
        source: 'https://www.irs.gov/pub/irs-prior/p1099--2026.pdf',
      },
      ssWageBase: {
        taxYear2025: '$176,100',
        taxYear2026: '$184,500',
        source: 'https://www.irs.gov/pub/irs-prior/p15a--2026.pdf',
      },
      stdDeduction: {
        single2026: '$16,100',
        marriedFilingJointly2026: '$32,200',
        headOfHousehold2026: '$24,150',
        source: 'https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill',
      },
    },
  });
});

router.get('/filing-channels', (_req, res) => {
  res.json({
    channels: [
      {
        name: 'SSA Business Services Online (BSO)',
        for: ['W-2', 'W-2c', 'W-3 (auto-generated)'],
        url: 'https://www.ssa.gov/bso',
        cost: 'Free',
        required: 'Required if 10+ information returns in a calendar year',
        deadline: '2027-02-01',
      },
      {
        name: 'IRS FIRE (Filing Information Returns Electronically)',
        for: ['1099-NEC', '1099-MISC', '1099-DIV', '1099-INT', 'W-2G'],
        url: 'https://www.irs.gov/ein-responsible-party',
        cost: 'Free',
        deadlineByForm: {
          '1099-NEC': '2027-01-31',
          '1099-MISC-paper': '2027-02-28',
          '1099-MISC-eFile': '2027-03-31',
        },
      },
      {
        name: 'IRS e-file for employment taxes',
        for: ['941', '940', '944', '945'],
        url: 'https://www.irs.gov/efile',
        cost: 'Free',
        required: 'Mandatory for most employment tax returns in 2026',
      },
      {
        name: 'Order official scannable forms',
        for: ['W-2 Copy A', '1099 Copy A', '1096', 'W-3'],
        url: 'https://www.irs.gov/orderforms',
        phone: '800-829-3676',
        cost: 'Free',
        important: 'Self-printed PDFs are NOT scannable and may incur penalty',
      },
    ],
  });
});

router.get('/deadlines/:taxYear', (req, res) => {
  const year = Number(req.params.taxYear);
  const rules = rulesForYear(year);
  res.json({
    taxYear: year,
    deadlines: rules.DEADLINES,
    source: 'https://www.irs.gov',
  });
});

export default router;
