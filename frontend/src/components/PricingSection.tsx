import React, { FC } from 'react';
import { Check } from 'lucide-react';

const PricingSection: FC = () => {
    const plans = [
        {
            title: "SaaS",
            price: "Custom",
            desc: "Per tenant (enterprise) / per cohort or seat",
            features: [
                "Full Platform Access",
                "AI Blueprinting",
                "One-Click Deployment",
                "Standard Analytics"
            ],
            cta: "Contact Sales",
            variant: "outline"
        },
        {
            title: "Managed",
            price: "Custom",
            desc: "Add PMO, mentors, weekly clinics, playbooks",
            features: [
                "Everything in SaaS",
                "Dedicated PMO Support",
                "Weekly Expert Clinics",
                "Custom Playbooks",
                "Priority Support"
            ],
            cta: "Get Started",
            variant: "filled",
            popular: true
        },
        {
            title: "Enterprise",
            price: "Custom",
            desc: "SSO/SCIM, private cloud, white-label",
            features: [
                "Everything in Managed",
                "SSO & SCIM",
                "Private Cloud Deployment",
                "White-label Branding",
                "SLA Guarantees"
            ],
            cta: "Contact Sales",
            variant: "outline"
        }
    ];

    return (
        <section className="py-24 bg-white border-t border-gray-100">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Plans & Packaging</h2>
                    <p className="text-gray-600">Flexible options to scale your innovation programs.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 mb-12">
                    {plans.map((plan, i) => (
                        <div key={i} className={`relative rounded-2xl p-8 flex flex-col ${plan.popular ? 'border-2 border-brand-500 shadow-xl scale-105 z-10' : 'border border-gray-200 shadow-sm'}`}>
                            {plan.popular && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-500 text-white text-sm font-bold px-4 py-1 rounded-full uppercase tracking-wide">
                                    Most Popular
                                </div>
                            )}
                            <div className="mb-6">
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.title}</h3>
                                <div className="text-3xl font-bold text-gray-900 mb-2">Let's Talk</div>
                                {/* Assuming custom pricing for all as per desc, can switch to props if price exists */}
                                <p className="text-sm text-gray-500">{plan.desc}</p>
                            </div>

                            <ul className="space-y-4 mb-8 flex-1">
                                {plan.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start">
                                        <Check className="w-5 h-5 text-brand-500 mr-2 shrink-0" />
                                        <span className="text-sm text-gray-600">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <button className={`w-full py-3 px-4 rounded-lg font-bold transition-colors ${plan.variant === 'filled' ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'bg-white border-2 border-brand-100 hover:border-brand-600 text-brand-700'}`}>
                                {plan.cta}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Outcome Add-ons */}
                <div className="bg-brand-50 rounded-xl p-8 border border-brand-100 flex flex-col md:flex-row items-center justify-between">
                    <div className="mb-6 md:mb-0">
                        <h4 className="text-lg font-bold text-brand-900 mb-1">Outcome Add-ons</h4>
                        <p className="text-brand-700">Success bonus per MVP/pilot milestones available.</p>
                    </div>
                    <button className="px-6 py-2 bg-white border border-brand-200 text-brand-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors">
                        View Details
                    </button>
                </div>
            </div>
        </section>
    );
};

export default PricingSection;
