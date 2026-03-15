import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import ClientForm from './ClientForm';
import { useCreateClient } from '../../hooks/useApi';

interface CreateClientModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (client: any) => void;
}

export default function CreateClientModal({
    open,
    onOpenChange,
    onSuccess,
}: CreateClientModalProps) {
    const create = useCreateClient();

    const handleSubmit = async (payload: any) => {
        const res: any = await create.mutateAsync(payload);
        if (res?.data) {
            onSuccess(res.data);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[70vw] sm:max-w-[70vw] w-full p-0 overflow-hidden border-none bg-background shadow-2xl rounded-[32px]">
                <div className="flex flex-col max-h-[90vh]">
                    <div className="p-8 pb-4 border-b border-border/10">
                        <DialogHeader>
                            <DialogTitle className="text-3xl font-black tracking-tighter text-foreground">Register New Client</DialogTitle>
                            <DialogDescription className="text-muted-foreground text-sm font-semibold opacity-60">
                                Fill in all the details to register a new client for this quotation.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 pt-6 custom-scrollbar scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                        <ClientForm
                            onSuccess={handleSubmit}
                            onCancel={() => onOpenChange(false)}
                            isSubmitting={create.isPending}
                            submitLabel="Create Client"
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
