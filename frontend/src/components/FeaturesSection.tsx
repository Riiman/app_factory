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
            gradient: "from-blue-500 to-cyan-400",
            bgGlow: "bg-blue-500/10",
            borderHover: "hover:border-blue-200"
        },
        {
            icon: <Layout className="w-6 h-6 text-white" />,
            title: "One-Click Deployment",
            description: "Deploy production-ready stacks (Next.js, Supabase, Python) to secure private clouds with a single click.",
            gradient: "from-violet-500 to-purple-400",
            bgGlow: "bg-purple-500/10",
            borderHover: "hover:border-purple-200"
        },
        {
            icon: <BarChart3 className="w-6 h-6 text-white" />,
            title: "Live Analytics",
            description: "Track meaningful metrics: cost, cycle time, prototype-to-pilot conversion, and real-time user adoption.",
            gradient: "from-emerald-500 to-green-400",
            bgGlow: "bg-green-500/10",
            borderHover: "hover:border-green-200"
        },
        {
            icon: <Shield className="w-6 h-6 text-white" />,
            title: "Enterprise Security",
            description: "Built-in SSO, RBAC, audit logs, and compliance controls ensure your innovation is secure from day one.",
            gradient: "from-indigo-500 to-blue-600",
            bgGlow: "bg-indigo-500/10",
            borderHover: "hover:border-indigo-200"
        },
        {
            icon: <Globe className="w-6 h-6 text-white" />,
            title: "GTM Automation",
            description: "Launch with landing pages, CRM integration, and marketing automation workflows ready out of the box.",
            gradient: "from-orange-500 to-amber-400",
            bgGlow: "bg-orange-500/10",
            borderHover: "hover:border-orange-200"
        },
        {
            icon: <Zap className="w-6 h-6 text-white" />,
            title: "Reusable Modules",
            description: "Stop reinventing the wheel. Access a library of pre-built, tested modules for auth, payments, and more.",
            gradient: "from-rose-500 to-pink-400",
            bgGlow: "bg-rose-500/10",
            borderHover: "hover:border-rose-200"
        }
    ];

    return (
        <section id="features" className="py-32 bg-white relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-100/40 rounded-full blur-3xl -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent-100/30 rounded-full blur-3xl translate-y-1/2 pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-20">
                    <span className="inline-block py-1 px-3 rounded-full bg-brand-50 text-brand-600 text-xs font-bold tracking-wider uppercase mb-4 border border-brand-100">
                        Why Venturestack
                    </span>
                    <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
                        Everything you need to <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-accent-500">build, launch, and scale</span>
                    </h2>
                    <p className="text-lg text-slate-600 leading-relaxed">
                        A complete operating system for innovation that replaces disjointed tools with a unified, intelligent workflow.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className={`group relative bg-white rounded-2xl p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${feature.borderHover}`}
                        >
                            {/* Inner Glow on Hover */}
                            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl bg-gradient-to-br ${feature.bgGlow} via-transparent to-transparent pointer-events-none`} />

                            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 shadow-lg shadow-gray-200 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 relative z-10`}>
                                {feature.icon}
                            </div>

                            <h3 className="text-xl font-bold text-slate-900 mb-3 relative z-10">
                                {feature.title}
                            </h3>

                            <p className="text-slate-500 leading-relaxed relative z-10 group-hover:text-slate-600 transition-colors">
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
