import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CallbackForm from "./CallbackForm";

/* ─── Design tokens — adapted from kdelectricals.in's dark "industrial-tech"
   system (deep navy surfaces, electric blue + amber accents, Space Grotesk
   headings over Inter body). Fixed dark design, not wired to the app's own
   light/dark toggle — same precedent as the Login/Register pages, which are
   also their own fixed brand design. ── */
const tokens = {
  bg0: "#04080F",
  bg1: "#080F1E",
  bg2: "#0D1728",
  bg3: "#111F38",
  bg4: "#162540",
  blue: "#3B82F6",
  blueLight: "#60A5FA",
  blueDark: "#2563EB",
  yellow: "#F59E0B",
  yellowLight: "#FCD34D",
  text1: "#F8FAFC",
  text2: "#CBD5E1",
  text3: "#94A3B8",
  text4: "#64748B",
  border: "#1E3358",
  borderSubtle: "#132040",
  radiusSm: "8px",
  radius: "12px",
  radiusLg: "20px",
  radiusXl: "28px",
  shadowLg: "0 12px 48px rgba(0,0,0,.5)",
  font: `"Inter", system-ui, -apple-system, sans-serif`,
  fontHeading: `"Space Grotesk", "Inter", system-ui, sans-serif`,
  navH: "72px",
};

const FEATURES = [
  {
    icon: "📄",
    title: "Quotations",
    desc: "Create polished, professional quotations in minutes and send them straight to your customers.",
  },
  {
    icon: "🧾",
    title: "GST-Ready Invoicing",
    desc: "Convert approved quotations into invoices instantly, with GST handled automatically.",
  },
  {
    icon: "👥",
    title: "Customer Management",
    desc: "Keep every customer's contacts, addresses, and history organized in one place.",
  },
  {
    icon: "📦",
    title: "Products & Inventory",
    desc: "Manage your product catalog, pricing, and stock across categories with ease.",
  },
  {
    icon: "🏢",
    title: "Multi-Company & Branches",
    desc: "Run multiple companies or branches from a single account, with data kept cleanly separate.",
  },
  {
    icon: "🤖",
    title: "AI Assistant",
    desc: "Ask your AI agent to search, create, or update customer records for you — just by chatting.",
  },
  {
    icon: "📊",
    title: "Real-Time Reports",
    desc: "See revenue, outstanding payments, and business performance the moment it happens.",
  },
  {
    icon: "🔐",
    title: "Roles & Permissions",
    desc: "Give every team member exactly the access they need — no more, no less.",
  },
];

const STEPS = [
  { n: "01", title: "Create a Quotation", desc: "Build a quotation for your customer with items, pricing, and terms." },
  { n: "02", title: "Convert to Invoice", desc: "Once approved, turn it into a GST-ready invoice with one click." },
  { n: "03", title: "Track & Get Paid", desc: "Record payments and keep an eye on outstanding balances in real time." },
];

const STATS = [
  { label: "Ready Invoicing", value: "GST" },
  { label: "Powered Assistant", value: "AI" },
  { label: "Access, Anywhere", value: "24/7" },
  { label: "Company Support", value: "Multi" },
];

const injectStyles = () => {
  const id = "lp-landing-styles";
  if (document.getElementById(id)) return;
  const s = document.createElement("style");
  s.id = id;
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@500;600;700;800&display=swap');

    html { scroll-behavior: smooth; }

    .lp-root {
      font-family: ${tokens.font};
      background: ${tokens.bg0};
      color: ${tokens.text1};
      min-height: 100vh;
      line-height: 1.65;
      -webkit-font-smoothing: antialiased;
    }

    /* ── Nav ── */
    .lp-nav {
      position: sticky; top: 0; z-index: 50;
      height: ${tokens.navH};
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 32px;
      transition: all .3s ease;
      background: transparent;
    }
    .lp-nav.scrolled {
      background: #04080ff5;
      backdrop-filter: blur(24px);
      border-bottom: 1px solid ${tokens.borderSubtle};
      box-shadow: 0 4px 32px rgba(0,0,0,.55);
    }
    .lp-nav-brand { display: flex; align-items: center; gap: 12px; cursor: pointer; }
    .lp-logo-icon {
      width: 40px; height: 40px; border-radius: 9px; flex-shrink: 0;
      background: linear-gradient(135deg, ${tokens.blue}, ${tokens.blueDark});
      box-shadow: 0 4px 12px rgba(59,130,246,.4);
      display: grid; grid-template-columns: repeat(2, 1fr); gap: 3px;
      align-items: center; justify-items: center; padding: 8px;
    }
    .lp-logo-dot { width: 6px; height: 6px; border-radius: 2px; background: rgba(255,255,255,.9); }
    .lp-nav-wordmark { font-family: ${tokens.fontHeading}; font-size: 17px; font-weight: 700; color: ${tokens.text1}; line-height: 1.1; }
    .lp-nav-wordmark span { color: ${tokens.blueLight}; }
    .lp-nav-links { display: flex; align-items: center; gap: 8px; }
    .lp-nav-link {
      padding: .5rem .9rem; border-radius: ${tokens.radiusSm}; font-size: .875rem; font-weight: 500;
      color: ${tokens.text3}; text-decoration: none; cursor: pointer; transition: all .25s ease;
    }
    .lp-nav-link:hover { color: ${tokens.text1}; background: ${tokens.bg2}; }
    .lp-nav-login-btn {
      margin-left: 12px; padding: .8rem 1.25rem; border-radius: ${tokens.radiusSm}; border: 1.5px solid ${tokens.blue};
      background: ${tokens.blue}; color: #fff; font-size: .85rem; font-weight: 600;
      cursor: pointer; transition: all .25s ease;
    }
    .lp-nav-login-btn:hover { background: ${tokens.blueDark}; border-color: ${tokens.blueDark}; }
    @media (max-width: 768px) { .lp-nav-links > .lp-nav-link { display: none; } }
    @media (max-width: 480px) { .lp-nav { padding: 0 16px; } }

    /* ── Hero ── */
    .lp-hero {
      min-height: 92vh; display: flex; align-items: center;
      position: relative; overflow: hidden; padding-top: ${tokens.navH};
      text-align: center;
    }
    .lp-hero-bg {
      position: absolute; inset: 0;
      background:
        radial-gradient(ellipse 80% 60% at 10% 60%, rgba(59,130,246,.12) 0%, transparent 60%),
        radial-gradient(ellipse 60% 40% at 90% 20%, rgba(245,158,11,.07) 0%, transparent 50%),
        radial-gradient(ellipse 50% 80% at 50% 100%, rgba(59,130,246,.05) 0%, transparent 60%),
        linear-gradient(160deg, ${tokens.bg0}, ${tokens.bg1}, ${tokens.bg0});
    }
    .lp-hero-grid {
      position: absolute; inset: 0;
      background-image:
        linear-gradient(rgba(30,51,88,.25) 1px, transparent 1px),
        linear-gradient(90deg, rgba(30,51,88,.25) 1px, transparent 1px);
      background-size: 64px 64px;
      -webkit-mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 80%);
      mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 80%);
    }
    .lp-hero-orb { position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; }
    .lp-hero-orb.blue { width: 480px; height: 480px; background: radial-gradient(circle, rgba(59,130,246,.14) 0%, transparent 70%); top: 8%; left: -6%; }
    .lp-hero-orb.yellow { width: 380px; height: 380px; background: radial-gradient(circle, rgba(245,158,11,.09) 0%, transparent 70%); bottom: 6%; right: 2%; }
    .lp-hero-content { position: relative; z-index: 1; max-width: 780px; margin: 0 auto; padding: 0 32px; }
    .lp-hero-eyebrow {
      display: inline-flex; align-items: center; gap: .55rem;
      padding: .45rem 1.1rem; background: rgba(59,130,246,.1); border: 1px solid rgba(59,130,246,.25);
      border-radius: 100px; font-size: .8rem; font-weight: 600; color: ${tokens.blueLight};
      letter-spacing: .08em; text-transform: uppercase; margin-bottom: 2rem;
    }
    .lp-hero-eyebrow-dot { width: 6px; height: 6px; background: ${tokens.blue}; border-radius: 50%; animation: lpPulse 2s infinite; }
    @keyframes lpPulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
    .lp-hero-title {
      font-family: ${tokens.fontHeading}; font-size: clamp(2rem, 8vw, 4.6rem); font-weight: 800;
      line-height: 1.06; letter-spacing: -.03em; margin: 0 0 1.4rem; color: ${tokens.text1};
    }
    .lp-hero-title-accent {
      background: linear-gradient(135deg, ${tokens.blueLight}, ${tokens.blue} 45%, ${tokens.blueDark});
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
      display: block;
    }
    .lp-hero-sub {
      font-size: clamp(1rem, 1.6vw, 1.15rem); color: ${tokens.text3}; line-height: 1.75;
      max-width: 560px; margin: 0 auto 2.4rem;
    }
    .lp-hero-buttons { display: flex; align-items: center; justify-content: center; gap: 1rem; flex-wrap: wrap; }
    .lp-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: .5rem;
      padding: .875rem 1.75rem; border-radius: ${tokens.radiusSm}; font-weight: 600; font-size: .95rem;
      cursor: pointer; border: 1.5px solid transparent; transition: all .25s ease; text-decoration: none;
      white-space: nowrap;
    }
    .lp-btn-primary { background: ${tokens.blue}; color: #fff; border-color: ${tokens.blue}; }
    .lp-btn-primary:hover:not(:disabled) { background: ${tokens.blueDark}; border-color: ${tokens.blueDark}; transform: translateY(-2px); }
    .lp-btn-primary:disabled { opacity: .6; cursor: not-allowed; transform: none; }
    .lp-btn-outline { background: transparent; color: ${tokens.text1}; border-color: ${tokens.border}; }
    .lp-btn-outline:hover { background: ${tokens.bg2}; border-color: ${tokens.blue}; }
    .lp-btn-ghost { padding: .625rem 1.25rem; font-size: .85rem; background: ${tokens.bg3}; color: ${tokens.text1}; border: 1px solid ${tokens.borderSubtle}; border-radius: ${tokens.radiusSm}; cursor: pointer; font-weight: 600; }

    /* ── Stats strip ── */
    .lp-stats-wrap { position: relative; z-index: 1; background: ${tokens.bg1}; border-top: 1px solid ${tokens.borderSubtle}; border-bottom: 1px solid ${tokens.borderSubtle}; }
    .lp-stats { max-width: 1080px; margin: 0 auto; display: grid; grid-template-columns: repeat(4, 1fr); }
    .lp-stat { padding: 2.25rem 1.5rem; text-align: center; border-right: 1px solid ${tokens.borderSubtle}; }
    .lp-stat:last-child { border-right: none; }
    .lp-stat-value { font-family: ${tokens.fontHeading}; font-size: 2.2rem; font-weight: 800; color: ${tokens.text1}; line-height: 1; margin-bottom: .3rem; }
    .lp-stat-label { font-size: .75rem; color: ${tokens.text4}; text-transform: uppercase; letter-spacing: .08em; font-weight: 500; }
    @media (max-width: 900px) {
      .lp-stats { grid-template-columns: repeat(2, 1fr); }
      .lp-stat:nth-child(2) { border-right: none; }
      .lp-stat:nth-child(3), .lp-stat:nth-child(4) { border-top: 1px solid ${tokens.borderSubtle}; }
      .lp-stat:nth-child(4) { border-right: none; }
    }

    /* ── Section shell ── */
    .lp-section { max-width: 1080px; margin: 0 auto; padding: 6rem 32px 1rem; }
    .lp-section-head { text-align: center; max-width: 560px; margin: 0 auto 3.2rem; }
    .lp-section-eyebrow {
      display: inline-block; font-size: .75rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
      color: ${tokens.blueLight}; margin-bottom: .75rem;
    }
    .lp-section-title { font-family: ${tokens.fontHeading}; font-size: clamp(1.8rem, 4vw, 2.6rem); font-weight: 800; color: ${tokens.text1}; margin: 0 0 .75rem; letter-spacing: -.02em; }
    .lp-section-sub { font-size: .9rem; color: ${tokens.text3}; line-height: 1.7; }

    /* ── Features grid ── */
    .lp-features-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.1rem; }
    .lp-feature-card {
      background: ${tokens.bg2}; border: 1px solid ${tokens.borderSubtle}; border-radius: ${tokens.radiusLg};
      padding: 1.75rem; transition: all .3s ease; position: relative; overflow: hidden;
    }
    .lp-feature-card:hover { transform: translateY(-3px); border-color: rgba(59,130,246,.4); box-shadow: 0 12px 32px rgba(0,0,0,.35); }
    .lp-feature-icon-wrap {
      width: 48px; height: 48px; border-radius: ${tokens.radiusSm};
      background: rgba(59,130,246,.12); border: 1px solid rgba(59,130,246,.2);
      display: flex; align-items: center; justify-content: center; font-size: 20px; margin-bottom: 1.1rem;
    }
    .lp-feature-title { font-size: 1.02rem; font-weight: 700; color: ${tokens.text1}; margin-bottom: .5rem; }
    .lp-feature-desc { font-size: .85rem; color: ${tokens.text3}; line-height: 1.65; }
    @media (max-width: 980px) { .lp-features-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 560px) { .lp-features-grid { grid-template-columns: 1fr; } }

    /* ── How it works ── */
    .lp-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.75rem; }
    .lp-step {
      background: ${tokens.bg2}; border: 1px solid ${tokens.borderSubtle}; border-radius: ${tokens.radiusLg};
      padding: 1.75rem;
    }
    .lp-step-num { font-family: ${tokens.fontHeading}; font-size: 2rem; font-weight: 800; color: ${tokens.blue}; opacity: .55; margin-bottom: .6rem; line-height: 1; }
    .lp-step-title { font-size: 1.02rem; font-weight: 700; color: ${tokens.text1}; margin-bottom: .5rem; }
    .lp-step-desc { font-size: .85rem; color: ${tokens.text3}; line-height: 1.65; }
    @media (max-width: 768px) { .lp-steps { grid-template-columns: 1fr; } }

    /* ── Contact / callback ── */
    .lp-contact-section { padding: 6rem 32px; }
    .lp-contact-inner { max-width: 640px; margin: 0 auto; }
    .lp-cta-banner {
      background: linear-gradient(135deg, ${tokens.bg2} 0%, ${tokens.bg3} 100%);
      border: 1px solid ${tokens.borderSubtle}; border-radius: ${tokens.radiusXl};
      padding: 2.5rem; position: relative; overflow: hidden;
    }
    .lp-cta-banner::before {
      content: ''; position: absolute; inset: 0;
      background: radial-gradient(ellipse 60% 80% at 50% 0%, rgba(59,130,246,.1) 0%, transparent 60%);
      pointer-events: none;
    }
    .lp-form-grid { position: relative; z-index: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
    .lp-form-field label { display: block; font-size: .72rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: ${tokens.text4}; margin-bottom: .5rem; }
    .lp-form-field input, .lp-form-field textarea {
      width: 100%; padding: .7rem .85rem; border-radius: ${tokens.radiusSm}; border: 1px solid ${tokens.border};
      background: ${tokens.bg0}; font-size: .875rem; font-family: inherit; color: ${tokens.text1};
      outline: none; transition: all .25s ease; box-sizing: border-box;
    }
    .lp-form-field input::placeholder, .lp-form-field textarea::placeholder { color: ${tokens.text4}; }
    .lp-form-field input:focus, .lp-form-field textarea:focus {
      border-color: ${tokens.blue}; box-shadow: 0 0 0 3px rgba(59,130,246,.18);
    }
    .lp-form-field-full { position: relative; z-index: 1; margin-bottom: 1.25rem; }
    .lp-form-error {
      position: relative; z-index: 1;
      background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.3); color: #FCA5A5;
      font-size: .82rem; padding: .6rem .9rem; border-radius: ${tokens.radiusSm}; margin-bottom: 1rem;
    }
    .lp-form-submit { position: relative; z-index: 1; width: 100%; }

    .lp-form-success { position: relative; z-index: 1; text-align: center; padding: 1.25rem .5rem; }
    .lp-form-success-icon {
      width: 52px; height: 52px; border-radius: 50%; background: rgba(34,197,94,.12); color: #4ADE80;
      border: 1px solid rgba(34,197,94,.3);
      display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700;
      margin: 0 auto 1rem;
    }
    .lp-form-success h3 { font-size: 1.1rem; font-weight: 700; color: ${tokens.text1}; margin: 0 0 .4rem; }
    .lp-form-success p { font-size: .85rem; color: ${tokens.text3}; margin: 0 0 1.25rem; }
    @media (max-width: 560px) {
      .lp-form-grid { grid-template-columns: 1fr; }
      .lp-contact-section { padding: 3rem 16px; }
      .lp-cta-banner { padding: 1.5rem; }
    }

    /* ── Footer ── */
    .lp-footer { background: ${tokens.bg1}; border-top: 1px solid ${tokens.borderSubtle}; padding: 3rem 32px 1.5rem; text-align: center; }
    .lp-footer-brand { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: .75rem; }
    .lp-footer-wordmark { font-family: ${tokens.fontHeading}; font-size: 15px; font-weight: 700; color: ${tokens.text1}; }
    .lp-footer-wordmark span { color: ${tokens.blueLight}; }
    .lp-footer-tagline { font-size: .78rem; color: ${tokens.text4}; margin-bottom: 1.5rem; }
    .lp-footer-bottom { font-size: .78rem; color: ${tokens.text4}; padding-top: 1.25rem; border-top: 1px solid ${tokens.borderSubtle}; }
    .lp-footer-login { color: ${tokens.text3}; text-decoration: underline; cursor: pointer; background: none; border: none; font-size: .78rem; padding: 0; }
  `;
  document.head.appendChild(s);
};
injectStyles();

const Logo: React.FC<{ wordmarkClass?: string }> = ({ wordmarkClass = "lp-nav-wordmark" }) => (
  <>
    <div className="lp-logo-icon">
      <span className="lp-logo-dot" />
      <span className="lp-logo-dot" />
      <span className="lp-logo-dot" />
      <span className="lp-logo-dot" />
    </div>
    <span className={wordmarkClass}>
      Same<span>Book</span>
    </span>
  </>
);

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="lp-root">
      {/* ── Nav ── */}
      <nav className={`lp-nav ${scrolled ? "scrolled" : ""}`}>
        <div className="lp-nav-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <Logo />
        </div>
        <div className="lp-nav-links">
          <a className="lp-nav-link" onClick={() => scrollTo("lp-features")}>Features</a>
          <a className="lp-nav-link" onClick={() => scrollTo("lp-how")}>How it works</a>
          <a className="lp-nav-link" onClick={() => scrollTo("lp-contact")}>Contact</a>
          <button className="lp-nav-login-btn" onClick={() => navigate("/login")}>Login</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="lp-hero">
        <div className="lp-hero-bg" />
        <div className="lp-hero-grid" />
        <div className="lp-hero-orb blue" />
        <div className="lp-hero-orb yellow" />
        <div className="lp-hero-content">
          <span className="lp-hero-eyebrow">
            <span className="lp-hero-eyebrow-dot" />
            Business Accounting, Simplified
          </span>
          <h1 className="lp-hero-title">
            Every number,
            <span className="lp-hero-title-accent">in its place.</span>
          </h1>
          <p className="lp-hero-sub">
            SameBook is an all-in-one business management platform — quotations, GST-ready invoicing,
            customers, inventory, and real-time reports, with an AI assistant to help you run it all.
          </p>
          <div className="lp-hero-buttons">
            <button className="lp-btn lp-btn-primary" onClick={() => scrollTo("lp-contact")}>
              Request a Callback
            </button>
            <button className="lp-btn lp-btn-outline" onClick={() => navigate("/login")}>
              Login to your account
            </button>
          </div>
        </div>
      </header>

      {/* ── Stats strip ── */}
      <div className="lp-stats-wrap">
        <div className="lp-stats">
          {STATS.map((stat) => (
            <div className="lp-stat" key={stat.label}>
              <div className="lp-stat-value">{stat.value}</div>
              <div className="lp-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <section className="lp-section" id="lp-features">
        <div className="lp-section-head">
          <div className="lp-section-eyebrow">What you get</div>
          <h2 className="lp-section-title">Everything your business needs, in one place</h2>
          <p className="lp-section-sub">
            From the first quotation to the final payment, SameBook keeps your whole business organized.
          </p>
        </div>
        <div className="lp-features-grid">
          {FEATURES.map((f) => (
            <div className="lp-feature-card" key={f.title}>
              <div className="lp-feature-icon-wrap">{f.icon}</div>
              <div className="lp-feature-title">{f.title}</div>
              <div className="lp-feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="lp-section" id="lp-how">
        <div className="lp-section-head">
          <div className="lp-section-eyebrow">Simple by design</div>
          <h2 className="lp-section-title">From quotation to payment in three steps</h2>
        </div>
        <div className="lp-steps">
          {STEPS.map((s) => (
            <div className="lp-step" key={s.n}>
              <div className="lp-step-num">{s.n}</div>
              <div className="lp-step-title">{s.title}</div>
              <div className="lp-step-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Contact / Callback ── */}
      <section className="lp-contact-section" id="lp-contact">
        <div className="lp-contact-inner">
          <div className="lp-section-head" style={{ marginBottom: 32 }}>
            <div className="lp-section-eyebrow">Get started</div>
            <h2 className="lp-section-title">Want to see SameBook in action?</h2>
            <p className="lp-section-sub">
              Leave your details and our team will call you back to help you get set up.
            </p>
          </div>
          <div className="lp-cta-banner">
            <CallbackForm />
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-brand">
          <Logo wordmarkClass="lp-footer-wordmark" />
        </div>
        <div className="lp-footer-tagline">Trusted by businesses across India</div>
        <div className="lp-footer-bottom">
          © {new Date().getFullYear()} SameBook. All rights reserved. ·{" "}
          <button className="lp-footer-login" onClick={() => navigate("/login")}>Login</button>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
