import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { signIn } from "next-auth/react";

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
      <Mail className="h-4 w-4 text-red-400" />
      Continuar com Gmail
    </Button>
  )
}