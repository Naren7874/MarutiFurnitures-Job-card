import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Building2, User, Phone, Mail, MapPin,
  FileText, CheckCircle, Clock, Package, ReceiptText
} from 'lucide-react';
import { useArchitectQuotationById } from '../../hooks/useApi';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n ?? 0);

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:     { label: 'Pending',   color: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/20' },
  sent:      { label: 'Sent',      color: 'bg-blue-500/15 text-blue-500 border-blue-500/20' },
  approved:  { label: 'Approved',  color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20' },
  rejected:  { label: 'Rejected',  color: 'bg-red-500/15 text-red-500 border-red-500/20' },
  converted: { label: 'Converted', color: 'bg-primary/15 text-primary border-primary/20' },
  revised:   { label: 'Revised',   color: 'bg-purple-500/15 text-purple-500 border-purple-500/20' },
};

function DetailSkeleton() {
  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function InfoCard({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl p-5 space-y-3"
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon size={15} />
        <p className="text-xs font-black uppercase tracking-wider">{title}</p>
      </div>
      {children}
    </motion.div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-muted-foreground text-xs shrink-0">{label}</span>
      <span className="text-foreground text-xs font-bold text-right">{value}</span>
    </div>
  );
}

export default function ArchitectQuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useArchitectQuotationById(id || '');
  const q: any = (data as any)?.data;

  if (isLoading) return <DetailSkeleton />;
  if (!q) {
    return (
      <div className="p-8 text-center text-muted-foreground/40 font-bold italic">
        Quotation not found.
      </div>
    );
  }

  const st = STATUS_CONFIG[q.status] || { label: q.status, color: 'bg-muted text-muted-foreground' };
  const isEarned = ['approved', 'converted'].includes(q.status);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <button
          onClick={() => navigate('/architect/quotations')}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm font-semibold transition-colors mb-3"
        >
          <ArrowLeft size={15} /> Back to Quotations
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">{q.quotationNumber}</h1>
            <p className="text-muted-foreground text-sm mt-1">{q.projectName}</p>
          </div>
          <Badge className={cn('text-sm font-bold border rounded-full px-4 py-1', st.color)}>{st.label}</Badge>
        </div>
      </motion.div>

      {/* Commission Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05 }}
        className={cn(
          'rounded-2xl p-5 border flex flex-col sm:flex-row items-center justify-between gap-4',
          isEarned
            ? 'bg-emerald-500/8 border-emerald-500/20'
            : 'bg-yellow-500/8 border-yellow-500/20'
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn('size-12 rounded-xl flex items-center justify-center', isEarned ? 'bg-emerald-500/15' : 'bg-yellow-500/15')}>
            {isEarned ? <CheckCircle size={22} className="text-emerald-500" /> : <Clock size={22} className="text-yellow-500" />}
          </div>
          <div>
            <p className="text-foreground font-black text-base">{isEarned ? 'Commission Earned' : 'Commission Pending'}</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              {isEarned ? 'Admin has approved this quotation.' : 'Awaiting admin approval.'}
            </p>
          </div>
        </div>
        <div className="text-center sm:text-right">
          <p className={cn('text-3xl font-black', isEarned ? 'text-emerald-500' : 'text-yellow-500')}>
            {fmt(q.architectCommissionAmount || 0)}
          </p>
          <p className="text-muted-foreground text-xs">
            {q.architectCommissionPercent || 0}% of {fmt(q.subtotal || 0)} subtotal
          </p>
        </div>
      </motion.div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Client */}
        <InfoCard icon={User} title="Client">
          <p className="text-foreground font-black text-base">{q.clientId?.name || '—'}</p>
          {q.clientId?.firmName && <p className="text-muted-foreground text-xs">{q.clientId.firmName}</p>}
          {q.clientId?.phone && (
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mt-1">
              <Phone size={11} /> {q.clientId.phone}
            </div>
          )}
          {q.clientId?.email && (
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <Mail size={11} /> {q.clientId.email}
            </div>
          )}
          {q.clientId?.address?.city && (
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <MapPin size={11} /> {q.clientId.address.city}
            </div>
          )}
        </InfoCard>

        {/* Company */}
        <InfoCard icon={Building2} title="Company">
          <p className="text-foreground font-black text-base">{q.companyId?.name || '—'}</p>
          {q.companyId?.phone && (
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mt-1">
              <Phone size={11} /> {q.companyId.phone}
            </div>
          )}
          {q.companyId?.email && (
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <Mail size={11} /> {q.companyId.email}
            </div>
          )}
        </InfoCard>

        {/* Quotation Info */}
        <InfoCard icon={FileText} title="Quotation Info">
          <div className="space-y-2">
            <InfoRow label="Date" value={q.createdAt ? format(new Date(q.createdAt), 'dd MMM yyyy') : null} />
            <InfoRow label="Valid Until" value={q.validUntil ? format(new Date(q.validUntil), 'dd MMM yyyy') : null} />
            <InfoRow label="Delivery" value={q.deliveryDays || null} />
            <InfoRow label="Advance" value={q.advancePercent != null ? `${q.advancePercent}%` : null} />
            <InfoRow label="GST Type" value={q.gstType?.replace('_', ' + ').toUpperCase() || null} />
          </div>
        </InfoCard>

        {/* Financials */}
        <InfoCard icon={ReceiptText} title="Financials">
          <div className="space-y-2">
            <InfoRow label="Subtotal" value={fmt(q.subtotal)} />
            {q.discount > 0 && <InfoRow label="Discount" value={`− ${fmt(q.discount)}`} />}
            <div className="border-t border-border/30 pt-2">
              <InfoRow label="Grand Total" value={fmt(q.grandTotal || (q.subtotal - (q.discount || 0)))} />
            </div>
            <div className="border-t border-primary/20 pt-2">
              <InfoRow
                label={`My Commission (${q.architectCommissionPercent || 0}%)`}
                value={fmt(q.architectCommissionAmount || 0)}
              />
            </div>
          </div>
        </InfoCard>
      </div>

      {/* Items Table */}
      {q.items && q.items.length > 0 && (
        <InfoCard icon={Package} title={`Items (${q.items.length})`}>
          <div className="space-y-3 -mx-1">
            <div className="grid grid-cols-12 text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 px-1 pb-1 border-b border-border/20">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Item</div>
              <div className="col-span-2 text-right">Qty</div>
              <div className="col-span-2 text-right">Rate</div>
              <div className="col-span-2 text-right">Total</div>
            </div>
            {q.items.map((item: any, idx: number) => (
              <div key={item._id || idx} className="grid grid-cols-12 text-xs px-1 py-1.5 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="col-span-1 text-muted-foreground font-bold">{item.srNo || idx + 1}</div>
                <div className="col-span-5">
                  <p className="text-foreground font-bold truncate">{item.name}</p>
                  {item.description && <p className="text-muted-foreground text-[10px] truncate mt-0.5">{item.description}</p>}
                  {item.specifications?.size && (
                    <p className="text-muted-foreground/60 text-[10px]">{item.specifications.size}</p>
                  )}
                </div>
                <div className="col-span-2 text-right text-muted-foreground font-bold">{item.qty}</div>
                <div className="col-span-2 text-right text-muted-foreground font-bold">{fmt(item.sellingPrice || 0)}</div>
                <div className="col-span-2 text-right text-foreground font-black">{fmt(item.totalPrice || item.qty * (item.sellingPrice || 0))}</div>
              </div>
            ))}
          </div>
        </InfoCard>
      )}

      {/* Additional Terms */}
      {q.additionalTerms && q.additionalTerms.length > 0 && (
        <InfoCard icon={FileText} title="Terms & Conditions">
          <ul className="space-y-1.5 list-disc list-inside">
            {q.additionalTerms.map((term: string, i: number) => (
              <li key={i} className="text-muted-foreground text-xs">{term}</li>
            ))}
          </ul>
        </InfoCard>
      )}
    </div>
  );
}
