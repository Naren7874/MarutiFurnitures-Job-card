import { AlertCircle, Pause } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface HoldBannerProps {
    reason?: string;
    onAt?: string;
    entityType: 'Quotation' | 'Project' | 'Job Card' | 'Invoice' | 'Proforma Invoice';
    className?: string;
}

export function HoldBanner({ reason, onAt, entityType, className }: HoldBannerProps) {
    const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "relative overflow-hidden bg-rose-500/10 border border-rose-500/20 rounded-3xl p-5 md:p-6 mb-8",
                className
            )}
        >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12 pointer-events-none">
                <Pause size={120} strokeWidth={3} />
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
                {/* Icon Circle */}
                <div className="shrink-0 w-12 h-12 flex items-center justify-center rounded-2xl bg-rose-500/20 text-rose-500 shadow-lg shadow-rose-500/10">
                    <AlertCircle size={24} />
                </div>

                <div className="flex-1 space-y-1">
                    <h3 className="text-rose-500 font-black text-lg tracking-tight uppercase">
                        This {entityType} is ON HOLD
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        {reason && (
                            <p className="text-sm font-bold text-rose-500/70">
                                <span className="text-[10px] uppercase tracking-wider opacity-50 mr-2">Reason:</span>
                                {reason}
                            </p>
                        )}
                        {onAt && (
                            <p className="text-xs font-semibold text-muted-foreground/50">
                                <span className="text-[10px] uppercase tracking-wider opacity-40 mr-2">Since:</span>
                                {fmtDate(onAt)}
                            </p>
                        )}
                    </div>
                </div>

                <div className="hidden md:block px-4 py-2 rounded-xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-rose-500/20">
                    Paused
                </div>
            </div>
            
            <p className="mt-3 text-[11px] font-medium text-rose-500/40 italic">
                All production and financial operations for this {entityType.toLowerCase()} are currently suspended.
            </p>
        </motion.div>
    );
}
