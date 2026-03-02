import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { IndianRupee, AlertCircle, ExternalLink, Send, Clock } from "lucide-react"
import { motion } from "motion/react"

interface OverdueInvoice {
    id: string
    invoiceNumber: string
    client: string
    amount: number
    dueDate: string
    daysOverdue?: number
}

interface OverdueInvoicesProps {
    invoices: OverdueInvoice[]
}

function formatAmount(amount: number) {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
    return `₹${amount}`
}

function getDaysOverdue(dueDateStr: string): number {
    const due = new Date(dueDateStr)
    const today = new Date('2024-02-28')
    const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
}

export function OverdueInvoices({ invoices }: OverdueInvoicesProps) {
    const totalOverdue = invoices.reduce((acc, inv) => acc + inv.amount, 0)

    return (
        <Card className="flex flex-col border-border bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between shrink-0 pb-3 pt-5 px-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-red-500/10">
                        <AlertCircle className="size-4 text-red-500" />
                    </div>
                    <div>
                        <CardTitle className="text-base font-bold">Overdue Invoices</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Total: <span className="font-bold text-red-600 dark:text-red-400">{formatAmount(totalOverdue)}</span> outstanding
                        </p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
                    All <ExternalLink className="ml-1 size-3" />
                </Button>
            </CardHeader>

            <CardContent className="px-3 pb-4 pt-0">
                {invoices.length === 0 ? (
                    <div className="h-28 flex flex-col items-center justify-center">
                        <div className="text-xl mb-1">✓</div>
                        <p className="text-xs text-muted-foreground font-medium">No overdue invoices</p>
                    </div>
                ) : (
                    <ScrollArea className="h-[220px]">
                        <div className="space-y-2 px-1">
                            {invoices.map((inv, index) => {
                                const daysOverdue = inv.daysOverdue ?? getDaysOverdue(inv.dueDate)
                                const isHighRisk = daysOverdue > 10

                                return (
                                    <motion.div
                                        key={inv.id}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.08 }}
                                        className="p-3 rounded-xl border border-border bg-background hover:bg-red-500/5 hover:border-red-500/20 transition-all group cursor-pointer"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-bold text-foreground">{inv.invoiceNumber}</span>
                                                    <Badge
                                                        className={`text-[9px] h-4 px-1.5 border font-semibold ${isHighRisk ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'}`}
                                                    >
                                                        {daysOverdue}d overdue
                                                    </Badge>
                                                </div>
                                                <div className="text-xs text-muted-foreground font-medium truncate">{inv.client}</div>
                                                <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                                                    <Clock className="size-2.5" />
                                                    Due: {inv.dueDate.split('-').slice(1).join('/')}
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end gap-2 shrink-0">
                                                <div className="flex items-center gap-0.5">
                                                    <IndianRupee className="size-3 text-foreground" />
                                                    <span className="text-sm font-bold text-foreground">{(inv.amount / 1000).toFixed(0)}K</span>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 px-2 text-[10px] rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Send className="mr-1 size-2.5" /> Remind
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    )
}
