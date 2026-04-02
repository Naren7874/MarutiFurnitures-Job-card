import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useClient, useUpdateClient } from '../hooks/useApi';
import { motion } from 'motion/react';
import ClientForm from '@/components/clients/ClientForm';

export default function EditClientPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const update = useUpdateClient(id ?? '');
    const { data: raw, isLoading } = useClient(id ?? '');
    const existing: any = (raw as any)?.data ?? (raw as any) ?? {};

    const handleSubmit = async (payload: any) => {
        await update.mutateAsync(payload);
        navigate(`/clients/${id}`);
    };

    if (isLoading) {
        return (
            <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 bg-muted/40 rounded-3xl animate-pulse border border-border/30" />
                ))}
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-10">
            {/* Header */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between gap-6">
                <button type="button" onClick={() => navigate(`/clients/${id}`)}
                    className="group flex items-center gap-3 text-muted-foreground hover:text-primary transition-all text-xs font-black uppercase tracking-widest">
                    <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-card border border-border group-hover:bg-primary/10 transition-colors">
                        <ArrowLeft size={16} />
                    </div>
                    Back to Client
                </button>
                <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500/60" />
                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-70">Edit Client</p>
                </div>
            </motion.div>

            <div>
                <h1 className="text-foreground text-4xl font-black  mb-2">Edit Client</h1>
                <p className="text-muted-foreground text-sm font-semibold opacity-60">Update contact information and details.</p>
            </div>

            <ClientForm
                initialData={existing}
                onSuccess={handleSubmit}
                onCancel={() => navigate(`/clients/${id}`)}
                isSubmitting={update.isPending}
                submitLabel="Save Changes"
            />
        </motion.div>
    );
}
