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

    const rawItems = xml.split("<item>").slice(1);

    const items = rawItems.map(item => {

      const titleMatch = item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);

      return {
        title: titleMatch ? titleMatch[1] : "",
        link: linkMatch ? linkMatch[1] : ""
      };

    }).filter(i => i.title && i.link);

    if (!items.length) {
      throw new Error("No products found in RSS");
    }

    const selected = items[Math.floor(Math.random() * items.length)];

    // ⭐ AI BLOG + PIN CONTENT

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `You are crochet blogger + Pinterest SEO expert.

Return:

BLOG:
...

PIN_TITLE:
...

PIN_DESCRIPTION:
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

    // ⭐ AI GENERATE PIN IMAGE (ALLTID FUNKER)

    const img = await openai.images.generate({
      model: "gpt-image-1",
      prompt: `Vertical pinterest crochet pin, cozy yarn aesthetic, handmade crochet design, product: ${selected.title}, minimal modern pinterest layout`,
      size: "1024x1024"
    });

    const imageBase64 = img.data?.[0]?.b64_json;

    let imageUrl = null;

    if (imageBase64) {

      const buffer = Buffer.from(imageBase64, "base64");

      const fileName = `pin-${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from("pins")
        .upload(fileName, buffer, {
          contentType: "image/png"
        });

      if (!uploadError) {

        const { data } = supabase.storage
          .from("pins")
          .getPublicUrl(fileName);

        imageUrl = data.publicUrl;
      }
    }

    const slug = "post-" + Date.now();

    await supabase.from("posts").insert({
      slug,
      title: selected.title,
      content: output,
      image: imageUrl
    });

    return Response.json({ success:true, slug, image:imageUrl });

  } catch(err){

    console.error(err);

    return Response.json({
      success:false,
      error:err.message
    });
  }
}