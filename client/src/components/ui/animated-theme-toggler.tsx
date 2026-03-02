import { useCallback, useRef } from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { flushSync } from "react-dom"

import { cn } from "@/lib/utils"
import { useTheme, type Theme } from "@/components/theme-provider"

interface AnimatedThemeTogglerProps extends React.ComponentPropsWithoutRef<"button"> {
  duration?: number
}

export const AnimatedThemeToggler = ({
  className,
  duration = 400,
  ...props
}: AnimatedThemeTogglerProps) => {
  const { theme, setTheme } = useTheme()
  const buttonRef = useRef<HTMLButtonElement>(null)

  const toggleTheme = useCallback(async () => {
    if (!buttonRef.current) return

    // 3-state toggle: light -> dark -> system
    let nextTheme: Theme = "light"
    if (theme === "light") nextTheme = "dark"
    else if (theme === "dark") nextTheme = "system"
    else nextTheme = "light"

    // If browser supports startViewTransition, use it for the animation
    if (document.startViewTransition) {
      await document.startViewTransition(() => {
        flushSync(() => {
          setTheme(nextTheme)
        })
      }).ready

      const { top, left, width, height } =
        buttonRef.current.getBoundingClientRect()
      const x = left + width / 2
      const y = top + height / 2
      const maxRadius = Math.hypot(
        Math.max(left, window.innerWidth - left),
        Math.max(top, window.innerHeight - top)
      )

      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${maxRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        }
      )
    } else {
      // Fallback for browsers without View Transitions
      setTheme(nextTheme)
    }
  }, [theme, setTheme, duration])

  return (
    <button
      ref={buttonRef}
      onClick={toggleTheme}
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground active:scale-95 group",
        className
      )}
      title={`Current: ${theme} mode (Click to toggle)`}
      {...props}
    >
      <div className="relative h-4.5 w-4.5">
        <Sun
          className={cn(
            "absolute inset-0 h-full w-full transition-all duration-300",
            theme === "light" ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-90 opacity-0"
          )}
        />
        <Moon
          className={cn(
            "absolute inset-0 h-full w-full transition-all duration-300",
            theme === "dark" ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-90 opacity-0"
          )}
        />
        <Monitor
          className={cn(
            "absolute inset-0 h-full w-full transition-all duration-300",
            theme === "system" ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-90 opacity-0"
          )}
        />
      </div>
      <span className="sr-only">Toggle theme (Current: {theme})</span>
    </button>
  )
}
