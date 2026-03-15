import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ExternalLink, Layers, ArrowRight, Clock } from "lucide-react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"

interface PriorityQueueItem {
    id: string
    jobNumber: string
    client: string
    priority: 'URGENT' | 'HIGH'
    stage: string
    completionPercent?: number
    estimatedValue?: number
}

interface PriorityQueueProps {
    items: PriorityQueueItem[]
}

const priorityConfig = {
    URGENT: { label: 'Urgent', className: 'bg-red-500 text-white border-none' },
    HIGH: { label: 'High', className: 'bg-amber-500 text-white border-none' },
}

const stageColors: Record<string, string> = {
    DESIGN: '#8B5CF6',
    PRODUCTION: '#1315E5',
    POLISHING: '#F59E0B',
    FABRICATION: '#06B6D4',
    ASSEMBLY: '#10B981',
    QC: '#10B981',
    DISPATCH: '#8ffb03',
    ENQUIRY: '#767A8C',
}

export function PriorityQueue({ items }: PriorityQueueProps) {
    const urgentCount = items.filter(i => i.priority === 'URGENT').length

    return (
        <Card className="flex flex-col border-border bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between shrink-0 pb-4 pt-5 px-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10">
                        <Layers className="size-4 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-base font-bold">Priority Pipeline</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">{items.length} active job{items.length !== 1 ? 's' : ''} requiring attention</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {urgentCount > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 rounded-full border border-red-500/20">
                            <div className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-xs font-semibold text-red-600 dark:text-red-400">{urgentCount} Urgent</span>
                        </div>
                    )}
                    <Button variant="ghost" size="sm" className="h-8 px-3 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground">
                        View All <ExternalLink className="ml-1.5 h-3 w-3" />
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="flex-1 px-3 pb-3 pt-0">
                {items.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-muted rounded-xl">
                        <Clock className="h-8 w-8 text-muted-foreground/40 mb-2" />
                        <span className="text-sm text-muted-foreground font-medium">All clear — no urgent items</span>
                    </div>
                ) : (
                    <ScrollArea className="h-[330px]">
                        <div className="space-y-2 px-1">
                            {items.map((item, index) => {
                                const stageColor = stageColors[item.stage] || '#767A8C'
                                const completion = item.completionPercent ?? 50

                                return (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.06 }}
                                        className="group relative p-4 rounded-xl border border-border bg-background hover:bg-muted/30 transition-all cursor-pointer hover:border-primary/30 hover:shadow-sm"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 min-w-0">
                                                {/* Stage color indicator */}
                                                <div
                                                    className="w-1 h-10 rounded-full shrink-0"
                                                    style={{ backgroundColor: stageColor }}
                                                />
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-sm text-foreground">{item.jobNumber}</span>
                                                        <Badge className={cn("text-[10px] px-2 py-0 h-5 rounded-md font-semibold", priorityConfig[item.priority].className)}>
                                                            {priorityConfig[item.priority].label}
                                                        </Badge>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground font-medium truncate block max-w-[180px]">{item.client}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0">
                                                <div className="hidden sm:block text-right">
                                                    <div
                                                        className="text-xs font-bold px-2 py-1 rounded-md border"
                                                        style={{ color: stageColor, borderColor: `${stageColor}30`, backgroundColor: `${stageColor}10` }}
                                                    >
                                                        {item.stage}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground mt-1 text-right">{completion}% done</div>
                                                </div>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="size-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-primary/10 hover:bg-primary hover:text-primary-foreground"
                                                >
                                                    <ArrowRight className="size-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Completion bar */}
                                        <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{ width: `${completion}%`, backgroundColor: stageColor }}
                                            />
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
