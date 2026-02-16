import OpenAI from "openai";
import { posts } from "../../lib/posts";

export const dynamic = "force-dynamic";

export async function GET() {

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const topic = "Easy crochet gift ideas";

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      {
        role: "system",
        content: "You are a crochet blogger writing helpful SEO posts."
      },
      {
        role: "user",
        content: `Write a crochet blog article about: ${topic}`
      }
    ],
  });

  const article = completion.choices[0]?.message?.content;

  const newPost = {
    slug: "post-" + Date.now(),
    title: topic,
    content: article
  };

  posts.push(newPost);

  return Response.json(newPost);
}