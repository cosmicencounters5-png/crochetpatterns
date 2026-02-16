import OpenAI from "openai";
import { posts } from "../../lib/posts";

export const dynamic = "force-dynamic";

export async function GET() {

  try {

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // ✅ DIN ETSY RSS
    const RSS_URL = "https://crochetpatternworks.etsy.com/rss";

    // hent RSS feed
    const res = await fetch(RSS_URL);
    const xml = await res.text();

    // hent alle titles fra RSS
    const matches = [...xml.matchAll(/<title>(.*?)<\/title>/g)];

    // første title er shop navn → skip
    const productTitles = matches.slice(1).map(m => m[1]);

    // velg tilfeldig produkt
    const topic = productTitles[Math.floor(Math.random() * productTitles.length)];

    // generer bloggpost med AI
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: "You are a crochet blogger writing helpful SEO posts."
        },
        {
          role: "user",
          content: `Write a helpful crochet blog article about this crochet pattern: ${topic}. Include beginner tips, inspiration and natural tone.`
        }
      ],
    });

    const article = completion.choices[0]?.message?.content;

    const newPost = {
      slug: "post-" + Date.now(),
      title: topic,
      content: article
    };

    // lagre i mini database
    posts.push(newPost);

    return Response.json(newPost);

  } catch (error) {

    console.error(error);

    return Response.json({ success: false }, { status: 500 });

  }

}