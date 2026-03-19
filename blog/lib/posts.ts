import fs from "fs";
import path from "path";
import matter from "gray-matter";

const postsDirectory = path.join(process.cwd(), "content", "blog");

export interface PostMeta {
  title: string;
  description: string;
  date: string;
  slug: string;
  author: string;
  tags: string[];
  coverImage: string;
}

export interface Post {
  meta: PostMeta;
  content: string;
}

export function getAllPosts(): PostMeta[] {
  const files = fs.readdirSync(postsDirectory);

  const posts = files
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const filePath = path.join(postsDirectory, file);
      const fileContents = fs.readFileSync(filePath, "utf8");
      const { data } = matter(fileContents);

      return {
        title: data.title,
        description: data.description,
        date: data.date,
        slug: data.slug,
        author: data.author,
        tags: data.tags || [],
        coverImage: data.coverImage || "",
      } as PostMeta;
    });

  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getPostBySlug(slug: string): Post | null {
  const files = fs.readdirSync(postsDirectory);
  const file = files.find((f) => {
    const filePath = path.join(postsDirectory, f);
    const fileContents = fs.readFileSync(filePath, "utf8");
    const { data } = matter(fileContents);
    return data.slug === slug;
  });

  if (!file) return null;

  const filePath = path.join(postsDirectory, file);
  const fileContents = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    meta: {
      title: data.title,
      description: data.description,
      date: data.date,
      slug: data.slug,
      author: data.author,
      tags: data.tags || [],
      coverImage: data.coverImage || "",
    },
    content,
  };
}

export function getAllSlugs(): string[] {
  const posts = getAllPosts();
  return posts.map((post) => post.slug);
}
