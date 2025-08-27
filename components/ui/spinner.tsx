import { cn } from "@/lib/utils/ui"
import { cva, type VariantProps } from "class-variance-authority"

const spinnerVariants = cva("animate-spin rounded-full border-2 border-current border-t-transparent", {
  variants: {
    size: {
      sm: "h-4 w-4",
      md: "h-6 w-6", 
      lg: "h-8 w-8",
      xl: "h-12 w-12"
    },
    variant: {
      default: "text-primary",
      secondary: "text-muted-foreground",
      destructive: "text-destructive",
    }
  },
  defaultVariants: {
    size: "md",
    variant: "default"
  }
})

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {}

function Spinner({ className, size, variant, ...props }: SpinnerProps) {
  return (
    <div
      className={cn(spinnerVariants({ size, variant }), className)}
      {...props}
    />
  )
}

export { Spinner, spinnerVariants }