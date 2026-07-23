"use strict";
/**
 * IRS form PDF generators.
 *
 * IMPORTANT: These PDFs are DRAFTS for the user's reference. They are NOT
 * scannable official IRS forms and must NOT be submitted to the SSA or IRS
 * directly. For actual filing, the user must either:
 *   1. Order official scannable forms at https://www.irs.gov/orderforms
 *   2. E-file via SSA BSO (W-2) or IRS FIRE (1099) — both free
 *   3. Use a certified payroll/1099 service
 *
 * Every form here is laid out to match the official 2026 IRS form box-by-box,
 * with a clear "DRAFT — NOT FOR FILING" notice. Source: docs/IRS/*.pdf
 * (downloaded from irs.gov on 2026-07-23) and docs/IRS_REFERENCE.md.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateW2Pdf = generateW2Pdf;
exports.generate1099Pdf = generate1099Pdf;
exports.generate1099MiscPdf = generate1099MiscPdf;
exports.generateW3Pdf = generateW3Pdf;
exports.generate1096Pdf = generate1096Pdf;
exports.generate941Worksheet = generate941Worksheet;
exports.generate940Worksheet = generate940Worksheet;
const pdfkit_1 = __importDefault(require("pdfkit"));
const irs_rules_1 = require("./irs-rules");
const DRAFT_NOTICE = 'DRAFT — NOT FOR FILING. For official filing, order scannable forms at ' +
    'https://www.irs.gov/orderforms or e-file via the SSA BSO (W-2/W-3) or ' +
    'IRS FIRE (1099). AURA Accounting PDFs are reference documents only.';
const SOURCE_LINE = 'Source: irs.gov (verified 2026-07-23)';
function fmtMoney(n) {
    const v = n || 0;
    return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function draftBanner(doc) {
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#cc0000')
        .text('DRAFT — NOT FOR FILING', 36, 24, { width: 540, align: 'center' });
    doc.fillColor('#000000');
}
// ─── Form W-2 (2026 layout) ────────────────────────────────────────────────
function generateW2Pdf(w2, res) {
    const doc = new pdfkit_1.default({ size: 'LETTER', margin: 36 });
    doc.pipe(res);
    draftBanner(doc);
    // Form header
    doc.fontSize(14).font('Helvetica-Bold').text('Form W-2 (2026)', 36, 42, { align: 'center' });
    doc.fontSize(9).font('Helvetica').text('Wage and Tax Statement', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(8).text(SOURCE_LINE, { align: 'center' });
    doc.moveDown(0.8);
    const col1 = 36, col2 = 320, rowH = 26, labelH = 11;
    let y = doc.y;
    function label(x, yy, text) {
        doc.fontSize(7).font('Helvetica').fillColor('#444').text(text, x + 3, yy + 2);
    }
    function value(x, yy, w, text, bold = false) {
        doc.fontSize(9).font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor('#000')
            .text(text ?? '', x + 3, yy + labelH, { width: w - 6 });
    }
    function cell(x, yy, w, h) {
        doc.rect(x, yy, w, h).stroke();
    }
    function box(x, yy, w, h, boxLabel, desc, val, money = false) {
        cell(x, yy, w, h);
        label(x, yy, `Box ${boxLabel} — ${desc}`);
        value(x, yy, w, money ? `$${fmtMoney(Number(val) || 0)}` : (val ?? ''), true);
    }
    // Row 1: a (SSN) | b (EIN) | c (employer name/addr) | d (control#)
    box(col1, y, 130, rowH, 'a', 'Employee SSN', w2.ssnLast4 ? `XXX-XX-${w2.ssnLast4}` : '');
    box(col1 + 130, y, 130, rowH, 'b', 'Employer EIN', w2.companyEin ?? '');
    cell(col1 + 260, y, 280, rowH);
    label(col1 + 260, y, 'c — Employer name, address, ZIP');
    value(col1 + 260, y, 280, `${w2.companyName ?? ''}\n${w2.companyAddress ?? ''}`, true);
    y += rowH;
    box(col1 + 260, y, 130, rowH, 'd', 'Control number', w2.controlNumber ?? '');
    cell(col1 + 390, y, 150, rowH);
    label(col1 + 390, y, 'e — Employee first name, MI, last');
    value(col1 + 390, y, 150, `${w2.firstName ?? ''} ${w2.lastName ?? ''}`, true);
    y += rowH;
    cell(col1, y, 540, rowH);
    label(col1, y, 'f — Employee address and ZIP');
    value(col1, y, 540, w2.address ?? '');
    y += rowH + 4;
    // Numbered boxes (two-column layout)
    const half = (colW) => colW / 2;
    const left = col1, right = col1 + 280, boxW = 270, numH = 24;
    const numberedBoxes = [
        ['1', 'Wages, tips, other compensation', fmtMoney(w2.wages), true],
        ['2', 'Federal income tax withheld', fmtMoney(w2.fedTax), true],
        ['3', 'Social security wages', fmtMoney(w2.ssWages), true],
        ['4', 'Social security tax withheld', fmtMoney(w2.ssTax), true],
        ['5', 'Medicare wages and tips', fmtMoney(w2.medWages), true],
        ['6', 'Medicare tax withheld', fmtMoney(w2.medTax), true],
        ['7', 'Social security tips', fmtMoney(w2.ssTips), true],
        ['8', 'Allocated tips', fmtMoney(w2.allocatedTips), true],
        ['10', 'Dependent care benefits', fmtMoney(w2.dependentCare), true],
        ['11', 'Nonqualified plans', fmtMoney(w2.nonqualifiedPlans), true],
    ];
    for (let i = 0; i < numberedBoxes.length; i += 2) {
        box(left, y, boxW, numH, numberedBoxes[i][0], numberedBoxes[i][1], numberedBoxes[i][2], true);
        box(right, y, boxW, numH, numberedBoxes[i + 1][0], numberedBoxes[i + 1][1], numberedBoxes[i + 1][2], true);
        y += numH;
    }
    // Box 12 — up to 4 codes
    cell(left, y, 540, numH * 2);
    label(left, y, '12 — See instructions for Box 12 codes (up to 4)');
    const codes = [
        [w2.box12aCode ?? '', w2.box12aAmount ? fmtMoney(w2.box12aAmount) : ''],
        [w2.box12bCode ?? '', w2.box12bAmount ? fmtMoney(w2.box12bAmount) : ''],
        [w2.box12cCode ?? '', w2.box12cAmount ? fmtMoney(w2.box12cAmount) : ''],
        [w2.box12dCode ?? '', w2.box12dAmount ? fmtMoney(w2.box12dAmount) : ''],
    ];
    for (let i = 0; i < 4; i++) {
        const codeY = y + labelH + i * 11;
        doc.fontSize(8).font('Helvetica').fillColor('#000');
        doc.text(`Code ${codes[i][0] || '____'}`, left + 10, codeY, { width: 80 });
        doc.text(codes[i][1] || '', left + 100, codeY, { width: 200, align: 'right' });
    }
    y += numH * 2;
    // Box 13 checkboxes
    cell(left, y, 270, numH);
    label(left, y, '13 — Checkboxes');
    doc.fontSize(9).font('Helvetica').fillColor('#000')
        .text(`${w2.retirementPlan ? '☑' : '☐'} Retirement plan    ${w2.thirdPartySickPay ? '☑' : '☐'} Third-party sick pay`, left + 10, y + labelH + 2);
    // Box 14 — Other
    cell(right, y, 270, numH);
    label(right, y, '14 — Other (state-specific)');
    value(right, y, 270, w2.box14Other ?? '');
    y += numH;
    // State/local grid (15–20)
    const stateRow = (boxNo, lbl, lbl2) => {
        cell(left, y, 60, numH);
        label(left, y, `Box ${boxNo}`);
        value(left, y, 60, w2[`box${boxNo}`] ?? '');
        cell(left + 60, y, 480, numH);
        label(left + 60, y, lbl);
        value(left + 60, y, 480, w2[`box${boxNo}Val`] ?? '');
        y += numH;
    };
    stateRow('15', 'State / Payer\'s state ID', 'State');
    box(left, y, 130, numH, '16', 'State wages', fmtMoney(w2.stateWages), true);
    box(left + 130, y, 130, numH, '17', 'State income tax', fmtMoney(w2.stateTax), true);
    cell(left + 260, y, 280, numH);
    label(left + 260, y, '18 — Local wages, tips, etc.');
    value(left + 260, y, 280, fmtMoney(w2.localWages));
    y += numH;
    box(left, y, 130, numH, '19', 'Local income tax', fmtMoney(w2.localTax), true);
    cell(left + 130, y, 410, numH);
    label(left + 130, y, '20 — Locality name');
    value(left + 130, y, 410, w2.localityName ?? '');
    y += numH + 6;
    // Footer
    doc.fontSize(7).font('Helvetica-Oblique').fillColor('#666')
        .text(`Tax year ${w2.taxYear ?? ''}  •  ${SOURCE_LINE}`, { align: 'center' });
    doc.fillColor('#cc0000').text(DRAFT_NOTICE, { align: 'center' });
    doc.end();
}
// ─── Form 1099-NEC (Rev. December 2026 layout) ─────────────────────────────
function generate1099Pdf(f, res) {
    const doc = new pdfkit_1.default({ size: 'LETTER', margin: 36 });
    doc.pipe(res);
    draftBanner(doc);
    doc.fontSize(14).font('Helvetica-Bold').text('Form 1099-NEC (Rev. December 2026)', { align: 'center' });
    doc.fontSize(9).font('Helvetica').text('Nonemployee Compensation', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(8).text(`For calendar year ${f.taxYear ?? ''}  •  ${SOURCE_LINE}`, { align: 'center' });
    doc.moveDown(0.8);
    const col1 = 36, rowH = 26;
    let y = doc.y;
    function label(x, yy, text) {
        doc.fontSize(7).font('Helvetica').fillColor('#444').text(text, x + 3, yy + 2);
    }
    function value(x, yy, w, text, bold = false) {
        doc.fontSize(9).font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor('#000')
            .text(text ?? '', x + 3, yy + 11, { width: w - 6 });
    }
    function cell(x, yy, w, h) {
        doc.rect(x, yy, w, h).stroke();
    }
    function box(x, yy, w, h, boxLabel, desc, val, money = false) {
        cell(x, yy, w, h);
        label(x, yy, `Box ${boxLabel} — ${desc}`);
        value(x, yy, w, money ? `$${fmtMoney(Number(val) || 0)}` : (val ?? ''), true);
    }
    // Header row: PAYER (left) | RECIPIENT (right)
    const halfW = 270;
    cell(col1, y, halfW, rowH * 2);
    label(col1, y, "PAYER'S name, address, ZIP, phone");
    value(col1, y, halfW, `${f.companyName ?? ''}\n${f.companyAddress ?? ''}`, true);
    box(col1, y + rowH, halfW, rowH, '', 'Payer TIN (EIN)', f.companyEin ?? '');
    cell(col1 + halfW, y, halfW, rowH * 2);
    label(col1 + halfW, y, "RECIPIENT'S name and address");
    const rname = f.businessName
        ? `${f.businessName} (${f.firstName ?? ''} ${f.lastName ?? ''})`
        : `${f.firstName ?? ''} ${f.lastName ?? ''}`;
    value(col1 + halfW, y, halfW, `${rname}\n${f.address ?? ''}`, true);
    box(col1 + halfW, y + rowH, halfW, rowH, '', `Recipient TIN (${(f.tinType ?? 'ssn').toUpperCase()})`, f.tinLast4 ? `XXX-XX-${f.tinLast4}` : '');
    y += rowH * 2;
    cell(col1, y, 540, rowH);
    label(col1, y, 'Account number (optional)');
    value(col1, y, 540, f.accountNumber ?? '');
    y += rowH + 4;
    // Numbered boxes — 2026 layout includes new 1b/1c/1d
    box(col1, y, 540, rowH, '1a', 'Nonemployee compensation', fmtMoney(f.box1NonemployeeComp), true);
    y += rowH;
    box(col1, y, 270, rowH, '1b', 'Total cash tips (new for TY 2026)', fmtMoney(f.box1CashTips), true);
    box(col1 + 270, y, 270, rowH, '1c', 'Treasury Tipped Occupation Code (TTOC)', f.box1Ttoc ?? '');
    y += rowH;
    box(col1, y, 540, rowH, '1d', 'Qualified overtime compensation (new for TY 2026)', fmtMoney(f.box1QOvertime), true);
    y += rowH;
    box(col1, y, 270, rowH, '2', 'Direct sales of $5,000+ consumer products', f.box2DirectSales ? '☑' : '☐');
    box(col1 + 270, y, 270, rowH, '3', 'Excess golden parachute payments', fmtMoney(f.box3GoldenParachute), true);
    y += rowH;
    box(col1, y, 270, rowH, '4', 'Federal income tax withheld', fmtMoney(f.box4FedTax), true);
    box(col1 + 270, y, 270, rowH, '5', 'Section 409A deferrals', fmtMoney(f.box5Sec409A), true);
    y += rowH;
    // State info (boxes 6, 7, 8)
    doc.fontSize(8).font('Helvetica-Bold').text('State information', col1, y);
    y += 12;
    box(col1, y, 180, rowH, '6', 'State tax withheld', fmtMoney(f.box6StateTax), true);
    box(col1 + 180, y, 180, rowH, '7', 'State/Payer\'s state ID', f.box7StateId ?? '');
    box(col1 + 360, y, 180, rowH, '8', 'State income', fmtMoney(f.box8StateIncome), true);
    y += rowH + 4;
    // Footer
    doc.fontSize(7).font('Helvetica-Oblique').fillColor('#666')
        .text(`Tax year ${f.taxYear ?? ''}  •  OMB No. 1545-0116  •  ${SOURCE_LINE}`, { align: 'center' });
    doc.fillColor('#cc0000').text(DRAFT_NOTICE, { align: 'center' });
    doc.end();
}
// ─── Form 1099-MISC (Rev. December 2026 layout) ────────────────────────────
function generate1099MiscPdf(f, res) {
    const doc = new pdfkit_1.default({ size: 'LETTER', margin: 36 });
    doc.pipe(res);
    draftBanner(doc);
    doc.fontSize(14).font('Helvetica-Bold').text('Form 1099-MISC (Rev. December 2026)', { align: 'center' });
    doc.fontSize(9).font('Helvetica').text('Miscellaneous Information', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(8).text(`For calendar year ${f.taxYear ?? ''}  •  ${SOURCE_LINE}`, { align: 'center' });
    doc.moveDown(0.8);
    const col1 = 36, rowH = 24, w540 = 540;
    let y = doc.y;
    function label(x, yy, text) {
        doc.fontSize(7).font('Helvetica').fillColor('#444').text(text, x + 3, yy + 2);
    }
    function value(x, yy, w, text) {
        doc.fontSize(9).font('Helvetica').fillColor('#000').text(text ?? '', x + 3, yy + 11, { width: w - 6 });
    }
    function cell(x, yy, w, h) { doc.rect(x, yy, w, h).stroke(); }
    function box(x, yy, w, h, boxLabel, desc, val, money = false) {
        cell(x, yy, w, h);
        label(x, yy, `Box ${boxLabel} — ${desc}`);
        value(x, yy, w, money ? `$${fmtMoney(Number(val) || 0)}` : (val ?? ''));
    }
    cell(col1, y, w540, rowH * 2);
    label(col1, y, "PAYER & RECIPIENT (name, address, TIN)");
    value(col1, y, w540, `Payer: ${f.companyName ?? ''} (EIN ${f.companyEin ?? ''})`);
    value(col1, y + 12, w540, `Recipient: ${f.firstName ?? ''} ${f.lastName ?? ''} (TIN XXX-XX-${f.tinLast4 ?? '____'})`);
    y += rowH * 2;
    cell(col1, y, w540, rowH);
    label(col1, y, 'Account number');
    value(col1, y, w540, f.accountNumber ?? '');
    y += rowH + 2;
    box(col1, y, 180, rowH, '1', 'Rents', fmtMoney(f.box1Rents), true);
    box(col1 + 180, y, 180, rowH, '2', 'Royalties', fmtMoney(f.box2Royalties), true);
    box(col1 + 360, y, 180, rowH, '3', 'Other income', fmtMoney(f.box3OtherIncome), true);
    y += rowH;
    box(col1, y, 180, rowH, '4', 'Federal income tax withheld', fmtMoney(f.box4FedTax), true);
    box(col1 + 180, y, 180, rowH, '5', 'Fishing boat proceeds', fmtMoney(f.box5FishingBoat), true);
    box(col1 + 360, y, 180, rowH, '6', 'Medical and health care payments', fmtMoney(f.box6Medical), true);
    y += rowH;
    box(col1, y, 180, rowH, '7', 'Direct sales indicator', f.box7DirectSales ? '☑' : '☐');
    box(col1 + 180, y, 180, rowH, '8', 'Substitute payments', fmtMoney(f.box8SubstitutePayments), true);
    box(col1 + 360, y, 180, rowH, '9', 'Crop insurance proceeds', fmtMoney(f.box9CropInsurance), true);
    y += rowH;
    box(col1, y, 180, rowH, '10', 'Attorney payments (≥ $600)', fmtMoney(f.box10Attorney), true);
    box(col1 + 180, y, 180, rowH, '12', 'Section 409A deferrals', fmtMoney(f.box12Sec409A), true);
    box(col1 + 360, y, 180, rowH, '15', 'Nonqualified deferred comp', fmtMoney(f.box15NQDefComp), true);
    y += rowH + 2;
    // State info
    box(col1, y, 180, rowH, '11', 'State tax withheld', fmtMoney(f.box11StateTax), true);
    box(col1 + 180, y, 180, rowH, '13', 'State/Payer state ID', f.box13StateId ?? '');
    box(col1 + 360, y, 180, rowH, '14', 'State income', fmtMoney(f.box14StateIncome), true);
    y += rowH + 4;
    doc.fontSize(7).font('Helvetica-Oblique').fillColor('#666')
        .text(`OMB No. 1545-0115  •  ${SOURCE_LINE}`, { align: 'center' });
    doc.fillColor('#cc0000').text(DRAFT_NOTICE, { align: 'center' });
    doc.end();
}
// ─── Form W-3 (Transmittal) ────────────────────────────────────────────────
function generateW3Pdf(records, company, taxYear, res) {
    const doc = new pdfkit_1.default({ size: 'LETTER', margin: 36 });
    doc.pipe(res);
    draftBanner(doc);
    doc.fontSize(14).font('Helvetica-Bold').text(`Form W-3 (${taxYear})`, { align: 'center' });
    doc.fontSize(9).font('Helvetica').text('Transmittal of Wage and Tax Statements', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(8).text(SOURCE_LINE, { align: 'center' });
    doc.moveDown(0.5);
    let totalWages = 0, totalFed = 0, totalSsWages = 0, totalSsTax = 0;
    let totalMedWages = 0, totalMedTax = 0;
    for (const r of records) {
        totalWages += r.wages || 0;
        totalFed += r.fedTax || 0;
        totalSsWages += r.ssWages || 0;
        totalSsTax += r.ssTax || 0;
        totalMedWages += r.medWages || 0;
        totalMedTax += r.medTax || 0;
    }
    const col1 = 36;
    let y = doc.y;
    function label(x, yy, t) {
        doc.fontSize(7).font('Helvetica').fillColor('#444').text(t, x + 3, yy + 2);
    }
    function value(x, yy, w, t, bold = false) {
        doc.fontSize(9).font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor('#000')
            .text(t, x + 3, yy + 11, { width: w - 6 });
    }
    function cell(x, yy, w, h) { doc.rect(x, yy, w, h).stroke(); }
    function box(x, yy, w, h, lbl, desc, val, money = false) {
        cell(x, yy, w, h);
        label(x, yy, `${lbl} — ${desc}`);
        value(x, yy, w, money ? `$${fmtMoney(Number(val) || 0)}` : val, true);
    }
    const rowH = 26;
    // Header
    box(col1, y, 270, rowH, 'a', 'Employer name', company?.name ?? '');
    box(col1 + 270, y, 270, rowH, 'b', 'Kind of Payer', '941');
    y += rowH;
    box(col1, y, 270, rowH, 'c', 'EIN', company?.ein ?? '');
    box(col1 + 270, y, 270, rowH, 'd', 'Establishment number', '');
    y += rowH;
    cell(col1, y, 540, rowH);
    label(col1, y, 'e — Employer address');
    value(col1, y, 540, company?.address ?? '');
    y += rowH;
    box(col1, y, 270, rowH, 'f', 'Total W-2s attached', String(records.length));
    box(col1 + 270, y, 270, rowH, 'g', 'Total W-2c attached (corrected)', '0');
    y += rowH + 4;
    // Totals grid
    doc.fontSize(8).font('Helvetica-Bold').text('Totals (sum of attached W-2s)', col1, y);
    y += 12;
    box(col1, y, 180, rowH, '1', 'Total wages', fmtMoney(totalWages), true);
    box(col1 + 180, y, 180, rowH, '2', 'Total federal income tax withheld', fmtMoney(totalFed), true);
    box(col1 + 360, y, 180, rowH, '3', 'Total social security wages', fmtMoney(totalSsWages), true);
    y += rowH;
    box(col1, y, 180, rowH, '4', 'Total social security tax withheld', fmtMoney(totalSsTax), true);
    box(col1 + 180, y, 180, rowH, '5', 'Total Medicare wages', fmtMoney(totalMedWages), true);
    box(col1 + 360, y, 180, rowH, '6', 'Total Medicare tax withheld', fmtMoney(totalMedTax), true);
    y += rowH + 6;
    // Filing address (from W-3 instructions)
    doc.fontSize(8).font('Helvetica-Bold').text('Where to file (paper only):', col1, y);
    y += 12;
    doc.fontSize(8).font('Helvetica').text('Social Security Administration\nDirect Operations Center\nWilkes-Barre, PA 18769-0001', col1, y);
    y += 50;
    doc.fontSize(7).font('Helvetica-Oblique').fillColor('#666')
        .text(`Tax year ${taxYear}  •  ${SOURCE_LINE}`, { align: 'center' });
    doc.fillColor('#cc0000').text('DRAFT — NOT FOR FILING. Required ONLY for paper-filed W-2s. ' +
        'If you e-file W-2s via SSA BSO (https://www.ssa.gov/bso), do NOT submit a W-3.', { align: 'center' });
    doc.end();
}
// ─── Form 1096 (Annual Summary and Transmittal) ───────────────────────────
function generate1096Pdf(records, company, taxYear, formType, res) {
    const doc = new pdfkit_1.default({ size: 'LETTER', margin: 36 });
    doc.pipe(res);
    draftBanner(doc);
    doc.fontSize(14).font('Helvetica-Bold').text(`Form 1096 (${taxYear})`, { align: 'center' });
    doc.fontSize(9).font('Helvetica').text('Annual Summary and Transmittal of U.S. Information Returns', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(8).text(SOURCE_LINE, { align: 'center' });
    doc.moveDown(0.5);
    let totalForms = records.length;
    let totalAmount = 0;
    for (const r of records)
        totalAmount += r.box1NonemployeeComp || r.box1Rents || 0;
    const col1 = 36;
    let y = doc.y;
    function label(x, yy, t) {
        doc.fontSize(7).font('Helvetica').fillColor('#444').text(t, x + 3, yy + 2);
    }
    function value(x, yy, w, t, bold = false) {
        doc.fontSize(9).font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor('#000')
            .text(t, x + 3, yy + 11, { width: w - 6 });
    }
    function cell(x, yy, w, h) { doc.rect(x, yy, w, h).stroke(); }
    function box(x, yy, w, h, lbl, desc, val, money = false) {
        cell(x, yy, w, h);
        label(x, yy, lbl);
        value(x, yy, w, money ? `$${fmtMoney(Number(val) || 0)}` : val, true);
    }
    const rowH = 26;
    box(col1, y, 360, rowH, 'FILER', 'name', company?.name ?? '');
    box(col1 + 360, y, 180, rowH, '2', 'TIN (EIN)', company?.ein ?? '');
    y += rowH;
    cell(col1, y, 540, rowH);
    label(col1, y, 'Address');
    value(col1, y, 540, company?.address ?? '');
    y += rowH;
    box(col1, y, 360, rowH, '1', 'Kind of return (1099-NEC / 1099-MISC etc.)', formType);
    box(col1 + 360, y, 180, rowH, '3', 'Total number of forms', String(totalForms));
    y += rowH;
    box(col1, y, 540, rowH, '4', 'Total federal income tax withheld', '$0.00', true);
    y += rowH;
    box(col1, y, 540, rowH, '5', 'Total reported amount', `$${fmtMoney(totalAmount)}`, true);
    y += rowH + 6;
    doc.fontSize(8).font('Helvetica-Bold').text('Where to file (paper only — see Form 1096 for state routing):', col1, y);
    y += 12;
    doc.fontSize(7).font('Helvetica').text('If your principal business is in OR, WA, ID, MT, ND, SD, WY, CO, UT, NV, AZ, NM, ' +
        'AK, HI, KS, OK, NE, MN, IA, MO, AR, LA, WI, IL, MI, IN, TN, KY, MS, AL, GA, FL, SC, NC, VA, ' +
        'WV, OH, VT, ME, NH, MA, RI, CT, NJ, NY, DE, MD, PA, TX: Internal Revenue Service Center, ' +
        'P.O. Box 219256, Kansas City, MO 64121-9256.\n' +
        'If in CA: Department of the Treasury, Internal Revenue Service Center, ' +
        '1973 North Rulon White Blvd., Ogden, UT 84201.\n' +
        'With 1099-NEC: due Jan 31. With other 1099s: due Feb 28.', col1, y, { width: 540 });
    y += 90;
    doc.fontSize(7).font('Helvetica-Oblique').fillColor('#666')
        .text(`OMB No. 1545-0108  •  ${SOURCE_LINE}`, { align: 'center' });
    doc.fillColor('#cc0000').text('DRAFT — NOT FOR FILING. Paper transmittal ONLY. Do not use for e-filed 1099s.', { align: 'center' });
    doc.end();
}
// ─── Form 941 Worksheet (Quarterly Federal Tax Return) ─────────────────────
function generate941Worksheet(quarter, taxYear, totals, res) {
    const doc = new pdfkit_1.default({ size: 'LETTER', margin: 36 });
    doc.pipe(res);
    draftBanner(doc);
    doc.fontSize(14).font('Helvetica-Bold').text(`Form 941 Worksheet — Q${quarter} ${taxYear}`, { align: 'center' });
    doc.fontSize(9).font('Helvetica').text('Employer\'s QUARTERLY Federal Tax Return (DRAFT)', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(8).text(`Revision: March 2026  •  ${SOURCE_LINE}`, { align: 'center' });
    doc.moveDown(0.5);
    const col1 = 36, rowH = 22, w540 = 540;
    let y = doc.y;
    function label(x, yy, t) {
        doc.fontSize(7).font('Helvetica').fillColor('#444').text(t, x + 3, yy + 2);
    }
    function value(x, yy, w, t, bold = false) {
        doc.fontSize(9).font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor('#000')
            .text(t, x + 3, yy + 10, { width: w - 6 });
    }
    function cell(x, yy, w, h) { doc.rect(x, yy, w, h).stroke(); }
    function box(x, yy, w, h, lbl, desc, val, money = true) {
        cell(x, yy, w, h);
        label(x, yy, `Line ${lbl} — ${desc}`);
        value(x, yy, w, money ? `$${fmtMoney(Number(val) || 0)}` : val, true);
    }
    // Compute line totals per 941
    const rules = (0, irs_rules_1.rulesForYear)(taxYear);
    const line1 = totals.wages;
    const line2 = totals.fedTax;
    const line3 = totals.ssWages;
    const line4 = totals.ssTax;
    const line5a = totals.medWages;
    const line5b = totals.medTax;
    const line5c = line5a + line5b; // SS + Med = line 5c
    const line5d = totals.additionalMedTax || 0;
    const line5e = line5c + line5d;
    const line6 = line2 + line5e; // total taxes
    const line7 = 0; // assumed no adjustments for simplicity
    const line8 = line6 + line7;
    const line10 = 0; // assumed no advance EIC
    const line11 = 0; // assumed no other adjustments
    const line12 = line8 - line10 + line11;
    const line13 = 0; // total deposits
    const line14 = line12 > line13 ? line12 - line13 : 0;
    const line15 = line13 > line12 ? line13 - line12 : 0;
    box(col1, y, 540, rowH, '1', 'Number of employees', '—', false);
    y += rowH;
    box(col1, y, 540, rowH, '2', 'Wages, tips, and other compensation', fmtMoney(line1), true);
    y += rowH;
    box(col1, y, 540, rowH, '3', 'Federal income tax withheld', fmtMoney(line2), true);
    y += rowH;
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#000')
        .text('Social security and Medicare taxes', col1, y);
    y += 12;
    box(col1, y, 270, rowH, '4', 'SS taxable wages (cap $' + rules.SS_WAGE_BASE.toLocaleString() + ')', fmtMoney(Math.min(line3, rules.SS_WAGE_BASE)), true);
    box(col1 + 270, y, 270, rowH, '5a', 'SS tax (6.2% × line 4)', fmtMoney(line4), true);
    y += rowH;
    box(col1, y, 270, rowH, '5b', 'Medicare taxable wages', fmtMoney(line5a), true);
    box(col1 + 270, y, 270, rowH, '5c', 'Medicare tax (1.45% × line 5a)', fmtMoney(line5b), true);
    y += rowH;
    box(col1, y, 270, rowH, '5d', 'Additional Medicare Tax (0.9% over $200k)', fmtMoney(line5d), true);
    box(col1 + 270, y, 270, rowH, '5e', 'Total SS+Med (5a+5b+5d)', fmtMoney(line5e), true);
    y += rowH;
    box(col1, y, 540, rowH, '6', 'Total taxes (line 3 + line 5e)', fmtMoney(line6), true);
    y += rowH;
    box(col1, y, 540, rowH, '7', 'Adjustments to SS/Med (from Form 941-X if any)', fmtMoney(line7), true);
    y += rowH;
    box(col1, y, 540, rowH, '8', 'Total taxes after adjustments', fmtMoney(line8), true);
    y += rowH;
    box(col1, y, 540, rowH, '12', 'Total taxes (after credits/adjustments)', fmtMoney(line12), true);
    y += rowH;
    box(col1, y, 540, rowH, '13', 'Total deposits for the quarter', fmtMoney(line13), true);
    y += rowH;
    box(col1, y, 270, rowH, '14', 'Balance due (line 12 − line 13)', fmtMoney(line14), true);
    box(col1 + 270, y, 270, rowH, '15', 'Overpayment (line 13 − line 12)', fmtMoney(line15), true);
    y += rowH + 6;
    // Deposit schedule
    doc.fontSize(8).font('Helvetica-Bold').text('Deposit schedule:', col1, y);
    y += 12;
    const monthlySchedule = line12 < irs_rules_1.IRS_TY_2026.DEPOSIT_THRESHOLD_QUARTERLY;
    doc.fontSize(8).font('Helvetica').text(monthlySchedule
        ? '• Monthly depositor: pay with return (line 12 < $2,500).'
        : '• Semiweekly or monthly depositor (line 12 ≥ $2,500). Complete Schedule B (Form 941).', col1, y, { width: 540 });
    y += 14;
    doc.text(`• If line 12 reaches $${irs_rules_1.IRS_TY_2026.DEPOSIT_NEXT_DAY_TRIGGER.toLocaleString()}+ at any point, deposit by next business day.`, col1, y, { width: 540 });
    y += 20;
    // Filing deadline
    const deadlines = {
        1: 'April 30, ' + (taxYear + 1),
        2: 'July 31, ' + (taxYear + 1),
        3: 'October 31, ' + (taxYear + 1),
        4: 'January 31, ' + (taxYear + 2),
    };
    doc.fontSize(8).font('Helvetica-Bold').text(`Q${quarter} ${taxYear} filing deadline: ${deadlines[quarter]}`, col1, y);
    y += 16;
    doc.fontSize(7).font('Helvetica-Oblique').fillColor('#666')
        .text(`OMB No. 1545-0029  •  ${SOURCE_LINE}`, { align: 'center' });
    doc.fillColor('#cc0000').text('DRAFT — NOT FOR FILING. File official 941 via IRS e-file (https://www.irs.gov/efile) or mail to the IRS service center.', { align: 'center' });
    doc.end();
}
// ─── Form 940 Worksheet (Annual FUTA) ─────────────────────────────────────
function generate940Worksheet(taxYear, totals, res) {
    const doc = new pdfkit_1.default({ size: 'LETTER', margin: 36 });
    doc.pipe(res);
    draftBanner(doc);
    doc.fontSize(14).font('Helvetica-Bold').text(`Form 940 Worksheet — Tax Year ${taxYear}`, { align: 'center' });
    doc.fontSize(9).font('Helvetica').text('Employer\'s Annual Federal Unemployment (FUTA) Tax Return (DRAFT)', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(8).text(`Revision: 2025  •  ${SOURCE_LINE}`, { align: 'center' });
    doc.moveDown(0.5);
    const col1 = 36, rowH = 22, w540 = 540;
    let y = doc.y;
    function label(x, yy, t) {
        doc.fontSize(7).font('Helvetica').fillColor('#444').text(t, x + 3, yy + 2);
    }
    function value(x, yy, w, t, bold = false) {
        doc.fontSize(9).font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor('#000')
            .text(t, x + 3, yy + 10, { width: w - 6 });
    }
    function cell(x, yy, w, h) { doc.rect(x, yy, w, h).stroke(); }
    function box(x, yy, w, h, lbl, desc, val, money = true) {
        cell(x, yy, w, h);
        label(x, yy, `Line ${lbl} — ${desc}`);
        value(x, yy, w, money ? `$${fmtMoney(Number(val) || 0)}` : val, true);
    }
    const rules = (0, irs_rules_1.rulesForYear)(taxYear);
    // Compute FUTA per 940 instructions
    const totalPayments = totals.totalPayments;
    const paymentsExempt = totals.paymentsExemptFromFUTA;
    const line3 = totalPayments - paymentsExempt;
    const line4 = line3 * rules.FUTA_RATE;
    const line5 = totals.stateUnemploymentContributions;
    // 5.4% max credit if state is not credit-reduced
    const maxCredit = line3 * 0.054;
    const line6 = Math.min(line5, maxCredit);
    const line7 = line4 - line6;
    // 6% gross FUTA × first $7,000 per employee (line 7 formula)
    const line8 = line7;
    const line9 = 0; // special credits (e.g., Section 3305(f) exempt employers)
    const line10 = 0; // adjustments
    const line11 = 0; // credit reduction
    const line12 = line8 - line9 + line10 + line11;
    const line13 = 0; // total deposits
    const line14 = line12 > line13 ? line12 - line13 : 0;
    const line15 = line13 > line12 ? line13 - line12 : 0;
    // Step 1: tell us about your return
    box(col1, y, 540, rowH, '1a', 'State where you paid SUI', '—', false);
    y += rowH;
    box(col1, y, 540, rowH, '1b', 'State ID number', '—', false);
    y += rowH;
    box(col1, y, 540, rowH, '2', 'Total payments to all employees', fmtMoney(totalPayments), true);
    y += rowH;
    box(col1, y, 540, rowH, '3', 'Payments exempt from FUTA', fmtMoney(paymentsExempt), true);
    y += rowH;
    box(col1, y, 540, rowH, '4', 'Gross FUTA wages (line 3 capped at $7,000/employee)', `$${fmtMoney(Math.min(line3, rules.FUTA_WAGE_BASE))}`, true);
    y += rowH;
    box(col1, y, 540, rowH, '5', 'Allowable state unemployment tax', fmtMoney(line5), true);
    y += rowH;
    box(col1, y, 540, rowH, '6', 'Credit (5.4% of line 4, capped at line 5)', fmtMoney(line6), true);
    y += rowH;
    box(col1, y, 540, rowH, '7', 'FUTA tax before adjustments (line 4 − line 6)', fmtMoney(line7), true);
    y += rowH;
    box(col1, y, 540, rowH, '8', 'Total FUTA tax after adjustments', fmtMoney(line8), true);
    y += rowH;
    box(col1, y, 540, rowH, '9', 'Special credits (e.g., Sec 3305(f) exempt)', fmtMoney(line9), true);
    y += rowH;
    box(col1, y, 540, rowH, '10', 'Adjustments', fmtMoney(line10), true);
    y += rowH;
    box(col1, y, 540, rowH, '11', 'Credit reduction (Schedule A if any)', fmtMoney(line11), true);
    y += rowH;
    box(col1, y, 540, rowH, '12', 'Total FUTA tax due', fmtMoney(line12), true);
    y += rowH;
    box(col1, y, 540, rowH, '13', 'Total deposits for the year', fmtMoney(line13), true);
    y += rowH;
    box(col1, y, 270, rowH, '14', 'Balance due', fmtMoney(line14), true);
    box(col1 + 270, y, 270, rowH, '15', 'Overpayment', fmtMoney(line15), true);
    y += rowH + 6;
    doc.fontSize(8).font('Helvetica-Bold').text('Filing deadline: February 1, ' + (taxYear + 1), col1, y);
    y += 14;
    doc.fontSize(8).font('Helvetica').text('File via IRS e-file (https://www.irs.gov/efile) or mail to the Department of the Treasury, ' +
        'Internal Revenue Service, Kansas City, MO 64999-0044.', col1, y, { width: 540 });
    y += 30;
    doc.fontSize(7).font('Helvetica-Oblique').fillColor('#666')
        .text(`OMB No. 1545-0029  •  ${SOURCE_LINE}`, { align: 'center' });
    doc.fillColor('#cc0000').text('DRAFT — NOT FOR FILING. This worksheet is for calculation reference only. ' +
        'Use IRS e-file or mail the official Form 940 to file.', { align: 'center' });
    doc.end();
}
//# sourceMappingURL=pdf.js.map