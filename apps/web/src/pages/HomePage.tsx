import { Link } from "react-router-dom";
import {
  Activity,
  Calendar,
  Video,
  Sparkles,
  UserPlus,
  Search,
  CreditCard,
  Monitor,
} from "lucide-react";
import { useMemo, useState } from "react";
import ThemeToggle from "../components/ThemeToggle";

type Feature = { icon: React.ElementType; title: string; desc: string };
type Step = { step: number; icon: React.ElementType; title: string; desc: string };

function HeroImage() {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="w-full h-80 lg:h-96 bg-secondary rounded-2xl flex items-center justify-center border border-border">
        <div className="text-center px-6">
          <p className="text-foreground text-sm">Image unavailable</p>
          <p className="text-muted-foreground text-xs mt-1">Please check your network.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden shadow-xl">
      <img
        src="https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=1400&q=80"
        alt="Telemedicine consultation"
        className="w-full h-80 lg:h-96 object-cover"
        onError={() => setFailed(true)}
        loading="lazy"
      />
    </div>
  );
}

export default function HomePage() {
  const features = useMemo<Feature[]>(
    () => [
      {
        icon: Calendar,
        title: "Book in Minutes",
        desc: "Browse verified doctors by specialty and book appointments instantly with real-time availability.",
      },
      {
        icon: Video,
        title: "Consult from Anywhere",
        desc: "Connect with your doctor via secure HD video consultations from the comfort of your home.",
      },
      {
        icon: Sparkles,
        title: "AI Health Suggestions",
        desc: "Describe your symptoms and get AI-powered preliminary health suggestions and doctor recommendations.",
      },
    ],
    [],
  );

  const steps = useMemo<Step[]>(
    () => [
      { step: 1, icon: UserPlus, title: "Register", desc: "Create your free account as a patient or doctor in under 2 minutes." },
      { step: 2, icon: Search, title: "Find a Doctor", desc: "Browse by specialty, view profiles, ratings, and availability." },
      { step: 3, icon: CreditCard, title: "Book & Pay", desc: "Select your preferred time slot and pay securely online." },
      { step: 4, icon: Monitor, title: "Consult Online", desc: "Join your video consultation at the scheduled time." },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="bg-card border-b border-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Activity className="w-7 h-7 text-teal" />
            <span className="text-xl text-foreground">Arogya</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/login" className="px-4 py-2 text-sm text-foreground hover:text-primary transition-colors">
              Login
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-light text-teal text-sm mb-6">
              <Sparkles className="w-4 h-4" /> AI-Powered Healthcare
            </span>
            <h1 className="text-4xl lg:text-5xl text-foreground leading-tight mb-6">
              Healthcare Made <span className="text-teal">Simple</span>, Accessible & Smart
            </h1>
            <p className="text-muted-foreground text-lg mb-8 max-w-lg">
              Book appointments with top doctors, consult via video, and get AI-powered health suggestions — all from the comfort
              of your home.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/register?role=patient"
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                Register as Patient
              </Link>
              <Link
                to="/register?role=doctor"
                className="px-6 py-3 bg-card text-foreground border border-border rounded-lg hover:bg-secondary transition-colors"
              >
                Register as Doctor
              </Link>
            </div>
          </div>
          <div className="relative">
            <HeroImage />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-card border-y border-border py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl text-foreground mb-3">Why Arogya?</h2>
            <p className="text-muted-foreground">Everything you need for modern healthcare, in one platform.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div key={i} className="bg-background rounded-xl p-6 border border-border text-center">
                <div className="w-12 h-12 bg-teal-light rounded-xl flex items-center justify-center mx-auto mb-4">
                  <f.icon className="w-6 h-6 text-teal" />
                </div>
                <h3 className="text-foreground mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl text-foreground mb-3">How It Works</h2>
            <p className="text-muted-foreground">Four simple steps to better healthcare.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s) => (
              <div key={s.step} className="bg-card rounded-xl p-6 border border-border relative">
                <div className="w-8 h-8 bg-teal text-white rounded-full flex items-center justify-center text-sm mb-4">
                  {s.step}
                </div>
                <s.icon className="w-8 h-8 text-primary mb-3" />
                <h3 className="text-foreground mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy text-white/70 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Activity className="w-6 h-6 text-teal" />
              <span className="text-lg text-white">Arogya</span>
            </div>
            <div className="flex gap-6 text-sm">
              <a href="#" className="hover:text-white transition-colors">
                About
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Contact
              </a>
            </div>
            <p className="text-sm">&copy; 2026 Arogya. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

