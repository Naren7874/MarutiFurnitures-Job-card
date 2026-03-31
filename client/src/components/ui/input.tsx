import * as React from "react"

import { cn } from "@/lib/utils"

function toTitleCase(str: string) {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

function Input({ className, type, disableTitleCase = false, ...props }: React.ComponentProps<"input"> & { disableTitleCase?: boolean }) {
  // Check if we should apply title case (only for text-like inputs, not email, password, etc.)
  const shouldApplyTitleCase = !disableTitleCase && (!type || ["text", "search", "url"].includes(type));

  // If title case should be applied, we intercept the value if it's passed
  // However, it's better to let the user type and transform it, or use CSS
  // Use CSS text-transform: capitalize as a visual hint for the user
  // For the actual value transformation, we can wrap onChange if needed, 
  // but that can be tricky with cursor positions.
  // Instead, the user requested "transfer each word first Letter as Capaition".
  // Let's add the transformation to a wrapper onChange if shouldApplyTitleCase is true.

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (shouldApplyTitleCase) {
      const originalValue = e.target.value;
      const transformedValue = toTitleCase(originalValue);
      
      // If the value changed due to capitalization, we update it
      if (originalValue !== transformedValue) {
        // We need to keep track of cursor position if we change the value manually
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        e.target.value = transformedValue;
        e.target.setSelectionRange(start, end);
      }
    }
    props.onChange?.(e);
  };

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        shouldApplyTitleCase && "capitalize", // Visual hint
        className
      )}
      {...props}
      onChange={handleChange}
    />
  )
}

export { Input }
