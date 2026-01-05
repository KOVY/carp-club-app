import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Input types optimized for mobile keyboards
 * Requirements: 8.7 - Ensure forms are optimized for mobile keyboard
 */
export type MobileInputType = 
  | 'text'
  | 'email'
  | 'tel'
  | 'number'
  | 'decimal'
  | 'password'
  | 'search'
  | 'url'
  | 'otp'

export interface MobileInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Mobile-optimized input type */
  mobileType?: MobileInputType
}

/**
 * Get the correct HTML input type and inputMode for mobile optimization
 */
function getMobileInputAttributes(mobileType: MobileInputType): {
  type: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  autoComplete?: string
  pattern?: string
} {
  switch (mobileType) {
    case 'email':
      return {
        type: 'email',
        inputMode: 'email',
        autoComplete: 'email',
      }
    case 'tel':
      return {
        type: 'tel',
        inputMode: 'tel',
        autoComplete: 'tel',
      }
    case 'number':
      return {
        type: 'number',
        inputMode: 'numeric',
      }
    case 'decimal':
      return {
        type: 'text',
        inputMode: 'decimal',
        pattern: '[0-9]*[.,]?[0-9]*',
      }
    case 'password':
      return {
        type: 'password',
        autoComplete: 'current-password',
      }
    case 'search':
      return {
        type: 'search',
        inputMode: 'search',
      }
    case 'url':
      return {
        type: 'url',
        inputMode: 'url',
        autoComplete: 'url',
      }
    case 'otp':
      return {
        type: 'text',
        inputMode: 'numeric',
        autoComplete: 'one-time-code',
        pattern: '[0-9]*',
      }
    default:
      return {
        type: 'text',
        inputMode: 'text',
      }
  }
}

/**
 * Mobile-optimized input component
 * Automatically sets correct input types, inputMode, and autocomplete for mobile keyboards
 * Requirements: 8.7 - Ensure forms are optimized for mobile keyboard
 */
const MobileInput = React.forwardRef<HTMLInputElement, MobileInputProps>(
  ({ className, mobileType = 'text', ...props }, ref) => {
    const mobileAttrs = getMobileInputAttributes(mobileType)
    
    return (
      <input
        {...mobileAttrs}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          // Larger text on mobile for better readability
          "sm:text-sm",
          // Prevent zoom on iOS when focusing input
          "text-[16px] sm:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
MobileInput.displayName = "MobileInput"

export { MobileInput, getMobileInputAttributes }
