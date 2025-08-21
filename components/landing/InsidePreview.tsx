"use client"

import { motion } from "framer-motion"
import insidePreview from "@/public/por-dentro.png"
import Image from "next/image"

export function InsidePreview() {
  return (
    <section className="relative py-12 px-6 md:py-24">
      <div className="mx-auto max-w-6xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center text-3xl md:text-5xl font-extrabold tracking-tight mb-4"
        >
          Como é por dentro da plataforma
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 overflow-hidden"
        >
          <Image src={insidePreview} alt="Como é por dentro da plataforma" className="h-full w-full object-contain rounded-2xl" />
        </motion.div>
      </div>
    </section>
  )
}


