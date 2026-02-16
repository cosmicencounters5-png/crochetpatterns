import OpenAI from "openai";
import { supabase } from "../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {

  try {

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const RSS_URL = "https://crochetpatternworks.etsy.com/rss";

    // hent rss
    const res = await fetch(RSS_URL);

    if (!res.ok) {
      return Response.json({ error: "RSS fetch failed" }, { status: 500 });
    }

    const xml = await res.text();

    const titles = [...xml.matchAll(/<title>(.*?)<\/title>/g)].slice(1);
    const links = [...xml.matchAll(/<link>(.*?)<\/link>/g)].slice(1);

    if (!titles.length) {
      return Response.json({ error: "No products found in RSS" });
    }

    const items = titles.map((t, i) => ({
      title: t[1],
      link: links[i] ? links[i][1] : ""
    }));

    const selected = items[Math.floor(Math.random() * items.length)];

    // AI GENERERING
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `You are crochet blogger + Pinterest expert.

Return:

BLOG:
...
PIN_TITLE:
...
PIN_DESCRIPTION:
...
HASHTAGS:
...`
        },
        {
          role: "user",
          content: `Pattern: ${selected.title}
Link: ${selected.link}`
        }
      ]
    });

    const output = completion.choices?.[0]?.message?.content;

    if (!output) {
      return Response.json({ error: "AI generation failed" });
    }

    const slug = "post-" + Date.now();

    // SUPABASE INSERT (MED ERROR DEBUG)
    const { data, error } = await supabase
      .from("posts")
      .insert({
        slug,
        title: selected.title,
        content: output
      });

    console.log("SUPABASE INSERT:", data, error);

    if (error) {
      return Response.json({
        error: "Supabase insert failed",
        details: error
      }, { status: 500 });
    }

    return Response.json({ slug });

  } catch (err) {

    console.error("AUTPOST ERROR:", err);

    return Response.json({
      error: "Server crash",
      details: err.message
    }, { status: 500 });
  }
}
