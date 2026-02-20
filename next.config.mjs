import { withSentryConfig } from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === "production";

const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.ingest.sentry.io",
    "form-action 'self'",
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    poweredByHeader: false,
    async headers() {
        const headers = [
            { key: "Content-Security-Policy", value: contentSecurityPolicy },
            { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "X-Frame-Options", value: "DENY" },
            { key: "X-DNS-Prefetch-Control", value: "off" },
            { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ];

        if (isProduction) {
            headers.push({
                key: "Strict-Transport-Security",
                value: "max-age=31536000; includeSubDomains; preload",
            });
        }

        return [
            {
                source: "/(.*)",
                headers,
            },
        ];
    },
};

const sentryWebpackPluginOptions = {
    silent: true,
};

export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
