import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Input, message, Popconfirm, Select, Tooltip } from "antd";
import {
  ApartmentOutlined,
  CrownOutlined,
  EditOutlined,
  EyeOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  ReloadOutlined,
  SearchOutlined,
  StopOutlined,
  TeamOutlined,
  UndoOutlined,
  UnorderedListOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
  UserSwitchOutlined,
  WarningOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { StatTile } from "@/modules/dashboard/components/Bits";
import "@/modules/dashboard/styles/dashboard.scss";
import { StorageService } from "@/storage";
import { LEVELS, initialsOf, levelInfo, roleLabel } from "@/permissions/standing";
import { type TeamData, type TeamPerson, activatePerson, ago, apiError, deactivatePerson, getTeam } from "./teamApi";
import PersonDrawer from "./PersonDrawer";
import OrgChart from "./OrgChart";
import "./team.scss";

type View = "people" | "chart";
type Status = "active" | "deactivated" | "all";

const companyName = () => {
  try {
    return JSON.parse(new StorageService().getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS) || "{}")?.name || "Your company";
  } catch {
    return "Your company";
  }
};
const readView = (): View => {
  try {
    return localStorage.getItem("tm_view") === "chart" ? "chart" : "people";
  } catch {
    return "people";
  }
};

/** The company's people, who they report to and what they can do. */
const TeamPage: React.FC = () => {
  const navigate = useNavigate();
  const company = useMemo(companyName, []);
  const [data, setData] = useState<TeamData | null>(null);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<View>(readView);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status>("active");
  const [dept, setDept] = useState("all");
  const [level, setLevel] = useState<number | "all" | "leaders">("all");
  const [unplacedOnly, setUnplacedOnly] = useState(false);
  const [drawer, setDrawer] = useState<{ open: boolean; person: TeamPerson | null }>({ open: false, person: null });
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await getTeam());
      setFailed(false);
    } catch (e) {
      setFailed(true);
      message.error(apiError(e, "Couldn't load your team"));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const pickView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem("tm_view", v);
    } catch {
      // ignore
    }
  };

  const departments = useMemo(
    () => [...new Set((data?.people || []).filter((p) => p.is_active).map((p) => (p.department || "").trim()).filter(Boolean))].sort(),
    [data],
  );

  const rows = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    return data.people
      .filter((p) => (status === "all" ? true : status === "active" ? p.is_active : !p.is_active))
      .filter((p) => dept === "all" || (p.department || "").trim() === dept)
      .filter((p) => (level === "all" ? true : level === "leaders" ? p.direct_reports > 0 : p.admin ? level === 1 : p.rank === level))
      .filter((p) => !unplacedOnly || (!p.reports_to && !p.admin && !p.platform))
      .filter((p) => !term || [p.name, p.email, p.phone, p.designation, p.department, ...p.roles.map((r) => roleLabel(r.name))].some((v) => String(v || "").toLowerCase().includes(term)))
      .sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.rank - b.rank || a.name.localeCompare(b.name));
  }, [data, q, status, dept, level, unplacedOnly]);

  const clearFilters = () => {
    setQ("");
    setStatus("active");
    setDept("all");
    setLevel("all");
    setUnplacedOnly(false);
  };

  const saved = (msg: string) => {
    setDrawer({ open: false, person: null });
    message.success({ content: msg, duration: msg.includes("password") ? 12 : 4 });
    load();
  };

  const deactivate = async (p: TeamPerson) => {
    setBusy(p.id);
    try {
      message.success((await deactivatePerson(p.id)).message);
      await load();
    } catch (e) {
      message.error(apiError(e, "Couldn't deactivate"));
    } finally {
      setBusy(null);
    }
  };
  const activate = async (p: TeamPerson) => {
    setBusy(p.id);
    try {
      message.success((await activatePerson(p.id)).message);
      await load();
    } catch (e) {
      message.error(apiError(e, "Couldn't reactivate"));
    } finally {
      setBusy(null);
    }
  };

  if (!data) {
    return (
      <div className="db-root tm-root">
        <div className="db-hero skeleton tm-hero-sk">
          {failed && (
            <div className="tm-failed">
              Couldn't load your team.
              <button type="button" className="db-btn white" onClick={load}>
                <ReloadOutlined /> Try again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const { me, stats } = data;
  const meP = data.people.find((p) => p.is_me);
  const myTeam = me.team.filter((id) => data.people.find((p) => p.id === id)?.is_active).length;
  const youLine = me.admin
    ? "You're an Admin — you manage everyone in the company"
    : me.rank < 99
      ? `You're ${levelInfo(me.rank).name.toLowerCase() === "manager" ? "a Manager" : roleLabel(meP?.roles.find((r) => r.scope !== "PLATFORM")?.name)} — you manage the ${myTeam} ${myTeam === 1 ? "person" : "people"} below you`
      : "You can see the team";
  const filtered = q || status !== "active" || dept !== "all" || level !== "all" || unplacedOnly;

  return (
    <div className="db-root tm-root">
      {/* ── Hero ── */}
      <div className="db-hero">
        <div className="db-hero-orb a" />
        <div className="db-hero-orb b" />
        <div className="db-hero-grid" />
        <div className="db-hero-inner">
          <div className="db-hero-left">
            <div className="db-hero-eyebrow">
              Team &amp; access
              <span className="db-hero-company">{company}</span>
              {me.platform && <span className="db-hero-company tm-sb">SameBook Super Admin</span>}
            </div>
            <div className="db-hero-title">
              <span className="db-hero-icon">
                <ApartmentOutlined />
              </span>
              Your team
            </div>
            <div className="db-hero-sub">Who works here, who they report to, and what each person can do.</div>
            <div className="db-hero-figure">
              <span className="db-hero-figure-label">People who can sign in</span>
              <span className="db-hero-number">{stats.active}</span>
              <span className="db-hero-figure-foot">
                <SafetyCertificateOutlined /> {youLine}
              </span>
            </div>
          </div>
          <div className="db-hero-right">
            <div className="db-hero-stats">
              <div className="db-hero-stat">
                <b>{stats.admins}</b>
                <span>{stats.admins === 1 ? "Admin" : "Admins"}</span>
              </div>
              <div className="db-hero-stat">
                <b>{stats.managers}</b>
                <span>Lead a team</span>
              </div>
              <div className="db-hero-stat">
                <b>{stats.departments}</b>
                <span>{stats.departments === 1 ? "Department" : "Departments"}</span>
              </div>
            </div>
            <div className="db-hero-btns">
              <button type="button" className="db-btn glass" onClick={() => navigate("/app/roles")}>
                <SafetyCertificateOutlined /> Roles
              </button>
              {me.can_create && (
                <button type="button" className="db-btn white" onClick={() => setDrawer({ open: true, person: null })}>
                  <UserAddOutlined /> Add person
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tiles (filters) ── */}
      <div className="db-tiles tm-tiles">
        <StatTile index={0} icon={<TeamOutlined />} label="Active" value={String(stats.active)} tint="var(--db-s1)" sub="can sign in" onClick={() => { clearFilters(); }} />
        <StatTile index={1} icon={<CrownOutlined />} label="Admins" value={String(stats.admins)} tint="var(--db-s7)" sub="top of the company" onClick={() => { clearFilters(); setLevel(1); }} />
        <StatTile index={2} icon={<UserSwitchOutlined />} label="Lead a team" value={String(stats.managers)} tint="var(--db-s3)" sub="have people reporting" onClick={() => { clearFilters(); setLevel("leaders"); }} />
        <StatTile
          index={3}
          icon={<WarningOutlined />}
          label="Not placed yet"
          value={String(stats.without_manager)}
          tint="var(--db-s4)"
          sub="no manager set"
          onClick={() => {
            clearFilters();
            setUnplacedOnly(true);
            pickView("people");
          }}
        />
        <StatTile index={4} icon={<StopOutlined />} label="Deactivated" value={String(stats.deactivated)} tint="var(--db-neutral)" sub="can't sign in" onClick={() => { clearFilters(); setStatus("deactivated"); pickView("people"); }} />
      </div>

      {/* ── Toolbar ── */}
      <div className="tm-bar">
        <div className="tm-seg" role="tablist" aria-label="View">
          <button type="button" role="tab" aria-selected={view === "people"} className={view === "people" ? "on" : ""} onClick={() => pickView("people")}>
            <UnorderedListOutlined /> People
          </button>
          <button type="button" role="tab" aria-selected={view === "chart"} className={view === "chart" ? "on" : ""} onClick={() => pickView("chart")}>
            <ApartmentOutlined /> Org chart
          </button>
        </div>
        {view === "people" && (
          <>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search name, job, email, role…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="tm-search"
              aria-label="Search people"
            />
            <Select
              value={dept}
              onChange={setDept}
              className="tm-filter"
              aria-label="Department"
              options={[{ value: "all", label: "All departments" }, ...departments.map((d) => ({ value: d, label: d }))]}
            />
            <Select
              value={level}
              onChange={setLevel}
              className="tm-filter"
              aria-label="Level"
              options={[
                { value: "all", label: "All levels" },
                { value: "leaders", label: "Lead a team" },
                ...[1, 2, 3, 4, 5].map((l) => ({ value: l, label: `Level ${l} · ${LEVELS[l].name}` })),
              ]}
            />
            <Select
              value={status}
              onChange={setStatus}
              className="tm-filter sm"
              aria-label="Status"
              options={[
                { value: "active", label: "Active" },
                { value: "deactivated", label: "Deactivated" },
                { value: "all", label: "Everyone" },
              ]}
            />
            {filtered && (
              <button type="button" className="tm-linkbtn" onClick={clearFilters}>
                Clear
              </button>
            )}
          </>
        )}
        <button type="button" className="tm-icon" onClick={load} aria-label="Refresh">
          <ReloadOutlined />
        </button>
      </div>

      {/* ── Content ── */}
      {view === "chart" ? (
        <section className="tm-card">
          <OrgChart company={company} people={data.people} onOpen={(p) => setDrawer({ open: true, person: p })} />
        </section>
      ) : (
        <section className="tm-card">
          <div className="tm-list-head" aria-hidden>
            <span>Person</span>
            <span>Role</span>
            <span>Reports to</span>
            <span>Last active</span>
            <span />
          </div>
          <ul className="tm-list">
            {rows.map((p, i) => {
              const role = p.roles.filter((r) => r.scope !== "PLATFORM");
              const tone = levelInfo(p.admin ? 1 : p.rank).tone;
              return (
                <li key={p.id} className={`tm-row${p.is_active ? "" : " off"}`} style={{ ["--i" as any]: Math.min(i, 12) }}>
                  <button type="button" className="tm-person" onClick={() => setDrawer({ open: true, person: p })}>
                    <span className="tm-avatar" style={{ ["--tone" as any]: tone }}>
                      {initialsOf(p.name)}
                    </span>
                    <span className="tm-person-text">
                      <b>
                        {p.name}
                        {p.is_me && <em className="tm-you">You</em>}
                        {p.platform && <em className="tm-chip platform">SameBook</em>}
                        {!p.is_active && <em className="tm-chip off">Deactivated</em>}
                      </b>
                      <span>{[p.designation, p.department].filter(Boolean).join(" · ") || <i className="tm-muted">No job title yet</i>}</span>
                      <span className="tm-contact">
                        <MailOutlined /> {p.email}
                        {p.phone && (
                          <>
                            <PhoneOutlined /> {p.phone}
                          </>
                        )}
                      </span>
                    </span>
                  </button>
                  <span className="tm-cell tm-roles-cell" data-label="Role">
                    {role.length ? (
                      role.map((r) => (
                        <span key={r.id} className="tm-chip" style={{ ["--tone" as any]: levelInfo(r.level).tone }} title={`Level ${r.level} · ${levelInfo(r.level).name}`}>
                          <i /> {roleLabel(r.name)}
                        </span>
                      ))
                    ) : (
                      <span className="tm-muted">No role</span>
                    )}
                    {p.direct_reports > 0 && <span className="tm-team-n">{p.team_size} in team</span>}
                  </span>
                  <span className="tm-cell" data-label="Reports to">
                    {p.manager ? (
                      <span className="tm-mgr">
                        <span className="tm-avatar xs" style={{ ["--tone" as any]: "#64748b" }}>
                          {initialsOf(p.manager.name)}
                        </span>
                        {p.manager.name}
                      </span>
                    ) : p.admin || p.platform ? (
                      <span className="tm-muted">Top of the company</span>
                    ) : (
                      <span className="tm-warn">
                        <WarningOutlined /> Not set
                      </span>
                    )}
                  </span>
                  <span className="tm-cell tm-muted" data-label="Last active">
                    {ago(p.last_login)}
                  </span>
                  <span className="tm-actions">
                    {p.can_manage && me.can_edit ? (
                      <Tooltip title="Edit details, manager and roles">
                        <button type="button" className="tm-icon" onClick={() => setDrawer({ open: true, person: p })} aria-label={`Edit ${p.name}`}>
                          <EditOutlined />
                        </button>
                      </Tooltip>
                    ) : (
                      <Tooltip title={p.why_not || "View"}>
                        <button type="button" className="tm-icon muted" onClick={() => setDrawer({ open: true, person: p })} aria-label={`View ${p.name}`}>
                          {p.is_me ? <EyeOutlined /> : <LockOutlined />}
                        </button>
                      </Tooltip>
                    )}
                    {me.can_deactivate &&
                      p.can_manage &&
                      (p.is_active ? (
                        <Popconfirm
                          title={`Deactivate ${p.first_name || p.name}?`}
                          description={
                            <span className="tm-confirm">
                              They won't be able to sign in. Their documents stay as they are.
                              {p.direct_reports > 0 && (
                                <>
                                  <br />
                                  {p.direct_reports} {p.direct_reports === 1 ? "person who reports" : "people who report"} to them will report to{" "}
                                  <b>{p.manager?.name || "no one (top level)"}</b>.
                                </>
                              )}
                            </span>
                          }
                          okText="Deactivate"
                          okButtonProps={{ danger: true }}
                          cancelText="Keep"
                          onConfirm={() => deactivate(p)}
                        >
                          <button type="button" className="tm-icon danger" disabled={busy === p.id} aria-label={`Deactivate ${p.name}`}>
                            <UserDeleteOutlined />
                          </button>
                        </Popconfirm>
                      ) : (
                        <Tooltip title="Let them sign in again">
                          <button type="button" className="tm-icon" disabled={busy === p.id} onClick={() => activate(p)} aria-label={`Reactivate ${p.name}`}>
                            <UndoOutlined />
                          </button>
                        </Tooltip>
                      ))}
                  </span>
                </li>
              );
            })}
          </ul>
          {!rows.length && (
            <div className="tm-empty">
              <TeamOutlined />
              <b>{filtered ? "Nobody matches" : "No one here yet"}</b>
              <span>{filtered ? "Try another search or clear the filters." : "Add the people who work with you."}</span>
              {filtered ? (
                <button type="button" className="tm-btn ghost" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : (
                me.can_create && (
                  <button type="button" className="tm-btn primary" onClick={() => setDrawer({ open: true, person: null })}>
                    <UserAddOutlined /> Add person
                  </button>
                )
              )}
            </div>
          )}
        </section>
      )}

      <PersonDrawer open={drawer.open} person={drawer.person} data={data} onClose={() => setDrawer({ open: false, person: null })} onSaved={saved} />
    </div>
  );
};

export default TeamPage;
