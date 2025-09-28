export default function Testimonials() {
  const testimonials = [
    {
      name: 'Aarya S.',
      quote: 'Volunteering through BeachGuardians helped me meet amazing people and make a real difference.'
    },
    {
      name: 'NGO BlueWave',
      quote: 'Organizing events was seamless. The broadcast emails brought record participation.'
    },
    {
      name: 'Ravi K.',
      quote: 'Seeing my points and badges grow keeps me motivated to show up every weekend!'
    }
  ];
  return (
    <section className="w-full py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">Testimonials</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <blockquote key={t.name} className="rounded-xl border p-6 shadow-sm">
              <p className="italic">“{t.quote}”</p>
              <footer className="mt-3 text-sm text-muted-foreground">— {t.name}</footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}