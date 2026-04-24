import Navbar from "../../components/landing/Navbar";
import Hero from "../../components/landing/Hero";
import Problems from "../../components/landing/Problems";
import Features from "../../components/landing/Features";
import DashboardPreview from "../../components/landing/DashboardPreview";
import CTASection from "../../components/landing/CTASection";
import Footer from "../../components/landing/Footer";

export default function Landing() {
  return (
    <div className="bg-white">

      <Navbar />
      <Hero />
      <Problems />
      <Features />
      <DashboardPreview />
      <CTASection />
      <Footer />

    </div>
  );
}