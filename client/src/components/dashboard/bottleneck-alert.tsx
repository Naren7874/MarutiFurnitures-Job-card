import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, ExternalLink, Clock } from "lucide-react"
import { motion } from "motion/react"

interface BottleneckItem {
    id: string
    jobNumber: string
    stageName: string
    daysInStage: number
}

interface BottleneckAlertProps {
    items: BottleneckItem[]
}

function getSeverity(days: number): { label: string; color: string; bg: string } {
    if (days >= 14) return { label: 'Critical', color: '#DC2626', bg: '#DC262615' }
    if (days >= 7) return { label: 'High', color: '#8ffb03', bg: '#8ffb0315' }
    return { label: 'Warning', color: '#F59E0B', bg: '#F59E0B15' }
}

export function BottleneckAlert({ items }: BottleneckAlertProps) {
    return (
        <Card className="flex flex-col border-border bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between shrink-0 pb-3 pt-5 px-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-red-500/10">
                        <AlertTriangle className="size-4 text-red-500" />
                    </div>
                    <div>
                        <CardTitle className="text-base font-bold">Delayed Jobs</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {items.length} job{items.length !== 1 ? 's' : ''} delayed
                        </p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
                    All <ExternalLink className="ml-1 size-3" />
                </Button>
            </CardHeader>

            <CardContent className="px-4 pb-4 pt-0">
                {items.length === 0 ? (
                    <div className="h-28 flex flex-col items-center justify-center">
                        <div className="text-2xl mb-1">✓</div>
                        <p className="text-xs text-muted-foreground font-medium"> No delays at the moment</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {items.map((item, index) => {
                            const severity = getSeverity(item.daysInStage)
                            return (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="flex items-center justify-between p-3 rounded-xl border cursor-pointer hover:shadow-sm transition-all"
                                    style={{ borderColor: `${severity.color}30`, backgroundColor: severity.bg }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="size-2 rounded-full animate-pulse shrink-0"
                                            style={{ backgroundColor: severity.color }}
                                        />
                                        <div>
                                            <div className="font-bold text-sm text-foreground">{item.jobNumber}</div>
                                            <div className="text-xs text-muted-foreground">{item.stageName}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-right">
                                        <Clock className="size-3" style={{ color: severity.color }} />
                                        <div>
                                            <div className="text-sm font-bold" style={{ color: severity.color }}>{item.daysInStage}d</div>
                                            <div className="text-[10px] font-semibold" style={{ color: severity.color }}>{severity.label}</div>
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
