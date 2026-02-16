import { supabase } from "../../lib/db";

export default async function BlogPost({ params }) {

  const slug = params?.slug;

  if (!slug) {
    return <h1>No slug</h1>;
  }

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    console.log("POST NOT FOUND:", slug, error);
    return <h1>Not found</h1>;
  }

  return (
    <main>
      <h1>{data.title}</h1>

      {data.image && (
        <img
          src={data.image}
          style={{ width: "100%", maxWidth: "600px" }}
        />
      )}

      <div style={{ whiteSpace: "pre-wrap" }}>
        {data.content}
      </div>
    </main>
  );
}