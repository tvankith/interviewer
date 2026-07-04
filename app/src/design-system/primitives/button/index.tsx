import {
  Button as BaseButton,
  type ButtonProps as BaseButtonProps,
} from "@/components/ui/button"

import { cn } from "@/lib/utils"

type Props = BaseButtonProps & {
  loading?: boolean
}

export function Button({
  loading,
  className,
  children,
  disabled,
  ...props
}: Props) {
  return (
    <BaseButton
      disabled={disabled || loading}
      className={cn("rounded-xl px-5", className)}
      {...props}
    >
      {loading ? "Loading..." : children}
    </BaseButton>
  )
}