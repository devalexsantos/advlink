import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getAllSlugs, getPostBySlug } from "@/lib/posts";
import { MdxContent } from "@/components/mdx/MdxContent";
import { Container } from "@/components/Container";
import { SITE_URL, SITE_NAME } from "@/lib/constants";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  const { meta } = post;
  const url = `${SITE_URL}/blog/${meta.slug}`;

  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      type: "article",
      title: meta.title,
      description: meta.description,
      url,
      siteName: SITE_NAME,
      publishedTime: meta.date,
      authors: [meta.author],
      tags: meta.tags,
      ...(meta.coverImage && {
        images: [{ url: meta.coverImage, width: 1200, height: 675 }],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      ...(meta.coverImage && { images: [meta.coverImage] }),
    },
    alternates: {
      canonical: url,
    },
  };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const { meta, content } = post;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: meta.title,
    description: meta.description,
    datePublished: meta.date,
    author: {
      "@type": "Person",
      name: meta.author,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
    },
    ...(meta.coverImage && { image: `${SITE_URL}${meta.coverImage}` }),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/blog/${meta.slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="flex-1 py-12 sm:py-16">
        <Container>
          <article className="mx-auto max-w-3xl">
            <nav className="mb-8">
              <ol className="flex items-center gap-2 text-sm text-muted-foreground">
                <li>
                  <Link
                    href="/"
                    className="transition-colors hover:text-foreground"
                  >
                    Blog
                  </Link>
                </li>
                <li>/</li>
                <li className="truncate text-foreground">{meta.title}</li>
              </ol>
            </nav>

            <header className="mb-10">
              <div className="flex flex-wrap gap-2">
                {meta.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {meta.title}
              </h1>

              <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                <span>{meta.author}</span>
                <span>&middot;</span>
                <time dateTime={meta.date}>{formatDate(meta.date)}</time>
              </div>
            </header>

            {meta.coverImage && (
              <div className="relative -mx-4 mb-10 aspect-[16/9] overflow-hidden rounded-xl sm:mx-0">
                <Image
                  src={meta.coverImage}
                  alt={meta.title}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 768px"
                  className="object-cover"
                />
              </div>
            )}

            <MdxContent source={content} />
          </article>
        </Container>
      </main>
    </>
  );
}
