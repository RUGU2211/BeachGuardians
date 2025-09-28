import Image from 'next/image';

export default function Partners() {
  const partners = [
    { name: 'BlueWave', logo: '/logo.jpg' },
    { name: 'EcoCircle', logo: '/logo.jpg' },
    { name: 'CleanCoast', logo: '/logo.jpg' },
    { name: 'GreenSteps', logo: '/logo.jpg' },
  ];
  return (
    <section className="w-full py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">Partner NGOs & Sponsors</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
          {partners.map((p) => (
            <div key={p.name} className="flex flex-col items-center gap-2">
              <Image src={p.logo} alt={p.name} width={64} height={64} className="rounded-full" />
              <div className="text-sm text-muted-foreground">{p.name}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}