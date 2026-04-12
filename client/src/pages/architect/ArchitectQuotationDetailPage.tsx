import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Building2, User, Phone, Mail, MapPin,
  FileText, CheckCircle, Clock, Package, ReceiptText
} from 'lucide-react';
import { useArchitectQuotationById } from '../../hooks/useApi';
import { useAuthStore } from '../../stores/authStore';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ImagePreview } from '@/components/ui/image-preview';
import { HoldBanner } from '@/components/ui/HoldBanner';

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
      className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm"
    >
      <div className="flex items-center gap-2.5 text-muted-foreground/80">
        <Icon size={16} />
        <p className="text-sm font-black uppercase tracking-wider">{title}</p>
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </motion.div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-muted-foreground text-sm font-medium shrink-0">{label}</span>
      <span className="text-foreground text-sm font-bold text-right">{value}</span>
    </div>
  );
}

export default function ArchitectQuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useArchitectQuotationById(id || '');
  const user = useAuthStore(s => s.user);
  const isProjectDesigner = user?.role === 'project_designer' || user?.role?.toLowerCase() === 'project designer';
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
      {q.status === 'on_hold' && (
        <HoldBanner 
          entityType="Quotation" 
          reason={q.onHoldReason} 
          onAt={q.onHoldAt} 
        />
      )}
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <button
          onClick={() => navigate('/architect/quotations')}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm font-bold transition-colors mb-4 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Quotations
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">{q.quotationNumber}</h1>
            <p className="text-muted-foreground text-base md:text-lg font-medium mt-1">{q.projectName}</p>
          </div>
          <Badge className={cn('text-sm md:text-base font-black border rounded-full px-5 py-1.5', st.color)}>{st.label}</Badge>
        </div>
      </motion.div>

      {/* Commission Banner — hidden for project_designer */}
      {!isProjectDesigner && (
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
          <div className="flex items-center gap-4">
            <div className={cn('size-14 rounded-2xl flex items-center justify-center shadow-sm', isEarned ? 'bg-emerald-500/20' : 'bg-yellow-500/20')}>
              {isEarned ? <CheckCircle size={26} className="text-emerald-600" /> : <Clock size={26} className="text-yellow-600" />}
            </div>
            <div>
              <p className="text-foreground font-black text-lg md:text-xl tracking-tight">{isEarned ? 'Ooroo Earned' : 'Ooroo Pending'}</p>
              <p className="text-muted-foreground text-sm font-medium mt-0.5">
                {isEarned ? 'Admin has approved this quotation.' : 'Awaiting admin approval.'}
              </p>
            </div>
          </div>
          <div className="text-center sm:text-right">
            <p className={cn('text-4xl md:text-5xl font-black tracking-tighter', isEarned ? 'text-emerald-600' : 'text-yellow-600')}>
              {((q.architectCommissionAmount || 0)/1000).toFixed(3)}
            </p>
          </div>
        </motion.div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Client */}
        <InfoCard icon={User} title="Client">
          <p className="text-foreground font-black text-lg tracking-tight">{q.clientId?.name || '—'}</p>
          {q.clientId?.firmName && <p className="text-muted-foreground text-sm font-bold tracking-tight opacity-70 italic">{q.clientId.firmName}</p>}
          <div className="space-y-1.5 mt-2">
            {q.clientId?.phone && (
              <div className="flex items-center gap-2 text-muted-foreground/80 text-sm font-medium">
                <Phone size={13} /> {q.clientId.phone}
              </div>
            )}
            {q.clientId?.email && (
              <div className="flex items-center gap-2 text-muted-foreground/80 text-sm font-medium">
                <Mail size={13} /> {q.clientId.email}
              </div>
            )}
            {q.clientId?.address?.city && (
              <div className="flex items-center gap-2 text-muted-foreground/80 text-sm font-medium">
                <MapPin size={13} /> {q.clientId.address.city}
              </div>
            )}
          </div>
        </InfoCard>

        {/* Company */}
        <InfoCard icon={Building2} title="Company">
          <p className="text-foreground font-black text-lg tracking-tight">{q.companyId?.name || '—'}</p>
          <div className="space-y-1.5 mt-2">
            {q.companyId?.phone && (
              <div className="flex items-center gap-2 text-muted-foreground/80 text-sm font-medium">
                <Phone size={13} /> {q.companyId.phone}
              </div>
            )}
            {q.companyId?.email && (
              <div className="flex items-center gap-2 text-muted-foreground/80 text-sm font-medium">
                <Mail size={13} /> {q.companyId.email}
              </div>
            )}
          </div>
        </InfoCard>

        {/* Quotation Info */}
        <InfoCard icon={FileText} title="Quotation Info">
          <div className="space-y-2">
            <InfoRow label="Date" value={q.createdAt ? format(new Date(q.createdAt), 'dd MMM yyyy') : null} />
            <InfoRow label="Valid Until" value={q.validUntil ? format(new Date(q.validUntil), 'dd MMM yyyy') : null} />
            <InfoRow label="Delivery" value={q.deliveryDays || null} />
            <InfoRow label="Advance" value={q.advancePercent != null ? `${q.advancePercent}%` : null} />

          </div>
        </InfoCard>

        {/* Financials — hidden for project_designer, show simplified Project Terms instead */}
        {isProjectDesigner ? (
          <InfoCard icon={FileText} title="Project Terms">
            <div className="space-y-2">
              <InfoRow label="Advance" value={q.advancePercent != null ? `${q.advancePercent}%` : null} />

              <InfoRow label="Delivery" value={q.deliveryDays || null} />
            </div>
          </InfoCard>
        ) : (
          <InfoCard icon={ReceiptText} title="Financials">
            <div className="space-y-2">
              <InfoRow label="Subtotal" value={fmt(q.subtotal)} />
              {q.discount > 0 && <InfoRow label="Discount" value={`− ${fmt(q.discount)}`} />}
              <div className="border-t border-border/30 pt-2">
                <InfoRow label="Grand Total" value={fmt(q.grandTotal || (q.subtotal - (q.discount || 0)))} />
              </div>
              <div className="border-t border-primary/20 pt-2">
                <InfoRow
                  label={`Ooroo`}
                  value={((q.architectCommissionAmount || 0)/1000).toFixed(3)}
                />
              </div>
            </div>
          </InfoCard>
        )}
      </div>

      {/* Linked Project & Job Cards */}
      {(q.projectId || (q.jobCards && q.jobCards.length > 0)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {q.projectId && (
            <Link to={`/architect/projects/${q.projectId}`}>
              <motion.div whileHover={{ scale: 1.01 }} className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex items-center justify-between group transition-colors hover:bg-primary/10 h-full">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                    <CheckCircle size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-primary/60">Linked Project</p>
                    <p className="text-foreground font-black text-base md:text-lg uppercase tracking-tight">{q.projectNumber || 'View Project'}</p>
                  </div>
                </div>
                <div className="text-primary italic text-xs font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">View Detail →</div>
              </motion.div>
            </Link>
          )}

          {q.jobCards && q.jobCards.length > 0 && (
            <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6 space-y-4 h-full">
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 shadow-sm"><Package size={18} /></div>
                <p className="text-xs font-black uppercase tracking-widest text-indigo-500/60">Related Job Cards ({q.jobCards.length})</p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {q.jobCards.map((jc: any) => (
                  <Link key={jc._id} to={`/architect/jobcards/${jc._id}`}>
                    <span className="px-4 py-2 rounded-xl bg-white/60 dark:bg-card border border-indigo-500/30 text-indigo-600 text-xs font-black uppercase tracking-tight hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                      {jc.jobCardNumber}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Items Table */}
      {q.items && q.items.length > 0 && (
        <div className="bg-card border border-border/60 rounded-3xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border/30 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <Package size={14} />
            </div>
            <p className="font-black text-sm tracking-wider text-foreground">Items ({q.items.length})</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/20 border-b border-border/20">
                  {(isProjectDesigner
                    ? ['#', 'Item Description', 'Qty']
                    : ['#', 'Item Description', 'Qty', 'Rate', 'Total Amount']
                  ).map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[9px] font-black tracking-widest text-muted-foreground/40">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {q.items.map((item: any, idx: number) => (
                  <tr key={item._id || idx} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4 text-muted-foreground/40 font-black text-xs">{item.srNo || idx + 1}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-4">
                        {(item.photo || item.fabricPhoto || (item.photos && item.photos.length > 0)) && (
                          <div className="flex gap-2 shrink-0 flex-wrap max-w-[200px]">
                            {item.photo && (
                              <div className="w-16 h-16">
                                <ImagePreview src={item.photo} alt="Main" />
                              </div>
                            )}
                            {item.fabricPhoto && (
                              <div className="w-16 h-16">
                                <ImagePreview src={item.fabricPhoto} alt="Fabric" />
                              </div>
                            )}
                            {item.photos?.map((url: string, i: number) => (
                              <div key={i} className="w-16 h-16">
                                <ImagePreview src={url} alt={`Photo ${i + 1}`} />
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex-1 space-y-1.5">
                          <p className="text-[16px] font-black text-foreground tracking-tight uppercase">{item.name || item.category}</p>
                          <p className="text-[13px] font-medium text-foreground/70 leading-relaxed mb-2 italic line-clamp-3">{item.description}</p>
                          <div className="flex flex-col gap-1">
                            {item.specifications?.size && <p className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-wider">Size: {item.specifications.size}</p>}
                            {item.specifications?.material && <p className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-wider">Material: {item.specifications.material}</p>}
                            {item.specifications?.polish && <p className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-wider">Polish: {item.specifications.polish}</p>}
                            {item.specifications?.fabric && <p className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-wider">Fabric: {item.specifications.fabric}</p>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[14px] font-bold text-foreground/70 tracking-tight whitespace-nowrap">{item.qty} {item.unit || 'pcs'}</td>
                    {!isProjectDesigner && (
                      <>
                        <td className="px-5 py-4 text-[14px] font-bold text-foreground/70 tracking-tight">{fmt(item.sellingPrice || 0)}</td>
                        <td className="px-5 py-4 text-[15px] font-black text-foreground tracking-tight">{fmt(item.totalPrice || (item.qty * (item.sellingPrice || 0)))}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Additional Terms */}
      {q.additionalTerms && q.additionalTerms.length > 0 && (
        <InfoCard icon={FileText} title="Terms & Conditions">
          <ul className="space-y-2 list-disc list-inside px-1">
            {q.additionalTerms.map((term: string, i: number) => (
              <li key={i} className="text-muted-foreground text-sm leading-relaxed font-bold opacity-80">{term}</li>
            ))}
          </ul>
        </InfoCard>
      )}
    </div>
  );
}
