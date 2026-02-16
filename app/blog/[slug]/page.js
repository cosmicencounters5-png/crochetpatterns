import { posts } from "@/app/lib/posts";

export default function BlogPost({ params }) {

  const post = posts.find(p => p.slug === params.slug);

  if (!post) {
    return <h1>Not found</h1>;
  }

  return (
    <main>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </main>
  );
}