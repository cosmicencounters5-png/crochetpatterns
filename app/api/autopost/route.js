import OpenAI from "openai";

export const dynamic = "force-dynamic";

export async function GET() {

  try {

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const topic = "Easy crochet patterns for beginners";

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: "You are a friendly crochet blogger writing helpful SEO blog posts."
        },
        {
          role: "user",
          content: `Write a helpful crochet blog article about: ${topic}`
        }
      ],
    });

    const article = completion.choices[0]?.message?.content;

    return Response.json({
      success: true,
      article
    });

  } catch (error) {

    console.error(error);

    return Response.json({
      success: false
    }, { status: 500 });

  }

}