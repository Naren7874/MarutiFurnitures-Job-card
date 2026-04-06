import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Package, Maximize2, Fingerprint, Wind, Camera } from 'lucide-react';
import { useArchitectJobCardById } from '../../hooks/useApi';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { ImagePreview } from '@/components/ui/image-preview';

export default function ArchitectJobCardDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: raw, isLoading } = useArchitectJobCardById(id!);
    const jc: any = (raw as any)?.data ?? {};

    if (isLoading) {
        return (
            <div className="p-8 max-w-6xl mx-auto space-y-6">
                <Skeleton className="h-40 w-full rounded-[2.5rem]" />
                <Skeleton className="h-[500px] w-full rounded-[2.5rem]" />
            </div>
        );
    }

    if (!jc._id) {
        return (
            <div className="p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                <Package size={48} className="text-muted-foreground/20 mb-4" />
                <h3 className="text-foreground text-xl font-black mb-2 tracking-tight">Job Card Not Found</h3>
                <Link to="/architect/jobcards">
                    <button className="text-primary text-sm font-bold mt-4 hover:underline">← Back to Job Cards</button>
                </Link>
            </div>
        );
    }

    const item = jc.items?.[0];

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/architect/jobcards')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-card border border-border hover:bg-primary/10 hover:border-primary/30 transition text-muted-foreground hover:text-primary">
                    <ArrowLeft size={16} />
                </button>
                <div>
                    <p className="text-primary text-[10px] font-black tracking-widest uppercase mb-1">{jc.jobCardNumber}</p>
                    <h1 className="text-foreground text-2xl font-black tracking-tight leading-none group flex items-center gap-2">
                        {jc.title}
                    </h1>
                    <p className="text-muted-foreground/60 text-xs font-bold mt-1.5 flex items-center gap-2">
                         Project: {jc.projectId?.projectName || '—'} 
                         <span className="opacity-30">/</span> 
                         Client: {jc.clientId?.name || '—'}
                         {jc.quotationId && (
                             <>
                                 <span className="opacity-30">/</span>
                                 <Link to={`/architect/quotations/${jc.quotationId._id || jc.quotationId}`} className="text-primary hover:underline">
                                     Quotation: {jc.quotationId.quotationNumber || 'View'}
                                 </Link>
                             </>
                         )}
                    </p>
                </div>
            </div>

            {/* Product Hero Block */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                className="bg-card dark:bg-card/20 backdrop-blur-xl border border-border/20 dark:border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col lg:flex-row shadow-xl min-h-[500px]"
            >
                {/* Visual Anchor (Left) */}
                <div className="lg:w-[40%] relative min-h-[400px] lg:h-auto overflow-hidden bg-muted/20 border-r border-border/10">
                    {item?.photo ? (
                        <div className="w-full h-full">
                            <ImagePreview src={item.photo} alt="Item Preview" />
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/10">
                            <Package size={100} strokeWidth={0.5} />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-3">No Main Photo</p>
                        </div>
                    )}
                </div>

                {/* Content Section (Right) */}
                <div className="lg:w-[60%] p-8 lg:p-12 flex flex-col">
                    <div className="mb-10">
                        <div className="inline-flex items-center px-2 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider mb-4">
                            {item?.category || 'General Item'}
                        </div>
                        <h2 className="text-3xl lg:text-4xl font-black text-foreground tracking-tight leading-tight mb-4 uppercase">
                            {item?.description || jc.title}
                        </h2>
                        {item?.specifications?.notes && (
                            <div className="p-5 rounded-2xl bg-muted/10 border border-border/10 max-w-xl">
                                <p className="text-muted-foreground/50 text-xs font-medium leading-relaxed italic">
                                    "{item.specifications.notes}"
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Technical Grid */}
                    <div className="mt-auto pt-8 border-t border-border/10 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Specs Column */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] pl-0.5">Dimensions</p>
                                <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                                    <Maximize2 size={14} className="text-blue-500/60" />
                                    <p className="text-sm font-black text-foreground/90 tracking-tight italic">{item?.specifications?.size || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] pl-0.5">Quantity</p>
                                <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-primary/5 border border-primary/10">
                                    <Package size={14} className="text-primary/60" />
                                    <p className="text-sm font-black text-foreground/90 uppercase tracking-tight">{item?.qty} {item?.unit || 'PCS'}</p>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] pl-0.5">Material</p>
                                <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                                    <Fingerprint size={14} className="text-amber-500/60" />
                                    <p className="text-[11px] font-black text-foreground/70 uppercase tracking-tight leading-tight line-clamp-2">{item?.specifications?.material || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] pl-0.5">Finish</p>
                                <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                                    <Wind size={14} className="text-emerald-500/60" />
                                    <p className="text-[11px] font-black text-foreground/70 uppercase tracking-tight leading-tight line-clamp-2">{item?.specifications?.polish || 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Fabric Column */}
                        <div className="space-y-4">
                            <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] pl-0.5 border-b border-border/10 pb-2">Technical Specification (Fabrics)</p>
                            <div className="flex flex-wrap gap-2">
                                {(item?.specifications?.fabrics?.length > 0) ? (
                                    item.specifications.fabrics.map((f: string, fi: number) => (
                                        <div key={fi} className="inline-flex items-center gap-2 bg-violet-500/5 border border-violet-500/10 px-4 py-2 rounded-xl text-[10px] font-black text-foreground/60 uppercase">
                                            <span className="opacity-30">#{fi + 1}</span> {f}
                                        </div>
                                    ))
                                ) : item?.specifications?.fabric ? (
                                    <div className="inline-flex items-center bg-violet-500/5 border border-violet-500/10 px-4 py-2 rounded-xl text-[10px] font-black text-foreground/60 uppercase">
                                        {item.specifications.fabric}
                                    </div>
                                ) : (
                                    <p className="text-[10px] font-bold text-muted-foreground/20 italic uppercase py-2">No fabric specifications defined</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Visual Archive Block */}
            {(item?.fabricPhoto || (item?.photos?.length > 0)) && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-card dark:bg-card/20 backdrop-blur-xl border border-border/10 rounded-[2.5rem] p-8 md:p-12 shadow-sm"
                >
                    <div className="flex items-center gap-4 mb-10">
                        <div className="p-3.5 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                            <Camera size={20} />
                        </div>
                        <div>
                            <h4 className="font-black text-sm uppercase tracking-[0.15em] text-foreground">Visual Archive</h4>
                            <p className="text-[9px] text-muted-foreground/40 font-medium uppercase tracking-widest">Technical References</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                        {item.fabricPhoto && (
                            <div className="space-y-3">
                                <div className="aspect-4/5 rounded-3xl overflow-hidden border border-border/20 bg-muted/20 hover:border-primary/50 transition-all cursor-zoom-in shadow-lg">
                                    <ImagePreview src={item.fabricPhoto} alt="Fabric Reference" />
                                </div>
                                <p className="text-center text-[8px] font-black uppercase tracking-widest text-muted-foreground/40">Fabric Selection</p>
                            </div>
                        )}
                        {item.photos?.map((url: string, i: number) => (
                            <div key={i} className="space-y-3">
                                <div className="aspect-4/5 rounded-3xl overflow-hidden border border-border/20 bg-muted/20 hover:border-primary/50 transition-all cursor-zoom-in shadow-lg">
                                    <ImagePreview src={url} alt={`Reference ${i+1}`} />
                                </div>
                                <p className="text-center text-[8px] font-black uppercase tracking-widest text-muted-foreground/40">Reference Photo #{i+1}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
