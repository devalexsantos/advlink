import Link from "next/link";
import Image from "next/image";
import type { PostMeta } from "@/lib/posts";

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface PostCardProps {
  post: PostMeta;
}

export function PostCard({ post }: PostCardProps) {
  return (
    <article className="group overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md">
      <Link href={`/blog/${post.slug}`} className="block">
        {post.coverImage && (
          <div className="relative aspect-[16/9] w-full overflow-hidden">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              sizes="(max-width: 640px) 100vw, 50vw"
              className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        )}

        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap gap-2">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
          </div>

          <h2 className="mt-3 text-lg font-semibold text-foreground transition-colors group-hover:text-primary sm:text-xl">
            {post.title}
          </h2>

          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground sm:line-clamp-3 sm:text-base">
            {post.description}
          </p>

          <div className="mt-4 flex items-center justify-between">
            <time
              dateTime={post.date}
              className="text-sm text-muted-foreground"
            >
              {formatDate(post.date)}
            </time>

            <span className="text-sm font-medium text-primary transition-colors group-hover:underline">
              Ler mais &rarr;
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
