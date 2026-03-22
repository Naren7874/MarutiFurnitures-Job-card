import { format, parse, isValid } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  setDate: (date?: Date) => void
  placeholder?: string
  className?: string
}

export function DatePicker({ date, setDate, placeholder = "DD-MM-YYYY", className }: DatePickerProps) {
  const [inputValue, setInputValue] = useState(date ? format(date, "dd-MM-yyyy") : "")
  const [isOpen, setIsOpen] = useState(false)

  // Update input text when date prop changes
  useEffect(() => {
    if (date) {
      setInputValue(format(date, "dd-MM-yyyy"))
    } else {
      setInputValue("")
    }
  }, [date])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputValue(val)
    
    // Attempt parsing if it looks like a full date (DD-MM-YYYY)
    if (val.length === 10) {
      const parsed = parse(val, "dd-MM-yyyy", new Date())
      if (isValid(parsed)) {
        setDate(parsed)
      }
    } else if (val === "") {
      setDate(undefined)
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <div className="relative group">
        <Input 
          className={cn("w-full h-12 rounded-2xl border-border/50 bg-background text-left font-medium", className, "pl-14")}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
        />
        <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-30 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <PopoverTrigger asChild>
          <button className="absolute inset-0 w-full h-full opacity-0 cursor-text -z-10" tabIndex={-1}>Toggle</button>
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            setDate(d)
            setIsOpen(false)
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
