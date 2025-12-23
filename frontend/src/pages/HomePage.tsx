import React, { FC, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../components/ui/Button';

import PersonaBentoGrid from '../components/PersonaBentoGrid';
import FeaturesSection from '../components/FeaturesSection';
import ProcessTimeline from '../components/ProcessTimeline';
import AnimatedMetrics from '../components/AnimatedMetrics';

import JourneySwitcherSection from '../components/JourneySwitcherSection';
import PricingSection from '../components/PricingSection';
import {
  Zap,
  Shield,
  BarChart3,
  Rocket,
  Code2,
  Layout,
  Database,
  Globe,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Building2,
  Users,
  Star,
  Quote,
  Plus,
  Minus
} from 'lucide-react';

const HomePage: FC = () => {
  // FAQ State
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    document.title = "Venturestack — Idea to MVP & Pilots for Enterprises and Cohorts";
  }, []);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };



  const faqs = [
    {
      question: "Is it low/no-code or code?",
      answer: "Both. We provide AI blueprints and code templates that give you a head start, but unlike restrictive low-code platforms, you own the source code. Your teams can extend everything in standard JS/TS, Python, or your enterprise stack without hitting a ceiling."
    },
    {
      question: "Can we host on our restricted cloud?",
      answer: "Absolutely. VentureStack is designed for enterprise compliance. We support private cloud deployments on AWS/Azure with full SSO/SCIM integration, RBAC, audit logs, and data residency guarantees."
    },
    {
      question: "What technology stacks do you support?",
      answer: "We focus on modern, scalable stacks: Next.js/React for frontend, Supabase/AWS for backend, and Python/Node for services. We also integrate deeply with enterprise tools like Fabric, Power BI, HubSpot, and n8n/Make."
    },
    {
      question: "How do you measure success?",
      answer: "We move beyond 'vanity metrics' to track real impact: Time-to-MVP, prototype-to-pilot conversion rates, user activation/adoption, and specific business KPIs defined at the start of the engagement."
    },
    {
      question: "Do you help after the initial launch?",
      answer: "Yes. Our partnership doesn't end at MVP. We assist with traction experiments, setting up partner pilots, preparing investor/executive data packs, and managing the handover to internal scale-up teams."
    }
  ];

  const testimonials = [
    {
      quote: "Built our first production-grade Copilot in 6 weeks. The speed was incredible, but the code quality was even better.",
      author: "Sarah Jenkins",
      role: "VP Innovation",
      company: "Global Manufacturing",
      image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80"
    },
    {
      quote: "Our Demo Day finally had products users could touch, not just slide decks. VentureStack changed the game for our cohort.",
      author: "David Chen",
      role: "Director",
      company: "TechNexus Accelerator",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80"
    },
    {
      quote: "The security compliance features saved us 3 months of legal review. We launched confident and compliant.",
      author: "Elena Rodriguez",
      role: "Innovation Lead",
      company: "Fintech Enterprise",
      image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80"
    },
    {
      quote: "Finally, a low-code tool that doesn't hit a ceiling when we need custom logic. It's the best of both worlds.",
      author: "James Wilson",
      role: "Senior Developer",
      company: "SaaS Scale-up",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80"
    },
    {
      quote: "VentureStack cut our dev costs by 60% while giving us better infrastructure than we could build internally.",
      author: "Michael Chang",
      role: "CTO",
      company: "Logistics Startup",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80"
    }
  ];

  return (
    <div className="font-sans text-slate-800">

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-brand-900 pt-20 pb-32 lg:pt-32 lg:pb-48 text-center text-white">
        <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-brand-900/90"></div>

        <div className="relative container mx-auto px-4 z-10">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-6">
            VentureStack <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-accent-400 text-4xl md:text-6xl block mt-2">
              Build real products, not just plans
            </span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-xl text-brand-100 mb-10 leading-relaxed">
            The platform that turns ideas into working MVPs and onboard first users—fast. <br />For corporate innovation teams and cohort programs.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a href="#contact">
              <Button className="w-full sm:w-auto px-8 py-4 text-lg bg-accent-600 hover:bg-accent-500 text-white font-bold shadow-lg transition-transform hover:scale-105">
                Book a demo
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Value SwitcherTabs */}
      <PersonaBentoGrid />

      {/* Features Section */}
      <FeaturesSection />

      {/* How Venturestack Works */}
      <ProcessTimeline />

      {/* Results / Metrics Band */}
      <AnimatedMetrics />

      {/* Implementation Journey Switcher */}
      <JourneySwitcherSection />

      {/* Plans & Packaging */}
      <PricingSection />

      {/* Testimonials */}
      {/* Testimonials */}
      <section className="py-24 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Trusted by Innovators</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              From corporate innovation labs to fast-moving accelerators, see why specialized teams choose VentureStack.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className={`p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm relative group hover:border-brand-500/30 transition-colors ${i === 3 ? "md:col-span-2 lg:col-span-1" : ""}`}
              >
                <Quote className="absolute top-8 right-8 w-8 h-8 text-white/5 group-hover:text-brand-500/20 transition-colors" />

                <div className="flex gap-1 mb-6">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-4 h-4 text-accent-500 fill-accent-500" />
                  ))}
                </div>

                <p className="text-slate-200 text-lg mb-8 leading-relaxed">"{t.quote}"</p>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/10">
                    <img src={t.image} alt={t.author} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="font-bold text-white">{t.author}</div>
                    <div className="text-sm text-slate-400">{t.role}, {t.company}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      {/* FAQ Section */}
      <section className="py-24 bg-white relative">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-16">
            <span className="text-brand-600 font-bold tracking-wider uppercase text-sm mb-2 block">Common Questions</span>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">Everything you need to know</h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              Can't find the answer you're looking for? Reach out to our team directly.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`border rounded-2xl overflow-hidden transition-all duration-300 ${isOpen ? 'border-brand-200 bg-brand-50/50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                >
                  <button
                    className="w-full flex justify-between items-center p-6 text-left focus:outline-none"
                    onClick={() => toggleFaq(index)}
                  >
                    <span className={`text-lg font-bold transition-colors ${isOpen ? 'text-brand-900' : 'text-gray-900'}`}>
                      {faq.question}
                    </span>
                    <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${isOpen ? 'bg-brand-200 text-brand-700' : 'bg-gray-100 text-gray-500'}`}>
                      {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </span>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        <div className="px-6 pb-6 pt-0">
                          <p className="text-gray-600 leading-relaxed text-base border-t border-brand-100/50 pt-4">
                            {faq.answer}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact Form & Footer CTA */}
      <section id="contact" className="py-24 bg-brand-50">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-white p-8 md:p-12 rounded-2xl shadow-lg border border-gray-200">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to build real products—fast?</h2>
              <p className="text-gray-600">Book a demo to see how Venturestack can transform your innovation pipeline.</p>
            </div>

            <form className="space-y-6" onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const formData = new FormData(form);
              const data = Object.fromEntries(formData);

              const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
              const originalText = submitBtn.innerText;
              submitBtn.innerText = 'Sending...';
              submitBtn.disabled = true;

              fetch('/api/contact/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
              })
                .then(res => res.json())
                .then(res => {
                  if (res.success) {
                    alert('Thank you! Your request has been sent successfully.');
                    form.reset();
                  } else {
                    alert(res.error || 'Failed to send request. Please try again.');
                  }
                })
                .catch(err => {
                  console.error(err);
                  alert('An error occurred. Please try again.');
                })
                .finally(() => {
                  submitBtn.innerText = originalText;
                  submitBtn.disabled = false;
                });
            }}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input required name="name" type="text" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors" placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Email</label>
                <input required name="email" type="email" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors" placeholder="john@company.com" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                  <input name="organization" type="text" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors" placeholder="Company Name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timeline</label>
                  <select name="timeline" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors">
                    <option>Immediately</option>
                    <option>1-3 months</option>
                    <option>3+ months</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Use Case</label>
                <select name="useCase" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors">
                  <option>Corporate Innovation</option>
                  <option>Incubator / Accelerator</option>
                  <option>Venture Studio</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea required name="message" rows={4} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors" placeholder="Tell us about your goals..."></textarea>
              </div>

              <Button type="submit" className="w-full py-4 text-lg font-bold shadow-md bg-brand-600 hover:bg-brand-700 text-white">
                Submit Request
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer CTA Band */}
      <section className="py-16 bg-brand-900 text-white text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-8">Stop planning innovation. Start shipping it.</h2>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
          </div>
        </div>
      </section>

      {/* Footer Addition */}
      <section className="bg-white py-12 border-t border-gray-200">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0 text-center md:text-left">
            <h4 className="text-xl font-bold text-brand-900 mb-1">Venturestack</h4>
            <p className="text-sm text-gray-500">
              A product of <span className="font-semibold text-gray-900">Turning Ideas Ventures</span>.
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
