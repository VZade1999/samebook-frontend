import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Input, message, Select } from "antd";
import {
  AppstoreAddOutlined,
  CrownOutlined,
  FileDoneOutlined,
  GlobalOutlined,
  PauseCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  RightOutlined,
  SearchOutlined,
  ShopOutlined,
  TeamOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { StatTile } from "@/modules/dashboard/components/Bits";
import "@/modules/dashboard/styles/dashboard.scss";
import "@/modules/team/team.scss";
import { initialsOf, levelInfo } from "@/permissions/standing";
import { ago, apiError } from "@/modules/team/teamApi";
import { type PlatformCompany, type PlatformOverview, getCompanies, getOverview } from "./platformApi";
import CompanyDrawer from "./CompanyDrawer";
import NewCompanyDrawer from "./NewCompanyDrawer";
import "./platform.scss";

type Filter = "all" | "active" | "suspended" | "no_admin";
const ADDON_NAME: Record<string, string> = { attendance: "Attendance", tasks: "Tasks", drive: "Drive", crm: "CRM" };

/** SameBook's own console: every company, its people, add-ons and status. */
const PlatformPage: React.FC = () => {
  const [ov, setOv] = useState<PlatformOverview | null>(null);
  const [companies, setCompanies] = useState<PlatformCompany[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const [o, c] = await Promise.all([getOverview(), getCompanies()]);
      setOv(o);
      setCompanies(c);
      setFailed(false);
    } catch (e) {
      setFailed(true);
      message.error(apiError(e, "Couldn't load the platform"));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (companies || [])
      .filter((c) => (filter === "all" ? true : filter === "no_admin" ? !c.admins.length : c.status === filter))
      .filter((c) => !term || [c.name, c.prefix, c.gst_no, c.email, ...c.admins.map((a) => `${a.name} ${a.email}`)].some((v) => String(v || "").toLowerCase().includes(term)))
      .sort((a, b) => Number(b.yours) - Number(a.yours) || (b.last_active || "").localeCompare(a.last_active || "") || a.name.localeCompare(b.name));
  }, [companies, q, filter]);

  if (!ov || !companies) {
    return (
      <div className="db-root tm-root pf-root">
        <div className="db-hero pf-hero skeleton tm-hero-sk">
          {failed && (
            <div className="tm-failed">
              Couldn't load the platform.
              <button type="button" className="db-btn white" onClick={load}>
                <ReloadOutlined /> Try again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const maxAdopt = Math.max(1, ov.companies.total);

  return (
    <div className="db-root tm-root pf-root">
      <div className="db-hero pf-hero">
        <div className="db-hero-orb a" />
        <div className="db-hero-orb b" />
        <div className="db-hero-grid" />
        <div className="db-hero-inner">
          <div className="db-hero-left">
            <div className="db-hero-eyebrow">
              SameBook platform
              <span className="db-hero-company tm-sb">Super Admin</span>
            </div>
            <div className="db-hero-title">
              <span className="db-hero-icon">
                <GlobalOutlined />
              </span>
              Every company
            </div>
            <div className="db-hero-sub">People, add-ons and status of every business on SameBook. Their documents stay private to them.</div>
            <div className="db-hero-figure">
              <span className="db-hero-figure-label">Companies</span>
              <span className="db-hero-number">{ov.companies.total}</span>
              <span className="db-hero-figure-foot">
                {ov.companies.active} active · {ov.companies.suspended} suspended
                {ov.companies.new_30d > 0 && <> · {ov.companies.new_30d} new in 30 days</>}
              </span>
            </div>
          </div>
          <div className="db-hero-right">
            <div className="db-hero-stats">
              <div className="db-hero-stat">
                <b>{ov.people.active}</b>
                <span>People active</span>
              </div>
              <div className="db-hero-stat">
                <b>{ov.documents_30d.invoices}</b>
                <span>Invoices · 30 days</span>
              </div>
              <div className="db-hero-stat">
                <b>{ov.documents_30d.quotations}</b>
                <span>Quotations · 30 days</span>
              </div>
            </div>
            <div className="db-hero-btns">
              <button type="button" className="db-btn glass" onClick={load}>
                <ReloadOutlined /> Refresh
              </button>
              <button type="button" className="db-btn white" onClick={() => setAdding(true)}>
                <PlusOutlined /> Add company
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="db-tiles tm-tiles">
        <StatTile index={0} icon={<ShopOutlined />} label="Companies" value={String(ov.companies.total)} tint="var(--db-s7)" sub="on SameBook" onClick={() => setFilter("all")} />
        <StatTile index={1} icon={<TeamOutlined />} label="People" value={String(ov.people.active)} tint="var(--db-s1)" sub={`${ov.people.total} accounts in all`} />
        <StatTile index={2} icon={<FileDoneOutlined />} label="Challans · 30 days" value={String(ov.documents_30d.challans)} tint="var(--db-s3)" sub="delivery challans" />
        <StatTile index={3} icon={<WarningOutlined />} label="No Admin yet" value={String(ov.companies.without_admin)} tint="var(--db-s4)" sub="nobody runs them" onClick={() => setFilter("no_admin")} />
        <StatTile index={4} icon={<PauseCircleOutlined />} label="Suspended" value={String(ov.companies.suspended)} tint="var(--db-neutral)" sub="can't sign in" onClick={() => setFilter("suspended")} />
      </div>

      <div className="pf-two">
        <section className="tm-card pf-card">
          <div className="pf-card-h">
            <AppstoreAddOutlined /> Add-on adoption
          </div>
          <ul className="pf-adopt">
            {ov.add_ons.map((m) => (
              <li key={m.key}>
                <span>{m.name}</span>
                <span className="pf-bar" role="img" aria-label={`${m.companies} of ${ov.companies.total} companies`}>
                  <i style={{ width: `${(m.companies / maxAdopt) * 100}%` }} />
                </span>
                <b>
                  {m.companies}/{ov.companies.total}
                </b>
              </li>
            ))}
          </ul>
        </section>
        <section className="tm-card pf-card">
          <div className="pf-card-h">
            <CrownOutlined /> SameBook Super Admins
          </div>
          <ul className="pf-supers">
            {ov.super_admins.map((s) => (
              <li key={s.id}>
                <span className="tm-avatar" style={{ ["--tone" as any]: levelInfo(0).tone }}>
                  {initialsOf(s.name)}
                </span>
                <span>
                  <b>{s.name}</b>
                  <em>
                    {s.email}
                    {s.company ? ` · home company ${s.company}` : ""}
                  </em>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="tm-bar">
        <Input allowClear prefix={<SearchOutlined />} placeholder="Search company, prefix, GSTIN, admin…" value={q} onChange={(e) => setQ(e.target.value)} className="tm-search" aria-label="Search companies" />
        <Select
          value={filter}
          onChange={setFilter}
          className="tm-filter"
          aria-label="Show"
          options={[
            { value: "all", label: "All companies" },
            { value: "active", label: "Active" },
            { value: "suspended", label: "Suspended" },
            { value: "no_admin", label: "No Admin yet" },
          ]}
        />
        <span className="pm-count">
          {rows.length} of {companies.length}
        </span>
      </div>

      <section className="tm-card">
        <div className="pf-head-row" aria-hidden>
          <span>Company</span>
          <span>People</span>
          <span>Admins</span>
          <span>Add-ons</span>
          <span>Documents</span>
          <span>Last active</span>
          <span />
        </div>
        <ul className="pf-list">
          {rows.map((c, i) => (
            <li key={c.id} className={`pf-row${c.status === "suspended" ? " off" : ""}`} style={{ ["--i" as any]: Math.min(i, 12) }}>
              <button type="button" className="pf-co" onClick={() => setOpen(c.id)}>
                <span className="tm-avatar company">
                  <ShopOutlined />
                </span>
                <span className="pf-co-text">
                  <b>
                    {c.name}
                    {c.yours && <em className="tm-you">Yours</em>}
                  </b>
                  <span>
                    <span className={`pf-status ${c.status}`}>{c.status === "suspended" ? "Suspended" : "Active"}</span> · <span className="tm-mono">{c.prefix}</span>
                    {c.gst_no ? <> · {c.gst_no}</> : null}
                  </span>
                </span>
              </button>
              <span className="pf-cell" data-label="People">
                <b>{c.people.active}</b> <em>/ {c.people.total}</em>
              </span>
              <span className="pf-cell" data-label="Admins">
                {c.admins.length ? (
                  <span className="pf-admin-stack" title={c.admins.map((a) => `${a.name} <${a.email}>`).join("\n")}>
                    {c.admins.slice(0, 3).map((a) => (
                      <span key={a.id} className="tm-avatar xs" style={{ ["--tone" as any]: levelInfo(1).tone }}>
                        {initialsOf(a.name)}
                      </span>
                    ))}
                    <em>{c.admins[0].name.split(" ")[0]}{c.admins.length > 1 ? ` +${c.admins.length - 1}` : ""}</em>
                  </span>
                ) : (
                  <span className="tm-warn">
                    <WarningOutlined /> None
                  </span>
                )}
              </span>
              <span className="pf-cell pf-addons" data-label="Add-ons">
                {c.add_ons.length ? c.add_ons.map((k) => <span key={k} className="pf-addon">{ADDON_NAME[k] || k}</span>) : <span className="tm-muted">Billing only</span>}
              </span>
              <span className="pf-cell tm-muted" data-label="Documents">
                {c.documents.invoices} inv · {c.documents.quotations} qt
              </span>
              <span className="pf-cell tm-muted" data-label="Last active">
                {ago(c.last_active)}
              </span>
              <span className="pf-go">
                <button type="button" className="tm-icon" onClick={() => setOpen(c.id)} aria-label={`Open ${c.name}`}>
                  <RightOutlined />
                </button>
              </span>
            </li>
          ))}
        </ul>
        {!rows.length && (
          <div className="tm-empty">
            <ShopOutlined />
            <b>No company matches</b>
            <span>Try another search or filter.</span>
          </div>
        )}
      </section>

      <CompanyDrawer companyId={open} onClose={() => setOpen(null)} onChanged={load} />
      <NewCompanyDrawer
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={(id, msg) => {
          setAdding(false);
          message.success({ content: msg, duration: 12 });
          load();
          setOpen(id);
        }}
      />
    </div>
  );
};

export default PlatformPage;
