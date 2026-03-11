"use client"

import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";
import gmailIcon from "@/assets/icons/gmail-icon.svg"
import Image from "next/image";

export function GoogleLoginButton() {
  return (
    <Button 
    type="button" 
    variant="secondary" 
    className="flex items-center justify-center gap-2 cursor-pointer border border-border bg-card hover:bg-muted text-foreground"
    onClick={async () => {
       await signIn("google", {
        redirect: false,
        callbackUrl: "/onboarding/profile",
       })
    }}
    >
      <Image width={20} height={20} src={gmailIcon} alt="Gmail" />
     Acesse com o Gmail 
    </Button>
  )
}