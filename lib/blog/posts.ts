import fs from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import matter from "gray-matter";

const BLOG_DIRECTORY = path.join(process.cwd(), "content", "blog");

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  category: string;
  coverImage: string;
  coverAlt: string;
  readingTime: string;
  tags: string[];
  content: string;
};

export type BlogPostSummary = Omit<BlogPost, "content">;

function toIsoDate(value: string, fallback: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toISOString();
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

async function readMdxFile(fileName: string): Promise<BlogPost> {
  const slug = fileName.replace(/\.mdx$/, "");
  const filePath = path.join(BLOG_DIRECTORY, fileName);
  const fileContents = await fs.readFile(filePath, "utf8");
  const { data, content } = matter(fileContents);

  const fallbackDate = new Date().toISOString();

  return {
    slug,
    title: typeof data.title === "string" ? data.title : slug,
    description: typeof data.description === "string" ? data.description : "",
    date: toIsoDate(typeof data.date === "string" ? data.date : fallbackDate, fallbackDate),
    author: typeof data.author === "string" ? data.author : "Equipo CashFlow",
    category: typeof data.category === "string" ? data.category : "Finanzas",
    coverImage: typeof data.coverImage === "string" ? data.coverImage : "/og/cashflow-cover.svg",
    coverAlt: typeof data.coverAlt === "string" ? data.coverAlt : "CashFlow blog",
    readingTime: typeof data.readingTime === "string" ? data.readingTime : "5 min",
    tags: normalizeTags(data.tags),
    content,
  };
}

const getAllPostsInternal = cache(async (): Promise<BlogPost[]> => {
  let files: string[] = [];
  try {
    files = await fs.readdir(BLOG_DIRECTORY);
  } catch {
    return [];
  }

  const mdxFiles = files.filter((file) => file.endsWith(".mdx"));
  const posts = await Promise.all(mdxFiles.map(readMdxFile));
  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
});

export const getAllPosts = cache(async (): Promise<BlogPostSummary[]> => {
  const posts = await getAllPostsInternal();
  return posts.map((post) => ({
    slug: post.slug,
    title: post.title,
    description: post.description,
    date: post.date,
    author: post.author,
    category: post.category,
    coverImage: post.coverImage,
    coverAlt: post.coverAlt,
    readingTime: post.readingTime,
    tags: post.tags,
  }));
});

export const getPostBySlug = cache(async (slug: string): Promise<BlogPost | null> => {
  const posts = await getAllPostsInternal();
  return posts.find((post) => post.slug === slug) ?? null;
});
