import React, { FC } from 'react';

interface DeepDiveSectionProps {
  title: string;
  subtitle: string;
  description: string;
  image?: string;
  imageAlt?: string;
  visualContent?: React.ReactNode;
  isImageRight?: boolean;
  pillText?: string;
  gradient?: string;
  listItems?: string[];
}

const DeepDiveSection: FC<DeepDiveSectionProps> = ({
  title,
  subtitle,
  description,
  image,
  imageAlt,
  visualContent,
  isImageRight = false,
  pillText,
  gradient = "from-brand-600 to-accent-500",
  listItems = []
}) => {
  return (
    <section className="py-20 lg:py-32 overflow-hidden">
      <div className="container mx-auto px-4">
        {/* 
          Grid Layout:
          - grid-cols-1 on mobile, grid-cols-2 on desktop (lg)
          - gap-12/20 for spacing
          - items-center to vertically align content
        */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Text Content Column */}
          <div className={`text-left min-w-0 break-words ${!isImageRight ? 'lg:order-last' : ''}`}>
            {pillText && (
              <span className="inline-block py-1 px-3 rounded-full bg-brand-50 text-brand-600 text-xs font-bold tracking-wider uppercase mb-6 border border-brand-100">
                {pillText}
              </span>
            )}

            <h3 className="text-xl text-brand-600 font-semibold mb-2">{subtitle}</h3>
            <h2 className="text-3xl lg:text-5xl font-bold text-slate-900 mb-6 leading-tight">
              {title.split(' ').map((word, i) => (
                <React.Fragment key={i}>
                  <span className={i === 1 ? `text-transparent bg-clip-text bg-gradient-to-r ${gradient}` : ''}>
                    {word}
                  </span>{' '}
                </React.Fragment>
              ))}
            </h2>

            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              {description}
            </p>

            {listItems.length > 0 && (
              <ul className="space-y-4 mb-8">
                {listItems.map((item, idx) => (
                  <li key={idx} className="flex items-start">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r ${gradient} flex items-center justify-center mt-1 mr-3`}>
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-slate-700 font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Visual Content Column */}
          <div className={`relative w-full min-w-0 ${!isImageRight ? 'lg:order-first' : ''}`}>
            <div className="absolute inset-0 bg-gradient-to-r from-brand-500 to-accent-500 blur-[80px] opacity-20 -z-10 rounded-full" />
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200 bg-white">
              {/* Browser Frame Header */}
              <div className="bg-slate-50 border-b border-slate-200 p-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <div className="ml-4 bg-white border border-slate-100 rounded text-xs text-slate-400 px-3 py-1 flex-1 text-center font-mono">
                  venturestackai.com
                </div>
              </div>

              {/* Content Area */}
              <div className="bg-slate-50 relative group flex items-center justify-center bg-slate-100 min-h-[300px]">
                {visualContent ? (
                  <div className="w-full h-full">
                    {visualContent}
                  </div>
                ) : (
                  <div className="aspect-video w-full">
                    <img
                      src={image || ''}
                      alt={imageAlt || ''}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "https://placehold.co/1920x1080/f1f5f9/94a3b8?text=Screenshot";
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default DeepDiveSection;
