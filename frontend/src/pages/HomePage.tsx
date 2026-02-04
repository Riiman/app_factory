import React, { FC, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../components/ui/Button';
import DeepDiveSection from '../components/DeepDiveSection';
import HeroDashboardPreview from '../components/previews/HeroDashboardPreview';
import CommandCenterPreview from '../components/previews/CommandCenterPreview';
import ProductDeepDivePreview from '../components/previews/ProductDeepDivePreview';
import AICopilotPreview from '../components/previews/AICopilotPreview';
import GrowthSalesPreview from '../components/previews/GrowthSalesPreview';
import IncubatorPortfolioPreview from '../components/previews/IncubatorPortfolioPreview';
import AdminInterventionPreview from '../components/previews/AdminInterventionPreview';
import SilosDiagramPreview from '../components/previews/SilosDiagramPreview';
import FragmentedToolsPreview from '../components/previews/FragmentedToolsPreview';
import ComparisonTable from '../components/ComparisonTable';
import {
  Quote,
  ArrowRight,
  Check
} from 'lucide-react';

const HomePage: FC = () => {
  const [activePersona, setActivePersona] = useState<'incubator' | 'founder'>('founder');

  useEffect(() => {
    document.title = "VentureStack — The Operating System for Innovation";
  }, []);

  return (
    <div className="bg-white">
      {/* 1. HERO — WHAT THIS IS */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-slate-50">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
          <div className="absolute left-1/2 -translate-x-1/2 -top-[40%] w-[800px] h-[800px] bg-brand-500/10 blur-[120px] rounded-full sm:w-[500px] sm:h-[500px]" />
        </div>

        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-sm mb-8"
          >
            <span className="text-sm font-semibold text-slate-700">The Operating System for Innovation</span>
          </motion.div>

          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-6 max-w-5xl mx-auto leading-tight">
            Build, Run, and Scale Companies — <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-accent-500">With One Source of Truth</span>
          </h1>

          <p className="text-xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            VentureStack is the shared operating system where founders execute and incubators gain real visibility — powered by a single, context-aware intelligence layer.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Button size="lg" className="px-8 h-14 text-lg shadow-xl shadow-brand-500/20">
              Get Started
            </Button>
            <Button variant="outline" size="lg" className="px-8 h-14 text-lg group">
              See How It Works <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative max-w-6xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-slate-200 bg-white"
          >
            {/* Replaced Static Image with Live Component */}
            <div className="bg-slate-50 border-b border-slate-200 p-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="ml-4 bg-white border border-slate-100 rounded text-xs text-slate-400 px-3 py-1 flex-1 text-center font-mono">
                venturestackai.com
              </div>
            </div>
            <HeroDashboardPreview />
            <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-2xl pointer-events-none" />
          </motion.div>
        </div>
      </section>

      {/* 2. THE PROBLEM — WHY THIS EXISTS */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6">
              Startups Don’t Fail from Lack of Tools — <br className="hidden lg:block" />They Fail Between Them
            </h2>
          </div>
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 aspect-video flex items-center justify-center relative shadow-inner">
              <FragmentedToolsPreview />
            </div>
            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-lg text-slate-600"><strong>Founders operate across disconnected products.</strong> Incubators chase updates through decks and emails. Critical decisions are made without full context.</p>
                <p className="text-lg text-slate-600">Product ships without demand. Marketing runs without runway clarity. Fundraising happens without execution readiness.</p>
              </div>
              <div className="p-6 bg-red-50 rounded-xl border border-red-100 text-red-800 font-semibold">
                Fragmentation kills momentum.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. THE INSIGHT — WHAT OTHERS MISS */}
      <section className="py-24 bg-slate-50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center lg:flex-row-reverse">
            <div className="order-2 lg:order-1 space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 leading-tight">
                Most Platforms Are Smart in Silos — Blind as a Whole
              </h2>
              <p className="text-lg text-slate-600">
                Modern startup platforms give insights inside individual sections:
              </p>
              <ul className="space-y-3">
                {['Product tools know features', 'Marketing tools know campaigns', 'Finance tools know numbers'].map((item, i) => (
                  <li key={i} className="flex items-center text-slate-700">
                    <div className="w-2 h-2 rounded-full bg-slate-400 mr-3" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-lg text-slate-600">
                But no system understands how everything connects.
              </p>
              <div className="font-semibold text-slate-900">
                Startups don’t fail inside modules. They fail between product, growth, sales, and finance.
              </div>
            </div>
            <div className="order-1 lg:order-2 bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm aspect-video relative">
              <SilosDiagramPreview />
              <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-2xl pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* 4. THE DIFFERENCE — THE SHARED CONTEXT LAYER */}
      <section className="py-24 bg-white border-b border-slate-100">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6">
            The Missing Layer Is Shared Context
          </h2>
          <p className="text-xl text-slate-600 mb-12">
            VentureStack doesn’t add another dashboard. It adds a <strong>single intelligence layer</strong> across your entire company. Every metric, action, and decision feeds the same system — so insights are connected, not isolated.
          </p>
          <div className="bg-slate-900 rounded-2xl p-1 overflow-hidden shadow-2xl">
            <img
              src="/assets/screenshots/difference_diagram.png"
              alt="Shared Intelligence Layer Diagram"
              className="w-full h-auto rounded-xl"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://placehold.co/1000x500/0f172a/334155?text=Intelligence+Layer+Diagram&font=lora";
              }}
            />
          </div>
          <p className="mt-8 text-brand-600 font-bold tracking-wide uppercase text-sm">This is what makes VentureStack fundamentally different.</p>
        </div>
      </section>

      {/* 5. THE SOLUTION — ONE PLATFORM, TWO VIEWS (PERSONA TOGGLE) */}
      <section id="solution" className="py-20 lg:py-32 bg-slate-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">One Platform. Two Powerful Perspectives.</h2>
          <p className="text-slate-600 text-lg mb-10 max-w-2xl mx-auto">Same data. Same system. No blind spots.</p>

          <div className="flex justify-center mb-16">
            <div className="bg-white p-1.5 rounded-full shadow-sm border border-slate-200 inline-flex">
              <button
                onClick={() => setActivePersona('founder')}
                className={`px-8 py-3 rounded-full text-sm font-semibold transition-all duration-300 ${activePersona === 'founder'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
                  }`}
              >
                For Founders
              </button>
              <button
                onClick={() => setActivePersona('incubator')}
                className={`px-8 py-3 rounded-full text-sm font-semibold transition-all duration-300 ${activePersona === 'incubator'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
                  }`}
              >
                For Incubators
              </button>
            </div>
          </div>

          {/* Dynamic Content Container */}
          <div className="min-h-[600px]">
            {activePersona === 'founder' ? (
              <div className="space-y-24">
                {/* 6. COMMAND CENTER */}
                <DeepDiveSection
                  title="Understand Your Entire Company at a Glance"
                  subtitle="Executive Command Center"
                  description="VentureStack starts with a unified, high-level view of company health. Before diving into tools or tasks, you see overall execution health, cross-functional risks, and what matters most right now."
                  image=""
                  imageAlt=""
                  visualContent={<CommandCenterPreview />}
                  isImageRight={true}
                  pillText="Strategy"
                  gradient="from-blue-600 to-indigo-600"
                />

                {/* 7. DIVE DEEP */}
                <DeepDiveSection
                  title="Dive Deep Without Losing the Big Picture"
                  subtitle="Connected Drill-downs"
                  description="From the command center, drill into product roadmaps, marketing ROI, sales pipelines, and financials. Unlike other platforms, every section stays connected to company-level outcomes. You never lose context."
                  image=""
                  imageAlt=""
                  visualContent={<ProductDeepDivePreview />}
                  isImageRight={false}
                  gradient="from-violet-600 to-purple-600"
                />

                {/* 8. AI COPILOT */}
                <DeepDiveSection
                  title="An AI Copilot That Understands Your Whole Company"
                  subtitle="Context-Aware Intelligence"
                  description="Most AI copilots only understand one workspace. VentureStack's AI sees your product, growth, finance, and fundraising all at once. It reasons across the entire company."
                  image=""
                  imageAlt=""
                  visualContent={<AICopilotPreview />}
                  isImageRight={true}
                  pillText="AI-Powered"
                  gradient="from-emerald-500 to-teal-500"
                  listItems={[
                    "Company-wide summaries, not module summaries",
                    "Answers grounded in real execution data",
                    "Cross-functional insights"
                  ]}
                />

                {/* 9. PRODUCT EXECUTION */}
                <DeepDiveSection
                  title="Ship Products Without Chaos"
                  subtitle="Product Development"
                  description="Clear ownership, feedback loops tied to real users, and less decision debt. Use AI-assisted PRDs and automated roadmap prioritization."
                  image=""
                  imageAlt=""
                  visualContent={<ProductDeepDivePreview />}
                  isImageRight={false}
                  gradient="from-orange-500 to-pink-500"
                />

                {/* 10. GROWTH */}
                <DeepDiveSection
                  title="Growth, Sales, and Fundraising — Finally Connected"
                  subtitle="Revenue Engine"
                  description="Marketing tied directly to revenue. Sales aligned with product readiness. Fundraising driven by execution confidence, not just slide decks."
                  image=""
                  imageAlt=""
                  visualContent={<GrowthSalesPreview />}
                  isImageRight={true}
                  gradient="from-cyan-500 to-blue-500"
                />
              </div>
            ) : (
              <div className="space-y-24">
                {/* 11. INCUBATORS */}
                <DeepDiveSection
                  title="See What’s Actually Happening Across Your Portfolio"
                  subtitle="Portfolio Intelligence"
                  description="Structured intake, lifecycle management, and deep visibility without hunting for updates. Measure program impact with real data, not just self-reported surveys."
                  image=""
                  imageAlt=""
                  visualContent={<IncubatorPortfolioPreview />}
                  isImageRight={true}
                  pillText="For Programs"
                  gradient="from-indigo-600 to-blue-800"
                  listItems={[
                    "Real-time portfolio visibility",
                    "Structured startup lifecycle management",
                    "Direct interventions without micromanagement"
                  ]}
                />

                <DeepDiveSection
                  title="Guide Them to Success"
                  subtitle="Intervention & Support"
                  description="Identify blockers early with automated health alerts. Provide resources, mentors, and specific tasks to help your founders overcome hurdles before they become fatal."
                  image=""
                  imageAlt=""
                  visualContent={<AdminInterventionPreview />}
                  isImageRight={false}
                  gradient="from-blue-600 to-indigo-600"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 12. WHY THIS MATTERS — COMPARISON TABLE */}
      <ComparisonTable />

      {/* 13. SOCIAL PROOF */}
      <section className="py-24 bg-white border-t border-slate-100">
        <div className="container mx-auto px-4 max-w-6xl text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-16">Trusted by Builders and Backers</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Testimonials - Keeping existing dummy content or replacing with placeholders if user didn't provide specifics */}
            {[
              { q: "VentureStack gives us the visibility we never had.", a: "Incubator Manager", r: "TechStars Alumni" },
              { q: "Finally, one place to run my entire company.", a: "Founder, Series A", r: "YCombinator Batch" },
              { q: "The AI insights actually saved us from a bad hire.", a: "Co-Founder", r: "SaaS Startup" }
            ].map((t, i) => (
              <div key={i} className="p-8 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                <Quote className="w-8 h-8 text-brand-200 mb-4" />
                <p className="text-slate-700 text-lg mb-6">"{t.q}"</p>
                <div>
                  <div className="font-bold text-slate-900">{t.a}</div>
                  <div className="text-slate-500 text-sm">{t.r}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 14. FINAL CTA */}
      <section className="py-32 bg-slate-900 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-900/20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/20 blur-[100px] rounded-full pointer-events-none" />

        <div className="container mx-auto px-4 relative z-10">
          <h2 className="text-4xl lg:text-5xl font-bold mb-8">Ready to Run Innovation on One System?</h2>
          <p className="text-xl text-slate-300 mb-12">We’ll tailor VentureStack to how you build.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Button size="lg" className="bg-white text-brand-600 hover:bg-slate-100 border-none px-8 font-bold">
              I’m a Founder
            </Button>
            <Button size="lg" variant="outline" className="border-slate-600 text-white hover:bg-slate-800 hover:border-slate-500 px-8">
              I Run an Incubator / Program
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
