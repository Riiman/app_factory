import React, { FC } from 'react';
import {
    Cpu,
    Globe,
    Zap,
    Shield,
    Layout,
    BarChart3
} from 'lucide-react';

const FeaturesSection: FC = () => {
    const features = [
        {
            icon: <Cpu className="w-6 h-6 text-white" />,
            title: "AI Blueprinting",
            description: "Transform raw ideas into comprehensive PRDs, schemas, and API maps instantly using advanced AI models.",
            color: "bg-blue-500"
        },
        {
            icon: <Layout className="w-6 h-6 text-white" />,
            title: "One-Click Deployment",
            description: "Deploy production-ready stacks (Next.js, Supabase, Python) to secure private clouds with a single click.",
            color: "bg-purple-500"
        },
        {
            icon: <BarChart3 className="w-6 h-6 text-white" />,
            title: "Live Analytics",
            description: "Track meaningful metrics: cost, cycle time, prototype-to-pilot conversion, and real-time user adoption.",
            color: "bg-green-500"
        },
        {
            icon: <Shield className="w-6 h-6 text-white" />,
            title: "Enterprise Security",
            description: "Built-in SSO, RBAC, audit logs, and compliance controls ensure your innovation is secure from day one.",
            color: "bg-indigo-500"
        },
        {
            icon: <Globe className="w-6 h-6 text-white" />,
            title: "GTM Automation",
            description: "Launch with landing pages, CRM integration, and marketing automation workflows ready out of the box.",
            color: "bg-orange-500"
        },
        {
            icon: <Zap className="w-6 h-6 text-white" />,
            title: "Reusable Modules",
            description: "Stop reinventing the wheel. Access a library of pre-built, tested modules for auth, payments, and more.",
            color: "bg-red-500"
        }
    ];

    return (
        <section id="features" className="py-24 bg-slate-50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-30">
                <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand-100 blur-3xl"></div>
                <div className="absolute top-1/2 -left-24 w-72 h-72 rounded-full bg-accent-100 blur-3xl"></div>
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-sm font-bold tracking-wide text-brand-600 uppercase mb-2">Why Venturestack</h2>
                    <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                        Everything you need to build, launch, and scale
                    </h3>
                    <p className="text-lg text-gray-600">
                        A complete operating system for innovation that replaces disjointed tools with a unified, intelligent workflow.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="group bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md hover:border-brand-200 transition-all duration-300"
                        >
                            <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform`}>
                                {feature.icon}
                            </div>
                            <h4 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-brand-700 transition-colors">
                                {feature.title}
                            </h4>
                            <p className="text-gray-600 leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FeaturesSection;
