import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck} from 'lucide-react';

interface AdminHeaderProps {
  title: string;
  description?: string;
  ctaText?: string;
  ctaUrl?: string;
  icon?: React.ReactNode;
  ctaIcon?: React.ReactNode;
  badgeText?: string; // Optional indicator badge e.g. "Admin Privilege"
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ 
  title, 
  description, 
  ctaText, 
  ctaUrl, 
  icon, 
  ctaIcon,
  badgeText = "Control Center"
}) => {
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
    <header className="relative md:mt-4 mt-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-8 mb-8 border-b border-slate-200/60">
      {/* Background ambient light glow */}
      <div className="absolute -top-10 left-1/4 w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Left Section: Title, Badge & Icon */}
      <div className="relative flex items-start gap-4 sm:gap-5 min-w-0">
        {icon && (
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-200/60 shadow-xs mt-0.5">
            {/* Inner glow effect */}
            <div className="absolute inset-0 rounded-2xl bg-white/40 backdrop-blur-xs" />
            <div className="relative z-10">
              {icon}
            </div>
          </div>
        )}
        
        <div className="space-y-2 min-w-0">
          {/* Admin Context Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50/80 border border-indigo-100 text-indigo-600 text-[11px] font-bold tracking-wider uppercase">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{badgeText}</span>
          </div>

          <h1 className="text-slate-900 tracking-tight font-black text-2xl sm:text-3xl md:text-4xl leading-tight">
            {title}
          </h1>

          {description && (
            <p className="text-slate-500 font-medium text-sm md:text-base leading-relaxed max-w-2xl">
              {description}
            </p>
          )}
        </div>
      </div>
      
      {/* Right Section: Action CTA with Primary Indigo Gradient Polish */}
      {ctaUrl && ctaText && (
        <div className="w-full lg:w-auto shrink-0 flex items-center gap-3">
          {isExternal ? (
            <button
              onClick={handleCtaClick}
              className="group relative w-full lg:w-auto inline-flex items-center justify-center gap-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/30 transition-all duration-300 active:scale-[0.97] cursor-pointer"
            >
              {ctaIcon && (
                <span className="text-indigo-200 group-hover:text-white transition-colors flex items-center">
                  {ctaIcon}
                </span>
              )}
              <span className="text-sm font-semibold tracking-tight">
                {ctaText}
              </span>
            </button>
          ) : (
            <Link 
              to={ctaUrl} 
              className="group relative w-full lg:w-auto inline-flex items-center justify-center gap-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/30 transition-all duration-300 active:scale-[0.97] text-center"
            >
              {ctaIcon && (
                <span className="text-indigo-200 group-hover:text-white transition-colors flex items-center">
                  {ctaIcon}
                </span>
              )}
              <span className="text-sm font-semibold tracking-tight">
                {ctaText}
              </span>
            </Link>
          )}
        </div>
      )}
    </header>
  );
};

AdminHeader.displayName = 'AdminHeader';

export default AdminHeader;