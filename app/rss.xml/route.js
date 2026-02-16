export async function GET() {

  // Fake posts for nå (vi kobler database senere)
  const posts = [
    {
      title: "Easy Crochet Patterns for Beginners",
      slug: "easy-crochet-patterns",
      description: "Beginner friendly crochet ideas and patterns.",
      date: new Date().toUTCString()
    },
    {
      title: "Cozy Crochet Gift Ideas",
      slug: "cozy-crochet-gifts",
      description: "Beautiful handmade crochet gift inspiration.",
      date: new Date().toUTCString()
    }
  ];

  const baseUrl = "https://crochetpatterns.vercel.app";

  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
<title>Crochet Blog</title>
<link>${baseUrl}</link>
<description>Automatic crochet blog</description>
${posts.map(post => `
<item>
<title>${post.title}</title>
<link>${baseUrl}/blog/${post.slug}</link>
<description>${post.description}</description>
<pubDate>${post.date}</pubDate>
</item>
`).join("")}
</channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}