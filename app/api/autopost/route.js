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

    if (!titles.length) {
      throw new Error("No products found in RSS");
    }

    const items = titles.map((t, i) => ({
      title: t[1],
      link: links[i] ? links[i][1] : ""
    }));

    const selected = items[Math.floor(Math.random() * items.length)];

    // 👇 HENT ETSY PRODUCT IMAGE (100% stabil metode)
    let imageUrl = null;

    try {
      const productRes = await fetch(selected.link);
      const productHtml = await productRes.text();

      const ogMatch = productHtml.match(/property="og:image" content="(.*?)"/);

      if (ogMatch) {
        imageUrl = ogMatch[1];
      }

    } catch (e) {
      console.log("Could not fetch Etsy image");
    }

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

    if (!output) {
      throw new Error("AI generation failed");
    }

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

    return Response.json({ success: true, slug });

  } catch (err) {

    console.error("AUTPOST ERROR:", err);

    return Response.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}