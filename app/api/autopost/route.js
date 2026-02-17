import OpenAI from "openai";
import { supabase } from "../../lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {

  try {

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // 🔥 FETCH ETSY RSS
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

    if(!items.length){
      throw new Error("No items in RSS");
    }

    const selected = items[Math.floor(Math.random()*items.length)];

    // ⭐ GENERATE BLOG TEXT

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

    // 🔥 SAFE IMAGE PROMPT (ANTI SAFETY BLOCK)

    const safePrompt = `
Pinterest vertical crochet artwork illustration.

Theme: cozy handmade crochet craft.

Style:
- yarn texture
- pastel colors
- craft illustration
- flat design
- NO people
- NO dolls
- NO characters
- crochet object only

Product inspiration: ${selected.title}
`;

    const imageResponse = await openai.images.generate({
      model:"gpt-image-1",
      prompt:safePrompt,
      size:"1024x1024"
    });

    let imageUrl = null;

    // ⭐ CASE 1 — base64 image

    if(imageResponse.data?.[0]?.b64_json){

      const buffer = Buffer.from(
        imageResponse.data[0].b64_json,
        "base64"
      );

      const fileName = `pin-${Date.now()}.png`;

      const { error:uploadError } = await supabase.storage
        .from("pins")
        .upload(fileName, buffer, {
          contentType:"image/png"
        });

      if(!uploadError){

        const { data } = supabase.storage
          .from("pins")
          .getPublicUrl(fileName);

        imageUrl = data.publicUrl;
      }
    }

    // ⭐ CASE 2 — direct URL fallback

    if(!imageUrl && imageResponse.data?.[0]?.url){
      imageUrl = imageResponse.data[0].url;
    }

    const slug = "post-"+Date.now();

    await supabase.from("posts").insert({
      slug,
      title:selected.title,
      content:output,
      image:imageUrl
    });

    return Response.json({
      success:true,
      slug,
      image:imageUrl
    });

  } catch(err){

    console.error("AUTPOST ERROR:", err);

    return Response.json({
      success:false,
      error:err.message
    });
  }
}