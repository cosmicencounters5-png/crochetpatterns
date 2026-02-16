import OpenAI from "openai";
import { supabase } from "../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const RSS_URL = "https://crochetpatternworks.etsy.com/rss";

  const res = await fetch(RSS_URL);
  const xml = await res.text();

  const titles = [...xml.matchAll(/<title>(.*?)<\/title>/g)].slice(1);
  const links = [...xml.matchAll(/<link>(.*?)<\/link>/g)].slice(1);

  const items = titles.map((t,i)=>({
    title:t[1],
    link:links[i] ? links[i][1] : ""
  }));

  const selected = items[Math.floor(Math.random()*items.length)];

  const completion = await openai.chat.completions.create({
    model:"gpt-4.1",
    messages:[
      {
        role:"system",
        content:`You are crochet blogger + Pinterest expert.

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
        role:"user",
        content:`Pattern: ${selected.title}
Link: ${selected.link}`
      }
    ]
  });

  const output = completion.choices[0].message.content;

  const slug = "post-"+Date.now();

  await supabase.from("posts").insert({
    slug,
    title:selected.title,
    content:output
  });

  return Response.json({slug});
}
