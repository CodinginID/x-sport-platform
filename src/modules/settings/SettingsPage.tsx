import { useLanguageStore } from '@/stores/language';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/hooks/useTranslation';
import { Card } from '@/components/ui';
import { Globe, Info, User } from 'lucide-react';
import { BackupSection } from './BackupSection';

const APP_VERSION = '1.0.0';

export default function SettingsPage() {
  const { lang, setLang } = useLanguageStore();
  const { user } = useAuthStore();
  const { t } = useTranslation();

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold">{t('settings.title')}</h1>

      {/* Account */}
      <Card title={t('settings.account')}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zen-brand/10 flex items-center justify-center text-zen-brand">
            <User size={20} />
          </div>
          <div>
            <div className="font-bold text-sm">{user?.full_name}</div>
            <div className="text-[10px] uppercase tracking-widest text-zen-ink/40">{user?.role === 'owner' ? 'Owner' : 'Staff'} • {user?.email}</div>
          </div>
        </div>
      </Card>

      {/* Language */}
      <Card title={t('settings.language')}>
        <div className="flex items-center gap-3 mb-3">
          <Globe size={18} className="text-zen-brand" />
          <span className="text-sm font-medium">{t('settings.select_language')}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setLang('id')}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all ${lang === 'id' ? 'bg-zen-brand text-white shadow-lg shadow-zen-brand/20' : 'bg-zen-bg text-zen-ink/50'}`}>
            🇮🇩 Bahasa Indonesia
          </button>
          <button onClick={() => setLang('en')}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all ${lang === 'en' ? 'bg-zen-brand text-white shadow-lg shadow-zen-brand/20' : 'bg-zen-bg text-zen-ink/50'}`}>
            🇬🇧 English
          </button>
        </div>
      </Card>

      {/* Backup */}
      <BackupSection />

      {/* About */}
      <Card title={t('settings.about')}>
        <div className="flex items-center gap-3 mb-4">
          <Info size={18} className="text-zen-brand" />
          <span className="text-sm font-medium">X-Sport Platform</span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-zen-brand/5">
            <span className="text-zen-ink/40">{t('settings.version')}</span>
            <span className="font-bold">v{APP_VERSION}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-zen-brand/5">
            <span className="text-zen-ink/40">{t('settings.platform')}</span>
            <span className="font-bold">PWA Offline-First</span>
          </div>
          <div className="flex justify-between py-2 border-b border-zen-brand/5">
            <span className="text-zen-ink/40">{t('settings.database')}</span>
            <span className="font-bold">IndexedDB (Dexie.js)</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-zen-ink/40">{t('settings.build')}</span>
            <span className="font-bold">2024.05</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
