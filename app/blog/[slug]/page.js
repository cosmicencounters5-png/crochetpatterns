import { supabase } from "../../lib/db";

export default async function BlogPost({ params }) {

  const { data } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (!data) {
    return <h1>Not found</h1>;
  }

  return (
    <main>
      <h1>{data.title}</h1>
      <div style={{whiteSpace:"pre-wrap"}}>
        {data.content}
      </div>
    </main>
  );
}
