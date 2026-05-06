import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { UploadForm } from '@/components/UploadForm';
import { GetCertificateCard } from '@/components/GetCertificateCard';
import { PricingCard } from '@/components/PricingCard';
import { FAQ } from '@/components/FAQ';
import { Footer } from '@/components/Footer';

export default function Home() {
  return (
    <>
      <Header />
      <Hero />
      <UploadForm />
      <GetCertificateCard />
      <PricingCard />
      <FAQ />
      <Footer />
    </>
  );
}

