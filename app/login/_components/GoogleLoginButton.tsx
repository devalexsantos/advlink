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
    className="flex items-center justify-center gap-2 cursor-pointer border border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 text-blue-50"
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