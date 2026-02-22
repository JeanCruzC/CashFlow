import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import JsonLd from "@/components/seo/JsonLd";
import { getAllPosts } from "@/lib/blog/posts";
import { buildBlogSchema } from "@/lib/seo/schema";
import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Blog de finanzas",
  description:
    "Guías prácticas de flujo de caja, presupuesto, Operating Margin y control financiero para personas y empresas.",
  alternates: {
    canonical: absoluteUrl("/blog"),
  },
  openGraph: {
    title: `Blog de finanzas | ${SITE_NAME}`,
    description:
      "Aprende a implementar métricas financieras reales dentro de tu operación: cash flow, budget vs actual, EBIT y más.",
    url: absoluteUrl("/blog"),
    type: "website",
    images: [
      {
        url: absoluteUrl(DEFAULT_OG_IMAGE),
        width: 1200,
        height: 630,
        alt: "Blog de CashFlow",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Blog de finanzas | ${SITE_NAME}`,
    description:
      "Guías accionables para mejorar el control financiero personal y empresarial desde una sola plataforma.",
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
};

function formatDate(dateIso: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(dateIso));
}

export default async function BlogPage() {
  const posts = await getAllPosts();
  const blogSchema = buildBlogSchema(posts.map((post) => ({ slug: post.slug, title: post.title, publishedAt: post.date })));

  return (
    <main className="min-h-screen bg-[#f3f8fc] px-5 py-10 text-[#0f172a] md:px-8 md:py-16">
      <JsonLd id="blog-schema" data={blogSchema} />

      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-10 rounded-[30px] border border-[#d7e5ef] bg-white px-7 py-9 shadow-[0_18px_34px_rgba(10,63,93,0.08)] md:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#3f6785]">Contenido técnico</p>
          <h1 className="mt-3 text-4xl font-black md:text-5xl">Blog financiero de CashFlow</h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#48657b]">
            Publicamos guías reales sobre gestión financiera, presupuesto, forecast y métricas como EBIT y Operating Margin.
          </p>
        </header>

        {posts.length === 0 ? (
          <section className="rounded-3xl border border-[#d7e5ef] bg-white p-8 text-[#48657b] shadow-[0_12px_28px_rgba(9,62,93,0.08)]">
            No hay artículos publicados todavía.
          </section>
        ) : (
          <section aria-label="Listado de artículos" className="grid gap-6 md:grid-cols-2">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="overflow-hidden rounded-3xl border border-[#d7e5ef] bg-white shadow-[0_12px_28px_rgba(9,62,93,0.08)] transition-transform hover:-translate-y-1"
              >
                <Link href={`/blog/${post.slug}`} className="block">
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#e8f3fa]">
                    <Image
                      src={post.coverImage}
                      alt={post.coverAlt}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                      priority={false}
                    />
                  </div>

                  <div className="p-6">
                    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#4d657a]">
                      <span>{post.category}</span>
                      <span>{formatDate(post.date)}</span>
                      <span>{post.readingTime}</span>
                    </div>
                    <h2 className="mt-3 text-2xl font-black text-[#123149]">{post.title}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-[#4b667c]">{post.description}</p>
                    {post.tags.length > 0 ? (
                      <ul className="mt-4 flex flex-wrap gap-2 text-xs text-[#32546e]">
                        {post.tags.map((tag) => (
                          <li key={tag} className="rounded-full border border-[#d5e3ee] bg-[#f5fafe] px-3 py-1">
                            {tag}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </Link>
              </article>
            ))}
          </section>
        )}

        <div className="mt-10">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-2xl border border-[#cfe0ec] bg-white px-5 py-3 text-sm font-semibold text-[#1e3e56] transition-all hover:border-[#9fc1d8]"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
