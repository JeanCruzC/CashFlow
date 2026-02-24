type JsonLdProps = {
  id: string;
  data: Record<string, unknown>;
};

function toSafeJsonLd(data: Record<string, unknown>) {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export default function JsonLd({ id, data }: JsonLdProps) {
  return <script id={id} type="application/ld+json" dangerouslySetInnerHTML={{ __html: toSafeJsonLd(data) }} />;
}
