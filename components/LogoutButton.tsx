"use client"

import { Button, type buttonVariants } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import type { VariantProps } from "class-variance-authority";

type Props = React.ComponentProps<typeof Button> & VariantProps<typeof buttonVariants>

export default function LogoutButton({ children, className, variant = "ghost", size = "sm", ...rest }: Props) {
  return (
    <Button
      className={className}
      variant={variant}
      size={size}
      onClick={() => signOut({ redirect: true, callbackUrl: "/login" })}
      {...rest}
    >
      <LogOut className="w-4 h-4" />
      {children && <span>{children}</span>}
    </Button>
  )
}