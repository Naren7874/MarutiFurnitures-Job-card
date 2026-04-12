import { Loader2, CheckCircle2, Info, TriangleAlert } from 'lucide-react'
import { Button } from './button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './dialog'
import { cn } from '@/lib/utils'

interface ConfirmationDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description: React.ReactNode
    onConfirm: () => void | Promise<void>
    onCancel?: () => void
    confirmText?: string
    cancelText?: string
    variant?: 'default' | 'destructive' | 'warning' | 'success'
    isPending?: boolean
}

export function ConfirmationDialog({
    open,
    onOpenChange,
    title,
    description,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'default',
    isPending = false
}: ConfirmationDialogProps) {

    const icons = {
        default: <Info className="size-5 text-primary" />,
        destructive: <TriangleAlert className="size-5 text-red-500" />,
        warning: <TriangleAlert className="size-5 text-amber-500" />,
        success: <CheckCircle2 className="size-5 text-emerald-500" />,
    }

    const bgs = {
        default: 'bg-primary/10',
        destructive: 'bg-red-500/10',
        warning: 'bg-amber-500/10',
        success: 'bg-emerald-500/10',
    }

    const confirmVariants = {
        default: 'bg-primary hover:bg-primary/90',
        destructive: 'bg-red-500 hover:bg-red-600',
        warning: 'bg-amber-500 hover:bg-amber-600',
        success: 'bg-emerald-500 hover:bg-emerald-600',
    }

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!isPending) {
                onOpenChange(val)
                if (!val && onCancel) onCancel()
            }
        }}>
            <DialogContent className="max-w-sm rounded-[24px] p-6 border-white/10 shadow-2xl">
                <DialogHeader className="flex-row items-center gap-3 space-y-0 text-left">
                    <div className={cn("p-2.5 rounded-2xl shrink-0", bgs[variant])}>
                        {icons[variant]}
                    </div>
                    <div>
                        <DialogTitle className="text-base font-black tracking-tight">{title}</DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                            Please confirm your action
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <div className="py-2">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {description}
                    </p>
                </div>

                <DialogFooter className="flex-row gap-2 sm:justify-stretch sm:space-x-0 mt-4">
                    <Button
                        variant="ghost"
                        onClick={() => { onOpenChange(false); onCancel?.() }}
                        disabled={isPending}
                        className="flex-1 rounded-2xl border border-white/5 hover:bg-white/5 font-bold text-xs"
                    >
                        {cancelText}
                    </Button>
                    <Button
                        onClick={async () => {
                            await onConfirm()
                            // If it doesn't throw and isn't externally managed, close it
                            // But usually users manage 'open' state via mutation state
                        }}
                        disabled={isPending}
                        className={cn("flex-1 rounded-2xl font-bold text-xs text-white", confirmVariants[variant])}
                    >
                        {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
                        {confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
