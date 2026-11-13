import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ApartmentOutlined,
  ArrowRightOutlined,
  CalendarOutlined,
  CarOutlined,
  CheckCircleFilled,
  CheckOutlined,
  CheckSquareOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  FunnelPlotOutlined,
  InboxOutlined,
  LineChartOutlined,
  MoonOutlined,
  NumberOutlined,
  PercentageOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SunOutlined,
  TeamOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useTheme } from "@/theme/ThemeProvider";
import { StorageService } from "@/storage";
import CallbackForm from "./CallbackForm";
import "./styles.scss";

// ── Content ─────────────────────────────────────────────────────────────────
// Copy describes what the product actually does today (see the backend's
// module catalog). The hero preview uses sample figures and is labelled so.

type Tone = 1 | 2 | 3 | 4 | 5 | 6;

const PLATFORM: { icon: React.ReactNode; tone: Tone; title: string; desc: string }[] = [
  { icon: <PercentageOutlined />, tone: 1, title: "GST-ready", desc: "Invoices with GST worked in" },
  { icon: <RobotOutlined />, tone: 6, title: "AI assistant", desc: "Find and update records by chat" },
  { icon: <SafetyCertificateOutlined />, tone: 3, title: "Roles & permissions", desc: "Everyone sees only what they need" },
  { icon: <ApartmentOutlined />, tone: 2, title: "Multi-company", desc: "Companies and branches kept apart" },
];

const BILLING: { icon: React.ReactNode; tone: Tone; title: string; desc: string; wide?: boolean }[] = [
  {
    icon: <FileTextOutlined />,
    tone: 1,
    title: "Quotations",
    desc: "Build quotes with items, GST and terms, share them as PDFs, and close lost ones with the customer's feedback so you learn why.",
    wide: true,
  },
  {
    icon: <FileDoneOutlined />,
    tone: 3,
    title: "GST invoices",
    desc: "Turn an approved quotation into a GST-ready invoice in one click.",
  },
  {
    icon: <CarOutlined />,
    tone: 2,
    title: "Delivery challans",
    desc: "Dispatch against approved quotations, in full or in parts, and see what's still pending.",
  },
  {
    icon: <WalletOutlined />,
    tone: 4,
    title: "Payments & dues",
    desc: "Record payments as they arrive and see who still owes you.",
  },
  {
    icon: <InboxOutlined />,
    tone: 6,
    title: "Products & warehouses",
    desc: "Your catalogue, prices and stock across categories and warehouses.",
  },
  {
    icon: <TeamOutlined />,
    tone: 5,
    title: "Customers",
    desc: "Contacts, addresses and the full history of every customer in one place.",
  },
  {
    icon: <NumberOutlined />,
    tone: 1,
    title: "Your own numbering",
    desc: "Keep your existing invoice, quotation and challan series, prefixes included.",
  },
  {
    icon: <LineChartOutlined />,
    tone: 3,
    title: "Live dashboard",
    desc: "Sales, collections and dues the moment they happen.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Quote",
    desc: "Create a quotation with items, GST and terms, and send it to your customer.",
    chip: "QT-0142 · Sent",
  },
  {
    n: "02",
    title: "Invoice & dispatch",
    desc: "Once it's approved, convert it to a GST invoice and raise delivery challans against it.",
    chip: "INV-0391 · GST incl.",
  },
  {
    n: "03",
    title: "Get paid",
    desc: "Record payments and watch collections and dues on your dashboard.",
    chip: "Paid in full",
  },
];

const ADDONS: { icon: React.ReactNode; tone: Tone; title: string; desc: string }[] = [
  {
    icon: <FunnelPlotOutlined />,
    tone: 2,
    title: "CRM",
    desc: "Leads and a sales pipeline with follow-ups. Enquiries from IndiaMART and your website arrive on their own, and a lead becomes a customer and a quotation in one click.",
  },
  {
    icon: <CheckSquareOutlined />,
    tone: 1,
    title: "Tasks",
    desc: "Epics, goals, tasks and subtasks. Assign work, track progress and follow up so nothing is forgotten.",
  },
  {
    icon: <CalendarOutlined />,
    tone: 3,
    title: "Attendance & Leave",
    desc: "Punch in and out, shift rules, holidays, a monthly calendar and leave requests for the whole team.",
  },
  {
    icon: <FolderOpenOutlined />,
    tone: 6,
    title: "Drive",
    desc: "A shared company drive with folders, tags and the full version history of every file.",
  },
];

// Decorative heights for the preview's column chart (sample data).
const PREVIEW_BARS = [34, 46, 40, 55, 50, 62, 58, 70, 64, 76, 72, 90];
const PREVIEW_PIPELINE = [
  { label: "Draft", value: 12 },
  { label: "Sent", value: 18 },
  { label: "Approved", value: 9 },
  { label: "Invoiced", value: 24 },
];
const PIPELINE_TOTAL = PREVIEW_PIPELINE.reduce((s, p) => s + p.value, 0);

const QUOTE_ROWS = [
  { no: "QT-0144", who: "Sample Traders", amt: "₹1,24,500", stage: "Sent" },
  { no: "QT-0143", who: "Demo Engineering", amt: "₹86,200", stage: "Approved" },
  { no: "QT-0142", who: "Example Steels", amt: "₹2,40,000", stage: "Invoiced" },
];

// ── Bits ────────────────────────────────────────────────────────────────────
const Mark = () => (
  <span className="lp-mark" aria-hidden="true">
    <i className="r" />
    <i className="g" />
    <i className="b" />
    <i className="y" />
  </span>
);

const Icon = ({ tone, children }: { tone: Tone; children: React.ReactNode }) => (
  <span className={`lp-icon t${tone}`} aria-hidden="true">
    {children}
  </span>
);

const SectionHead = ({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) => (
  <div className="lp-head lp-reveal">
    <span className="lp-eyebrow">{eyebrow}</span>
    <h2>{title}</h2>
    {sub && <p>{sub}</p>}
  </div>
);

const HeroPreview = () => (
  <div className="lp-preview" aria-hidden="true">
    <div className="lp-pv-main">
      <div className="lp-pv-top">
        <span>Sales · this month</span>
        <em>Example</em>
      </div>
      <div className="lp-pv-num">₹4,82,600</div>
      <div className="lp-pv-delta">
        <b>▲ 12.4%</b> vs last month
      </div>
      <div className="lp-pv-bars">
        {PREVIEW_BARS.map((h, i) => (
          <span key={i} style={{ height: `${h}%`, animationDelay: `${300 + i * 45}ms` }} />
        ))}
      </div>
      <div className="lp-pv-meter">
        <div>
          <span>Collected</span>
          <b>78%</b>
        </div>
        <i>
          <s style={{ width: "78%" }} />
        </i>
      </div>
    </div>

    <div className="lp-pv-pipe">
      <div className="lp-pv-pipe-head">
        <b>Quotation pipeline</b>
        <span>{PIPELINE_TOTAL} open</span>
      </div>
      <div className="lp-pv-seg">
        {PREVIEW_PIPELINE.map((p, i) => (
          <span key={p.label} className={`o${i + 1}`} style={{ flexGrow: p.value }} />
        ))}
      </div>
      <ul>
        {PREVIEW_PIPELINE.map((p, i) => (
          <li key={p.label}>
            <i className={`o${i + 1}`} />
            {p.label}
            <b>{p.value}</b>
          </li>
        ))}
      </ul>
    </div>

    <div className="lp-pv-toast t1">
      <span className="lp-pv-toast-ic pay">₹</span>
      <div>
        <b>Payment received</b>
        <span>₹48,000 · INV-0388</span>
      </div>
    </div>
    <div className="lp-pv-toast t2">
      <CheckCircleFilled />
      <div>
        <b>QT-0142 approved</b>
        <span>Invoice INV-0391 created</span>
      </div>
    </div>
  </div>
);

const QuoteMini = () => (
  <div className="lp-mini" aria-hidden="true">
    {QUOTE_ROWS.map((r) => (
      <div className="lp-mini-row" key={r.no}>
        <b>{r.no}</b>
        <span className="who">{r.who}</span>
        <span className="amt">{r.amt}</span>
        <span className={`pill ${r.stage.toLowerCase()}`}>{r.stage}</span>
      </div>
    ))}
  </div>
);

// Fade sections in as they scroll into view. Content stays visible if the
// browser has no IntersectionObserver or the person prefers reduced motion.
const useReveal = (root: React.RefObject<HTMLDivElement | null>) => {
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    el.classList.add("lp-animate");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    el.querySelectorAll(".lp-reveal").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [root]);
};

// ── Page ────────────────────────────────────────────────────────────────────
const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  const rootRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  useReveal(rootRef);

  const signedIn = (() => {
    try {
      return !!new StorageService().getItem(StorageService.STORAGE_KEYS.TOKEN);
    } catch {
      return false;
    }
  })();
  const goApp = () => navigate(signedIn ? "/app/dashboard" : "/login");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const jump = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="lp-root" ref={rootRef}>
      {/* ── Nav ── */}
      <nav className={`lp-nav${scrolled ? " is-scrolled" : ""}`} aria-label="Main">
        <div className="lp-nav-inner">
          <a href="#top" className="lp-brand" onClick={jump("top")}>
            <Mark />
            SameBook
          </a>
          <div className="lp-nav-links">
            <a href="#features" onClick={jump("features")}>Features</a>
            <a href="#how" onClick={jump("how")}>How it works</a>
            <a href="#addons" onClick={jump("addons")}>Add-ons</a>
            <a href="#contact" onClick={jump("contact")}>Contact</a>
          </div>
          <div className="lp-nav-actions">
            <button
              type="button"
              className="lp-theme"
              onClick={toggleTheme}
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              title={dark ? "Light mode" : "Dark mode"}
            >
              {dark ? <SunOutlined /> : <MoonOutlined />}
            </button>
            <button type="button" className="lp-btn lp-btn-dark" onClick={goApp}>
              {signedIn ? "Open dashboard" : "Sign in"}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="lp-hero" id="top">
        <span className="lp-orb a" aria-hidden="true" />
        <span className="lp-orb b" aria-hidden="true" />
        <span className="lp-grid" aria-hidden="true" />
        <div className="lp-hero-inner">
          <div className="lp-hero-copy">
            <span className="lp-pill">
              <span className="lp-pill-dot" />
              Business accounting, simplified
            </span>
            <h1>
              Every number,
              <span>in its place.</span>
            </h1>
            <p className="lp-hero-sub">
              Quotations, GST invoices, delivery challans, payments, customers and stock: one
              calm workspace for your whole business, with an AI assistant to help you run it.
            </p>
            <div className="lp-hero-ctas">
              <a href="#contact" className="lp-btn lp-btn-light" onClick={jump("contact")}>
                Request a callback <ArrowRightOutlined />
              </a>
              <button type="button" className="lp-btn lp-btn-glass" onClick={goApp}>
                {signedIn ? "Open dashboard" : "Sign in to your account"}
              </button>
            </div>
            <ul className="lp-hero-ticks">
              <li><CheckOutlined /> GST-ready invoicing</li>
              <li><CheckOutlined /> Your own numbering series</li>
              <li><CheckOutlined /> Works on phone and desktop</li>
            </ul>
          </div>
          <HeroPreview />
        </div>
      </header>

      <main>
        {/* ── Platform tiles ── */}
        <section className="lp-tiles" aria-label="Highlights">
          {PLATFORM.map((p, i) => (
            <div className="lp-tile lp-reveal" key={p.title} style={{ "--d": `${i * 70}ms` } as React.CSSProperties}>
              <Icon tone={p.tone}>{p.icon}</Icon>
              <div>
                <b>{p.title}</b>
                <span>{p.desc}</span>
              </div>
            </div>
          ))}
        </section>

        {/* ── Billing ── */}
        <section className="lp-section" id="features">
          <SectionHead
            eyebrow="Billing, end to end"
            title="Everything from the first quote to the final payment"
            sub="The core of SameBook, included for every company."
          />
          <div className="lp-bento">
            {BILLING.map((f, i) => (
              <article
                key={f.title}
                className={`lp-card lp-reveal${f.wide ? " is-wide" : ""}`}
                style={{ "--d": `${(i % 3) * 70}ms` } as React.CSSProperties}
              >
                <Icon tone={f.tone}>{f.icon}</Icon>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                {f.wide && <QuoteMini />}
              </article>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="lp-section" id="how">
          <SectionHead eyebrow="Simple by design" title="From quotation to payment in three steps" />
          <ol className="lp-steps">
            {STEPS.map((s, i) => (
              <li className="lp-step lp-reveal" key={s.n} style={{ "--d": `${i * 90}ms` } as React.CSSProperties}>
                <span className="lp-step-n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                <span className="lp-step-chip">
                  <CheckCircleFilled /> {s.chip}
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Add-ons ── */}
        <section className="lp-section" id="addons">
          <SectionHead
            eyebrow="Grow into it"
            title="Switch on more when you need it"
            sub="Add-ons sit alongside billing and use the same people, roles and permissions."
          />
          <div className="lp-addons">
            {ADDONS.map((a, i) => (
              <article className="lp-card lp-addon lp-reveal" key={a.title} style={{ "--d": `${i * 70}ms` } as React.CSSProperties}>
                <div className="lp-addon-top">
                  <Icon tone={a.tone}>{a.icon}</Icon>
                  <span className="lp-tag">Add-on</span>
                </div>
                <h3>{a.title}</h3>
                <p>{a.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── Contact ── */}
        <section className="lp-section lp-contact" id="contact">
          <div className="lp-contact-panel lp-reveal">
            <span className="lp-orb a" aria-hidden="true" />
            <span className="lp-grid" aria-hidden="true" />
            <div className="lp-contact-copy">
              <span className="lp-pill">Get started</span>
              <h2>Want to see SameBook in action?</h2>
              <p>Leave your details and our team will call you back to help you get set up.</p>
              <ul>
                <li><CheckCircleFilled /> Tell us how you quote and invoice today</li>
                <li><CheckCircleFilled /> See how it fits your business</li>
                <li><CheckCircleFilled /> Get help setting up your company</li>
              </ul>
            </div>
            <div className="lp-contact-form">
              <CallbackForm />
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <a href="#top" className="lp-brand" onClick={jump("top")}>
              <Mark />
              SameBook
            </a>
            <p>Every number, in its place. Trusted by businesses across India.</p>
          </div>
          <nav className="lp-footer-links" aria-label="Footer">
            <a href="#features" onClick={jump("features")}>Features</a>
            <a href="#how" onClick={jump("how")}>How it works</a>
            <a href="#addons" onClick={jump("addons")}>Add-ons</a>
            <a href="#contact" onClick={jump("contact")}>Contact</a>
            <button type="button" onClick={goApp}>{signedIn ? "Open dashboard" : "Sign in"}</button>
          </nav>
        </div>
        <div className="lp-footer-bottom">© {new Date().getFullYear()} SameBook. All rights reserved.</div>
      </footer>
    </div>
  );
};

export default LandingPage;
