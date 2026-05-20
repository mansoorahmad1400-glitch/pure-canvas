import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles, Film, Globe, Music, Youtube, Wand2, ArrowRight,
  LogIn, Crown, Check, X, Gem, ImageIcon, FolderOpen, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { base44 } from '@/api/base44Client';
import { useTranslation } from 'react-i18next';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
});

const FEATURE_ICONS = [Film, ImageIcon, Globe, Music, Youtube, Wand2, FolderOpen, Gem, Zap];

export default function Home() {
  const { user, isStarter, isPremium, isElite, isAdmin, isLoading, isFetching } = useCurrentUser();
  const { t } = useTranslation();

  const features = t('home.features.items', { returnObjects: true });
  const howItWorksSteps = t('home.howItWorks.steps', { returnObjects: true });
  const socialProof = t('home.socialProof', { returnObjects: true });
  const freeFeatures = t('home.plans.free.features', { returnObjects: true });
  const freeIncluded = t('home.plans.free.included', { returnObjects: true });
  const starterFeatures = t('home.plans.starter.features', { returnObjects: true });
  const proFeatures = t('home.plans.pro.features', { returnObjects: true });
  const eliteFeatures = t('home.plans.elite.features', { returnObjects: true });

  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
        {/* Background glows */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-primary/10 rounded-full blur-3xl opacity-40 pointer-events-none" />
        <div className="absolute top-1/2 left-[15%] w-[200px] h-[200px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-[15%] w-[200px] h-[200px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold tracking-wider uppercase mb-8"
          >
            <Wand2 className="w-3.5 h-3.5" />
            {t('home.badge')}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="font-playfair text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[1.05] tracking-tight"
          >
            StudioOne<span className="text-primary"> AI</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-6 text-xl sm:text-2xl text-muted-foreground font-light max-w-2xl mx-auto leading-relaxed"
          >
            {t('home.tagline')}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.42, duration: 0.6 }}
            className="mt-3 text-base text-muted-foreground/70 max-w-xl mx-auto"
          >
            {t('home.subTagline')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.5 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            {user ? (
              <>
                <Link to="/studio">
                  <Button size="lg" className="h-12 px-8 text-base bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl">
                    <Sparkles className="w-5 h-5 mr-2" /> {t('home.startCreating')}
                  </Button>
                </Link>
                <Link to="/projects">
                  <Button variant="outline" size="lg" className="h-12 px-8 text-base rounded-xl border-border/50 text-muted-foreground hover:text-foreground">
                    {t('home.myProjects')} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Button
                  size="lg"
                  onClick={() => base44.auth.redirectToLogin()}
                  className="h-12 px-10 text-base bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20"
                >
                  <Sparkles className="w-5 h-5 mr-2" /> {t('home.startCreatingFree')}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => base44.auth.redirectToLogin()}
                  className="h-12 px-8 text-base rounded-xl border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                >
                  <LogIn className="w-4 h-4 mr-2" /> {t('home.signIn')}
                </Button>
              </>
            )}
          </motion.div>

          {/* Guest signup nudge */}
          {!user && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 0.65 }}
             className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground/60"
           >
             <Gem className="w-3 h-3 text-primary/60" />
             <span>{t('home.freeNudge')}</span>
           </motion.div>
          )}

          {/* Social proof strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground/40"
          >
            {Array.isArray(socialProof) && socialProof.map((item, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-primary/40" />{item}
              </span>
            ))}
          </motion.div>

          {/* Demo Video */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.6 }}
            className="mt-10 max-w-4xl mx-auto w-full"
          >
            <video
              src="https://media.base44.com/videos/public/69beca883f9aef74a54f435d/7ed28dfb2_advvideoforstudio1withsound.mp4"
              controls
              autoPlay
              muted
              loop
              playsInline
              className="w-full rounded-2xl border border-border/50 shadow-2xl"
            />
          </motion.div>

          </div>
          </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="border-t border-border/40 bg-card/20 py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()} className="text-center mb-16">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">{t('home.howItWorks.label')}</p>
            <h2 className="font-playfair text-3xl sm:text-4xl font-bold">{t('home.howItWorks.heading')}</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-10 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            {Array.isArray(howItWorksSteps) && howItWorksSteps.map((item, i) => (
              <motion.div key={item.num} {...fadeUp(i * 0.12)} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
                  <span className="font-playfair text-xl font-bold text-primary">{item.num}</span>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─────────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp()} className="text-center mb-14">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">{t('home.features.label')}</p>
            <h2 className="font-playfair text-3xl sm:text-4xl font-bold">{t('home.features.heading')}</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">{t('home.features.subheading')}</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.isArray(features) && features.map((f, i) => {
              const Icon = FEATURE_ICONS[i] || Sparkles;
              return (
                <motion.div
                  key={i}
                  {...fadeUp(i * 0.06)}
                  className="group p-5 rounded-2xl border border-border/50 bg-card/40 hover:bg-card hover:border-primary/20 transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1.5">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── FREE VS PREMIUM ──────────────────────────────────── */}
      <section className="border-t border-border/40 bg-card/20 py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeUp()} className="text-center mb-14">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">{t('home.plans.label')}</p>
            <h2 className="font-playfair text-3xl sm:text-4xl font-bold">{t('home.plans.heading')}</h2>
            <p className="mt-3 text-muted-foreground max-w-md mx-auto">{t('home.plans.subheading')}</p>
          </motion.div>

          {(isLoading || isFetching) ? (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 border-4 border-border border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

            {/* Free */}
            <motion.div {...fadeUp(0.1)} className="relative p-6 rounded-2xl border-2 border-green-500/40 bg-gradient-to-b from-green-500/8 to-card/60 overflow-hidden flex flex-col">
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-green-500/15 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-green-500/15 flex items-center justify-center">
                  <Gem className="w-4.5 h-4.5 text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-400">{t('home.plans.free.name')}</h3>
                  <p className="text-xl font-bold">$0</p>
                </div>
              </div>
              <p className="text-xs text-green-400/70 mb-4 italic">Try StudioOne AI with 2 lifetime gems.</p>
              <ul className="space-y-2 flex-1">
                {Array.isArray(freeFeatures) && freeFeatures.map((label, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs">
                    {freeIncluded[idx]
                      ? <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
                      : <X className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />}
                    <span className={freeIncluded[idx] ? 'text-foreground/85' : 'text-muted-foreground/40 line-through'}>{label}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                <Button onClick={() => !user && base44.auth.redirectToLogin()} variant="outline" className="w-full border-green-500/30 text-green-400 hover:bg-green-500/10 text-sm" disabled={!!user}>
                  {user ? t('home.plans.currentPlan') : t('home.plans.getStartedFree')}
                </Button>
              </div>
            </motion.div>

            {/* Starter */}
            <motion.div {...fadeUp(0.15)} className="relative p-6 rounded-2xl border-2 border-blue-500/40 bg-gradient-to-b from-blue-500/8 to-card/60 overflow-hidden flex flex-col">
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
                  <Crown className="w-4.5 h-4.5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-400">Starter</h3>
                  <p className="text-xl font-bold">$9.99<span className="text-xs text-muted-foreground font-normal">{t('home.plans.perMonth')}</span></p>
                </div>
              </div>
              <p className="text-xs text-blue-400/70 mb-4 italic">Start creating with 200 monthly gems.</p>
              <ul className="space-y-2 flex-1">
                {Array.isArray(starterFeatures) && starterFeatures.map((label, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs">
                    <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="text-foreground/85">{label}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                <Link to="/upgrade">
                  <Button className="w-full bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 font-bold h-10 text-sm rounded-xl">
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Get Starter
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* Creator Pro */}
            <motion.div {...fadeUp(0.2)} className="relative p-6 rounded-2xl border-2 border-purple-500/40 bg-gradient-to-b from-purple-500/8 to-card/60 overflow-hidden flex flex-col">
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-purple-500/15 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center">
                  <Crown className="w-4.5 h-4.5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-purple-400">{t('home.plans.pro.name')}</h3>
                  <p className="text-xl font-bold">$19.99<span className="text-xs text-muted-foreground font-normal">{t('home.plans.perMonth')}</span></p>
                </div>
              </div>
              <p className="text-xs text-purple-400/70 mb-4 italic">For regular creators — 500 monthly gems.</p>
              <ul className="space-y-2 flex-1">
                {Array.isArray(proFeatures) && proFeatures.map((label, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs">
                    <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span className="text-foreground/85">{label}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                {isPremium ? (
                  <Link to="/studio"><Button className="w-full bg-purple-400 hover:bg-purple-500 text-purple-950 font-bold h-12 text-sm rounded-lg transition-colors"><Sparkles className="w-4 h-4 mr-2" /> {t('home.plans.openStudio')}</Button></Link>
                ) : (
                  <Link to="/upgrade"><Button className="w-full bg-purple-400 hover:bg-purple-500 text-purple-950 font-bold h-12 text-sm rounded-lg transition-colors"><Sparkles className="w-4 h-4 mr-2" /> {t('home.plans.upgradeToPro')}</Button></Link>
                )}
              </div>
            </motion.div>

            {/* Studio Elite */}
            <motion.div {...fadeUp(0.3)} className="relative p-6 rounded-2xl border-2 border-amber-500/50 bg-gradient-to-b from-amber-500/10 to-card/60 overflow-hidden flex flex-col">
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
              {isElite && (
                <div className="absolute top-4 right-4">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-amber-950 text-[10px] font-bold">{t('home.plans.currentPlan')}</span>
                </div>
              )}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Crown className="w-4.5 h-4.5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-400">{t('home.plans.elite.name')}</h3>
                  <p className="text-xl font-bold">$39.99<span className="text-xs text-muted-foreground font-normal">{t('home.plans.perMonth')}</span></p>
                </div>
              </div>
              <p className="text-xs text-amber-400/70 mb-4 italic">Premium creative power with GPT-4o.</p>
              <ul className="space-y-2 flex-1">
                {Array.isArray(eliteFeatures) && eliteFeatures.map((label, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs">
                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-foreground/85">{label}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                {isElite ? (
                  <Link to="/studio"><Button className="w-full bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold h-12 text-sm rounded-lg transition-colors"><Sparkles className="w-4 h-4 mr-2" /> {t('home.plans.openStudio')}</Button></Link>
                ) : (
                  <Link to="/upgrade"><Button className="w-full bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold h-12 text-sm rounded-lg transition-colors"><Crown className="w-4 h-4 mr-2" /> {t('home.plans.upgradeToElite')}</Button></Link>
                )}
              </div>
            </motion.div>

          </div>
          )}
        </div>
      </section>

      {/* ─── FINAL CTA ────────────────────────────────────────── */}
      <section className="py-28 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/8 rounded-full blur-3xl pointer-events-none" />

        <motion.div {...fadeUp()} className="relative max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-8">
            <Sparkles className="w-3.5 h-3.5" /> {t('home.cta.badge')}
          </div>
          <h2 className="font-playfair text-4xl sm:text-5xl font-bold leading-tight mb-5">
            {t('home.cta.heading1')}<br />
            <span className="text-primary">{t('home.cta.heading2')}</span> {t('home.cta.heading3')}
          </h2>
          <p className="text-muted-foreground mb-10 text-lg">{t('home.cta.subheading')}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {user ? (
              <>
                <Link to="/studio">
                  <Button size="lg" className="h-12 px-10 text-base bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20">
                    <Sparkles className="w-5 h-5 mr-2" /> {t('home.plans.openStudio')}
                  </Button>
                </Link>
                <Link to="/upgrade">
                  <Button variant="outline" size="lg" className="h-12 px-8 text-base rounded-xl border-border/50 text-muted-foreground hover:text-foreground">
                    <Crown className="w-4 h-4 mr-2" /> {t('home.cta.upgrade')}
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Button
                  size="lg"
                  onClick={() => base44.auth.redirectToLogin()}
                  className="h-12 px-10 text-base bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20"
                >
                  <Sparkles className="w-5 h-5 mr-2" /> {t('home.startCreatingFree')}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => base44.auth.redirectToLogin()}
                  className="h-12 px-8 text-base rounded-xl border-border/60 text-muted-foreground hover:text-foreground"
                >
                  <LogIn className="w-4 h-4 mr-2" /> {t('home.signIn')}
                </Button>
              </>
            )}
          </div>
        </motion.div>
      </section>

    </div>
  );
}