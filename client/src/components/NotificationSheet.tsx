/**
 * Notification Sheet
 * A slide-over panel from the right showing real-time in-app notifications.
 * Controlled by notificationStore.isSheetOpen
 */
import { Bell, CheckCheck, X, Package, FileText, Receipt, Folder, ShoppingCart, AlertCircle } from 'lucide-react';
import { useNotificationStore } from '../stores/notificationStore';
import type { AppNotification } from '../stores/notificationStore';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

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

function NotifItem({ n, onRead }: { n: AppNotification; onRead: () => void }) {
    const cfg = TYPE_CFG[n.type] || { icon: Bell, color: 'text-primary', bg: 'bg-primary/10' };
    const Icon = cfg.icon;
    return (
        <button onClick={onRead}
            className={cn('w-full text-left flex items-start gap-3 p-3 rounded-xl transition-all hover:bg-muted/30 group', !n.read && 'bg-primary/2')}>
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', cfg.bg)}>
                <Icon size={15} className={cfg.color} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                    <p className={cn('text-xs font-bold leading-snug', n.read ? 'text-foreground/60' : 'text-foreground')}>{n.title}</p>
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0 mt-1" />}
                </div>
                <p className="text-[11px] text-muted-foreground/50 font-medium mt-0.5 line-clamp-2">{n.message}</p>
                <p className="text-[10px] text-muted-foreground/30 font-bold mt-1">{fmtTime(n.createdAt)}</p>
            </div>
        </button>
    );
}

export default function NotificationSheet() {
    const { notifications, markRead, markAllRead, unreadCount, isSheetOpen, setSheetOpen } = useNotificationStore();

    return (
        <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
            <SheetContent side="right" showCloseButton={false} className="w-[380px] p-0 flex flex-col bg-background border-l border-border">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Bell size={16} className="text-primary" />
                        <SheetTitle className="font-black text-sm text-foreground">Notifications</SheetTitle>
                        {unreadCount > 0 && (
                            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {unreadCount > 0 && (
                            <Button onClick={markAllRead} variant="ghost" size="sm" className="rounded-lg text-[10px] font-bold h-7 gap-1 text-muted-foreground hover:text-primary">
                                <CheckCheck size={11} /> All read
                            </Button>
                        )}
                        <button onClick={() => setSheetOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground/50 hover:text-foreground transition">
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Notifications list */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-muted/20 flex items-center justify-center">
                                <Bell size={20} className="text-muted-foreground/20" />
                            </div>
                            <p className="text-muted-foreground/30 font-black text-xs uppercase tracking-widest">No notifications</p>
                        </div>
                    ) : (
                        <AnimatePresence>
                            {notifications.map(n => (
                                <motion.div key={n._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <NotifItem n={n} onRead={() => markRead(n._id)} />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-border">
                    <a href="/notifications" onClick={() => setSheetOpen(false)}
                        className="block text-center text-xs font-bold text-primary/70 hover:text-primary transition">
                        View all notifications →
                    </a>
                </div>
            </SheetContent>
        </Sheet>
    );
}
