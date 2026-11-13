import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input, Select, Spin, Table, message } from "antd";
import {
  ApiOutlined,
  AppstoreOutlined,
  CloseOutlined,
  FunnelPlotOutlined,
  PlusOutlined,
  SearchOutlined,
  UnorderedListOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import { crmService } from "../services/crmService";
import {
  CRM_CHANGED_EVENT,
  Lead,
  LeadDetail,
  RATINGS,
  SOURCES,
  STAGES,
  StageKey,
  ago,
  emitCrmChanged,
  errText,
} from "../constants";
import { useAutoSync, useCrmMeta, useCrmSummary } from "../hooks";
import CrmShell from "../components/CrmShell";
import LeadBoard, { BoardColumn } from "../components/LeadBoard";
import LeadDrawer from "../components/LeadDrawer";
import LeadFormModal from "../components/LeadFormModal";
import ImportModal from "../components/ImportModal";
import StageModal from "../components/StageModal";
import { Avatar, EmptyState, FollowUpChip, KeyChip, Money, RatingBadge, SourceChip, StagePill } from "../components/Bits";

const VIEW_KEY = "crm_leads_view";
const readView = (): "board" | "list" => {
  try {
    return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "board";
  } catch {
    return "board";
  }
};

const FOLLOW_UPS = [
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due today" },
  { value: "due", label: "Overdue + today" },
  { value: "upcoming", label: "Later" },
  { value: "none", label: "No follow-up" },
];
const STATUSES = [
  { value: "open", label: "Open" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "all", label: "All" },
];
const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "follow_up", label: "Follow-up date" },
  { value: "value", label: "Highest value" },
  { value: "updated", label: "Recently updated" },
  { value: "oldest", label: "Oldest first" },
];

const LeadsPage: React.FC = () => {
  const navigate = useNavigate();
  const meta = useCrmMeta();
  const { summary } = useCrmSummary();
  useAutoSync();
  const [params, setParams] = useSearchParams();
  const [view, setViewState] = useState<"board" | "list">(readView);
  const [qInput, setQInput] = useState(params.get("q") || "");
  const [columns, setColumns] = useState<BoardColumn[] | null>(null);
  const [rows, setRows] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [stageTarget, setStageTarget] = useState<{ lead: Lead; stage: "WON" | "LOST" } | null>(null);
  const req = useRef(0);

  const scope = params.get("scope") || "all";
  const source = params.get("source") || "";
  const owner = params.get("owner_id") || "";
  const rating = params.get("rating") || "";
  const followUp = params.get("follow_up") || "";
  const status = params.get("status") || "open";
  const sort = params.get("sort") || "newest";
  const stage = params.get("stage") || "";
  const q = params.get("q") || "";
  const page = Number(params.get("page") || 1);
  const leadId = Number(params.get("lead")) || null;

  const setParam = useCallback(
    (patch: Record<string, string | null>) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          Object.entries(patch).forEach(([k, v]) => (v === null || v === "" ? p.delete(k) : p.set(k, v)));
          if (!("page" in patch) && !("lead" in patch)) p.delete("page");
          return p;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const setView = (v: "board" | "list") => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      // ignore
    }
  };

  // Debounced search box → URL.
  useEffect(() => {
    const t = setTimeout(() => qInput !== q && setParam({ q: qInput.trim() || null }), 350);
    return () => clearTimeout(t);
  }, [qInput, q, setParam]);

  const filters = useMemo(
    () => ({
      scope: scope === "all" ? undefined : scope,
      source: source || undefined,
      owner_id: owner || undefined,
      rating: rating || undefined,
      follow_up: followUp || undefined,
      q: q || undefined,
    }),
    [scope, source, owner, rating, followUp, q],
  );

  const load = useCallback(async () => {
    const my = ++req.current;
    setLoading(true);
    try {
      if (view === "board") {
        const r = await crmService.pipeline({ ...filters, stage: stage || undefined });
        if (my === req.current) setColumns(r.data.data.columns as BoardColumn[]);
      } else {
        const r = await crmService.list({ ...filters, status, sort, stage: stage || undefined, page, limit: 25 });
        if (my === req.current) {
          setRows(r.data.data.rows);
          setTotal(r.data.data.pagination.total);
        }
      }
    } catch (err) {
      if (my === req.current) message.error(errText(err, "Couldn't load leads"));
    } finally {
      if (my === req.current) setLoading(false);
    }
  }, [view, filters, status, sort, stage, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let t: any;
    const onChange = () => {
      clearTimeout(t);
      t = setTimeout(load, 250);
    };
    window.addEventListener(CRM_CHANGED_EVENT, onChange);
    return () => {
      clearTimeout(t);
      window.removeEventListener(CRM_CHANGED_EVENT, onChange);
    };
  }, [load]);

  const openLead = (id: number) => setParam({ lead: String(id) });
  const closeLead = useCallback(() => setParam({ lead: null }), [setParam]);

  // Keep the board in step with changes made in the drawer, without a reload flash.
  const onLeadChanged = (l: LeadDetail | null, removedId?: number) => {
    if (removedId) {
      setColumns((cols) => cols && cols.map((c) => ({ ...c, items: c.items.filter((x) => x.id !== removedId) })));
      setRows((rs) => rs.filter((x) => x.id !== removedId));
      return;
    }
    if (!l) return;
    setRows((rs) => rs.map((x) => (x.id === l.id ? { ...x, ...l } : x)));
  };

  const move = async (lead: Lead, to: StageKey) => {
    if (to === "WON" || to === "LOST") {
      setStageTarget({ lead, stage: to });
      return;
    }
    // Optimistic: move the card now, roll back if the server says no.
    const before = columns;
    setColumns(
      (cols) =>
        cols &&
        cols.map((c) =>
          c.stage === lead.stage
            ? { ...c, count: c.count - 1, items: c.items.filter((x) => x.id !== lead.id) }
            : c.stage === to
              ? { ...c, count: c.count + 1, items: [{ ...lead, stage: to }, ...c.items] }
              : c,
        ),
    );
    try {
      await crmService.stage(lead.id, { stage: to });
      message.success(`${lead.key} moved to ${STAGES.find((s) => s.key === to)?.label}`);
      emitCrmChanged();
    } catch (err) {
      setColumns(before);
      message.error(errText(err, "Couldn't move the lead"));
    }
  };

  const activeFilters = !!(source || owner || rating || followUp || q || stage || scope !== "all");
  const isEmpty =
    !loading &&
    !activeFilters &&
    (view === "board" ? !!columns && columns.every((c) => c.count === 0) : total === 0 && status === "open");

  const tableColumns = [
    {
      title: "Lead",
      key: "lead",
      render: (_: any, l: Lead) => (
        <div className="crm-tcell-lead">
          <Avatar name={l.name} seed={l.id} size={32} />
          <div>
            <b>
              {l.name} <RatingBadge rating={l.rating} />
            </b>
            <small>
              <KeyChip k={l.key} /> {l.company_name || [l.city, l.state].filter(Boolean).join(", ")}
            </small>
          </div>
        </div>
      ),
    },
    {
      title: "Needs",
      dataIndex: "requirement",
      key: "requirement",
      ellipsis: true,
      render: (v: string | null) => v || <span className="crm-muted">—</span>,
    },
    { title: "Stage", key: "stage", width: 130, render: (_: any, l: Lead) => <StagePill stage={l.stage} /> },
    { title: "Source", key: "source", width: 150, render: (_: any, l: Lead) => <SourceChip source={l.source} detail={l.source_detail} /> },
    {
      title: "Owner",
      key: "owner",
      width: 160,
      render: (_: any, l: Lead) =>
        l.owner ? (
          <span className="crm-tcell-owner">
            <Avatar name={l.owner.name} seed={l.owner.id} size={22} /> {l.owner.name}
          </span>
        ) : (
          <span className="crm-muted">Unassigned</span>
        ),
    },
    { title: "Follow-up", key: "fu", width: 170, render: (_: any, l: Lead) => <FollowUpChip lead={l} showNone /> },
    { title: "Value", key: "value", width: 110, align: "right" as const, render: (_: any, l: Lead) => <Money value={l.estimated_value} compact muted /> },
    { title: "Received", key: "received", width: 120, render: (_: any, l: Lead) => <span className="crm-muted">{ago(l.received_at)}</span> },
  ];

  return (
    <CrmShell
      title="Leads"
      subtitle="Every enquiry in one place. Follow up on time and turn more of them into orders."
      icon={<FunnelPlotOutlined />}
      onNew={() => setNewOpen(true)}
      onImport={() => setImportOpen(true)}
    >
      <div className="crm-toolbar">
        <div className="crm-seg" role="tablist" aria-label="View">
          <button role="tab" aria-selected={view === "board"} className={view === "board" ? "on" : ""} onClick={() => setView("board")}>
            <AppstoreOutlined /> Board
          </button>
          <button role="tab" aria-selected={view === "list"} className={view === "list" ? "on" : ""} onClick={() => setView("list")}>
            <UnorderedListOutlined /> List
          </button>
        </div>
        <div className="crm-seg" role="tablist" aria-label="Whose leads">
          {[
            { k: "all", label: meta?.can.manage ? "Everyone" : "All" },
            { k: "mine", label: "Mine" },
            { k: "pool", label: "Unassigned", count: summary?.pool },
          ].map((s) => (
            <button key={s.k} role="tab" aria-selected={scope === s.k} className={scope === s.k ? "on" : ""} onClick={() => setParam({ scope: s.k === "all" ? null : s.k })}>
              {s.label}
              {!!s.count && <i className="crm-seg-count">{s.count}</i>}
            </button>
          ))}
        </div>
        <Input
          className="crm-search"
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search name, company, phone, LD-12…"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
        />
        <div className="crm-filters">
          <Select
            mode="multiple"
            maxTagCount="responsive"
            allowClear
            placeholder="Source"
            value={source ? source.split(",") : []}
            onChange={(v) => setParam({ source: v.join(",") || null })}
            options={SOURCES.map((s) => ({ value: s.key, label: s.label }))}
            className="crm-filter"
          />
          {meta?.can.manage && (
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Owner"
              value={owner || undefined}
              onChange={(v) => setParam({ owner_id: v ?? null })}
              options={[{ value: "none", label: "Unassigned" }, ...(meta?.users || []).map((u) => ({ value: String(u.id), label: u.name }))]}
              className="crm-filter"
            />
          )}
          <Select allowClear placeholder="Follow-up" value={followUp || undefined} onChange={(v) => setParam({ follow_up: v ?? null })} options={FOLLOW_UPS} className="crm-filter" />
          <Select
            allowClear
            placeholder="Rating"
            value={rating || undefined}
            onChange={(v) => setParam({ rating: v ?? null })}
            options={[...RATINGS.map((r) => ({ value: r.key, label: r.label })), { value: "NONE", label: "Not rated" }]}
            className="crm-filter"
          />
          {view === "list" && (
            <>
              <Select value={status} onChange={(v) => setParam({ status: v === "open" ? null : v })} options={STATUSES} className="crm-filter sm" />
              <Select value={sort} onChange={(v) => setParam({ sort: v === "newest" ? null : v })} options={SORTS} className="crm-filter" />
            </>
          )}
          {activeFilters && (
            <button
              className="crm-chip"
              onClick={() => {
                setQInput("");
                setParams(leadId ? { lead: String(leadId) } : {}, { replace: true });
              }}
            >
              <CloseOutlined /> Clear
            </button>
          )}
        </div>
      </div>
      {stage && (
        <div className="crm-filter-note">
          Showing stage <StagePill stage={stage} small />
          <button className="crm-link" onClick={() => setParam({ stage: null })}>
            show all
          </button>
        </div>
      )}

      {isEmpty ? (
        <EmptyState
          icon={<FunnelPlotOutlined />}
          title="No leads yet"
          sub="Add enquiries by hand, import a list, or connect IndiaMART and your website so new enquiries arrive here by themselves."
          action={
            <div className="crm-empty-actions">
              {meta?.can.create && (
                <button className="crm-btn primary" onClick={() => setNewOpen(true)}>
                  <PlusOutlined /> Add a lead
                </button>
              )}
              {meta?.can.manage && (
                <button className="crm-btn ghost" onClick={() => navigate("/app/crm/sources")}>
                  <ApiOutlined /> Connect IndiaMART / website
                </button>
              )}
              {meta?.can.create && (
                <button className="crm-btn ghost" onClick={() => setImportOpen(true)}>
                  <UploadOutlined /> Import CSV
                </button>
              )}
            </div>
          }
        />
      ) : view === "board" ? (
        columns ? (
          <div className={loading ? "crm-loading-fade" : ""}>
            <LeadBoard
              columns={stage ? columns.filter((c) => c.stage === stage) : columns}
              onOpen={openLead}
              onMove={move}
              closedDays={30}
            />
          </div>
        ) : (
          <div className="crm-center tall">
            <Spin />
          </div>
        )
      ) : (
        <div className="crm-table">
          <Table
            rowKey="id"
            loading={loading}
            dataSource={rows}
            columns={tableColumns as any}
            onRow={(l: Lead) => ({ onClick: () => openLead(l.id), className: l.follow_up_state === "OVERDUE" ? "late" : "" })}
            scroll={{ x: 1100 }}
            pagination={{
              current: page,
              pageSize: 25,
              total,
              showSizeChanger: false,
              showTotal: (t) => `${t} lead${t === 1 ? "" : "s"}`,
              onChange: (p) => setParam({ page: p > 1 ? String(p) : null }),
            }}
          />
        </div>
      )}

      <LeadDrawer leadId={leadId} meta={meta} onClose={closeLead} onChanged={onLeadChanged} onOpenLead={openLead} />
      <LeadFormModal
        open={newOpen}
        meta={meta}
        onClose={() => setNewOpen(false)}
        onSaved={(l) => {
          setNewOpen(false);
          openLead(l.id);
        }}
        onOpenLead={(id) => {
          setNewOpen(false);
          openLead(id);
        }}
      />
      <ImportModal open={importOpen} meta={meta} onClose={() => setImportOpen(false)} />
      <StageModal
        target={stageTarget}
        onClose={() => setStageTarget(null)}
        onDone={() => {
          setStageTarget(null);
          load();
        }}
      />
    </CrmShell>
  );
};

export default LeadsPage;
