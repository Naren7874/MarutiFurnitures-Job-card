import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageCircle, CheckCheck, Clock, Send } from "lucide-react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"

interface WhatsAppLogEntry {
    id: string
    message: string
    recipient: string
    jobNumber?: string
    time: string
    status: 'delivered' | 'read' | 'pending'
}

interface WhatsAppLogProps {
    logs: WhatsAppLogEntry[]
}

const statusIcon = {
    read: <CheckCheck className="size-3 text-blue-500" />,
    delivered: <CheckCheck className="size-3 text-muted-foreground/60" />,
    pending: <Clock className="size-3 text-muted-foreground/40" />,
}

export function WhatsAppLog({ logs }: WhatsAppLogProps) {
    return (
        <Card className="flex flex-col border-border bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between shrink-0 pb-3 pt-5 px-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-green-500/10">
                        <MessageCircle className="size-4 text-green-500" />
                    </div>
                    <div>
                        <CardTitle className="text-base font-bold">WhatsApp Log</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">{logs.length} recent messages</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="size-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-green-600 dark:text-green-400 font-semibold">Live</span>
                </div>
            </CardHeader>

            <CardContent className="px-3 pb-4 pt-0">
                {logs.length === 0 ? (
                    <div className="h-28 flex flex-col items-center justify-center">
                        <MessageCircle className="size-8 text-muted-foreground/30 mb-2" />
                        <p className="text-xs text-muted-foreground font-medium">No recent messages</p>
                    </div>
                ) : (
                    <ScrollArea className="h-[240px]">
                        <div className="space-y-2 px-1">
                            {logs.map((log, index) => (
                                <motion.div
                                    key={log.id}
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.06 }}
                                    className="p-3 rounded-xl border border-border bg-background hover:bg-muted/30 transition-all group cursor-pointer"
                                >
                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <div className="size-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                                                <svg viewBox="0 0 24 24" fill="white" className="size-3">
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                                                    <path d="M11.975 0C5.354 0 0 5.373 0 12c0 2.117.554 4.103 1.522 5.828L.024 24l6.286-1.63A11.944 11.944 0 0011.975 24C18.596 24 24 18.627 24 12S18.596 0 11.975 0zm0 21.818a9.844 9.844 0 01-5.028-1.378l-.36-.214-3.733.969.999-3.63-.235-.374A9.799 9.799 0 012.18 12c0-5.413 4.408-9.818 9.795-9.818 5.386 0 9.794 4.405 9.794 9.818 0 5.414-4.408 9.818-9.794 9.818z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-foreground">{log.recipient}</span>
                                                {log.jobNumber && (
                                                    <Badge variant="outline" className="ml-1.5 text-[9px] h-4 px-1.5 font-semibold border-primary/20 text-primary/70">
                                                        {log.jobNumber}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground shrink-0">{log.time}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed pl-6 line-clamp-2">{log.message}</p>
                                    <div className={cn("flex items-center gap-1 pl-6 mt-1.5")}>
                                        {statusIcon[log.status]}
                                        <span className="text-[10px] text-muted-foreground capitalize">{log.status}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </ScrollArea>
                )}

                <Button variant="outline" className="w-full mt-3 h-8 text-xs font-semibold rounded-xl border-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-500/5 hover:border-green-500/40">
                    <Send className="mr-2 size-3" /> Send Broadcast Message
                </Button>
            </CardContent>
        </Card>
    )
}
