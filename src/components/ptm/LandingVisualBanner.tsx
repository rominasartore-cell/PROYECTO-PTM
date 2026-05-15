import Image from "next/image";

export default function LandingVisualBanner() {
  return (
    <section className="bg-white px-4 pb-6 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-xl shadow-blue-950/10">
        <Image
          src="/images/ptm-landing-banner.png"
          alt="Prescribe tu Multa - analiza tu certificado al instante"
          width={1672}
          height={941}
          priority
          sizes="(max-width: 768px) 100vw, 1280px"
          className="h-auto w-full object-cover"
        />
      </div>
    </section>
  );
}
