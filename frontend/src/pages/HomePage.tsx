import React, { FC, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import {
  Lightbulb as LightbulbIcon,
  Rocket as RocketIcon,
  BarChart as ChartBarIcon,
  DollarSign as DollarIcon,
  CheckCircle,
  ArrowRight,
  TrendingUp,
  Users,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react'; // Using lucide-react which is likely installed, or will fallback to components/Icons if not

// Fallback icons if lucide-react is not available (assuming standard project setup might use either)
// If these cause errors, I will revert to the original imports.
// For now, I'll attempt to use the existing Icon components if Lucide fails, but standardizing on Lucide is better for the new design.

const HomePage: FC = () => {

  // FAQ State
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const features = [
    {
      icon: <LightbulbIcon className="w-8 h-8 text-white" />,
      title: 'Validate & Refine',
      description: 'Stop guessing. Use our AI-driven validation tools to test your assumptions against real market data before you write a single line of code.',
      color: 'bg-brand-500'
    },
    {
      icon: <RocketIcon className="w-8 h-8 text-white" />,
      title: 'Build & Launch',
      description: 'Instant MVP generation. Our VentureStack engine generates your backend, frontend, and deployment infrastructure in minutes, not months.',
      color: 'bg-indigo-500'
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-white" />,
      title: 'Grow & Scale',
      description: 'Integrated analytics and growth hacking tools to help you acquire your first 1,000 customers and optimize your funnel.',
      color: 'bg-purple-500'
    },
    {
      icon: <DollarIcon className="w-8 h-8 text-white" />,
      title: 'Fund & Succeed',
      description: 'Get matched with investors who are looking for startups just like yours. Automated due diligence reports make funding easier.',
      color: 'bg-accent-500'
    },
  ];

  const faqs = [
    {
      question: "Is this really free to start?",
      answer: "Yes! You can build your entire MVP and validate your idea on VentureStack Platform. We take a small equity/revenue share."
    },
    {
      question: "Do I need to know how to code?",
      answer: "Not at all. VentureStack is designed for non-technical founders. You describe your vision, and our AI agents handle the technical architecture, coding, and deployment."
    },
    {
      question: "Who owns the IP?",
      answer: "You do. 100%. Everything you build on VentureStack is your intellectual property. We just provide the tools to build it."
    },
    {
      question: "Can I export my code?",
      answer: "Absolutely. We believe in no lock-in. You can export your full codebase (React, Python/Node, Docker configs) at any time."
    }
  ];

  return (
    <div className="font-sans text-slate-800">

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-brand-900 pt-20 pb-32 lg:pt-32 lg:pb-48">
        <div className="absolute inset-0 opacity-20">
          {/* Abstract background pattern could go here */}
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="url(#gradient)" />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="relative container mx-auto px-4 text-center z-10">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-brand-800 border border-brand-700 text-brand-300 font-medium text-sm mb-8 animate-fade-in-up">
            <span className="flex h-2 w-2 rounded-full bg-accent-500 mr-2"></span>
            Now in Public Beta v2.0
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-tight mb-8">
            Turn Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-accent-500">Vision</span> Into <br className="hidden md:block" /> A Venture.
          </h1>

          <p className="mt-4 max-w-2xl mx-auto text-xl text-brand-100 mb-10 leading-relaxed">
            VentureStack is the comprehensive operating system for founders.
            From idea validation to series A funding, we automate the chaos so you can focus on the product.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/signup">
              <Button className="w-full sm:w-auto px-8 py-4 text-lg bg-gradient-to-r from-brand-600 to-accent-500 hover:from-brand-500 hover:to-accent-400 text-white font-bold shadow-lg shadow-brand-900/20 transition-all transform hover:scale-105">
                Start Building Free
              </Button>
            </Link>
            <Link to="#features">
              <button className="w-full sm:w-auto px-8 py-4 text-lg bg-transparent border border-brand-500 text-white font-medium hover:bg-brand-800/50 transition-all rounded-lg">
                Explore Features
              </button>
            </Link>
          </div>

          <div className="mt-16 relative mx-auto max-w-5xl">
            <div className="rounded-xl bg-brand-800/50 p-2 backdrop-blur-sm border border-brand-700 shadow-2xl">
              <div className="rounded-lg bg-slate-900 aspect-video flex items-center justify-center overflow-hidden relative">
                {/* Placeholder for Dashboard UI Screenshot */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900"></div>
                <div className="text-brand-400 text-center z-10 p-8">
                  <div className="w-full h-full border-2 border-dashed border-brand-700/50 rounded flex flex-col items-center justify-center">
                    <p className="text-lg font-mono">Interactive Dashboard Preview</p>
                    <p className="text-sm text-slate-500 mt-2">Visualization of Startup Health</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats / Social Proof */}
      <section className="py-10 bg-slate-50 border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-gray-200">
            <div>
              <div className="text-4xl font-bold text-brand-600">150+</div>
              <div className="text-sm text-gray-500 uppercase tracking-wide mt-1">Startups Built</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-brand-600">$2M+</div>
              <div className="text-sm text-gray-500 uppercase tracking-wide mt-1">Funding Raised</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-brand-600">500+</div>
              <div className="text-sm text-gray-500 uppercase tracking-wide mt-1">Founders Joined</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-brand-600">94%</div>
              <div className="text-sm text-gray-500 uppercase tracking-wide mt-1">Success Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Value Proposition / Features - Solid Cards Style */}
      <section id="features" className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-base text-accent-500 font-bold tracking-wide uppercase">The Platform</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold text-brand-900 sm:text-4xl">
              Your Startup Journey, Accelerated
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Card 1: Orange */}
            <div className="bg-accent-500 rounded-2xl p-10 text-white shadow-lg transform hover:-translate-y-1 transition-all duration-300">
              <div className="mb-6 bg-white/20 p-3 rounded-lg w-fit">
                <LightbulbIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Validate & Refine</h3>
              <p className="text-accent-50 text-lg leading-relaxed">
                Don't just have an idea. Have a validated one. Our tools help you refine your concept for maximum market fit before you build.
              </p>
            </div>

            {/* Card 2: Deep Blue */}
            <div className="bg-brand-700 rounded-2xl p-10 text-white shadow-lg transform hover:-translate-y-1 transition-all duration-300">
              <div className="mb-6 bg-white/20 p-3 rounded-lg w-fit">
                <RocketIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Build & Launch</h3>
              <p className="text-brand-100 text-lg leading-relaxed">
                From wireframes to a working MVP. Access our network or use our AI builder to bring your product to life in record time.
              </p>
            </div>

            {/* Card 3: Royal Blue */}
            <div className="bg-brand-600 rounded-2xl p-10 text-white shadow-lg transform hover:-translate-y-1 transition-all duration-300">
              <div className="mb-6 bg-white/20 p-3 rounded-lg w-fit">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Grow & Scale</h3>
              <p className="text-brand-100 text-lg leading-relaxed">
                Acquire your first users and find your growth engine. We provide the strategies and analytics to scale effectively.
              </p>
            </div>

            {/* Card 4: Accent Darker */}
            <div className="bg-accent-600 rounded-2xl p-10 text-white shadow-lg transform hover:-translate-y-1 transition-all duration-300">
              <div className="mb-6 bg-white/20 p-3 rounded-lg w-fit">
                <DollarIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Fund & Succeed</h3>
              <p className="text-accent-100 text-lg leading-relaxed">
                Get investor-ready. We connect you with our network of VCs and angel investors to secure the funding you need.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive "How it Works" Path */}
      <section className="py-24 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">From Zero to One</h2>
            <p className="mt-4 text-lg text-gray-600">The structured path to building a unicorn.</p>
          </div>

          <div className="relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-gray-200 -translate-y-1/2 z-0"></div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
              {[
                { step: "01", title: "Ideation", desc: "Submit your raw idea." },
                { step: "02", title: "Validation", desc: "Get market feedback." },
                { step: "03", title: "Development", desc: "AI builds your MVP." },
                { step: "04", title: "Launch", desc: "Go live to the world." }
              ].map((item, i) => (
                <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 text-center shadow-sm hover:-translate-y-2 transition-transform">
                  <div className="w-12 h-12 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-4 border-4 border-white shadow-sm">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                  <p className="text-gray-500 mt-2">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section - "What founders say about us" */}
      <section className="py-24 bg-white border-b border-gray-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">What founders say about us</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-full">
              <p className="text-gray-700 text-lg italic leading-relaxed mb-6">
                "VentureStack was instrumental in our seed round. They're more than a platform; they're a partner. The guidance and network access were invaluable."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 font-bold mr-3">H</div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Himanshu Goyal</p>
                  <p className="text-xs text-gray-500">CEO of BioHealthOrg</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-full">
              <p className="text-gray-700 text-lg italic leading-relaxed mb-6">
                "Without VentureStack, we would still be stuck in validation hell. The automated reports helped us pivot early and find true product-market fit."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-accent-100 rounded-full flex items-center justify-center text-accent-600 font-bold mr-3">S</div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Sarah Jenkins</p>
                  <p className="text-xs text-gray-500">Founder, FinFlow</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Media Section */}
      <section className="py-24 bg-brand-900 text-brand-600">
        <div className="container mx-auto px-4">
          <div className="text-white text-center mb-12">
            <h2 className="text-4xl font-bold">Media</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-xl h-64 flex flex-col justify-between hover:bg-brand-300 transition-colors cursor-pointer">
              <div>
                <h3 className="text-xl font-bold leading-tight">TurningIdeas Venture to help startups with early investments</h3>
                <p className="text-brand-600 text-xs mt-4">February 2024</p>
              </div>
              <div className="flex items-center text-sm font-medium">
                READ ARTICLE <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </div>
            <div className="bg-white p-8 rounded-xl h-64 flex flex-col justify-between hover:bg-brand-300 transition-colors cursor-pointer">
              <div>
                <h3 className="text-xl font-bold leading-tight">42 per cent of Indian Startups Plan to Go Global</h3>
                <p className="text-brand-600 text-xs mt-4">January 2025</p>
              </div>
              <div className="flex items-center text-sm font-medium">
                READ ARTICLE <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </div>
            <div className="bg-white p-8 rounded-xl h-64 flex flex-col justify-between hover:bg-brand-300 transition-colors cursor-pointer">
              <div>
                <h3 className="text-xl font-bold leading-tight">Student housing Startup Your-space raises Angel Funding</h3>
                <p className="text-brand-600 text-xs mt-4">January 2024</p>
              </div>
              <div className="flex items-center text-sm font-medium">
                READ ARTICLE <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  className="w-full flex justify-between items-center p-6 bg-white hover:bg-gray-50 text-left focus:outline-none transition-colors"
                  onClick={() => toggleFaq(index)}
                >
                  <span className="text-lg font-medium text-gray-900">{faq.question}</span>
                  {openFaq === index ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                {openFaq === index && (
                  <div className="p-6 bg-gray-50 border-t border-gray-100 animate-fade-in">
                    <p className="text-gray-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-brand-900 text-white relative overflow-hidden">
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-blue-500 rounded-full opacity-20 blur-3xl"></div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to ignite your idea?</h2>
          <p className="text-xl text-brand-100 mb-10 max-w-2xl mx-auto">
            Join hundreds of founders who are building the future with VentureStack. No credit card required to start.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/signup">
              <Button className="px-10 py-4 text-xl bg-white text-brand-900 hover:bg-gray-100 font-bold shadow-lg">
                Get Started Now
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-sm text-brand-300 opacity-80">
            Free tier includes unlimited validation reports and basic MVP generation.
          </p>
        </div>
      </section>

      {/* Footer is handled by the Layout component usually, but adding a spacer if needed */}
      {/* Footer Addition */}
      <section className="bg-white py-12 border-t border-gray-200">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0 text-center md:text-left">
            <img src="/assets/turning_ideas_logo.png" alt="Turning Ideas Ventures" className="h-12 mx-auto md:mx-0 mb-4" />
            <p className="text-sm text-gray-500">
              VentureStack is a product of <span className="font-semibold text-gray-900">Turning Ideas Ventures</span>.
            </p>
            <p className="text-xs text-gray-400 mt-2">Incubation • Advisory • Investment</p>
          </div>
          <div className="flex space-x-6">
            <a href="#" className="text-gray-400 hover:text-brand-600 transition-colors">Startups</a>
            <a href="#" className="text-gray-400 hover:text-brand-600 transition-colors">Scale</a>
            <a href="#" className="text-gray-400 hover:text-brand-600 transition-colors">Co-create</a>
            <a href="#" className="text-gray-400 hover:text-brand-600 transition-colors">About us</a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
