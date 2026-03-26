export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
    ],
    sitemap: 'https://cazadvf.fr/sitemap.xml',
    host: 'https://cazadvf.fr',
  };
}
