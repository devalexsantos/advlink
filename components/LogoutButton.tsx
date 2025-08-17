"use client"

import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <Button 
    className="bg-zinc-800 hover:bg-zinc-700 cursor-pointer" 
    variant="outline" 
    size="icon" 
    onClick={() => signOut({
      redirect: true,
      callbackUrl: "/login",
    })}
    >
      <LogOut />
    </Button>
  )
}