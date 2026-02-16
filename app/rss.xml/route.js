import { supabase } from "../lib/db";

export async function GET() {

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  console.log("RSS POSTS:", posts, error);

  const baseUrl = "https://crochetpatterns.vercel.app";

  const items = posts?.map(post => `
<item>
<title>${post.title}</title>
<link>${baseUrl}/blog/${post.slug}</link>
<description>${post.title}</description>
<pubDate>${new Date(post.created_at).toUTCString()}</pubDate>
</item>
`).join("") || "";

  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
<title>Crochet Blog</title>
<link>${baseUrl}</link>
<description>Automatic crochet blog</description>
${items}
</channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
