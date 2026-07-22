import { Router, Request, Response } from 'express';
import { z } from 'zod';
import db from '../db';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../db';
import { generate1099Pdf } from '../services/pdf';

const router = Router();
router.use(requireAuth);

router.get('/', (req: Request, res: Response) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const formType = (req.query.formType as string) || 'NEC';
  const rows = db
    .prepare(
      `SELECT f.*, c.firstName, c.lastName, c.businessName, c.tinLast4, c.tinType, c.address
       FROM form1099_records f JOIN contractors c ON c.id = f.contractorId
       WHERE f.companyId = ? AND f.taxYear = ? AND f.formType = ?
       ORDER BY c.lastName, c.firstName`
    )
    .all(req.user!.companyId, year, formType);
  res.json({ forms: rows, year, formType });
});

// 1099-NEC threshold ($600 in 2024)
const NEC_THRESHOLD = 600;

router.get('/nec-eligible', (req: Request, res: Response) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const rows = db
    .prepare(
      `SELECT c.*,
              CASE WHEN c.ytdPayments >= ? THEN 1 ELSE 0 END as needs1099
       FROM contractors c
       WHERE c.companyId = ?
       ORDER BY c.ytdPayments DESC`
    )
    .all(NEC_THRESHOLD, req.user!.companyId);
  res.json({ contractors: rows, threshold: NEC_THRESHOLD, year });
});

router.post('/generate/:contractorId/:year', (req: Request, res: Response) => {
  const contractorId = Number(req.params.contractorId);
  const year = Number(req.params.year);
  const contractor = db
    .prepare('SELECT * FROM contractors WHERE id = ? AND companyId = ?')
    .get(contractorId, req.user!.companyId) as any;
  if (!contractor) return res.status(404).json({ error: 'Contractor not found' });

  const amount = Math.round(contractor.ytdPayments * 100) / 100;
  db.prepare(
    `INSERT INTO form1099_records
     (companyId, contractorId, taxYear, formType, box1NonemployeeComp, box2DirectSales, box3, box4FedTax, status)
     VALUES (?, ?, ?, 'NEC', ?, 0, ?, 0, 'draft')
     ON CONFLICT(contractorId, taxYear, formType) DO UPDATE SET
       box1NonemployeeComp = excluded.box1NonemployeeComp,
       box3 = excluded.box3`
  ).run(req.user!.companyId, contractorId, year, amount, amount);

  const row = db
    .prepare("SELECT id FROM form1099_records WHERE contractorId = ? AND taxYear = ? AND formType = 'NEC'")
    .get(contractorId, year) as any;
  logAudit({
    companyId: req.user!.companyId,
    userId: req.user!.userId,
    action: '1099.generate',
    entity: 'form1099_records',
    entityId: row.id,
  });
  res.json({ id: row.id });
});

router.post('/finalize', (req: Request, res: Response) => {
  const body = z.object({ year: z.number().int(), formType: z.string().default('NEC') }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: 'Invalid input' });
  const r = db
    .prepare("UPDATE form1099_records SET status = 'final' WHERE companyId = ? AND taxYear = ? AND formType = ? AND status = 'draft'")
    .run(req.user!.companyId, body.data.year, body.data.formType);
  logAudit({
    companyId: req.user!.companyId,
    userId: req.user!.userId,
    action: '1099.finalize_all',
    details: { year: body.data.year, formType: body.data.formType },
  });
  res.json({ ok: true, finalized: r.changes });
});

router.get('/pdf/:id', (req: Request, res: Response) => {
  const row = db
    .prepare(
      `SELECT f.*, c.firstName, c.lastName, c.businessName, c.tinLast4, c.tinType, c.address,
              co.name as companyName, co.ein as companyEin, co.address as companyAddress
       FROM form1099_records f
       JOIN contractors c ON c.id = f.contractorId
       JOIN companies co ON co.id = f.companyId
       WHERE f.id = ? AND f.companyId = ?`
    )
    .get(req.params.id, req.user!.companyId) as any;
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="1099-NEC-${row.taxYear}-${row.lastName}.pdf"`);
  generate1099Pdf(row, res);
});

export default router;
