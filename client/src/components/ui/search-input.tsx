import * as React from "react"
import { cn } from "@/lib/utils"
import { Search, X } from "lucide-react"

interface SearchInputProps extends React.ComponentProps<"input"> {
  onClear?: () => void
  showSearchIcon?: boolean
  containerClassName?: string
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onClear, showSearchIcon = true, containerClassName, ...props }, ref) => {
    const hasValue = value !== undefined && value !== null && String(value) !== ""
    return (
      <div className={cn("relative", containerClassName)}>
        {showSearchIcon && (
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        )}
        <input
          ref={ref}
          className={cn(
            "flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base font-semibold shadow-sm transition-all duration-200 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/60 placeholder:font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50",
            showSearchIcon ? "ps-9" : "",
            hasValue ? "pe-8" : "",
            className
          )}
          value={value}
          {...props}
        />
        {hasValue && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute end-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    )
  }
)

SearchInput.displayName = "SearchInput"

export { SearchInput }
