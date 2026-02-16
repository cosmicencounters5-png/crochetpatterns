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

    const titles = [...xml.matchAll(/<title>(.*?)<\/title>/g)].slice(1);
    const links = [...xml.matchAll(/<link>(.*?)<\/link>/g)].slice(1);

    const items = titles.map((t, i) => ({
      title: t[1],
      link: links[i] ? links[i][1] : ""
    }));

    const selected = items[Math.floor(Math.random() * items.length)];

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `
You are a crochet blogger AND Pinterest SEO expert.

Create:

1) A helpful crochet blog article
2) Pinterest pin title
3) Pinterest pin description
4) Pinterest hashtags

RULES:

- Blog article must mention Etsy link naturally 3 times
- Friendly handmade tone
- SEO optimized but natural
- Pinterest title must be clickable
`
        },
        {
          role: "user",
          content: `
Crochet pattern:

${selected.title}

Etsy link:

${selected.link}

Return format:

BLOG:
[text]

PIN_TITLE:
[text]

PIN_DESCRIPTION:
[text]

HASHTAGS:
[text]
`
        }
      ],
    });

    const output = completion.choices[0]?.message?.content;

    const newPost = {
      slug: "post-" + Date.now(),
      title: selected.title,
      content: output,
      link: selected.link
    };

    posts.push(newPost);

    return Response.json(newPost);

  } catch (error) {

    console.error(error);

    return Response.json({ success: false }, { status: 500 });

  }

}