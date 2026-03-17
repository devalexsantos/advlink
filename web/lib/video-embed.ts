type VideoEmbed = {
  provider: "youtube" | "vimeo"
  embedUrl: string
}

export function getVideoEmbedUrl(url: string): VideoEmbed | null {
  if (!url || typeof url !== "string") return null

  const trimmed = url.trim()
  if (!trimmed) return null

  // YouTube patterns
  const ytPatterns = [
    /(?:youtube\.com\/watch\?.*v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
  ]

  for (const pattern of ytPatterns) {
    const match = trimmed.match(pattern)
    if (match?.[1]) {
      return { provider: "youtube", embedUrl: `https://www.youtube.com/embed/${match[1]}` }
    }
  }

  // Vimeo patterns
  const vimeoPatterns = [
    /(?:vimeo\.com\/)(\d+)/,
    /(?:player\.vimeo\.com\/video\/)(\d+)/,
  ]

  for (const pattern of vimeoPatterns) {
    const match = trimmed.match(pattern)
    if (match?.[1]) {
      return { provider: "vimeo", embedUrl: `https://player.vimeo.com/video/${match[1]}` }
    }
  }

  return null
}
