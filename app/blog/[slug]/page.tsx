import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type {
  AnchorHTMLAttributes,
  HTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import JsonLd from "@/components/seo/JsonLd";
import { getAllPosts, getPostBySlug } from "@/lib/blog/posts";
import { buildBlogPostingSchema } from "@/lib/seo/schema";
import { absoluteUrl, SITE_NAME } from "@/lib/seo/site";

type BlogPostPageProps = {
  params: {
    slug: string;
  };
};

function formatDate(dateIso: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(dateIso));
}

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);

  if (!post) {
    return {
      title: "Artículo no encontrado",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: `${post.title} | Blog`,
    description: post.description,
    alternates: {
      canonical: absoluteUrl(`/blog/${post.slug}`),
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      url: absoluteUrl(`/blog/${post.slug}`),
      publishedTime: post.date,
      authors: [post.author],
      images: [
        {
          url: absoluteUrl(post.coverImage),
          width: 1200,
          height: 630,
          alt: post.coverAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [absoluteUrl(post.coverImage)],
    },
  };
}

const mdxComponents = {
  h2: (props: HTMLAttributes<HTMLHeadingElement>) => <h2 {...props} className="mt-10 text-3xl font-black text-[#123149]" />,
  h3: (props: HTMLAttributes<HTMLHeadingElement>) => <h3 {...props} className="mt-8 text-2xl font-extrabold text-[#123149]" />,
  p: (props: HTMLAttributes<HTMLParagraphElement>) => <p {...props} className="mt-4 text-base leading-8 text-[#274258]" />,
  a: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      {...props}
      className="font-semibold text-[#0d4c7a] underline decoration-[#9ec0d8] underline-offset-4 transition-colors hover:text-[#0b3f66]"
    />
  ),
  ul: (props: HTMLAttributes<HTMLUListElement>) => <ul {...props} className="mt-4 list-disc space-y-2 pl-6 text-[#274258]" />,
  ol: (props: HTMLAttributes<HTMLOListElement>) => <ol {...props} className="mt-4 list-decimal space-y-2 pl-6 text-[#274258]" />,
  li: (props: HTMLAttributes<HTMLLIElement>) => <li {...props} className="leading-7" />,
  blockquote: (props: HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote {...props} className="mt-6 rounded-2xl border-l-4 border-[#0d4c7a] bg-[#f3f8fc] px-5 py-4 text-[#274258]" />
  ),
  code: (props: HTMLAttributes<HTMLElement>) => (
    <code {...props} className="rounded bg-[#edf4f9] px-1.5 py-1 font-mono text-sm text-[#11324a]" />
  ),
  pre: (props: HTMLAttributes<HTMLPreElement>) => (
    <pre {...props} className="mt-5 overflow-x-auto rounded-2xl bg-[#0f172a] p-5 text-sm text-[#e2e8f0]" />
  ),
  hr: () => <hr className="my-8 border-[#dce7f0]" />,
  table: (props: HTMLAttributes<HTMLTableElement>) => (
    <div className="mt-5 overflow-x-auto">
      <table {...props} className="w-full min-w-[520px] border-collapse overflow-hidden rounded-xl border border-[#dce7f0]" />
    </div>
  ),
  th: (props: ThHTMLAttributes<HTMLTableCellElement>) => <th {...props} className="border border-[#dce7f0] bg-[#f3f8fc] px-4 py-2 text-left text-sm font-bold text-[#14324a]" />,
  td: (props: TdHTMLAttributes<HTMLTableCellElement>) => <td {...props} className="border border-[#dce7f0] px-4 py-2 text-sm text-[#274258]" />,
};

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const post = await getPostBySlug(params.slug);
  if (!post) notFound();

  const articleSchema = buildBlogPostingSchema({
    slug: post.slug,
    title: post.title,
    description: post.description,
    publishedAt: post.date,
    authorName: post.author,
    image: post.coverImage,
  });

  return (
    <main className="min-h-screen bg-[#f3f8fc] px-5 py-10 text-[#0f172a] md:px-8 md:py-16">
      <JsonLd id={`blog-post-schema-${post.slug}`} data={articleSchema} />

      <article className="mx-auto w-full max-w-4xl">
        <header className="mb-8 rounded-[30px] border border-[#d7e5ef] bg-white p-7 shadow-[0_18px_34px_rgba(10,63,93,0.08)] md:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#3f6785]">Blog de {SITE_NAME}</p>
          <h1 className="mt-3 text-4xl font-black leading-tight md:text-5xl">{post.title}</h1>
          <p className="mt-4 text-base leading-relaxed text-[#48657b]">{post.description}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#4d657a]">
            <span>{post.category}</span>
            <span>{formatDate(post.date)}</span>
            <span>{post.author}</span>
            <span>{post.readingTime}</span>
          </div>
        </header>

        <div className="relative mb-8 aspect-[16/9] w-full overflow-hidden rounded-3xl border border-[#d7e5ef] bg-[#e8f3fa]">
          <Image src={post.coverImage} alt={post.coverAlt} fill priority className="object-cover" sizes="(max-width: 1200px) 100vw, 1200px" />
        </div>

        <section className="rounded-[30px] border border-[#d7e5ef] bg-white p-7 shadow-[0_18px_34px_rgba(10,63,93,0.08)] md:p-10">
          <MDXRemote
            source={post.content}
            options={{
              mdxOptions: {
                remarkPlugins: [remarkGfm],
                rehypePlugins: [
                  rehypeSlug,
                  [
                    rehypeAutolinkHeadings,
                    {
                      behavior: "append",
                      properties: { className: ["anchor-link"] },
                    },
                  ],
                ],
              },
            }}
            components={mdxComponents}
          />
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/blog"
            className="inline-flex items-center justify-center rounded-2xl border border-[#cfe0ec] bg-white px-5 py-3 text-sm font-semibold text-[#1e3e56] transition-all hover:border-[#9fc1d8]"
          >
            Volver al blog
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-2xl bg-[#0d4c7a] px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-[#0b3f66]"
          >
            Probar CashFlow
          </Link>
        </div>
      </article>
    </main>
  );
}
