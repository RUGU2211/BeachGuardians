import Link from 'next/link';

export default function SustainabilityBlog() {
  const posts = [
    {
      title: 'Smart Waste Sorting: Tips for Volunteers',
      excerpt: 'Learn simple sorting rules to maximize recycling efficiency during cleanups.',
      href: '/resources/waste-sorting',
      tag: 'Tips',
    },
    {
      title: 'Impact Stories: Goa Coastal Cleanup',
      excerpt: 'How 200 volunteers removed 3 tons of waste in a single weekend.',
      href: '/resources/goa-impact-story',
      tag: 'Story',
    },
    {
      title: 'Sustainability Basics: Reduce, Reuse, Recycle',
      excerpt: 'The foundational principles your daily routine can follow to cut waste.',
      href: '/resources/3r-basics',
      tag: 'Guide',
    },
  ];

  return (
    <section className="w-full py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Sustainability Blog</h2>
          <Link href="/resources" className="text-primary hover:underline">View all</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {posts.map((p) => (
            <article key={p.href} className="rounded-xl border p-5 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-primary mb-2">{p.tag}</div>
              <h3 className="text-lg font-bold mb-2">{p.title}</h3>
              <p className="text-muted-foreground mb-4">{p.excerpt}</p>
              <Link href={p.href} className="text-primary hover:underline">Read more</Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}