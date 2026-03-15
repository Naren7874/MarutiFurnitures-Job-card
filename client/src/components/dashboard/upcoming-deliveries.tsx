import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Truck, MapPin, Calendar, CheckCircle2 } from "lucide-react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"

interface DeliveryItem {
    id: string
    date: string
    client: string
    address: string
    status?: 'SCHEDULED' | 'IN_TRANSIT' | 'DELIVERED'
    timeSlot?: string
}

interface UpcomingDeliveriesProps {
    deliveries: DeliveryItem[]
}

const statusConfig = {
    SCHEDULED: { label: 'Scheduled', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
    IN_TRANSIT: { label: 'In Transit', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
    DELIVERED: { label: 'Delivered', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
}

export function UpcomingDeliveries({ deliveries }: UpcomingDeliveriesProps) {
    return (
        <Card className="flex flex-col border-border bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between shrink-0 pb-3 pt-5 px-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10">
                        <Truck className="size-4 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-base font-bold">Deliveries</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">Upcoming & recent</p>
                    </div>
                </div>
                <Badge variant="outline" className="text-xs font-semibold border-primary/20 text-primary dark:text-primary bg-primary/5">
                    {deliveries.filter(d => d.status !== 'DELIVERED').length} pending
                </Badge>
            </CardHeader>

            <CardContent className="px-4 pb-4 pt-0">
                {deliveries.length === 0 ? (
                    <div className="h-28 flex flex-col items-center justify-center">
                        <Truck className="size-8 text-muted-foreground/30 mb-2" />
                        <p className="text-xs text-muted-foreground font-medium">No deliveries scheduled</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {deliveries.map((delivery, index) => {
                            const isDelivered = delivery.status === 'DELIVERED'
                            const cfg = statusConfig[delivery.status || 'SCHEDULED']
                            return (
                                <motion.div
                                    key={delivery.id}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.08 }}
                                    className={cn(
                                        "p-3 rounded-xl border transition-all hover:shadow-sm cursor-pointer",
                                        isDelivered ? "border-border/40 bg-muted/20" : "border-border bg-background hover:border-primary/30"
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div className={cn(
                                                "mt-0.5 p-1.5 rounded-lg shrink-0",
                                                isDelivered ? "bg-emerald-500/10" : "bg-primary/10"
                                            )}>
                                                {isDelivered
                                                    ? <CheckCircle2 className="size-3.5 text-emerald-500" />
                                                    : <Calendar className="size-3.5 text-primary" />
                                                }
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="font-bold text-sm text-foreground">{delivery.date}</span>
                                                    {delivery.timeSlot && (
                                                        <span className="text-[10px] text-muted-foreground">{delivery.timeSlot}</span>
                                                    )}
                                                </div>
                                                <div className="font-semibold text-xs text-foreground/80 truncate">{delivery.client}</div>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <MapPin className="size-2.5 text-muted-foreground shrink-0" />
                                                    <span className="text-[10px] text-muted-foreground truncate">{delivery.address}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Badge className={cn("text-[10px] shrink-0 font-semibold border", cfg.className)}>
                                            {cfg.label}
                                        </Badge>
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
