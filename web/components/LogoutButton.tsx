"use client"

import { Button, type buttonVariants } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import type { VariantProps } from "class-variance-authority";

type Props = React.ComponentProps<typeof Button> & VariantProps<typeof buttonVariants>

export default function LogoutButton({ children, className, variant = "ghost", size = "sm", ...rest }: Props) {
  const { onClick, ...buttonProps } = rest as { onClick?: React.MouseEventHandler<HTMLButtonElement> }
  async function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    try {
      if (typeof onClick === "function") {
        onClick(e)
      }
    } finally {
      await signOut({ redirect: true, callbackUrl: "/login" })
    }
  }
  return (
    <Button
      type="button"
      className={className}
      variant={variant}
      size={size}
      onClick={handleClick}
      {...buttonProps}
    >
      <LogOut className="w-4 h-4" />
      {children && <span>{children}</span>}
    </Button>
  )
}