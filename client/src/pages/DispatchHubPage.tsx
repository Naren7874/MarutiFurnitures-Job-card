import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
    Truck, Package, Camera, Search, User, Lock,
    LogOut, Loader2, ChevronRight, CheckCheck,
    AlertCircle, Image as ImageIcon, X
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { apiPatch, apiUpload } from '@/lib/axios';
import { useAuthStore } from '@/stores/authStore';
import { useDispatchTeam, useJobCards } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface JobCard {
    _id: string;
    jobCardNumber: string;
    title: string;
    status: string;
    expectedDelivery: string;
    items: any[];
    clientId: {
        name: string;
        phone: string;
        address?: string;
    };
    dispatchStageId?: {
        _id: string;
        deliveryTeam?: Array<{ name: string; phone: string; role: string }>;
        proofOfDelivery?: {
            photo?: string;
            capturedAt?: string;
        };
    };
}

// ── Main Hub Page ─────────────────────────────────────────────────────────────

export default function DispatchHubPage() {
    const navigate = useNavigate();
    const { logout } = useAuthStore();
    const qc = useQueryClient();
    
    // Identity State
    const [selectedMember, setSelectedMember] = useState<{ id: string, name: string } | null>(null);
    const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
    
    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
    const [filterType, setFilterType] = useState<'all' | 'mine'>('mine');

    // API Data
    const dispatchTeamRes = useDispatchTeam();
    const teamMembers = (dispatchTeamRes.data as any)?.data || [];
    
    // Use the central hook which now handles global dispatch role correctly
    const { data: jobCardsRes, isLoading } = useJobCards({ 
        status: ['qc_passed', 'dispatched', 'delivered'], 
        limit: 100 
    });
    const jobCards: JobCard[] = (jobCardsRes as any)?.data || [];

    // Persist Identity
    useEffect(() => {
        const saved = localStorage.getItem('dispatch_identity');
        if (saved) {
            try {
                setSelectedMember(JSON.parse(saved));
            } catch (e) {
                setIsIdentityModalOpen(true);
            }
        } else {
            setIsIdentityModalOpen(true);
        }
    }, []);

    const handleSelectMember = (member: any) => {
        const identity = { id: member._id, name: member.name };
        setSelectedMember(identity);
        localStorage.setItem('dispatch_identity', JSON.stringify(identity));
        setIsIdentityModalOpen(false);
    };

    const handleLogout = () => {
        localStorage.removeItem('dispatch_identity');
        logout();
        navigate('/login');
    };

    // Filter Logic
    const filteredJobs = jobCards.filter(jc => {
        const matchesSearch = (jc.jobCardNumber?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                            (jc.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                            (jc.clientId?.name?.toLowerCase() || '').includes(searchQuery.toLowerCase());
        
        const matchesTab = activeTab === 'pending' 
            ? ['qc_passed', 'dispatched'].includes(jc.status)
            : jc.status === 'delivered';

        const isMine = jc.dispatchStageId?.deliveryTeam?.some(t => 
            t.name?.trim().toLowerCase() === selectedMember?.name?.trim().toLowerCase()
        );
        const matchesFilter = filterType === 'all' || isMine;
            
        return matchesSearch && matchesTab && matchesFilter;
    });

    return (
        <div className="h-full w-full bg-[#0a0a0b] selection:bg-emerald-500/30 overflow-hidden flex flex-col font-sans text-white">
            {/* Header */}
            <header className="shrink-0 z-30 bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-white/5 w-full flex justify-center">
                <div className="w-full max-w-7xl px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Truck className="size-4.5 text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-xs font-black uppercase tracking-widest text-emerald-400">Dispatch Portal</h1>
                            <p className="text-[9px] text-white/40 font-bold uppercase tracking-[0.1em]">
                                {selectedMember ? `Active: ${selectedMember.name}` : 'Select Identity'} 
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white/60"
                            onClick={() => {
                                qc.invalidateQueries({ queryKey: ['jobcards'] });
                                qc.invalidateQueries({ queryKey: ['dispatch-team'] });
                            }}
                        >
                            <Loader2 className={cn("size-4", (dispatchTeamRes.isFetching || isLoading) && "animate-spin")} />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white/60"
                            onClick={() => setIsIdentityModalOpen(true)}
                        >
                            <User className="size-4" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-xl bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 transition-all text-rose-500"
                            onClick={handleLogout}
                        >
                            <LogOut className="size-4" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-h-0 w-full max-w-7xl mx-auto">
                {/* Search & Tabs */}
                <div className="shrink-0 p-4 pb-4 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative group w-full md:w-96">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-white/30 group-focus-within:text-emerald-500 transition-colors" />
                        <Input 
                            placeholder="Search Job #, Client..." 
                            className="w-full h-10 pl-10 rounded-xl bg-white/5 border-white/5 focus:border-emerald-500/50 focus:ring-0 transition-all text-xs font-medium"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-row gap-3 w-full md:w-auto md:ml-auto">
                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 w-full md:w-64">
                            <button 
                                onClick={() => setActiveTab('pending')}
                                className={cn(
                                    "flex-1 h-9 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                                    activeTab === 'pending' ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "text-white/40 hover:text-white/60"
                                )}
                            >
                                Upcoming
                            </button>
                            <button 
                                onClick={() => setActiveTab('completed')}
                                className={cn(
                                    "flex-1 h-9 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                                    activeTab === 'completed' ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "text-white/40 hover:text-white/60"
                                )}
                            >
                                Completed
                            </button>
                        </div>
                        
                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 w-full md:w-48 overflow-hidden">
                            <button 
                                onClick={() => setFilterType('all')}
                                className={cn(
                                    "flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all",
                                    filterType === 'all' ? "bg-white/15 text-white shadow-md shadow-black/20" : "text-white/30 hover:text-white/50"
                                )}
                            >
                                All
                            </button>
                            <button 
                                onClick={() => setFilterType('mine')}
                                className={cn(
                                    "flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all",
                                    filterType === 'mine' ? "bg-emerald-500/20 text-emerald-400 shadow-md shadow-emerald-500/10" : "text-white/30 hover:text-white/50"
                                )}
                            >
                                My Jobs
                            </button>
                        </div>
                    </div>
                </div>

                {/* Job List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-24">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="size-8 text-emerald-500 animate-spin" />
                            <p className="text-xs font-bold text-white/30 uppercase tracking-widest">Loading deliveries...</p>
                        </div>
                    ) : filteredJobs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-6 grayscale opacity-30">
                            <div className="size-20 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
                                <Package className="size-10" />
                            </div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em]">No deliveries found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredJobs.map((jc) => (
                                <JobDeliveryCard 
                                    key={jc._id} 
                                    job={jc} 
                                    activeTab={activeTab} 
                                    currentDispatcher={selectedMember?.name || ''} 
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Identity Selection Overlay */}
            <AnimatePresence>
                {isIdentityModalOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-[#0a0a0b]/95 backdrop-blur-md flex flex-col"
                    >
                        <div className="p-8 space-y-8 flex-1 flex flex-col justify-center">
                            <div className="space-y-2 text-center">
                                <h2 className="text-2xl font-black uppercase">Who is logged in?</h2>
                                <p className="text-sm text-white/40 font-medium">Select your name to start tracking deliveries</p>
                            </div>

                            <div className="grid grid-cols-1 gap-3 max-w-sm mx-auto w-full">
                                {dispatchTeamRes.isLoading ? (
                                    <Loader2 className="size-6 text-emerald-500 animate-spin mx-auto" />
                                ) : teamMembers.length === 0 ? (
                                    <div className="text-center p-12 space-y-4 bg-white/5 rounded-[2.5rem] border border-white/5">
                                        <AlertCircle className="size-10 text-amber-500 mx-auto opacity-50" />
                                        <div className="space-y-1">
                                            <p className="text-sm font-black uppercase tracking-widest text-white/80">No Team Found</p>
                                            <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] leading-relaxed">Please ask your administrator to add you to the Dispatch Team list.</p>
                                        </div>
                                    </div>
                                ) : teamMembers.map((m: any) => (
                                    <button 
                                        key={m._id}
                                        onClick={() => handleSelectMember(m)}
                                        className="w-full h-16 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5 text-sm font-bold flex items-center px-6 gap-4 transition-all group active:scale-[0.98]"
                                    >
                                        <div className="size-8 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-emerald-500/20 group-hover:text-emerald-500">
                                            <User className="size-4" />
                                        </div>
                                        {m.name}
                                        <ChevronRight className="ml-auto size-4 text-white/20 group-hover:text-emerald-500" />
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        {selectedMember && (
                            <div className="p-6 border-t border-white/5">
                                <Button 
                                    variant="ghost" 
                                    className="w-full h-12 rounded-2xl text-white/40 font-bold uppercase tracking-widest text-xs"
                                    onClick={() => setIsIdentityModalOpen(false)}
                                >
                                    Dismiss
                                </Button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Job Delivery Card Component ───────────────────────────────────────────────

function JobDeliveryCard({ job, activeTab, currentDispatcher }: { job: JobCard, activeTab: string, currentDispatcher: string }) {
    const [isUpdating, setIsUpdating] = useState(false);
    const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
    const qc = useQueryClient();

    const isAssignedToMe = job.dispatchStageId?.deliveryTeam?.some(t => t.name === currentDispatcher);

    const handleMarkDelivered = async (podUrl: string) => {
        setIsUpdating(true);
        try {
            await apiPatch(`/jobcards/${job._id}/dispatch/deliver`, {
                podPhotoUrl: podUrl,
                deliveredByName: currentDispatcher
            });
            toast.success('Delivery completed successfully!');
            qc.invalidateQueries({ queryKey: ['dispatch-hub'] });
        } catch (e) {
            toast.error('Failed to update delivery');
        } finally {
            setIsUpdating(false);
            setIsPhotoModalOpen(false);
        }
    };

    return (
        <Card className="bg-white/5 border-white/5 rounded-[2rem] overflow-hidden group hover:bg-white/[0.07] transition-all">
            <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/60 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                {job.jobCardNumber}
                            </span>
                            {activeTab === 'completed' && (
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 bg-white/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <CheckCheck className="size-2.5" /> Delivered
                                </span>
                            )}
                            {isAssignedToMe && (
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <User className="size-2.5" /> Mine
                                </span>
                            )}
                        </div>
                        <h3 className="text-lg font-black leading-tight text-white/90">{job.title}</h3>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Client Info */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-2xl bg-white/5 flex flex-col gap-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Client</span>
                            <span className="text-[11px] font-bold truncate">{job.clientId.name}</span>
                        </div>
                        <div className="p-3 rounded-2xl bg-white/5 flex flex-col gap-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Delivery Due</span>
                            <span className="text-[11px] font-bold">
                                {job.expectedDelivery ? format(new Date(job.expectedDelivery), 'dd MMM') : 'Not Set'}
                            </span>
                        </div>
                    </div>

                    {/* Action Section */}
                    {activeTab === 'pending' ? (
                        isAssignedToMe ? (
                            <Button 
                                className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-xs gap-3 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
                                onClick={() => setIsPhotoModalOpen(true)}
                                disabled={isUpdating}
                            >
                                {isUpdating ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-5" strokeWidth={2.5} />}
                                Capture Proof & Deliver
                            </Button>
                        ) : (
                            <div className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 font-black uppercase tracking-widest text-[10px] gap-2">
                                <Lock className="size-3.5 opacity-50" />
                                Assigned to {job.dispatchStageId?.deliveryTeam?.[0]?.name || 'Another Team'}
                            </div>
                        )
                    ) : (
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                            {job.dispatchStageId?.proofOfDelivery?.photo ? (
                                <img 
                                    src={job.dispatchStageId.proofOfDelivery.photo} 
                                    className="size-10 rounded-xl object-cover bg-black" 
                                    alt="POD"
                                />
                            ) : (
                                <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center">
                                    <ImageIcon className="size-4 text-white/20" />
                                </div>
                            )}
                            <div className="flex-1">
                                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Delivered on</p>
                                <p className="text-xs font-bold text-white/60">
                                    {job.dispatchStageId?.proofOfDelivery?.capturedAt 
                                        ? format(new Date(job.dispatchStageId.proofOfDelivery.capturedAt), 'dd MMM, hh:mm a')
                                        : 'Unknown Date'
                                    }
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>

            {/* POD Photo Upload Modal */}
            <AnimatePresence>
                {isPhotoModalOpen && (
                    <PODUploadModal 
                        onClose={() => setIsPhotoModalOpen(false)}
                        onComplete={handleMarkDelivered}
                        jobTitle={job.title}
                    />
                )}
            </AnimatePresence>
        </Card>
    );
}

// ── POD Upload Modal ──────────────────────────────────────────────────────────

function PODUploadModal({ onClose, onComplete, jobTitle }: { onClose: () => void, onComplete: (url: string) => void, jobTitle: string }) {
    const [preview, setPreview] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
            // Zero-copy, zero-memory preview pointer (prevents OOM crashes)
            const url = URL.createObjectURL(selected);
            setPreview(url);
        }
    };

    // Cleanup object URLs to prevent memory leaks
    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        };
    }, [preview]);

    const handleConfirm = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        if (!file) {
            toast.error('Please capture a photo first');
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const result: any = await apiUpload('/jobcards/upload-pod-photo', formData);
            onComplete(result.url);
        } catch (e) {
            toast.error('Photo upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 bg-[#0a0a0b] flex flex-col"
        >
            <div className="p-6 h-20 flex items-center justify-between border-b border-white/5">
                <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Proof of Delivery</h4>
                    <p className="text-sm font-bold truncate max-w-[200px]">{jobTitle}</p>
                </div>
                <Button variant="ghost" size="icon" className="rounded-xl bg-white/5" onClick={onClose}>
                    <X className="size-5" />
                </Button>
            </div>

            <div 
                className="flex-1 p-6 flex flex-col gap-6 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Form Shield: Prevents ANY default button behavior from bubbles */}
                <form 
                    onSubmit={(e) => e.preventDefault()} 
                    className="flex-1 flex flex-col gap-6 overflow-hidden"
                >
                    <div className="flex-1 relative rounded-[2.5rem] bg-white/5 border-2 border-dashed border-white/10 flex flex-col items-center justify-center overflow-hidden">
                    {preview ? (
                        <>
                            <img src={preview} className="absolute inset-0 size-full object-cover" alt="Preview" />
                            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-black/40" />
                            <Button 
                                type="button"
                                variant="ghost" 
                                className="absolute top-6 right-6 size-12 rounded-2xl bg-black/40 backdrop-blur-md text-white border border-white/10"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreview(null); setFile(null); }}
                            >
                                <X className="size-6" />
                            </Button>
                        </>
                    ) : (
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex flex-col items-center gap-4 cursor-pointer active:scale-95 transition-all group"
                        >
                            <div className="size-24 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-xl shadow-emerald-500/5 group-hover:bg-emerald-500/20 transition-all">
                                <Camera className="size-10" strokeWidth={2.5} />
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-black uppercase tracking-tight">Tap to Open Camera</p>
                                <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-1">Capture items at location</p>
                            </div>
                            <input 
                                ref={fileInputRef}
                                id="hub-camera-input"
                                type="file" 
                                accept="image/*" 
                                className="sr-only" 
                                onChange={handleFileChange}
                            />
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="p-5 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 flex items-start gap-3">
                        <AlertCircle className="size-5 text-emerald-500 shrink-0" />
                        <p className="text-[11px] font-bold text-white/60 leading-relaxed uppercase tracking-wide">
                            Ensure the photo clearly shows the <span className="text-emerald-400">installed furniture</span> or signed challan.
                        </p>
                    </div>

                    <Button 
                        type="button"
                        className="w-full h-16 rounded-[2rem] bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
                        disabled={!file || isUploading}
                        onClick={handleConfirm}
                    >
                        {isUploading ? (
                            <div className="flex items-center gap-3">
                                <Loader2 className="size-5 animate-spin" />
                                <span>Uploading...</span>
                            </div>
                        ) : (
                            "Confirm Delivery"
                        )}
                    </Button>
                </div>
            </form>
        </div>
    </motion.div>
    );
}
