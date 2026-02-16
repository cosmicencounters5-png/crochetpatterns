import OpenAI from "openai";
import { posts } from "../../lib/posts";

export const dynamic = "force-dynamic";

export async function GET() {

  try {

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const RSS_URL = "https://crochetpatternworks.etsy.com/rss";

    const res = await fetch(RSS_URL);
    const xml = await res.text();

    // hent titles og links
    const titles = [...xml.matchAll(/<title>(.*?)<\/title>/g)].slice(1);
    const links = [...xml.matchAll(/<link>(.*?)<\/link>/g)].slice(1);

    const items = titles.map((t, i) => ({
      title: t[1],
      link: links[i] ? links[i][1] : ""
    }));

    // velg tilfeldig produkt
    const selected = items[Math.floor(Math.random() * items.length)];

    // AI lager bloggpost med naturlig Etsy link
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: "You are a crochet blogger writing helpful SEO posts."
        },
        {
          role: "user",
          content: `
Write a helpful crochet blog article about this crochet pattern:

${selected.title}

Include:

- beginner tips
- crochet inspiration
- natural friendly tone
- mention this Etsy pattern naturally and include this link:

${selected.link}
`
        }
      ],
    });

    const article = completion.choices[0]?.message?.content;

    const newPost = {
      slug: "post-" + Date.now(),
      title: selected.title,
      content: article,
      link: selected.link
    };

    posts.push(newPost);

    return Response.json(newPost);

  } catch (error) {

    console.error(error);

    return Response.json({ success: false }, { status: 500 });

  }

}