import OpenAI from "openai";
import { supabase } from "../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {

  try {

    console.log("START AUTPOST");

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // ======================
    // FETCH RSS
    // ======================

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

    console.log("SELECTED:", selected);

    // ======================
    // AI BLOG
    // ======================

    const completion = await openai.chat.completions.create({
      model:"gpt-4.1",
      messages:[
        { role:"system", content:"Write crochet blog content." },
        { role:"user", content:selected.title }
      ]
    });

    const output = completion.choices[0].message.content;

    // ======================
    // IMAGE GENERATION
    // ======================

    console.log("GENERATING IMAGE...");

    const imageResponse = await openai.images.generate({
      model:"gpt-image-1",
      prompt:`Pinterest crochet pin, safe handmade yarn design, ${selected.title}`,
      size:"1024x1024"
    });

    console.log("IMAGE RESPONSE:", imageResponse);

    const base64 = imageResponse.data?.[0]?.b64_json;

    if(!base64){
      console.log("NO BASE64 RETURNED");
    }

    let imageUrl = null;

    if(base64){

      const bytes = Uint8Array.from(
        atob(base64),
        c => c.charCodeAt(0)
      );

      const fileName = `pin-${Date.now()}.png`;

      console.log("UPLOADING TO SUPABASE...");

      const { data, error } = await supabase.storage
        .from("pins")
        .upload(fileName, bytes, {
          contentType:"image/png",
          upsert:true
        });

      console.log("UPLOAD RESULT:", data, error);

      if(!error){

        const { data: publicData } = supabase.storage
          .from("pins")
          .getPublicUrl(fileName);

        imageUrl = publicData.publicUrl;

        console.log("PUBLIC URL:", imageUrl);
      }
    }

    const slug = "post-"+Date.now();

    await supabase.from("posts").insert({
      slug,
      title:selected.title,
      content:output,
      image:imageUrl
    });

    console.log("DONE");

    return Response.json({success:true,slug,image:imageUrl});

  } catch(err){

    console.error("AUTPOST ERROR:", err);

    return Response.json({
      success:false,
      error:err.message
    });
  }
}