import OpenAI from "openai";
import { supabase } from "../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {

  try {

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const RSS_URL = "https://crochetpatternworks.etsy.com/rss";

    const res = await fetch(RSS_URL);

    if (!res.ok) {
      throw new Error("RSS fetch failed");
    }

    const xml = await res.text();

    // 🔥 PARSE EACH ITEM SEPARATELY (STABLE METHOD)
    const rawItems = xml.split("<item>").slice(1);

    const items = rawItems.map(item => {

      const titleMatch = item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);

      // Etsy thumbnail
      const imgMatch =
        item.match(/<media:thumbnail url="([^"]+)"/) ||
        item.match(/<media:content url="([^"]+)"/);

      return {
        title: titleMatch ? titleMatch[1] : "",
        link: linkMatch ? linkMatch[1] : "",
        image: imgMatch ? imgMatch[1] : null
      };

    }).filter(i => i.title && i.link);

    if (!items.length) {
      throw new Error("No products found in RSS");
    }

    const selected = items[Math.floor(Math.random() * items.length)];

    const imageUrl = selected.image;

    // AI CONTENT
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `You are a crochet blogger AND Pinterest SEO expert.

Create:

BLOG:
Helpful crochet article.
Mention Etsy link naturally 3 times.

PIN_TITLE:
Short clickable Pinterest title.

PIN_DESCRIPTION:
SEO friendly description for Pinterest.

HASHTAGS:
crochet hashtags.`
        },
        {
          role: "user",
          content: `Pattern: ${selected.title}
Etsy link: ${selected.link}`
        }
      ]
    });

    const output = completion.choices?.[0]?.message?.content;

    const slug = "post-" + Date.now();

    const { error } = await supabase
      .from("posts")
      .insert({
        slug,
        title: selected.title,
        content: output,
        image: imageUrl
      });

    if (error) {
      throw error;
    }

    return Response.json({ success: true, slug, image: imageUrl });

  } catch (err) {

    console.error("AUTPOST ERROR:", err);

    return Response.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}