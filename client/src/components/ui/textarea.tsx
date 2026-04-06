import * as React from "react"

import { cn } from "@/lib/utils"

function toTitleCase(str: string) {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

function Textarea({ className, onChange, disableTitleCase = false, ...props }: React.ComponentProps<"textarea"> & { disableTitleCase?: boolean }) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!disableTitleCase) {
      const originalValue = e.target.value;
      const transformedValue = toTitleCase(originalValue);
      
      if (originalValue !== transformedValue) {
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        e.target.value = transformedValue;
        e.target.setSelectionRange(start, end);
      }
    }
    onChange?.(e);
  };

  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground/45 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:ring-destructive/40 dark:placeholder:text-muted-foreground/70",
        !disableTitleCase && "capitalize", // Visual hint
        className
      )}
      onChange={handleChange}
      {...props}
    />
  )
}

export { Textarea }
