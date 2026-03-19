import { getAllPosts } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";
import { Container } from "@/components/Container";

export default function HomePage() {
  const posts = getAllPosts();

  return (
    <main className="flex-1 py-12 sm:py-16">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Marketing Jurídico e Presença Digital
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Dicas práticas para advogados que querem atrair mais clientes,
            fortalecer sua marca e se destacar no digital.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      </Container>
    </main>
  );
}
