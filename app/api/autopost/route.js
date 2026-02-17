import OpenAI from "openai";
import { supabase } from "../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {

  try {

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // =============================
    // FETCH ETSY RSS
    // =============================

    const rss = await fetch("https://crochetpatternworks.etsy.com/rss");
    const xml = await rss.text();

    const rawItems = xml.split("<item>").slice(1);

    const items = rawItems.map(item => {

      const title = item.match(/<title>(.*?)<\/title>/)?.[1];
      const link = item.match(/<link>(.*?)<\/link>/)?.[1];

      return { title, link };

    }).filter(i=>i.title && i.link);

    const selected = items[Math.floor(Math.random()*items.length)];

    // =============================
    // AI BLOG CONTENT
    // =============================

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

    // =============================
    // GENERATE AI PIN IMAGE
    // =============================

    const imageResponse = await openai.images.generate({
      model:"gpt-image-1",
      prompt:`Pinterest vertical crochet pin, cozy yarn aesthetic, clean layout, product: ${selected.title}, safe handmade craft design`,
      size:"1024x1024"
    });

    const base64 = imageResponse.data?.[0]?.b64_json;

    let imageUrl = null;

    if(base64){

      const buffer = Buffer.from(base64,"base64");

      const fileName = `pin-${Date.now()}.png`;

      const { error } = await supabase.storage
        .from("pins")
        .upload(fileName, buffer, {
          contentType:"image/png"
        });

      if(!error){

        const { data } = supabase.storage
          .from("pins")
          .getPublicUrl(fileName);

        imageUrl = data.publicUrl;
      }
    }

    // =============================
    // SAVE BLOG POST
    // =============================

    const slug = "post-"+Date.now();

    await supabase.from("posts").insert({
      slug,
      title:selected.title,
      content:output,
      image:imageUrl
    });

    // =============================
    // POST TO PINTEREST
    // =============================

    const pinTitle = output.split("PIN_TITLE:")[1]?.split("PIN_DESCRIPTION:")[0]?.trim();
    const pinDesc = output.split("PIN_DESCRIPTION:")[1]?.trim();

    await fetch("https://api.pinterest.com/v5/pins",{
      method:"POST",
      headers:{
        "Authorization":`Bearer ${process.env.PINTEREST_ACCESS_TOKEN}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        board_id:process.env.PINTEREST_BOARD_ID,
        title:pinTitle,
        description:pinDesc,
        link:`https://crochetpatterns.vercel.app/blog/${slug}`,
        media_source:{
          source_type:"image_url",
          url:imageUrl
        }
      })
    });

    return Response.json({success:true,slug,image:imageUrl});

  } catch(err){

    console.error(err);

    return Response.json({
      success:false,
      error:err.message
    });
  }
}