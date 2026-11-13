import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Drawer, Dropdown, InputNumber, Modal, Popover, Select, Spin, Tooltip, message } from "antd";
import {
  CheckOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  ExclamationCircleFilled,
  FileAddOutlined,
  FileTextOutlined,
  FireFilled,
  MailOutlined,
  MoreOutlined,
  PhoneOutlined,
  ReloadOutlined,
  ShopOutlined,
  TrophyFilled,
  UserOutlined,
  WhatsAppOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { inr } from "@/modules/dashboard/utils/format";
import { crmService } from "../services/crmService";
import {
  CrmMeta,
  LeadDetail,
  LogType,
  RATINGS,
  STAGE,
  STAGES,
  StageKey,
  ago,
  emitCrmChanged,
  errText,
  greetingFor,
  isOpen,
  overdueBy,
  prettyPhone,
  telHref,
  whatsappHref,
  whenLabel,
} from "../constants";
import { Avatar, KeyChip, SourceChip, StagePill } from "./Bits";
import ActivityComposer from "./ActivityComposer";
import ConvertModal from "./ConvertModal";
import FollowUpPicker from "./FollowUpPicker";
import LeadFormModal from "./LeadFormModal";
import StageModal from "./StageModal";
import Timeline from "./Timeline";
import { companyName } from "./CrmShell";

interface Props {
  leadId: number | null;
  meta: CrmMeta | null;
  /** Open the composer on this activity type (e.g. from the follow-ups agenda). */
  focus?: LogType | null;
  onClose: () => void;
  onChanged?: (lead: LeadDetail | null, removedId?: number) => void;
  onOpenLead?: (id: number) => void;
}

const copy = async (text: string, what: string) => {
  try {
    await navigator.clipboard.writeText(text);
    message.success(`${what} copied`);
  } catch {
    message.error("Couldn't copy");
  }
};

const QUOTE_STATUS: Record<string, { label: string; tone: string }> = {
  DRAFT: { label: "Draft", tone: "muted" },
  SENT: { label: "Sent", tone: "info" },
  APPROVED: { label: "Approved", tone: "good" },
  PARTIALLY_DISPATCHED: { label: "Dispatching", tone: "good" },
};

const LeadDrawer: React.FC<Props> = ({ leadId, meta, focus, onClose, onChanged, onOpenLead }) => {
  const navigate = useNavigate();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [stageTarget, setStageTarget] = useState<{ lead: LeadDetail; stage: "WON" | "LOST" } | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);
  const [composerType, setComposerType] = useState<LogType>("CALL");
  const [fuOpen, setFuOpen] = useState(false);
  const [fuValue, setFuValue] = useState<string | null | undefined>(undefined);
  const [raw, setRaw] = useState<{ title: string; data: any } | null>(null);
  const [showFullMsg, setShowFullMsg] = useState(false);
  const composerRef = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);
  const company = useMemo(companyName, []);
  const people = useMemo(() => new Map((meta?.users || []).map((u) => [u.id, u.name])), [meta]);

  const load = useCallback(
    async (id: number) => {
      const my = ++reqId.current;
      setLoading(true);
      try {
        const r = await crmService.get(id);
        if (my === reqId.current) setLead(r.data.data as LeadDetail);
      } catch (err: any) {
        if (my !== reqId.current) return;
        message.error(errText(err, "Couldn't open the lead"));
        if (err?.response?.status === 404) onClose();
      } finally {
        if (my === reqId.current) setLoading(false);
      }
    },
    [onClose],
  );

  useEffect(() => {
    setShowFullMsg(false);
    if (leadId) {
      setLead((l) => (l && l.id === leadId ? l : null));
      load(leadId);
    } else setLead(null);
  }, [leadId, load]);

  useEffect(() => {
    if (focus) {
      setComposerType(focus);
      setTimeout(() => composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 350);
    }
  }, [focus, leadId]);

  const apply = (l: LeadDetail) => {
    setLead(l);
    onChanged?.(l);
  };

  const act = async (key: string, fn: () => Promise<any>, ok?: string) => {
    if (!lead) return;
    setBusy(key);
    try {
      const r = await fn();
      if (r?.data?.data) apply(r.data.data as LeadDetail);
      emitCrmChanged();
      if (ok) message.success(ok);
    } catch (err) {
      message.error(errText(err, "Something went wrong"));
    } finally {
      setBusy(null);
    }
  };

  const moveTo = (s: StageKey) => {
    if (!lead || s === lead.stage || !lead.can.work) return;
    if (s === "WON" || s === "LOST") {
      setStageTarget({ lead, stage: s });
      return;
    }
    const reopening = !isOpen(lead.stage);
    const run = () => act("stage", () => crmService.stage(lead.id, { stage: s }), `Moved to ${STAGE[s].label}`);
    if (reopening) {
      Modal.confirm({
        title: `Reopen ${lead.key}?`,
        content: `It will move back to ${STAGE[s].label} and show up in follow-ups again.`,
        okText: "Reopen",
        onOk: run,
      });
    } else run();
  };

  const saveFollowUp = (value: string | null) =>
    act("fu", () => crmService.followUp(lead!.id, value), value ? `Follow-up set for ${whenLabel(value)}` : "Follow-up cleared").then(() => {
      setFuOpen(false);
      setFuValue(undefined);
    });

  const remove = () => {
    if (!lead) return;
    Modal.confirm({
      title: `Delete ${lead.key}?`,
      icon: <ExclamationCircleFilled />,
      content: "The lead and its history will be removed from the CRM. This can't be undone.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await crmService.remove(lead.id);
          message.success(`${lead.key} deleted`);
          emitCrmChanged();
          onChanged?.(null, lead.id);
          onClose();
        } catch (err) {
          message.error(errText(err, "Couldn't delete"));
        }
      },
    });
  };

  const openRaw = async (enquiryId: number, title: string) => {
    if (!lead) return;
    try {
      const r = await crmService.raw(lead.id, enquiryId);
      setRaw({ title, data: r.data.data });
    } catch (err) {
      message.error(errText(err, "Couldn't load the original data"));
    }
  };

  const newQuotation = (customerId: number) => {
    const back = encodeURIComponent(`/app/crm/leads?lead=${lead!.id}`);
    navigate(`/app/quotation?new=1&customer=${customerId}&returnTo=${back}`);
  };

  const l = lead;
  const closed = l ? !isOpen(l.stage) : false;
  const rank = l ? (l.stage === "LOST" ? -1 : STAGES.findIndex((s) => s.key === l.stage)) : -1;
  const waText = l ? greetingFor(l, company) : "";
  const place = l ? [l.city, l.state].filter(Boolean).join(", ") : "";
  const ownerOptions = [
    { value: 0, label: "Unassigned" },
    ...(meta?.users || []).map((u) => ({ value: u.id, label: u.id === meta?.me ? `${u.name} (me)` : u.name })),
  ];
  const deals = l?.deals;

  return (
    <Drawer
      open={!!leadId}
      onClose={onClose}
      size="min(1040px, 100vw)"
      closable={false}
      title={null}
      rootClassName="crm-portal"
      className="crm-drawer"
      destroyOnHidden
    >
      {!l ? (
        <div className="crm-center tall">
          <Spin />
        </div>
      ) : (
        <div className={`crm-lead${loading ? " refreshing" : ""}`}>
          <header className="crm-dhead" style={{ ["--stage" as any]: STAGE[l.stage]?.color }}>
            <div className="crm-dhead-top">
              <Avatar name={l.name} seed={l.id} size={54} ring={l.rating ? RATINGS.find((r) => r.key === l.rating)?.color : undefined} />
              <div className="crm-dhead-id">
                <div className="crm-dhead-eyebrow">
                  <KeyChip k={l.key} />
                  <SourceChip source={l.source} detail={[l.source_detail, l.integration?.name].filter(Boolean).join(" · ")} />
                  <Tooltip title={dayjs(l.received_at || l.created_at).format("D MMM YYYY, h:mm A")}>
                    <span className="crm-dhead-when">received {ago(l.received_at || l.created_at)}</span>
                  </Tooltip>
                  {l.enquiry_count > 1 && <span className="crm-badge hot">Enquired {l.enquiry_count}×</span>}
                </div>
                <h2>{l.name}</h2>
                <div className="crm-dhead-sub">
                  {l.company_name && (
                    <span>
                      <ShopOutlined /> {l.company_name}
                    </span>
                  )}
                  {place && (
                    <span>
                      <EnvironmentOutlined /> {place}
                    </span>
                  )}
                  {l.requirement && (
                    <span className="crm-dhead-req">
                      <FireFilled /> {l.requirement}
                    </span>
                  )}
                </div>
              </div>
              <div className="crm-dhead-actions">
                {loading && <Spin size="small" />}
                {l.can.work && (
                  <Tooltip title="Edit details">
                    <button className="crm-icon-btn" onClick={() => setEditOpen(true)} aria-label="Edit details">
                      <EditOutlined />
                    </button>
                  </Tooltip>
                )}
                {l.can.delete && (
                  <Dropdown
                    trigger={["click"]}
                    menu={{ items: [{ key: "del", danger: true, icon: <DeleteOutlined />, label: "Delete lead", onClick: remove }] }}
                  >
                    <button className="crm-icon-btn" aria-label="More actions">
                      <MoreOutlined />
                    </button>
                  </Dropdown>
                )}
                <button className="crm-icon-btn" onClick={onClose} aria-label="Close">
                  <CloseOutlined />
                </button>
              </div>
            </div>

            <div className="crm-quick">
              {l.phone && (
                <a className="crm-qbtn call" href={telHref(l.phone)}>
                  <PhoneOutlined /> Call <span>{prettyPhone(l.phone)}</span>
                </a>
              )}
              {l.phone && (
                <a className="crm-qbtn wa" href={whatsappHref(l.phone, waText)} target="_blank" rel="noreferrer">
                  <WhatsAppOutlined /> WhatsApp
                </a>
              )}
              {l.email && (
                <a className="crm-qbtn mail" href={`mailto:${l.email}?subject=${encodeURIComponent(`Your enquiry${l.requirement ? `: ${l.requirement}` : ""}`)}`}>
                  <MailOutlined /> Email
                </a>
              )}
              {l.phone && (
                <button className="crm-qbtn plain" onClick={() => copy(l.phone!, "Number")}>
                  <CopyOutlined /> Copy number
                </button>
              )}
            </div>

            <ol className={`crm-stepper${closed ? " closed" : ""}`} aria-label="Pipeline stage">
              {STAGES.filter((s) => s.key !== "LOST").map((s, i) => {
                const state =
                  l.stage === "LOST" ? "off" : s.key === l.stage ? "current" : i < rank ? "done" : "todo";
                return (
                  <li key={s.key} className={state} style={{ ["--c" as any]: s.color }}>
                    <Tooltip title={s.hint}>
                      <button disabled={!l.can.work || busy === "stage"} onClick={() => moveTo(s.key)} aria-current={state === "current" ? "step" : undefined}>
                        <span className="crm-step-dot">{state === "done" ? <CheckOutlined /> : s.key === "WON" ? <TrophyFilled /> : i + 1}</span>
                        <span className="crm-step-label">{s.label}</span>
                      </button>
                    </Tooltip>
                  </li>
                );
              })}
              <li className={`lost${l.stage === "LOST" ? " current" : ""}`} style={{ ["--c" as any]: STAGE.LOST.color }}>
                <Tooltip title={STAGE.LOST.hint}>
                  <button disabled={!l.can.work || busy === "stage"} onClick={() => moveTo("LOST")}>
                    <span className="crm-step-dot">
                      <CloseOutlined />
                    </span>
                    <span className="crm-step-label">Lost</span>
                  </button>
                </Tooltip>
              </li>
            </ol>
          </header>

          <div className="crm-dbody">
            <div className="crm-dmain">
              {deals?.suggest_won && (
                <div className="crm-banner good">
                  <TrophyFilled />
                  <span>
                    {deals.suggest_won.number ? <b>{deals.suggest_won.number}</b> : "A quotation"} was approved. Mark this lead as won?
                  </span>
                  {l.can.work && (
                    <button className="crm-btn sm good" onClick={() => setStageTarget({ lead: l, stage: "WON" })}>
                      Mark won
                    </button>
                  )}
                </div>
              )}
              {l.can.claim && (
                <div className="crm-banner info">
                  <UserOutlined />
                  <span>Nobody owns this lead yet. Take it so the team knows you're on it.</span>
                  <button className="crm-btn sm primary" disabled={busy === "claim"} onClick={() => act("claim", () => crmService.claim(l.id), "It's yours")}>
                    Take this lead
                  </button>
                </div>
              )}
              {closed && (
                <div className={`crm-banner ${l.stage === "WON" ? "good" : "bad"}`}>
                  {l.stage === "WON" ? <TrophyFilled /> : <CloseOutlined />}
                  <span>
                    {l.stage === "WON" ? (
                      <>
                        Won {ago(l.won_at)}
                        {l.estimated_value ? <> · <b>{inr(l.estimated_value)}</b></> : null}
                      </>
                    ) : (
                      <>
                        Lost {ago(l.lost_at)}
                        {l.lost_reason ? <> · {l.lost_reason}</> : null}
                      </>
                    )}
                  </span>
                  {l.can.work && (
                    <button className="crm-btn sm ghost" onClick={() => moveTo("NEW")}>
                      <ReloadOutlined /> Reopen
                    </button>
                  )}
                </div>
              )}

              {!closed && (
                <section className={`crm-fucard ${(l.follow_up_state || "none").toLowerCase()}`}>
                  <span className="crm-fucard-icon">
                    <ClockCircleOutlined />
                  </span>
                  <div className="crm-fucard-body">
                    <small>Next follow-up</small>
                    {l.next_follow_up_at ? (
                      <>
                        <b>{whenLabel(l.next_follow_up_at)}</b>
                        <span className="crm-fucard-state">
                          {l.follow_up_state === "OVERDUE"
                            ? `Overdue by ${overdueBy(l.next_follow_up_at)}`
                            : l.follow_up_state === "TODAY"
                              ? "Due today"
                              : `In ${dayjs(l.next_follow_up_at).fromNow(true)}`}
                        </span>
                        {l.follow_up_note && <p>{l.follow_up_note}</p>}
                      </>
                    ) : (
                      <>
                        <b>No next step planned</b>
                        <p>Leads without a follow-up date are the ones that get forgotten.</p>
                      </>
                    )}
                  </div>
                  {l.can.work && (
                    <div className="crm-fucard-actions">
                      {l.next_follow_up_at && (
                        <button
                          className="crm-btn sm primary"
                          onClick={() => composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
                        >
                          <CheckOutlined /> Done — log it
                        </button>
                      )}
                      <Popover
                        open={fuOpen}
                        onOpenChange={(o) => {
                          setFuOpen(o);
                          if (o) setFuValue(l.next_follow_up_at || undefined);
                        }}
                        trigger="click"
                        placement="bottomRight"
                        content={
                          <div className="crm-fu-pop">
                            <FollowUpPicker value={fuValue} onChange={setFuValue} size="sm" />
                            <div className="crm-fu-pop-foot">
                              {l.next_follow_up_at && (
                                <button className="crm-btn sm ghost" onClick={() => saveFollowUp(null)}>
                                  Clear
                                </button>
                              )}
                              <button className="crm-btn sm primary" disabled={!fuValue || busy === "fu"} onClick={() => fuValue && saveFollowUp(fuValue)}>
                                Save
                              </button>
                            </div>
                          </div>
                        }
                      >
                        <button className="crm-btn sm ghost">
                          <ClockCircleOutlined /> {l.next_follow_up_at ? "Reschedule" : "Plan follow-up"}
                        </button>
                      </Popover>
                    </div>
                  )}
                </section>
              )}

              {l.can.work && (
                <section className="crm-panel" ref={composerRef}>
                  <header className="crm-panel-head">
                    <h4>Log what happened</h4>
                  </header>
                  <ActivityComposer
                    lead={l}
                    initialType={composerType}
                    onLogged={apply}
                    onSuggestLost={() =>
                      Modal.confirm({
                        title: "Mark this lead as lost?",
                        content: "They said they're not interested.",
                        okText: "Mark as lost",
                        onOk: () => setStageTarget({ lead: l, stage: "LOST" }),
                      })
                    }
                  />
                </section>
              )}

              <section className="crm-panel">
                <header className="crm-panel-head">
                  <h4>Timeline</h4>
                  <span className="crm-muted">{l.activities.length} entries</span>
                </header>
                <Timeline items={l.activities} people={people} showMoney={!!meta?.can.quotations_view} />
              </section>
            </div>

            <aside className="crm-dside">
              <section className="crm-panel deal">
                <header className="crm-panel-head">
                  <h4>Deal</h4>
                  <StagePill stage={l.stage} small />
                </header>
                <div className="crm-deal-value">
                  <small>Expected value</small>
                  {l.can.work ? (
                    <InputNumber
                      key={`${l.id}:${l.estimated_value ?? ""}`}
                      className="crm-value-input"
                      variant="borderless"
                      min={0}
                      max={999999999999}
                      defaultValue={l.estimated_value ?? undefined}
                      placeholder="Add value"
                      prefix="₹"
                      formatter={(v) => (v ? Number(v).toLocaleString("en-IN") : "")}
                      parser={(v) => Number(String(v || "").replace(/[^\d.]/g, "")) as any}
                      onBlur={(e) => {
                        const raw = String((e.target as HTMLInputElement).value || "").replace(/[^\d.]/g, "");
                        const v = raw ? Number(raw) : null;
                        if ((v ?? null) !== (l.estimated_value ?? null)) act("value", () => crmService.update(l.id, { estimated_value: v }), "Value saved");
                      }}
                      onPressEnter={(e) => (e.target as HTMLInputElement).blur()}
                    />
                  ) : (
                    <b>{l.estimated_value !== null ? inr(l.estimated_value) : "—"}</b>
                  )}
                </div>

                {l.customer ? (
                  <div className="crm-deal-customer">
                    <span className="crm-deal-cust-icon">
                      <ShopOutlined />
                    </span>
                    <div>
                      <small>Customer</small>
                      <b>{l.customer.name}</b>
                    </div>
                  </div>
                ) : null}

                {deals && deals.visible && deals.quotations.length > 0 && (
                  <ul className="crm-quotes">
                    {deals.quotations.map((q) => (
                      <li key={q.id}>
                        <FileTextOutlined />
                        <span className="crm-quote-no">{q.number}</span>
                        <span className={`crm-qstatus ${q.has_invoice ? "good" : QUOTE_STATUS[q.status]?.tone || "muted"}`}>
                          {q.has_invoice ? "Invoiced" : QUOTE_STATUS[q.status]?.label || q.status}
                        </span>
                        <b>{inr(q.total)}</b>
                      </li>
                    ))}
                  </ul>
                )}
                {deals && !deals.visible && deals.count > 0 && (
                  <p className="crm-hint">{deals.count} quotation{deals.count === 1 ? "" : "s"} made for this customer.</p>
                )}

                {l.customer ? (
                  meta?.can.quotations_create &&
                  !closed && (
                    <button className="crm-btn primary block" onClick={() => newQuotation(l.customer!.id)}>
                      <FileAddOutlined /> {deals && deals.count ? "Another quotation" : "Create quotation"}
                    </button>
                  )
                ) : (
                  l.can.work &&
                  (meta?.can.customers_view || meta?.can.customers_create) && (
                    <>
                      <button className="crm-btn primary block" onClick={() => setConvertOpen(true)}>
                        <FileAddOutlined /> {meta?.can.quotations_create ? "Create quotation" : "Make customer"}
                      </button>
                      <p className="crm-hint center">Links or creates the customer, then opens a quotation with their details filled in.</p>
                    </>
                  )
                )}
              </section>

              <section className="crm-panel">
                <header className="crm-panel-head">
                  <h4>Owner &amp; priority</h4>
                </header>
                <div className="crm-owner">
                  {l.can.assign ? (
                    <Select
                      className="crm-owner-select"
                      value={l.owner?.id ?? 0}
                      options={ownerOptions}
                      showSearch
                      optionFilterProp="label"
                      loading={busy === "assign"}
                      onChange={(v) => act("assign", () => crmService.assign(l.id, v ? Number(v) : null), "Owner updated")}
                    />
                  ) : (
                    <div className="crm-owner-view">
                      {l.owner ? <Avatar name={l.owner.name} seed={l.owner.id} size={30} /> : <span className="crm-avatar empty"><UserOutlined /></span>}
                      <div>
                        <b>{l.owner?.name || "Unassigned"}</b>
                        <small>{l.owner?.id === meta?.me ? "You own this lead" : l.owner ? "Owner" : "Anyone in sales can take it"}</small>
                      </div>
                    </div>
                  )}
                </div>
                <div className="crm-rating-pick" role="radiogroup" aria-label="Rating">
                  {RATINGS.map((r) => (
                    <Tooltip key={r.key} title={r.hint}>
                      <button
                        role="radio"
                        aria-checked={l.rating === r.key}
                        disabled={!l.can.work}
                        className={`crm-rate-btn${l.rating === r.key ? " on" : ""}`}
                        style={{ ["--c" as any]: r.color }}
                        onClick={() => act("rating", () => crmService.update(l.id, { rating: l.rating === r.key ? null : r.key }))}
                      >
                        <FireFilled /> {r.label}
                      </button>
                    </Tooltip>
                  ))}
                </div>
              </section>

              <section className="crm-panel">
                <header className="crm-panel-head">
                  <h4>Contact</h4>
                  {l.can.work && (
                    <button className="crm-link" onClick={() => setEditOpen(true)}>
                      Edit
                    </button>
                  )}
                </header>
                <dl className="crm-kv">
                  {[
                    ["Mobile", l.phone ? prettyPhone(l.phone) : null, l.phone],
                    ["Other phone", l.alt_phone ? prettyPhone(l.alt_phone) : null, l.alt_phone],
                    ["Email", l.email, l.email],
                    ["Company", l.company_name, null],
                    ["GSTIN", l.gst_number, l.gst_number],
                    ["Address", [l.address, [l.city, l.state].filter(Boolean).join(", "), l.pincode].filter(Boolean).join(" · ") || null, null],
                  ]
                    .filter(([, v]) => v)
                    .map(([k, v, c]) => (
                      <div key={k as string}>
                        <dt>{k}</dt>
                        <dd>
                          <span>{v}</span>
                          {c && (
                            <button className="crm-copy" onClick={() => copy(c as string, k as string)} aria-label={`Copy ${k}`}>
                              <CopyOutlined />
                            </button>
                          )}
                        </dd>
                      </div>
                    ))}
                </dl>
              </section>

              <section className="crm-panel">
                <header className="crm-panel-head">
                  <h4>Enquiry</h4>
                  {l.enquiries.length > 0 && <span className="crm-muted">{l.enquiries.length} received</span>}
                </header>
                {l.requirement && <div className="crm-need">{l.requirement}</div>}
                {l.message ? (
                  <p className={`crm-msg${showFullMsg ? " full" : ""}`}>
                    {l.message}
                  </p>
                ) : (
                  !l.requirement && <p className="crm-muted">No details given.</p>
                )}
                {l.message && l.message.length > 240 && (
                  <button className="crm-link" onClick={() => setShowFullMsg((v) => !v)}>
                    {showFullMsg ? "Show less" : "Show all"}
                  </button>
                )}
                {l.enquiries.length > 0 && (
                  <ul className="crm-enquiries">
                    {l.enquiries.map((e) => (
                      <li key={e.id}>
                        <SourceChip source={e.source} compact />
                        <div>
                          <b>{e.subject || e.source_detail || "Enquiry"}</b>
                          <small>
                            {[e.source_detail, e.integration?.name, dayjs(e.received_at).format("D MMM, h:mm A")].filter(Boolean).join(" · ")}
                          </small>
                        </div>
                        {e.has_raw && (
                          <button className="crm-link" onClick={() => openRaw(e.id, `${e.subject || "Enquiry"} — original data`)}>
                            Original
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {l.related.length > 0 && (
                <section className="crm-panel">
                  <header className="crm-panel-head">
                    <h4>Same person, other leads</h4>
                  </header>
                  <ul className="crm-related">
                    {l.related.map((r) => (
                      <li key={r.id}>
                        <KeyChip k={r.key} />
                        <StagePill stage={r.stage} small />
                        <span className="crm-related-meta">
                          {r.owner?.name || "Unassigned"} · {dayjs(r.created_at).format("D MMM YYYY")}
                        </span>
                        {r.visible && onOpenLead && (
                          <button className="crm-link" onClick={() => onOpenLead(r.id)}>
                            Open
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <p className="crm-footnote">
                Added {dayjs(l.created_at).format("D MMM YYYY, h:mm A")}
                {l.creator ? ` by ${l.creator.name}` : " automatically"}
                {l.first_response_at ? ` · first response ${dayjs(l.first_response_at).from(dayjs(l.created_at), true)} later` : ""}
              </p>
            </aside>
          </div>
        </div>
      )}

      <LeadFormModal
        open={editOpen}
        meta={meta}
        lead={l}
        onClose={() => setEditOpen(false)}
        onSaved={(x) => {
          setEditOpen(false);
          apply(x);
        }}
        onOpenLead={onOpenLead}
      />
      <StageModal
        target={stageTarget}
        onClose={() => setStageTarget(null)}
        onDone={(x) => {
          setStageTarget(null);
          apply(x);
        }}
      />
      <ConvertModal
        open={convertOpen}
        lead={l}
        meta={meta}
        onClose={() => setConvertOpen(false)}
        onConverted={(x) => {
          setConvertOpen(false);
          apply(x);
        }}
      />
      <Modal open={!!raw} onCancel={() => setRaw(null)} footer={null} width={640} title={raw?.title} className="crm-modal">
        <pre className="crm-code">{raw ? JSON.stringify(raw.data, null, 2) : ""}</pre>
      </Modal>
    </Drawer>
  );
};

export default LeadDrawer;
