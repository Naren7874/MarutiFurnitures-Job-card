import { useState, useMemo, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { format, isSameDay, parseISO } from "date-fns"
import { Calendar as CalendarIcon, Package, ChevronRight, LayoutGrid } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "motion/react"

interface DashboardCalendarProps {
    jobCards: any[]
}

const priorityConfig: Record<string, { color: string; dot: string }> = {
    urgent: { color: "text-rose-500", dot: "bg-rose-500" },
    high: { color: "text-amber-500", dot: "bg-amber-500" },
    medium: { color: "text-blue-500", dot: "bg-blue-500" },
    low: { color: "text-slate-400", dot: "bg-slate-400" },
}

export function DashboardCalendar({ jobCards }: DashboardCalendarProps) {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
    const [currentTime, setCurrentTime] = useState(new Date())
    const [isOpen, setIsOpen] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    const deliveryDates = useMemo(() => {
        return jobCards
            .filter(jc => jc.expectedDelivery)
            .map(jc => parseISO(jc.expectedDelivery))
    }, [jobCards])

    const selectedDayJobs = useMemo(() => {
        if (!selectedDate) return []
        return jobCards.filter(jc => 
            jc.expectedDelivery && isSameDay(parseISO(jc.expectedDelivery), selectedDate)
        )
    }, [jobCards, selectedDate])

    const modifiers = { hasDelivery: deliveryDates }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button 
                    variant="outline" 
                    className="flex items-center gap-4 bg-card/30 backdrop-blur-md border border-border/40 px-6 py-3 h-auto rounded-2xl hover:border-primary/30 hover:bg-card/50 transition-all group shadow-sm"
                >
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                        <CalendarIcon size={18} strokeWidth={2.5} />
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-[14px] font-black tracking-tight text-foreground uppercase">
                            {format(new Date(), 'EEE, d MMM')}
                        </span>
                        <span className="text-[13px] font-bold text-foreground/40 tabular-nums border-l border-border/20 pl-4 py-0.5">
                            {format(currentTime, 'p')}
                        </span>
                    </div>
                </Button>
            </PopoverTrigger>

            <PopoverContent 
                className="w-[300px] p-0 rounded-[24px] border-border/20 shadow-2xl bg-card/95 backdrop-blur-xl ring-1 ring-white/5" 
                align="end"
                sideOffset={8}
            >
                {/* Minimal Header */}
                <div className="p-5 pb-3 flex items-center justify-between border-b border-border/5">
                    <div className="flex items-center gap-2">
                        <LayoutGrid size={14} className="text-primary/60" />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/80">
                            Deliveries
                        </h3>
                    </div>
                    <Badge variant="outline" className="text-[8px] font-bold tracking-widest bg-primary/5 border-primary/10 text-primary/60 px-2 py-0 h-5 rounded-md">LIVE</Badge>
                </div>
                
                <div className="p-1 pt-0 border-b border-border/5">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        className="bg-transparent"
                        modifiers={modifiers}
                        components={{
                            DayButton: ({ day, modifiers: dayModifiers, ...props }: any) => {
                                const hasDelivery = deliveryDates.some(d => isSameDay(d, day.date))
                                const isSelected = dayModifiers.selected
                                const isToday = dayModifiers.today
                                
                                return (
                                    <div className="relative w-full h-full flex items-center justify-center p-0.5">
                                        <Button
                                            {...props}
                                            variant="ghost"
                                            className={cn(
                                                "h-8 w-8 p-0 text-[11px] font-bold rounded-lg transition-all relative group/day",
                                                isSelected ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-primary/10 hover:text-primary",
                                                isToday && !isSelected && "ring-1 ring-primary/30 bg-primary/5 shadow-sm"
                                            )}
                                        >
                                            <span className="relative z-10">{day.date.getDate()}</span>
                                            {hasDelivery && (
                                                <div className={cn(
                                                    "absolute bottom-1 w-0.5 h-0.5 rounded-full transition-all",
                                                    isSelected ? "bg-primary-foreground scale-150" : "bg-primary"
                                                )} />
                                            )}
                                        </Button>
                                    </div>
                                )
                            }
                        }}
                    />
                </div>

                <div className="bg-muted/20 pb-4">
                    <div className="px-5 py-3.5 flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/50">
                            {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Select Date'}
                        </span>
                        <div className="flex items-center gap-1.5 bg-primary/10 px-2 py-0.5 rounded-md">
                            <Package size={10} className="text-primary" />
                            <span className="text-[10px] font-bold text-primary">{selectedDayJobs.length}</span>
                        </div>
                    </div>

                    <ScrollArea className="max-h-[240px] px-3">
                        <AnimatePresence mode="wait">
                            {selectedDayJobs.length > 0 ? (
                                <motion.div 
                                    key={selectedDate?.toISOString()}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-1"
                                >
                                    {selectedDayJobs.map((jc: any) => {
                                        const config = priorityConfig[jc.priority] || priorityConfig.medium
                                        return (
                                            <div 
                                                key={jc._id}
                                                onClick={() => navigate(`/jobcards/${jc._id}`)}
                                                className="group flex items-center justify-between p-3.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-border/10 transition-all cursor-pointer"
                                            >
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0 shadow-sm", config.dot)} />
                                                    <div className="min-w-0">
                                                        <p className="text-[13px] font-black text-foreground group-hover:text-primary transition-colors tracking-tight">{jc.jobCardNumber}</p>
                                                        <p className="text-[11px] font-semibold text-muted-foreground/70 truncate leading-tight group-hover:text-foreground transition-colors">{jc.title}</p>
                                                    </div>
                                                </div>
                                                <ChevronRight size={14} className="text-muted-foreground/20 group-hover:text-primary transition-all translate-x-1 opacity-0 group-hover:opacity-100" />
                                            </div>
                                        )
                                    })}
                                </motion.div>
                            ) : (
                                <div className="py-10 text-center flex flex-col items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center">
                                        <Package size={14} className="text-muted-foreground/30" />
                                    </div>
                                    <p className="text-[11px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">
                                        Idle Fleet
                                    </p>
                                </div>
                            )}
                        </AnimatePresence>
                    </ScrollArea>
                </div>
            </PopoverContent>
        </Popover>
    )
}
