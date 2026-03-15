import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useCreateClient } from '../hooks/useApi';
import { motion } from 'motion/react';
import ClientForm from '@/components/clients/ClientForm';

export default function NewClientPage() {
    const navigate = useNavigate();
    const create = useCreateClient();

    const handleSubmit = async (payload: any) => {
        await create.mutateAsync(payload);
        navigate('/clients');
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 md:p-8 max-w-5xl mx-auto space-y-10"
        >
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between gap-6"
            >
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="group flex items-center gap-3 text-muted-foreground hover:text-primary transition-all text-xs font-black uppercase tracking-widest"
                >
                    <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-card border border-border group-hover:bg-primary/10 transition-colors">
                        <ArrowLeft size={16} />
                    </div>
                    Back
                </button>
                <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-70">
                        New Client Registration
                    </p>
                </div>
            </motion.div>

            <div>
                <h1 className="text-foreground text-4xl font-black tracking-tighter mb-2">Register New Client</h1>
                <p className="text-muted-foreground text-sm font-semibold opacity-60">
                    Add an external client — this is separate from your internal staff.
                </p>
            </div>

            <ClientForm 
                onSuccess={handleSubmit} 
                onCancel={() => navigate('/clients')} 
                isSubmitting={create.isPending}
                submitLabel="Create Client"
            />
        </motion.div>
    );
}
