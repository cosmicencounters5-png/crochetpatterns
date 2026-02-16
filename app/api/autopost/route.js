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

    const titles = [...xml.matchAll(/<title>(.*?)<\/title>/g)].slice(1);
    const links = [...xml.matchAll(/<link>(.*?)<\/link>/g)].slice(1);

    // 🔥 HENT IMAGE FRA DESCRIPTION
    const descriptions = [...xml.matchAll(/<description><!\[CDATA\[(.*?)\]\]><\/description>/gs)];

    const items = titles.map((t, i) => {

      let imageUrl = null;

      if (descriptions[i]) {
        const imgMatch = descriptions[i][1].match(/<img[^>]+src="([^"]+)"/);
        if (imgMatch) {
          imageUrl = imgMatch[1];
        }
      }

      return {
        title: t[1],
        link: links[i] ? links[i][1] : "",
        image: imageUrl
      };

    });

    const selected = items[Math.floor(Math.random() * items.length)];

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
crochet hashtags.
`
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
        image: selected.image
      });

    if (error) {
      throw error;
    }

    return Response.json({ success: true, slug });

  } catch (err) {

    console.error("AUTPOST ERROR:", err);

    return Response.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}