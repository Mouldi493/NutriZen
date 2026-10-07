import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Clock3, RefreshCw, ScanLine, ShoppingBasket, Sparkles, Utensils } from 'lucide-react';
import { ScrollToTop } from '@/components/common/ScrollToTop';

const HERO_VIDEO = 'https://d8j0ntlcm91z4.cloudfront.net/user_3KBoNF4aYuLJekQmHRg9bCOKXpC/hf_20261007_001054_34723958-90dc-47b9-a240-825ece07da08.mp4';
const HERO_POSTER = 'https://d8j0ntlcm91z4.cloudfront.net/user_3KBoNF4aYuLJekQmHRg9bCOKXpC/hf_20261007_000813_7b561d9e-b701-48cf-b308-7c01c04eb610.png';

const ranges = [
  { a: 0.00, b: 0.24 },
  { a: 0.25, b: 0.49 },
  { a: 0.50, b: 0.74 },
  { a: 0.75, b: 1.00 },
];

const clamp = (n:number,min:number,max:number) => Math.min(max,Math.max(min,n));
const smoothstep = (p:number,e0:number,e1:number) => {
  const t = clamp((p-e0)/(e1-e0),0,1);
  return t*t*(3-2*t);
};


const menuProfiles = {
  famille: {
    label: 'Famille',
    note: 'Simple, varié, pensé pour limiter les négociations à table.',
    meals: [
      ['Lundi', 'Poulet citron, quinoa et courgettes', '25 min'],
      ['Mardi', 'Pâtes bolognaise aux légumes', '20 min'],
      ['Mercredi', 'Saumon, pommes de terre et brocolis', '30 min'],
      ['Jeudi', 'Wraps de poulet et crudités', '18 min'],
    ],
  },
  veggie: {
    label: 'Végétarien',
    note: 'Des repas sans viande avec protéines et variété sur la semaine.',
    meals: [
      ['Lundi', 'Dahl de lentilles corail et riz', '24 min'],
      ['Mardi', 'Bowl pois chiches, feta et légumes', '18 min'],
      ['Mercredi', 'Lasagnes épinards et ricotta', '32 min'],
      ['Jeudi', 'Curry de tofu et légumes', '22 min'],
    ],
  },
  sport: {
    label: 'Objectif sport',
    note: 'Des repas structurés pour un apport plus soutenu en protéines.',
    meals: [
      ['Lundi', 'Poulet paprika, riz et haricots verts', '25 min'],
      ['Mardi', 'Bowl thon, œufs et pommes de terre', '20 min'],
      ['Mercredi', 'Dinde, patate douce et légumes', '28 min'],
      ['Jeudi', 'Pâtes au saumon et épinards', '22 min'],
    ],
  },
} as const;

type MenuProfile = keyof typeof menuProfiles;

export const CinematicLanding = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const signup = () => navigate('/auth/signup');
  const [menuProfile, setMenuProfile] = useState<MenuProfile>('famille');

  useEffect(() => {
    const video = videoRef.current;
    const hero = heroRef.current;
    if (!video || !hero) return;

    const media = [
      matchMedia('(max-width: 720px)'),
      matchMedia('(orientation: portrait) and (max-width: 1024px)'),
      matchMedia('(orientation: portrait) and (pointer: coarse)'),
      matchMedia('(orientation: landscape) and (pointer: coarse) and (max-height: 560px)'),
      matchMedia('(prefers-reduced-motion: reduce)'),
    ];
    let objectUrl = '';
    let raf = 0;
    let target = 0;
    let shown = 0;
    let seekBusy = false;
    let pending:number|null = null;
    let active = false;
    let loaded = false;
    let controller: AbortController | null = null;
    let watchdog = 0;

    const requestSeek = (time:number) => {
      if (!video.duration) return;
      if (seekBusy) { pending = time; return; }
      seekBusy = true;
      try { video.currentTime = clamp(time, 0, Math.max(0, video.duration - .01)); }
      catch { seekBusy = false; }
    };
    const onSeeked = () => {
      seekBusy = false;
      if (pending !== null) {
        const t = pending;
        pending = null;
        requestSeek(t);
      }
    };
    const onError = () => { seekBusy = false; pending = null; };
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);

    const progress = () => {
      const rect = hero.getBoundingClientRect();
      const scrollable = Math.max(1, hero.offsetHeight - innerHeight);
      return clamp(-rect.top / scrollable, 0, 1);
    };

    const paintBands = (p:number) => {
      hero.querySelectorAll<HTMLElement>('.nz-band').forEach((el,i) => {
        const { a, b } = ranges[i];
        const f = Math.min(.035, (b-a)/3);
        const opacity = i===0
          ? 1-smoothstep(p,b-f,b)
          : i===ranges.length-1
            ? smoothstep(p,a,a+f)
            : smoothstep(p,a,a+f)*(1-smoothstep(p,b-f,b));
        const k = i === 0 ? 1 : clamp((p-a)/Math.min(.065,(b-a)*.38),0,1);
        el.style.opacity = String(opacity);
        el.style.setProperty('--k', String(k));
      });
    };

    const tick = () => {
      if (!active) return;
      shown += (target-shown)*.16;
      if (Math.abs(target-shown) < .0005) shown = target;
      if (video.duration) requestSeek(shown*video.duration);
      paintBands(shown);
      if (shown !== target) raf = requestAnimationFrame(tick); else raf = 0;
    };

    const onScroll = () => {
      target = progress();
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const enable = async () => {
      if (active) return;
      active = true;
      const poster = hero.querySelector<HTMLElement>('.nz-poster');
      if (poster) poster.style.backgroundImage = `url("${HERO_POSTER}")`;
      addEventListener('scroll', onScroll, { passive:true });
      paintBands(progress());

      if (loaded) {
        hero.querySelector('.nz-stage')?.classList.add('video-ready');
        onScroll();
        return;
      }

      try {
        controller = new AbortController();
        watchdog = window.setTimeout(() => controller?.abort(), 20000);
        const response = await fetch(HERO_VIDEO, { signal: controller.signal });
        if (!response.ok) throw new Error('hero-video');
        const blob = await response.blob();
        window.clearTimeout(watchdog);
        objectUrl = URL.createObjectURL(blob);
        video.src = objectUrl;
        video.load();
        video.addEventListener('canplay', () => {
          loaded = true;
          hero.querySelector('.nz-stage')?.classList.add('video-ready');
          onScroll();
        }, { once:true });
      } catch {
        window.clearTimeout(watchdog);
        hero.querySelector('.nz-stage')?.classList.add('video-failed');
      }
      onScroll();
    };

    const disable = () => {
      active = false;
      removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      if (!loaded) controller?.abort();
      window.clearTimeout(watchdog);
    };
    const apply = () => media.some(q => q.matches) ? disable() : enable();
    media.forEach(q => q.addEventListener('change', apply));
    apply();

    return () => {
      disable();
      media.forEach(q => q.removeEventListener('change', apply));
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  return (
    <div className="nz-cinematic">
      <a className="nz-skip" href="#main-content">Aller au contenu</a>
      <nav className="nz-nav" aria-label="Navigation principale">
        <Link to="/" aria-label="NutriZen, accueil">
          <img src={new URL('@/assets/nutrizen-main-logo.png', import.meta.url).href} alt="NutriZen" />
        </Link>
        <div className="nz-navlinks">
          <a href="#comment">Comment ça marche</a>
          <a href="#fonctionnalites">Fonctionnalités</a>
          <a href="#tarifs">Tarifs</a>
          <Link to="/auth/login">Connexion</Link>
        </div>
        <button className="nz-nav-cta" onClick={signup}>Créer mon menu</button>
      </nav>

      <main id="main-content">
      <section ref={heroRef} className="nz-hero" aria-label="Présentation NutriZen">
        <div className="nz-stage">
          <div className="nz-poster" aria-hidden="true" />
          <video ref={videoRef} muted playsInline preload="none" aria-hidden="true" tabIndex={-1} />

          <div className="nz-band">
            <div className="nz-band-inner">
              <div className="nz-kicker">NutriZen · votre semaine repas</div>
              <h1>Le plus fatigant n'est pas de cuisiner.</h1>
              <p>C'est de devoir décider, encore et encore, quoi manger.</p>
            </div>
          </div>

          <div className="nz-band nz-band-right">
            <div className="nz-band-inner">
              <div className="nz-kicker">Moins de charge mentale</div>
              <h2>Votre semaine se démêle.</h2>
              <p>Préférences, intolérances, objectifs et équipements sont pris en compte avant de proposer vos repas.</p>
            </div>
          </div>

          <div className="nz-band">
            <div className="nz-band-inner">
              <div className="nz-kicker">Menu + courses</div>
              <h2>Vous savez quoi manger. Et quoi acheter.</h2>
              <p>Le menu est généré avec sa liste de courses. Vous gardez la main sur chaque repas.</p>
            </div>
          </div>

          <div className="nz-band nz-band-right">
            <div className="nz-band-inner">
              <div className="nz-kicker">Une semaine claire</div>
              <h2>Libérez votre semaine des repas.</h2>
              <p>Créez votre compte gratuitement et générez votre premier menu personnalisé.</p>
              <div className="nz-hero-cta">
                <button className="nz-btn nz-btn-primary" onClick={signup}>Créer mon menu gratuit <ArrowRight size={17}/></button>
                <a className="nz-btn nz-btn-ghost" href="#comment">Voir comment ça marche</a>
              </div>
            </div>
          </div>

          <div className="nz-scroll-cue">Faites défiler pour organiser la semaine</div>
        </div>
      </section>

      <section className="nz-mobile-hero" style={{'--mobile-poster': `url("${HERO_POSTER}")`} as CSSProperties}>
        <div className="nz-shell">
          <div className="nz-kicker">NutriZen · votre semaine repas</div>
          <h1>Libérez votre semaine des repas.</h1>
          <p>Un menu personnalisé selon votre profil, puis une liste de courses prête à utiliser.</p>
          <button className="nz-btn nz-btn-primary" onClick={signup}>Créer mon menu gratuit <ArrowRight size={17}/></button>
        </div>
      </section>

      <section className="nz-section">
        <div className="nz-shell">
          <div className="nz-eyebrow">Le vrai problème</div>
          <h2>La décision quotidienne coûte plus que la recette.</h2>
          <p className="nz-lead">NutriZen organise les contraintes une fois, puis transforme ce profil en menus exploitables pour la semaine.</p>
          <div className="nz-grid3">
            <article className="nz-card"><span className="num">01</span><h3>Plus besoin de repartir de zéro</h3><p>Votre profil conserve préférences, restrictions alimentaires, objectifs et équipements.</p></article>
            <article className="nz-card"><span className="num">02</span><h3>Une semaine, pas sept décisions</h3><p>Le menu regroupe vos repas dans une vue claire pour savoir ce qui est prévu à l'avance.</p></article>
            <article className="nz-card"><span className="num">03</span><h3>Les courses suivent le menu</h3><p>La liste de courses est générée à partir des repas retenus pour éviter la double saisie.</p></article>
          </div>
        </div>
      </section>

      <section id="comment" className="nz-section" style={{background:'#fff'}}>
        <div className="nz-shell nz-flow">
          <div>
            <div className="nz-eyebrow">Comment ça marche</div>
            <h2>Trois étapes. Puis vous passez à autre chose.</h2>
            <p className="nz-lead">L'organisation se fait au début de la semaine pour réduire les décisions répétitives ensuite.</p>
          </div>
          <div className="nz-steps">
            <div className="nz-step"><b>1</b><div><h3>Décrivez votre foyer</h3><p>Préférences, intolérances, équipements disponibles et objectif principal.</p></div></div>
            <div className="nz-step"><b>2</b><div><h3>Générez votre menu</h3><p>Recevez une semaine de repas cohérente avec votre profil et modifiez ce qui ne vous convient pas.</p></div></div>
            <div className="nz-step"><b>3</b><div><h3>Partez faire les courses</h3><p>Votre liste est déjà reliée au menu. Plus besoin de reconstruire les ingrédients à la main.</p></div></div>
          </div>
        </div>
      </section>


      <section className="nz-section nz-demo" aria-labelledby="demo-title">
        <div className="nz-shell">
          <div className="nz-demo-head">
            <div>
              <div className="nz-eyebrow">Essayez le principe</div>
              <h2 id="demo-title">Un même outil. Des semaines différentes.</h2>
            </div>
            <p className="nz-lead">Choisissez un profil pour voir comment la même structure de semaine peut s'adapter à des besoins différents.</p>
          </div>

          <div className="nz-profile-tabs" role="group" aria-label="Exemples de profils">
            {(Object.keys(menuProfiles) as MenuProfile[]).map((key) => (
              <button
                key={key}
                type="button"
                className={`nz-profile-tab ${menuProfile === key ? 'is-active' : ''}`}
                aria-pressed={menuProfile === key}
                onClick={() => setMenuProfile(key)}
              >
                {menuProfiles[key].label}
              </button>
            ))}
          </div>

          <div className="nz-profile-panel">
            <div className="nz-profile-copy">
              <span className="nz-kicker" style={{color:'var(--nz-green)'}}>Exemple de menu</span>
              <h3>{menuProfiles[menuProfile].label}</h3>
              <p>{menuProfiles[menuProfile].note}</p>
              <button className="nz-btn nz-btn-primary" onClick={signup}>Créer mon propre profil <ArrowRight size={17}/></button>
            </div>
            <div className="nz-profile-meals" aria-live="polite">
              {menuProfiles[menuProfile].meals.map(([day, meal, time]) => (
                <div className="nz-profile-meal" key={day}>
                  <span>{day}</span>
                  <strong>{meal}</strong>
                  <small>{time}</small>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="fonctionnalites" className="nz-section">
        <div className="nz-shell">
          <div className="nz-eyebrow">Tout est relié</div>
          <h2>Du menu à l'assiette, sans jongler entre cinq outils.</h2>
          <div className="nz-proof-grid">
            <div className="nz-proof-main">
              <div className="nz-eyebrow">Votre semaine</div>
              <h3 style={{fontFamily:'DM Serif Display, Georgia, serif',fontSize:'42px',fontWeight:400,margin:0,maxWidth:'12ch'}}>Une vue simple de ce qui compte maintenant.</h3>
              <div className="nz-ui-mock" aria-label="Aperçu conceptuel du menu NutriZen">
                {[
                  ['Lun.','Poulet citron, quinoa','25 min'],
                  ['Mar.','Curry de lentilles','20 min'],
                  ['Mer.','Saumon, légumes rôtis','30 min'],
                  ['Jeu.','Pâtes complètes, courgettes','18 min'],
                ].map(([d,m,t]) => <div className="nz-ui-row" key={d}><div className="nz-ui-thumb"/><div><small>{d}</small><div style={{fontWeight:800}}>{m}</div></div><span style={{fontSize:12,color:'#60736b'}}>{t}</span></div>)}
              </div>
            </div>
            <div className="nz-proof-side">
              <div className="nz-mini"><ScanLine size={26}/><p className="nz-quote">Scannez un repas pour mieux comprendre votre assiette.</p><strong>ScanRepas</strong></div>
              <div className="nz-mini"><Sparkles size={26}/><p className="nz-quote">Transformez ce qu'il reste dans le frigo en idées exploitables.</p><strong>InspiFrigo</strong></div>
            </div>
          </div>
          <div className="nz-grid3">
            <article className="nz-card"><ShoppingBasket/><h3>Liste de courses automatique</h3><p>Les ingrédients suivent les repas sélectionnés pour limiter les oublis et la ressaisie.</p></article>
            <article className="nz-card"><RefreshCw/><h3>Swap de recette</h3><p>Un repas ne convient pas ? Remplacez-le sans refaire toute la semaine.</p></article>
            <article className="nz-card"><Utensils/><h3>Recettes adaptées</h3><p>Les suggestions tiennent compte du profil plutôt que de vous imposer un catalogue générique.</p></article>
          </div>
        </div>
      </section>

      <section className="nz-section nz-section-dark">
        <div className="nz-shell">
          <div className="nz-eyebrow">Le principe</div>
          <h2>Les repas doivent devenir une routine, pas un projet.</h2>
          <p className="nz-lead">Le produit est construit autour de quatre tâches : décider, adapter, acheter et cuisiner. La landing suit désormais cette logique plutôt qu'un empilement de fonctionnalités.</p>
          <div className="nz-grid3">
            <article className="nz-card" style={{background:'rgba(255,255,255,.07)',borderColor:'rgba(255,255,255,.12)',color:'#fff'}}><Clock3/><h3>Décider une fois</h3><p style={{color:'rgba(255,255,255,.66)'}}>Organisez la semaine en amont plutôt que d'improviser chaque soir.</p></article>
            <article className="nz-card" style={{background:'rgba(255,255,255,.07)',borderColor:'rgba(255,255,255,.12)',color:'#fff'}}><Check/><h3>Respecter vos contraintes</h3><p style={{color:'rgba(255,255,255,.66)'}}>Les restrictions et préférences font partie de la génération.</p></article>
            <article className="nz-card" style={{background:'rgba(255,255,255,.07)',borderColor:'rgba(255,255,255,.12)',color:'#fff'}}><ShoppingBasket/><h3>Fermer la boucle</h3><p style={{color:'rgba(255,255,255,.66)'}}>Le plan mène directement aux courses, puis à la cuisine.</p></article>
          </div>
        </div>
      </section>

      <section id="tarifs" className="nz-section nz-section-dark" style={{paddingTop:0}}>
        <div className="nz-shell">
          <div className="nz-eyebrow">Tarifs</div>
          <h2>Commencez sans abonnement.</h2>
          <div className="nz-pricing">
            <article className="nz-price featured">
              <div className="nz-eyebrow">Compte gratuit</div>
              <div className="price">0 €</div>
              <p>Le socle pour organiser vos repas et tester NutriZen sans carte bancaire.</p>
              <ul><li>Menu hebdomadaire</li><li>Accès aux recettes</li><li>Liste de courses</li><li>Historique et tableau de bord</li></ul>
              <button className="nz-btn nz-btn-primary" onClick={signup}>Créer mon compte</button>
            </article>
            <article className="nz-price">
              <div className="nz-eyebrow">Crédits Zen</div>
              <div className="price">À la carte</div>
              <p>Activez les fonctions IA avancées uniquement quand vous en avez besoin.</p>
              <ul><li>Swap de recette</li><li>InspiFrigo</li><li>ScanRepas</li><li>Substitutions d'ingrédients</li></ul>
              <button className="nz-btn nz-btn-ghost" onClick={() => navigate('/credits')}>Voir les crédits</button>
            </article>
          </div>
        </div>
      </section>

      <section className="nz-section">
        <div className="nz-shell nz-faq">
          <div><div className="nz-eyebrow">FAQ</div><h2>Les questions avant de commencer.</h2></div>
          <div>
            {[
              ['Est-ce vraiment gratuit ?',"Oui. Le compte gratuit donne accès au socle de NutriZen. Les fonctions IA avancées utilisent des Crédits Zen achetés séparément."],
              ['Mes intolérances sont-elles prises en compte ?',"Votre profil sert de contrainte à la génération des menus. En cas d'allergie sévère, vérifiez toujours les ingrédients."],
              ['Puis-je changer un repas ?',"Oui. Le swap permet de remplacer une recette sans reconstruire toute la semaine."],
              ['Faut-il beaucoup de matériel ?',"Non. Les équipements disponibles font partie du profil pour éviter les recettes impossibles à réaliser chez vous."],
            ].map(([q,a]) => <div className="nz-faq-item" key={q}><h3>{q}</h3><p>{a}</p></div>)}
          </div>
        </div>
      </section>

      <section className="nz-final">
        <div className="nz-shell">
          <div className="nz-eyebrow">Votre prochaine semaine</div>
          <h2>Une décision maintenant. Moins de décisions toute la semaine.</h2>
          <p className="nz-lead" style={{margin:'0 auto 30px'}}>Créez votre profil, générez votre menu et récupérez votre liste de courses.</p>
          <button className="nz-btn nz-btn-primary" onClick={signup}>Créer mon menu gratuit <ArrowRight size={17}/></button>
        </div>
      </section>

      </main>

      <footer className="nz-footer">
        <div className="nz-shell nz-footer-row">
          <span>© NutriZen</span>
          <div><Link to="/a-propos">À propos</Link><Link to="/blog">Blog</Link><Link to="/contact">Contact</Link><Link to="/legal/confidentialite">Confidentialité</Link></div>
        </div>
      </footer>
      <ScrollToTop />
    </div>
  );
};
