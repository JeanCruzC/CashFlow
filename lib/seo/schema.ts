import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo/site";

export type FaqItem = {
  question: string;
  answer: string;
};

type BlogPostingInput = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  authorName: string;
  image?: string;
};

type BlogListItem = {
  slug: string;
  title: string;
  publishedAt: string;
};

export function buildSoftwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    description: SITE_DESCRIPTION,
    url: absoluteUrl("/"),
    inLanguage: ["es", "en"],
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "Gestión de transacciones y cuentas por organización",
      "Presupuesto mensual y análisis Budget vs Actual",
      "Onboarding por perfil personal o empresa",
      "Forecast financiero con supuestos auditables",
    ],
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
      logo: absoluteUrl("/og/cashflow-cover.svg"),
    },
  };
}

export function buildFaqSchema(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function buildBlogSchema(items: BlogListItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `${SITE_NAME} Blog`,
    description: "Guías prácticas de finanzas personales y empresariales.",
    url: absoluteUrl("/blog"),
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
    blogPost: items.map((item) => ({
      "@type": "BlogPosting",
      headline: item.title,
      datePublished: item.publishedAt,
      url: absoluteUrl(`/blog/${item.slug}`),
    })),
  };
}

export function buildBlogPostingSchema(input: BlogPostingInput) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.title,
    description: input.description,
    datePublished: input.publishedAt,
    dateModified: input.publishedAt,
    mainEntityOfPage: absoluteUrl(`/blog/${input.slug}`),
    image: absoluteUrl(input.image ?? DEFAULT_OG_IMAGE),
    author: {
      "@type": "Person",
      name: input.authorName,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl(DEFAULT_OG_IMAGE),
      },
    },
  };
}
