import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { useLanguageStore } from '@/stores/language';
import { useTranslation } from '@/hooks/useTranslation';
import { ChevronRight, Calendar, Users, CreditCard, TrendingUp, Globe } from 'lucide-react';

export default function LandingPage() {
  const { isAuthenticated } = useAuthStore();
  const { lang, setLang } = useLanguageStore();
  const { t } = useTranslation();

  return (
    <div className="bg-zen-bg overflow-hidden font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 pt-4">
        <div className="max-w-6xl mx-auto glass-card h-16 rounded-[28px] px-6 flex justify-between items-center">
          <span className="text-xl font-bold tracking-tighter">X<span className="text-zen-brand italic">Sport</span></span>
          <button onClick={() => setLang(lang === 'id' ? 'en' : 'id')}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-zen-ink/50 hover:text-zen-brand transition-colors">
            <Globe size={14} /> {lang === 'id' ? 'EN' : 'ID'}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center pt-28 pb-16 px-6">
        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="z-10">
            <div className="inline-flex items-center space-x-2 bg-zen-brand/10 text-zen-brand px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zen-brand opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-zen-brand"></span>
              </span>
              <span>{t('landing.badge')}</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold leading-[0.95] text-zen-ink mb-8 tracking-tight">
              {t('landing.title1')} <br />
              <span className="gradient-text">{t('landing.title2')}</span>
            </h1>
            <p className="text-lg text-zen-ink/60 max-w-lg mb-10 leading-relaxed">
              {t('landing.subtitle')}
            </p>
            <div className="flex flex-wrap gap-4">
              {isAuthenticated ? (
                <Link to="/dashboard" className="btn-primary flex items-center group">
                  {t('landing.cta_dashboard')}
                  <ChevronRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <>
                  <Link to="/login" className="btn-primary flex items-center group">
                    {t('landing.cta_login')}
                    <ChevronRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link to="/register" className="px-8 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest border border-zen-ink/10 text-zen-ink hover:bg-zen-ink hover:text-white transition-all duration-300 flex items-center group">
                    Daftar Studio
                    <ChevronRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="relative hidden lg:flex justify-center">
            <img src="/images/hero-fitness.svg" alt="Fitness" className="w-full max-w-md drop-shadow-2xl" />
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-zen-accent/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-zen-brand/20 rounded-full blur-3xl" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Calendar, title: t('landing.feature1_title'), desc: t('landing.feature1_desc'), color: 'text-zen-brand' },
            { icon: Users, title: t('landing.feature2_title'), desc: t('landing.feature2_desc'), color: 'text-zen-accent' },
            { icon: CreditCard, title: t('landing.feature3_title'), desc: t('landing.feature3_desc'), color: 'text-zen-brand' },
            { icon: TrendingUp, title: t('landing.feature4_title'), desc: t('landing.feature4_desc'), color: 'text-zen-accent' },
          ].map((f, i) => (
            <div key={i} className="glass-card p-8 rounded-[32px] hover:-translate-y-2 transition-all duration-300 group">
              <div className={`w-12 h-12 rounded-2xl bg-zen-brand/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform ${f.color}`}>
                <f.icon size={24} />
              </div>
              <h3 className="text-base font-bold mb-2">{f.title}</h3>
              <p className="text-sm text-zen-ink/50 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Motivation Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto glass-card rounded-[48px] p-12 md:p-16 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">{t('landing.section2_title')}</h2>
            <p className="text-zen-ink/60 leading-relaxed text-lg">{t('landing.section2_desc')}</p>
          </div>
          <div className="flex justify-center">
            <img src="/images/group-workout.svg" alt="Group Workout" className="w-full max-w-sm" />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">{t('landing.section3_title')}</h2>
          <p className="text-zen-ink/50 text-lg max-w-xl mx-auto mb-10">{t('landing.section3_desc')}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/register" className="btn-primary inline-flex items-center group">
              Daftar Studio Gratis
              <ChevronRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/login" className="px-8 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest border border-zen-ink/10 text-zen-ink hover:bg-zen-ink hover:text-white transition-all duration-300 inline-flex items-center group">
              {t('landing.cta_login')}
              <ChevronRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-zen-brand/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-xl font-bold tracking-tighter">X<span className="text-zen-brand italic">Sport</span></span>
          <span className="text-[10px] opacity-30">{t('landing.footer_copyright')}</span>
        </div>
      </footer>
    </div>
  );
}
