import OpenAI from "openai";

export const dynamic = "force-dynamic"; // viktig for Vercel cron

export async function GET() {

  try {

    // Init OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // TEST topic (vi kobler RSS senere)
    const topic = "Easy crochet patterns for beginners";

    // Generer bloggpost
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `
You are a friendly crochet blogger.
Write helpful SEO blog articles.
Natural tone.
No marketing hype.
Use headings.
`
        },
        {
          role: "user",
          content: `Write a helpful crochet blog article about: ${topic}`
        }
      ],
    });

    const article = completion.choices[0]?.message?.content;

    console.log("GENERATED ARTICLE:");
    console.log(article);

    return Response.json({
      success: true,
      article
    });

  } catch (error) {

    console.error(error);

    return Response.json({
      success: false,
      error: "Something went wrong"
    }, { status: 500 });

  }
}