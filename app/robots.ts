import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/dashboard/', '/onboarding/'],
        },
        sitemap: 'https://onecashflow.vercel.app/sitemap.xml',
    }
}
