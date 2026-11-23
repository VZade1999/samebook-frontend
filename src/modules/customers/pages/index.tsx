import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input, message, Pagination, Select, Tooltip } from "antd";
import {
  ClockCircleOutlined,
  EditOutlined,
  EnvironmentOutlined,
  ExclamationCircleOutlined,
  FileDoneOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  ReloadOutlined,
  RightOutlined,
  SearchOutlined,
  ShopOutlined,
  StarOutlined,
  TeamOutlined,
  UserOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import { StatTile } from "@/modules/dashboard/components/Bits";
import "@/modules/dashboard/styles/dashboard.scss";
import { count, inr, inrCompact } from "@/modules/dashboard/utils/format";
import { useAccess } from "@/permissions/useAccess";
import { initialsOf } from "@/permissions/standing";
import { StorageService } from "@/storage";
import AddCustomerModal from "../components/AddCustomerModal";
import EditCustomerModal from "../components/EditCustomerModal";
import CustomerProfile from "../directory/CustomerProfile";
import { type CustomerType, type DirCustomer, type DirFilter, type DirSort, type Directory, apiError, getCustomer, getDirectory, removeCustomer, sinceText } from "../directory/customersApi";
import "../directory/customers.scss";

const PAGE_SIZE = 20;
const companyName = () => {
  try {
    return JSON.parse(new StorageService().getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS) || "{}")?.name || "Your company";
  } catch {
    return "Your company";
  }
};

/** Everyone you sell to: who they are, how to reach them, what they've bought and what they owe. */
const CustomerPage: React.FC = () => {
  const navigate = useNavigate();
  const { can } = useAccess();
  const company = useMemo(companyName, []);
  const [data, setData] = useState<Directory | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState<CustomerType | "">("");
  const [filter, setFilter] = useState<DirFilter>("all");
  const [state, setState] = useState("");
  const [sort, setSort] = useState<DirSort>("recent");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<DirCustomer | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const seq = useRef(0);
  const [params, setParams] = useSearchParams();

  // ?open=<id> opens that customer's profile (links from the AI Assistant and elsewhere).
  useEffect(() => {
    const id = Number(params.get("open"));
    if (!Number.isInteger(id) || id <= 0) return;
    const next = new URLSearchParams(params);
    next.delete("open");
    setParams(next, { replace: true });
    getDirectory({ id })
      .then((d) => {
        const c = d.customers?.[0];
        if (c) setOpen(c);
        else message.warning("That customer was not found");
      })
      .catch((e) => message.error(apiError(e, "Couldn't open this customer")));
  }, [params, setParams]);

  // Typing settles for a moment before searching.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchText.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchText]);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true);
    try {
      const d = await getDirectory({ search, type, filter, state, sort, page, limit: PAGE_SIZE });
      if (mine !== seq.current) return;
      setData(d);
      setFailed(false);
    } catch (e) {
      if (mine !== seq.current) return;
      setFailed(true);
      message.error(apiError(e, "Couldn't load your customers"));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [search, type, filter, state, sort, page]);
  useEffect(() => {
    load();
  }, [load]);

  const pick = (f: Partial<{ type: CustomerType | ""; filter: DirFilter; state: string; sort: DirSort }>) => {
    if (f.type !== undefined) setType(f.type);
    if (f.filter !== undefined) setFilter(f.filter);
    if (f.state !== undefined) setState(f.state);
    if (f.sort !== undefined) setSort(f.sort);
    setPage(1);
  };
  const clear = () => {
    setSearchText("");
    setSearch("");
    pick({ type: "", filter: "all", state: "", sort: "recent" });
  };

  // The Edit dialog needs the whole customer (contacts and addresses).
  const editDirect = async (c: DirCustomer) => {
    try {
      const full = await getCustomer(c.id);
      if (full?.id) setEditing(full);
    } catch (e) {
      message.error(apiError(e, "Couldn't open this customer"));
    }
  };

  const remove = async (c: DirCustomer) => {
    try {
      const r = await removeCustomer(c.id);
      message.success(r?.message || `${c.name} was deleted`);
      setOpen(null);
      load();
    } catch (e) {
      message.error(apiError(e, "Couldn't delete this customer"));
    }
  };

  if (!data) {
    return (
      <div className="db-root cu-root">
        <div className="db-hero skeleton cu-hero-sk">
          {failed && (
            <div className="cu-failed">
              Couldn't load your customers.
              <button type="button" className="db-btn white" onClick={load}>
                <ReloadOutlined /> Try again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const { stats, access } = data;
  const money = access.money;
  const collected = stats.billed_total ? ((stats.billed_total - stats.due_total) / stats.billed_total) * 100 : 0;
  const filtered = !!search || !!type || filter !== "all" || !!state || sort !== "recent";
  const canAdd = can("customers.create");
  const canEdit = can("customers.edit");
  const canDelete = can("customers.delete");
  const FILTER_LABEL: Record<DirFilter, string> = {
    all: "Everyone",
    due: "Owe you money",
    billed: "Billed",
    never: "Never billed",
    new: "New · 30 days",
    incomplete: "No phone or email",
  };

  return (
    <div className={`db-root cu-root${loading ? " refreshing" : ""}`}>
      {/* ── Hero ── */}
      <div className="db-hero">
        <div className="db-hero-orb a" />
        <div className="db-hero-orb b" />
        <div className="db-hero-grid" />
        <div className="db-hero-inner">
          <div className="db-hero-left">
            <div className="db-hero-eyebrow">
              Customers
              <span className="db-hero-company">{company}</span>
            </div>
            <div className="db-hero-title">
              <span className="db-hero-icon">
                <TeamOutlined />
              </span>
              Your customers
            </div>
            <div className="db-hero-sub">Everyone you sell to — how to reach them, what they've bought and what they owe.</div>
            <div className="db-hero-figure">
              <span className="db-hero-figure-label">Customers</span>
              <span className="db-hero-number">{count(stats.total)}</span>
              <span className="db-hero-figure-foot">
                {stats.new_30d > 0 && <span className="db-delta good ondark">+{count(stats.new_30d)} new</span>}
                <span>
                  in the last 30 days · {count(stats.billed)} billed so far
                </span>
              </span>
            </div>
          </div>
          <div className="db-hero-right">
            {money && stats.billed_total > 0 && (
              <div className="db-hero-meter">
                <div className="db-hero-meter-top">
                  <span className="db-hero-meter-label">Collected from customers</span>
                  <b>{inrCompact(stats.billed_total - stats.due_total)}</b>
                </div>
                <div className="db-hero-track" role="img" aria-label={`${Math.round(collected)}% of everything billed is collected`}>
                  <span style={{ width: `${Math.min(100, collected)}%` }} />
                </div>
                <div className="db-hero-meter-foot">
                  <span>{Math.round(collected)}% of {inrCompact(stats.billed_total)} billed</span>
                  <span>{inrCompact(stats.due_total)} still due</span>
                </div>
              </div>
            )}
            <div className="db-hero-stats">
              <div className="db-hero-stat">
                <b>{count(stats.business)}</b>
                <span>Businesses</span>
              </div>
              <div className="db-hero-stat">
                <b>{count(stats.individual)}</b>
                <span>Individuals</span>
              </div>
              <div className="db-hero-stat">
                <b>{count(stats.with_gst)}</b>
                <span>With GSTIN</span>
              </div>
            </div>
            <div className="db-hero-btns">
              {can("invoices.view") && (
                <button type="button" className="db-btn glass" onClick={() => navigate("/app/invoice")}>
                  <FileDoneOutlined /> Invoices
                </button>
              )}
              {canAdd && (
                <button type="button" className="db-btn white" onClick={() => setAdding(true)}>
                  <PlusOutlined /> Add customer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tiles (filters) ── */}
      <div className="db-tiles cu-tiles">
        <StatTile index={0} icon={<TeamOutlined />} label="All customers" value={count(stats.total)} tint="var(--db-s1)" sub={`${count(stats.with_gst)} with GSTIN`} onClick={clear} />
        <StatTile index={1} icon={<ShopOutlined />} label="Businesses" value={count(stats.business)} tint="var(--db-s7)" sub={`${count(stats.individual)} individuals`} onClick={() => pick({ type: "BUSINESS", filter: "all" })} />
        {money ? (
          <StatTile
            index={2}
            icon={<WalletOutlined />}
            label="Owe you money"
            value={count(stats.due_customers)}
            tint="var(--db-s2)"
            sub={`${inrCompact(stats.due_total)} due`}
            onClick={() => pick({ type: "", filter: "due", sort: "due" })}
          />
        ) : (
          <StatTile index={2} icon={<FileDoneOutlined />} label="Billed" value={count(stats.billed)} tint="var(--db-s2)" sub="have an invoice" onClick={() => pick({ type: "", filter: "billed" })} />
        )}
        <StatTile index={3} icon={<StarOutlined />} label="New" value={count(stats.new_30d)} tint="var(--db-s3)" sub="last 30 days" onClick={() => pick({ type: "", filter: "new", sort: "recent" })} />
        <StatTile
          index={4}
          icon={<ClockCircleOutlined />}
          label="Never billed"
          value={count(stats.never_billed)}
          tint="var(--db-s4)"
          sub="no invoice yet"
          onClick={() => pick({ type: "", filter: "never" })}
        />
        {stats.incomplete > 0 && (
          <StatTile
            index={5}
            icon={<ExclamationCircleOutlined />}
            label="No phone or email"
            value={count(stats.incomplete)}
            tint="var(--db-neutral)"
            sub="can't reach them"
            onClick={() => pick({ type: "", filter: "incomplete" })}
          />
        )}
      </div>

      {/* ── Toolbar ── */}
      <div className="cu-bar">
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search name, GSTIN, phone, contact, city…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="cu-search"
          aria-label="Search customers"
        />
        <div className="cu-seg" role="tablist" aria-label="Type">
          {([
            ["", "All"],
            ["BUSINESS", "Business"],
            ["INDIVIDUAL", "Individual"],
          ] as [CustomerType | "", string][]).map(([v, l]) => (
            <button key={l} type="button" role="tab" aria-selected={type === v} className={type === v ? "on" : ""} onClick={() => pick({ type: v })}>
              {l}
            </button>
          ))}
        </div>
        <Select
          value={filter}
          onChange={(v) => pick({ filter: v })}
          className="cu-filter"
          aria-label="Show"
          options={(["all", ...(money ? ["due"] : []), ...(access.invoices ? ["billed", "never"] : []), "new", "incomplete"] as DirFilter[]).map((f) => ({ value: f, label: FILTER_LABEL[f] }))}
        />
        <Select
          value={state}
          onChange={(v) => pick({ state: v })}
          className="cu-filter"
          aria-label="State"
          showSearch
          options={[{ value: "", label: "All states" }, ...stats.states.map((s) => ({ value: s.name, label: `${s.name} (${s.count})` }))]}
        />
        <Select
          value={sort}
          onChange={(v) => pick({ sort: v })}
          className="cu-filter"
          aria-label="Sort"
          options={[
            { value: "recent", label: "Newest first" },
            { value: "name", label: "Name A–Z" },
            { value: "activity", label: "Recently active" },
            ...(money
              ? [
                  { value: "billed", label: "Most billed" },
                  { value: "due", label: "Most due" },
                ]
              : []),
          ]}
        />
        {filtered && (
          <button type="button" className="cu-link" onClick={clear}>
            Clear
          </button>
        )}
        <span className="cu-count">
          {count(data.pagination.total)} of {count(stats.total)}
        </span>
      </div>

      {/* ── List ── */}
      <section className="cu-card">
        <div className="cu-list-head" aria-hidden>
          <span>Customer</span>
          <span>Contact</span>
          <span>Place</span>
          <span>{money ? "Billed · due" : "Documents"}</span>
          <span>Last activity</span>
          <span />
        </div>
        <ul className="cu-list">
          {data.customers.map((c, i) => {
            const business = c.type === "BUSINESS";
            const phone = c.contact?.phone || c.phone;
            const email = c.contact?.email || c.email;
            return (
              <li key={c.id} className="cu-row" style={{ ["--i" as any]: Math.min(i, 12) }}>
                <button type="button" className="cu-person" onClick={() => setOpen(c)}>
                  <span className={`cu-avatar ${business ? "biz" : "ind"}`}>{business ? <ShopOutlined /> : initialsOf(c.name)}</span>
                  <span className="cu-person-text">
                    <b>{c.name}</b>
                    <span>
                      <i className={`cu-type ${business ? "biz" : "ind"}`}>{business ? "Business" : "Individual"}</i>
                      {c.gst_number ? <span className="cu-mono">{c.gst_number}</span> : c.company_name && c.company_name !== c.name ? c.company_name : null}
                    </span>
                  </span>
                </button>
                <span className="cu-cell cu-contact-cell" data-label="Contact">
                  {c.contact || phone || email ? (
                    <>
                      <b>{c.contact?.name || c.name}</b>
                      {phone && (
                        <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="cu-sub-link" onClick={(e) => e.stopPropagation()}>
                          <PhoneOutlined /> {phone}
                        </a>
                      )}
                      {!phone && email && (
                        <a href={`mailto:${email}`} className="cu-sub-link" onClick={(e) => e.stopPropagation()}>
                          <MailOutlined /> {email}
                        </a>
                      )}
                    </>
                  ) : (
                    <span className="cu-warn">
                      <ExclamationCircleOutlined /> No phone or email
                    </span>
                  )}
                </span>
                <span className="cu-cell" data-label="Place">
                  {c.city || c.state ? (
                    <span className="cu-place">
                      <EnvironmentOutlined /> {[c.city, c.state].filter(Boolean).join(", ")}
                    </span>
                  ) : (
                    <span className="cu-muted">—</span>
                  )}
                </span>
                <span className="cu-cell cu-money" data-label={money ? "Billed" : "Documents"}>
                  {money ? (
                    c.invoices ? (
                      <>
                        <b>{inr(c.billed)}</b>
                        {c.due > 0 ? <span className="cu-due">{inr(c.due)} due</span> : <span className="cu-paid">All paid</span>}
                      </>
                    ) : (
                      <span className="cu-muted">{c.quotations ? `${c.quotations} quotation${c.quotations === 1 ? "" : "s"}` : "Not billed yet"}</span>
                    )
                  ) : (
                    <span className="cu-muted">
                      {[access.quotations ? `${c.quotations} qt` : null, access.invoices ? `${c.invoices} inv` : null].filter(Boolean).join(" · ") || "—"}
                    </span>
                  )}
                </span>
                <span className="cu-cell cu-muted" data-label="Last activity">
                  {sinceText(c.last_activity)}
                </span>
                <span className="cu-actions">
                  {canEdit && (
                    <Tooltip title="Edit">
                      <button type="button" className="cu-icon" onClick={() => editDirect(c)} aria-label={`Edit ${c.name}`}>
                        <EditOutlined />
                      </button>
                    </Tooltip>
                  )}
                  <button type="button" className="cu-icon" onClick={() => setOpen(c)} aria-label={`Open ${c.name}`}>
                    <RightOutlined />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
        {!data.customers.length && (
          <div className="cu-empty">
            <UserOutlined />
            <b>{filtered ? "Nobody matches" : "No customers yet"}</b>
            <span>{filtered ? "Try another search or clear the filters." : "Add the people and businesses you sell to."}</span>
            {filtered ? (
              <button type="button" className="cu-btn ghost" onClick={clear}>
                Clear filters
              </button>
            ) : (
              canAdd && (
                <button type="button" className="cu-btn primary" onClick={() => setAdding(true)}>
                  <PlusOutlined /> Add customer
                </button>
              )
            )}
          </div>
        )}
        {data.pagination.pages > 1 && (
          <div className="cu-pages">
            <Pagination
              current={data.pagination.page}
              pageSize={data.pagination.limit}
              total={data.pagination.total}
              onChange={(p) => {
                setPage(p);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              showSizeChanger={false}
              size="small"
            />
          </div>
        )}
      </section>

      {canAdd && (
        <button type="button" className="cu-fab" onClick={() => setAdding(true)} aria-label="Add customer">
          <PlusOutlined />
        </button>
      )}

      <CustomerProfile
        customer={open}
        can={{ edit: canEdit, remove: canDelete, quote: can("quotations.create") }}
        onClose={() => setOpen(null)}
        onEdit={(full) => setEditing(full)}
        onDelete={remove}
      />
      <AddCustomerModal
        open={adding}
        onClose={() => {
          setAdding(false);
          load();
        }}
      />
      <EditCustomerModal
        open={!!editing}
        customer={editing}
        onClose={() => {
          setEditing(null);
          // Re-open the profile with fresh details.
          const again = open;
          setOpen(null);
          load().then(() => again && setOpen({ ...again }));
        }}
      />
    </div>
  );
};

export default CustomerPage;
