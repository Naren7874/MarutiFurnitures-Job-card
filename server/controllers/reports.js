import mongoose from 'mongoose';
import { Invoice } from '../models/Invoice.js';
import JobCard from '../models/JobCard.js';
import Project from '../models/Project.js';
import Quotation from '../models/Quotation.js';
import { PurchaseOrder } from '../models/PurchaseOrder.js';
import { Inventory } from '../models/Inventory.js';
import { Parser } from 'json2csv';

/** Cast string companyId to ObjectId for aggregation pipelines */
const toOid = (id) => new mongoose.Types.ObjectId(id);

/**
 * Helper: get start of current month / quarter
 */
const startOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

const monthRange = (monthsAgo = 0) => {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth() - monthsAgo, 1);
  const end   = new Date(d.getFullYear(), d.getMonth() - monthsAgo + 1, 0, 23, 59, 59);
  return { start, end };
};

// ── GET /api/reports/financial ────────────────────────────────────────────────
export const getFinancialReport = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    // Last 6 months data
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const { start, end } = monthRange(i);
      const agg = await Invoice.aggregate([
        { $match: { companyId: toOid(companyId), createdAt: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: null,
            totalInvoiced: { $sum: '$grandTotal' },
            totalReceived: { $sum: '$advancePaid' },
            count:         { $sum: 1 },
          },
        },
      ]);
      const label = start.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      monthlyData.push({
        label,
        totalInvoiced: agg[0]?.totalInvoiced || 0,
        totalReceived: agg[0]?.totalReceived || 0,
        count:         agg[0]?.count || 0,
      });
    }

    // Summary (all time / this month)
    const [summary] = await Invoice.aggregate([
      { $match: { companyId: toOid(companyId) } },
      {
        $group: {
          _id: null,
          totalInvoiced:  { $sum: '$grandTotal' },
          totalReceived:  { $sum: '$advancePaid' },
          totalOverdue:   { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, '$balanceDue', 0] } },
          countPaid:      { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
          countOverdue:   { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } },
          countPending:   { $sum: { $cond: [{ $in: ['$status', ['sent', 'partially_paid']] }, 1, 0] } },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        monthly: monthlyData,
        summary: summary || {
          totalInvoiced: 0, totalReceived: 0, totalOverdue: 0,
          countPaid: 0, countOverdue: 0, countPending: 0,
        },
      },
    });
  } catch (err) { next(err); }
};

// ── GET /api/reports/outstanding ──────────────────────────────────────────────
export const getOutstandingReport = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const invoices = await Invoice.find({
      companyId,
      status: { $in: ['sent', 'partially_paid', 'overdue'] },
    })
      .populate('clientId', 'name phone email')
      .populate('projectId', 'projectName')
      .lean();

    const now = Date.now();
    const aging = invoices.map(inv => {
      const balance = (inv.grandTotal || 0) - (inv.advancePaid || 0);
      const daysOverdue = inv.dueDate
        ? Math.max(0, Math.floor((now - new Date(inv.dueDate).getTime()) / 86400000))
        : 0;
      return {
        invoiceNumber: inv.invoiceNumber,
        clientName:    inv.clientId?.name || 'Unknown',
        phone:         inv.clientId?.phone,
        project:       inv.projectId?.projectName || '',
        grandTotal:    inv.grandTotal,
        totalPaid:     inv.advancePaid || 0,
        balance,
        dueDate:       inv.dueDate,
        daysOverdue,
        bucket: daysOverdue === 0 ? 'current'
          : daysOverdue <= 30  ? '1-30'
          : daysOverdue <= 60  ? '31-60'
          : daysOverdue <= 90  ? '61-90'
          : '90+',
      };
    });

    res.json({ success: true, data: aging });
  } catch (err) { next(err); }
};

// ── GET /api/reports/production ───────────────────────────────────────────────
export const getProductionReport = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const bystatus = await JobCard.aggregate([
      { $match: { companyId: toOid(companyId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const statusMap = {};
    bystatus.forEach(s => { statusMap[s._id] = s.count; });

    // Avg time in production (created to delivered, delivered only)
    const [avgData] = await JobCard.aggregate([
      { $match: { companyId: toOid(companyId), status: 'delivered', actualDelivery: { $exists: true } } },
      {
        $group: {
          _id: null,
          avgDays: {
            $avg: {
              $divide: [
                { $subtract: ['$actualDelivery', '$createdAt'] },
                86400000,
              ],
            },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    // Monthly throughput (created vs delivered)
    const monthly = [];
    for (let i = 5; i >= 0; i--) {
      const { start, end } = monthRange(i);
      const [cr] = await JobCard.aggregate([
        { $match: { companyId: toOid(companyId), createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, count: { $sum: 1 } } },
      ]);
      const [dl] = await JobCard.aggregate([
        { $match: { companyId: toOid(companyId), actualDelivery: { $gte: start, $lte: end } } },
        { $group: { _id: null, count: { $sum: 1 } } },
      ]);
      monthly.push({
        label:     start.toLocaleString('en-IN', { month: 'short', year: '2-digit' }),
        created:   cr?.count || 0,
        delivered: dl?.count || 0,
      });
    }

    res.json({
      success: true,
      data: {
        byStatus:   statusMap,
        avgDaysToDeliver: avgData?.avgDays ? Math.round(avgData.avgDays) : null,
        totalDelivered:   avgData?.count || 0,
        monthly,
      },
    });
  } catch (err) { next(err); }
};

// ── GET /api/reports/delivery ─────────────────────────────────────────────────
export const getDeliveryReport = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const [delivered] = await JobCard.aggregate([
      { $match: { companyId: toOid(companyId), status: 'delivered', actualDelivery: { $exists: true } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          onTime: {
            $sum: {
              $cond: [
                { $lte: ['$actualDelivery', '$expectedDelivery'] },
                1,
                0,
              ],
            },
          },
          late: {
            $sum: {
              $cond: [
                { $gt: ['$actualDelivery', '$expectedDelivery'] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const total   = delivered?.total  || 0;
    const onTime  = delivered?.onTime || 0;
    const late    = delivered?.late   || 0;
    const onTimePct = total > 0 ? Math.round((onTime / total) * 100) : 0;

    res.json({
      success: true,
      data: { total, onTime, late, onTimePct },
    });
  } catch (err) { next(err); }
};

// ── GET /api/reports/export ───────────────────────────────────────────────────
export const exportReport = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const invoices = await Invoice.find({ companyId })
      .populate('clientId', 'name phone')
      .populate('projectId', 'projectName')
      .lean();

    const rows = invoices.map(inv => ({
      invoiceNumber:  inv.invoiceNumber,
      client:         inv.clientId?.name,
      phone:          inv.clientId?.phone,
      project:        inv.projectId?.projectName,
      grandTotal:     inv.grandTotal,
      totalPaid:      inv.advancePaid || 0,
      balance:        (inv.grandTotal || 0) - (inv.advancePaid || 0),
      status:         inv.status,
      createdAt:      inv.createdAt?.toISOString().split('T')[0],
      dueDate:        inv.dueDate?.toISOString?.()?.split('T')[0] || '',
    }));

    const parser = new Parser();
    const csv    = parser.parse(rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="financial_report_${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) { next(err); }
};

// ── GET /api/reports/dashboard-stats ─────────────────────────────────────────
export const getDashboardStats = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const oid = toOid(companyId);

    // Date ranges for trend analysis
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const sixtyDaysAgo  = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));

    // 1. Core Summary Metrics
    const [
      activeProjects,
      totalProjects,
      completedProjects,
      jobCardByStatus,
      invoiceSummary,
      quotationSummary,
      pendingPOs,
      lowStockCount,
      // Trend data (Current 30 days)
      currProjects,
      currJobCards,
      currSentQuotes,
      currQCPending,
      // Trend data (Previous 30 days)
      prevProjects,
      prevJobCards,
      prevSentQuotes,
      prevQCPending,
    ] = await Promise.all([
      Project.countDocuments({ companyId, status: 'active' }),
      Project.countDocuments({ companyId }),
      Project.countDocuments({ companyId, status: 'completed' }),
      JobCard.aggregate([
        { $match: { companyId: oid } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Invoice.aggregate([
        { $match: { companyId: oid } },
        {
          $group: {
            _id: null,
            totalAmount:   { $sum: '$grandTotal' },
            received:      { $sum: '$advancePaid' },
            overdueCount:  { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } },
            overdueAmount: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, '$balanceDue', 0] } },
          },
        },
      ]),
      Quotation.aggregate([
        { $match: { companyId: oid } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      PurchaseOrder.countDocuments({ companyId, status: 'raised' }),
      Inventory.countDocuments({ companyId, $expr: { $lte: ['$currentStock', '$minStock'] } }),

      Project.countDocuments({ companyId, createdAt: { $gte: thirtyDaysAgo } }),
      JobCard.countDocuments({ companyId, createdAt: { $gte: thirtyDaysAgo } }),
      Quotation.countDocuments({ companyId, status: 'sent', updatedAt: { $gte: thirtyDaysAgo } }),
      JobCard.countDocuments({ companyId, status: 'qc_pending', updatedAt: { $gte: thirtyDaysAgo } }),

      Project.countDocuments({ companyId, createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }),
      JobCard.countDocuments({ companyId, createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }),
      Quotation.countDocuments({ companyId, status: 'sent', updatedAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }),
      JobCard.countDocuments({ companyId, status: 'qc_pending', updatedAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }),
    ]);

    const statusMap = {};
    jobCardByStatus.forEach(s => { statusMap[s._id] = s.count; });
    const qMap = {};
    quotationSummary.forEach(q => { qMap[q._id] = q.count; });

    const inv = invoiceSummary[0] || {};

    const calcChange = (curr, prev) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return parseFloat(((curr - prev) / prev * 100).toFixed(1));
    };

    // 2. Revenue (Invoiced vs Received) for MTD
    const { start: mStart, end: mEnd } = monthRange(0);
    const [monthlyInvoicedAgg] = await Invoice.aggregate([
      { $match: { companyId: oid, createdAt: { $gte: mStart, $lte: mEnd } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } },
    ]);
    const [monthlyReceivedAgg] = await Invoice.aggregate([
      { $match: { companyId: oid } },
      { $unwind: '$payments' },
      { $match: { 'payments.paidAt': { $gte: mStart, $lte: mEnd } } },
      { $group: { _id: null, total: { $sum: '$payments.amount' } } },
    ]);

    // 3. Historical Trend
    const trendMonths = parseInt(req.query.months) || 6;
    const trend = [];
    for (let i = trendMonths - 1; i >= 0; i--) {
      const { start, end } = monthRange(i);
      const [invAgg] = await Invoice.aggregate([
        { $match: { companyId: oid, createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]);
      const [recAgg] = await Invoice.aggregate([
        { $match: { companyId: oid } },
        { $unwind: '$payments' },
        { $match: { 'payments.paidAt': { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: '$payments.amount' } } },
      ]);
      const label = start.toLocaleString('en-IN', { month: 'short' });
      trend.push({
        label,
        totalInvoiced: invAgg?.total || 0,
        totalReceived: recAgg?.total || 0,
      });
    }

    res.json({
      success: true,
      data: {
        projects: {
          active: activeProjects,
          total: totalProjects,
          completed: completedProjects,
          change: calcChange(currProjects, prevProjects)
        },
        jobCards: {
          byStage: statusMap,
          total: Object.values(statusMap).reduce((a, b) => a + b, 0),
          change: calcChange(currJobCards, prevJobCards),
          qcPending: statusMap['qc_pending'] || 0,
          qcPendingChange: calcChange(currQCPending, prevQCPending)
        },
        invoices: {
          totalAmount:   inv.totalAmount   || 0,
          received:      inv.received      || 0,
          overdue:       inv.overdueCount  || 0,
          overdueAmount: inv.overdueAmount || 0,
        },
        revenue: {
          thisMonth: monthlyReceivedAgg?.total || 0,
          totalInvoicedThisMonth: monthlyInvoicedAgg?.total || 0,
        },
        trend,
        quotations: {
          total:    Object.values(qMap).reduce((a, b) => a + b, 0),
          pending:  qMap['sent'] || 0,
          change:   calcChange(currSentQuotes, prevSentQuotes),
          draft:    qMap['draft'] || 0,
          approved: qMap['approved'] || 0,
          rejected: qMap['rejected'] || 0,
          converted: qMap['converted'] || 0,
        },
        purchaseOrders: { pending: pendingPOs },
        inventory: { lowStock: lowStockCount },
      },
    });
  } catch (err) { next(err); }
};
