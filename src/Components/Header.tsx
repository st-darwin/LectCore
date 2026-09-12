import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface HeaderProps {
  title: string;
  description?: string;
  ctaText?: string;
  ctaUrl?: string;
  icon?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ title, description, ctaText, ctaUrl, icon }) => {
  const navigate = useNavigate();

  const handleCtaClick = () => {
    if (!ctaUrl) return;
    if (ctaUrl.startsWith('http') || ctaUrl.startsWith('mailto:')) {
      window.open(ctaUrl, '_blank');
    } else {
      navigate(ctaUrl);
    }
  };

  const isExternal = ctaUrl?.startsWith('http') || ctaUrl?.startsWith('mailto:');

  return (
    <header className="relative md:mt-6 flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 mb-8">
      {/* Soft minimal gradient anchor line with refined multi-stop fade */}
      <div className="absolute bottom-0 left-0 h-[1px] w-full bg-gradient-to-r from-slate-200/80 via-indigo-400/40 to-transparent" />
      
      {/* Title, Icon & Description Section */}
      <div className="relative flex items-start gap-4 min-w-0">
        {icon && (
          <div className="relative w-12 h-12 rounded-2xl bg-indigo-50/90 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/70 shadow-sm shadow-indigo-500/5 mt-0.5 transition-transform duration-300 hover:scale-105">
            {icon}
          </div>
        )}
        <div className="space-y-1.5 min-w-0">
          <h1 className="text-slate-900 tracking-tight font-extrabold text-2xl sm:text-3xl md:text-4xl leading-tight">
            {title}
          </h1>

          {description && (
            <p className="text-slate-500 font-medium leading-relaxed max-w-xl text-sm md:text-base border-l-2 border-indigo-400/50 pl-4 py-0.5">
              {description}
            </p>
          )}
        </div>
      </div>
      
      {/* CTA Button Section */}
      {ctaUrl && ctaText && (
        <div className="w-full sm:w-auto shrink-0">
          {isExternal ? (
            <button
              onClick={handleCtaClick}
              className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-3 overflow-hidden rounded-2xl bg-white border border-slate-200/80 px-6 py-3.5 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all duration-300 active:scale-[0.97] cursor-pointer"
            >
              <div className="absolute inset-0 bg-indigo-50/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative text-sm font-semibold tracking-tight text-slate-800 group-hover:text-indigo-600 transition-colors">
                {ctaText}
              </span>
            </button>
          ) : (
            <Link 
              to={ctaUrl} 
              className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-3 overflow-hidden rounded-2xl bg-white border border-slate-200/80 px-6 py-3.5 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all duration-300 active:scale-[0.97] text-center"
            >
              <div className="absolute inset-0 bg-indigo-50/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative text-sm font-semibold tracking-tight text-slate-800 group-hover:text-indigo-600 transition-colors">
                {ctaText}
              </span>
            </Link>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;