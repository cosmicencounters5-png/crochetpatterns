export default function BlogPost({ params }) {

  const { slug } = params;

  return (
    <main>
      <h1>Blog post:</h1>
      <p>{slug}</p>
    </main>
  );
}