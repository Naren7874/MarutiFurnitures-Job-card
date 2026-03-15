import { Bell, CheckCheck, Clock, AlertCircle, Package, FileText, Receipt, Folder, ShoppingCart } from 'lucide-react';
import { useNotificationStore } from '../stores/notificationStore';
import type { AppNotification } from '../stores/notificationStore';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const TYPE_CFG: Record<string, { icon: any; color: string; bg: string }> = {
    job_card: { icon: Package, color: 'text-primary', bg: 'bg-primary/10' },
    invoice: { icon: Receipt, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    quotation: { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    project: { icon: Folder, color: 'text-violet-500', bg: 'bg-violet-500/10' },
    purchase_order: { icon: ShoppingCart, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    alert: { icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
};

const fmtTime = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

function NotifCard({ n, onRead }: { n: AppNotification; onRead: () => void }) {
    const cfg = TYPE_CFG[n.type] || { icon: Bell, color: 'text-primary', bg: 'bg-primary/10' };
    const Icon = cfg.icon;
    return (
        <motion.div layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }}
            onClick={onRead}
            className={cn('flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer group', n.read ? 'bg-transparent border-border/20 hover:bg-muted/20' : 'bg-primary/3 border-primary/20 hover:bg-primary/5')}>
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110', cfg.bg)}>
                <Icon size={18} className={cfg.color} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <p className={cn('text-sm font-bold leading-snug', n.read ? 'text-foreground/70' : 'text-foreground')}>{n.title}</p>
                    <div className="flex items-center gap-2 shrink-0">
                        {!n.read && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                        <p className="text-[10px] text-muted-foreground/50 font-bold whitespace-nowrap">{fmtTime(n.createdAt)}</p>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground/60 font-medium mt-0.5 leading-relaxed">{n.message}</p>
            </div>
        </motion.div>
    );
}

export default function NotificationsPage() {
    const { notifications, markRead, markAllRead, unreadCount } = useNotificationStore();
    const unread = notifications.filter(n => !n.read);
    const read = notifications.filter(n => n.read);

    return (
        <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-8">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <span className="p-2 rounded-xl bg-primary/10 text-primary"><Bell size={22} /></span>
                        Notifications
                    </h1>
                    <p className="text-muted-foreground/50 text-sm font-bold mt-1">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}</p>
                </div>
                {unreadCount > 0 && (
                    <Button onClick={markAllRead} variant="outline" size="sm" className="rounded-xl font-bold text-xs gap-2 border-border/60 h-10">
                        <CheckCheck size={14} /> Mark All Read
                    </Button>
                )}
            </motion.div>

            <div className="space-y-2">
                {notifications.length === 0 ? (
                    <div className="py-24 text-center">
                        <div className="w-20 h-20 rounded-[28px] bg-muted/20 flex items-center justify-center mx-auto mb-4">
                            <Bell size={32} className="text-muted-foreground/20" />
                        </div>
                        <p className="text-muted-foreground/30 font-black text-sm uppercase tracking-widest">No notifications yet</p>
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {unread.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 px-1">Unread ({unread.length})</p>
                                {unread.map(n => <NotifCard key={n._id} n={n} onRead={() => markRead(n._id)} />)}
                            </div>
                        )}
                        {read.length > 0 && (
                            <div className="space-y-2 pt-4">
                                <div className="flex items-center gap-2 px-1">
                                    <Clock size={11} className="text-muted-foreground/30" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Earlier</p>
                                </div>
                                {read.map(n => <NotifCard key={n._id} n={n} onRead={() => { }} />)}
                            </div>
                        )}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
