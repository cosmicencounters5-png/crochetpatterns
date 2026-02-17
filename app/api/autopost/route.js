import OpenAI from "openai";
import { supabase } from "../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {

  try {

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // =========================
    // FETCH RSS
    // =========================

    const RSS_URL = "https://crochetpatternworks.etsy.com/rss";

    const res = await fetch(RSS_URL);

    if (!res.ok) throw new Error("RSS fetch failed");

    const xml = await res.text();

    const rawItems = xml.split("<item>").slice(1);

    const items = rawItems.map(item => {

      const titleMatch = item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);

      return {
        title: titleMatch?.[1],
        link: linkMatch?.[1]
      };

    }).filter(i => i.title && i.link);

    const selected = items[Math.floor(Math.random()*items.length)];

    // =========================
    // AI BLOG TEXT
    // =========================

    const completion = await openai.chat.completions.create({
      model:"gpt-4.1",
      messages:[
        {
          role:"system",
          content:`You are crochet blogger + Pinterest SEO expert.

Return:

BLOG:
...

PIN_TITLE:
...

PIN_DESCRIPTION:
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

    // =========================
    // AI IMAGE GENERATION
    // =========================

    const imageResponse = await openai.images.generate({
      model:"gpt-image-1",
      prompt:`Vertical pinterest crochet pin, cozy yarn aesthetic, handmade crochet style, safe family-friendly design, yarn project: ${selected.title}`,
      size:"1024x1024"
    });

    const base64 = imageResponse.data?.[0]?.b64_json;

    let imageUrl = null;

    if(base64){

      // ⭐ FIX: convert to Uint8Array
      const bytes = Uint8Array.from(
        atob(base64),
        c => c.charCodeAt(0)
      );

      const fileName = `pin-${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from("pins")
        .upload(fileName, bytes, {
          contentType:"image/png",
          upsert:true
        });

      if(uploadError){
        console.log("UPLOAD ERROR:", uploadError);
      } else {

        const { data } = supabase.storage
          .from("pins")
          .getPublicUrl(fileName);

        imageUrl = data.publicUrl;
      }
    }

    // =========================
    // SAVE POST
    // =========================

    const slug = "post-"+Date.now();

    await supabase.from("posts").insert({
      slug,
      title:selected.title,
      content:output,
      image:imageUrl
    });

    return Response.json({ success:true, slug, image:imageUrl });

  } catch(err){

    console.error("AUTPOST ERROR:", err);

    return Response.json({
      success:false,
      error:err.message
    });
  }
}