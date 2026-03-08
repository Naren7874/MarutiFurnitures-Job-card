/**
 * Public Client Sign-off Page
 * Route: /signoff/:token (outside of ProtectedRoute)
 * The client clicks a link from the design team and approves/rejects the design.
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiGet, apiPost } from '../lib/axios';
import { CheckCircle2, XCircle, Building2, Loader2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'motion/react';

export default function ClientSignoffPage() {
    const { token } = useParams<{ token: string }>();

    const { data: raw, isLoading, isError } = useQuery({
        queryKey: ['signoff', token],
        queryFn: () => apiGet(`/jobcards/signoff/${token}`),
        retry: false,
    });
    const signoff: any = (raw as any)?.data;

    const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null);
    const [remarks, setRemarks] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const submitMut = useMutation({
        mutationFn: (body: any) => apiPost(`/jobcards/signoff/${token}`, body),
        onSuccess: () => setSubmitted(true),
    });

    if (isLoading) return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <Loader2 size={32} className="animate-spin text-primary" />
        </div>
    );

    if (isError || !signoff) return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                <XCircle size={32} className="text-rose-500" />
            </div>
            <h1 className="text-2xl font-black text-foreground">Link Expired or Invalid</h1>
            <p className="text-muted-foreground/60 font-medium max-w-sm">This sign-off link is no longer valid. Please contact your project manager for a new link.</p>
        </div>
    );

    if (submitted) return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-8 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
                className={`w-20 h-20 rounded-[28px] flex items-center justify-center ${decision === 'approved' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                {decision === 'approved' ? <CheckCircle2 size={40} className="text-white" /> : <XCircle size={40} className="text-white" />}
            </motion.div>
            <div>
                <h1 className="text-2xl font-black text-foreground">{decision === 'approved' ? 'Design Approved!' : 'Revision Requested'}</h1>
                <p className="text-muted-foreground/60 font-medium mt-2">Your response has been recorded. The team has been notified.</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-xl bg-white dark:bg-card/40 border border-border/30 rounded-[32px] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="bg-linear-to-br from-primary to-indigo-600 p-8 text-white">
                    <div className="flex items-center gap-3 mb-4">
                        <Building2 size={20} className="text-white/60" />
                        <span className="text-sm font-bold text-white/80">Maruti Furniture</span>
                    </div>
                    <h1 className="text-2xl font-black mb-1">Design Approval Required</h1>
                    <p className="text-white/60 text-sm font-medium">{signoff.projectName || 'Your Project'}</p>
                </div>

                <div className="p-8 space-y-6">
                    {/* Design Files */}
                    {signoff.files?.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Design Files ({signoff.files.length})</p>
                            <div className="grid grid-cols-2 gap-3">
                                {signoff.files.map((f: any, i: number) => (
                                    <a key={i} href={f.url} target="_blank" rel="noreferrer"
                                        className="block p-4 rounded-2xl bg-muted/20 border border-border/40 hover:border-primary/30 hover:bg-primary/5 transition text-center">
                                        <div className="text-2xl mb-2">📄</div>
                                        <p className="text-xs font-bold text-foreground truncate">{f.name || `File ${i + 1}`}</p>
                                        <p className="text-[10px] text-muted-foreground/40 font-medium mt-0.5">Tap to view</p>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notes from designer */}
                    {signoff.designerNotes && (
                        <div className="p-4 rounded-2xl bg-muted/20 border border-border/30">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">Designer Notes</p>
                            <p className="text-sm font-medium text-foreground/80">{signoff.designerNotes}</p>
                        </div>
                    )}

                    {/* Decision */}
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setDecision('approved')}
                            className={`p-4 rounded-2xl border-2 font-black text-sm flex flex-col items-center gap-2 transition-all ${decision === 'approved' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600' : 'border-border hover:border-emerald-500/40 text-muted-foreground'}`}>
                            <ThumbsUp size={22} />
                            Approve Design
                        </button>
                        <button onClick={() => setDecision('rejected')}
                            className={`p-4 rounded-2xl border-2 font-black text-sm flex flex-col items-center gap-2 transition-all ${decision === 'rejected' ? 'border-rose-500 bg-rose-500/10 text-rose-600' : 'border-border hover:border-rose-500/40 text-muted-foreground'}`}>
                            <ThumbsDown size={22} />
                            Request Changes
                        </button>
                    </div>

                    <AnimatePresence>
                        {decision && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2">
                                <p className="text-xs font-bold text-muted-foreground/60">{decision === 'approved' ? 'Add any final remarks (optional)' : 'Please describe the changes needed *'}</p>
                                <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={3} className="rounded-2xl"
                                    placeholder={decision === 'approved' ? 'Looks great! Proceed with production.' : 'Please change the drawer handle style and add more shelf space…'} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <Button
                        disabled={!decision || (decision === 'rejected' && !remarks.trim()) || submitMut.isPending}
                        onClick={() => submitMut.mutate({ status: decision, remarks })}
                        className={`w-full h-12 rounded-2xl font-black text-sm gap-2 ${decision === 'rejected' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'} text-white`}>
                        {submitMut.isPending ? <Loader2 size={16} className="animate-spin" /> : decision === 'approved' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                        {!decision ? 'Select your decision above' : decision === 'approved' ? 'Confirm Approval' : 'Submit Revision Request'}
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}
