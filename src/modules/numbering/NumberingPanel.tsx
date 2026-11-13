import React, { useState } from "react";
import { Dropdown, Modal, Tooltip, message } from "antd";
import type { MenuProps } from "antd";
import {
  CarOutlined,
  DeleteOutlined,
  EditOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  InboxOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  StarFilled,
  StarOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { apiError, invalidateSeries, numberingService, useSeriesList } from "./numberingService";
import { DOC_TYPES, RESET_OPTIONS, timeAgo, type DocType, type Series } from "./rules";
import SeriesModal from "./SeriesModal";
import "./numbering.scss";

const ICON: Record<DocType, React.ReactNode> = {
  INVOICE: <FileDoneOutlined />,
  QUOTATION: <FileTextOutlined />,
  DELIVERY_CHALLAN: <CarOutlined />,
};

/**
 * Company → Document numbering. Body of a Panel: one column per document
 * type with its series, or the standard format when it has none.
 */
const NumberingPanel: React.FC<{ canEdit: boolean }> = ({ canEdit }) => {
  const { data, loading, error, reload } = useSeriesList();
  const [modal, setModal] = useState<{ series: Series | null; docType: DocType } | null>(null);
  const [showArchived, setShowArchived] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<number | null>(null);

  const all = data?.series || [];
  const prefix = data?.prefix || "";
  const hasActive = (t: DocType) => all.some((s) => s.doc_type === t && s.is_active);

  const refresh = () => {
    invalidateSeries();
    return reload(true);
  };

  const act = async (s: Series, fn: () => Promise<any>, ok: string) => {
    setBusy(s.id);
    try {
      await fn();
      message.success(ok);
      await refresh();
    } catch (e: any) {
      message.error(apiError(e, "Something went wrong"));
    } finally {
      setBusy(null);
    }
  };

  const menuFor = (s: Series): MenuProps["items"] => [
    { key: "edit", icon: <EditOutlined />, label: "Edit", onClick: () => setModal({ series: s, docType: s.doc_type }) },
    ...(s.is_active && !s.is_default
      ? [{ key: "default", icon: <StarOutlined />, label: "Make default", onClick: () => act(s, () => numberingService.update(s.id, { is_default: true }), `“${s.name}” is now the default`) }]
      : []),
    s.is_active
      ? {
          key: "archive",
          icon: <InboxOutlined />,
          label: "Archive",
          onClick: () =>
            Modal.confirm({
              title: `Archive “${s.name}”?`,
              content:
                all.filter((x) => x.doc_type === s.doc_type && x.is_active).length > 1
                  ? "It won't be offered for new documents. Numbers already given stay as they are, and you can restore it any time."
                  : "It's the only active series, so new documents go back to the standard format. You can restore it any time.",
              okText: "Archive",
              onOk: () => act(s, () => numberingService.update(s.id, { is_active: false }), "Series archived"),
            }),
        }
      : { key: "restore", icon: <UndoOutlined />, label: "Restore", onClick: () => act(s, () => numberingService.update(s.id, { is_active: true }), "Series restored") },
    ...(s.issued_count === 0
      ? [
          { type: "divider" as const },
          {
            key: "delete",
            danger: true,
            icon: <DeleteOutlined />,
            label: "Delete",
            onClick: () =>
              Modal.confirm({
                title: `Delete “${s.name}”?`,
                content: "No document has used it yet, so nothing else changes.",
                okText: "Delete",
                okButtonProps: { danger: true },
                onOk: () => act(s, () => numberingService.remove(s.id), "Series deleted"),
              }),
          },
        ]
      : []),
  ];

  const card = (s: Series) => {
    const reset = RESET_OPTIONS.find((o) => o.value === s.reset_period)?.short;
    return (
      <div key={s.id} className={`nm-card ${s.is_active ? "" : "off"} ${busy === s.id ? "busy" : ""}`}>
        <div className="nm-card-top">
          <b className="nm-card-name" title={s.name}>
            {s.name}
          </b>
          {s.is_default && (
            <span className="nm-badge def">
              <StarFilled /> Default
            </span>
          )}
          {!s.is_active && <span className="nm-badge">Archived</span>}
          {canEdit && (
            <Dropdown menu={{ items: menuFor(s) }} trigger={["click"]} placement="bottomRight">
              <button type="button" className="nm-icon-btn" aria-label={`Actions for ${s.name}`}>
                <MoreOutlined />
              </button>
            </Dropdown>
          )}
        </div>
        <div className="nm-next">
          <span>{s.is_active ? "Next" : "Was next"}</span>
          <b className="nm-mono">{s.next_preview}</b>
        </div>
        <div className="nm-card-meta">
          <span className="nm-mono nm-fmt">{s.format}</span>
          <span>{reset}</span>
          {s.restarts && s.is_active && (
            <Tooltip title="The last number was given in an earlier period, so the next one starts again at 1">
              <span className="nm-restart">Starts again at 1</span>
            </Tooltip>
          )}
        </div>
        <div className="nm-card-foot">
          {s.issued_count > 0 ? (
            <>
              {s.issued_count.toLocaleString("en-IN")} issued · last <span className="nm-mono">{s.last_issued_number}</span>
              {s.last_issued_at && <> · {timeAgo(s.last_issued_at)}</>}
            </>
          ) : (
            "Nothing numbered yet"
          )}
        </div>
      </div>
    );
  };

  if (error && !data) {
    return (
      <div className="nm-empty-state">
        <span>{error}</span>
        <button type="button" className="cp-head-btn" onClick={() => reload(true)}>
          <ReloadOutlined /> Try again
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="nm-cols">
        {DOC_TYPES.map((d) => {
          const list = all.filter((s) => s.doc_type === d.key);
          const active = list.filter((s) => s.is_active);
          const archived = list.filter((s) => !s.is_active);
          return (
            <section key={d.key} className="nm-col">
              <header className="nm-col-head">
                <span className="nm-col-icon">{ICON[d.key]}</span>
                <b>{d.plural}</b>
                {canEdit && active.length > 0 && (
                  <Tooltip title={`Another ${d.label.toLowerCase()} series, e.g. for exports or a branch`}>
                    <button type="button" className="nm-icon-btn" aria-label={`Add ${d.label.toLowerCase()} series`} onClick={() => setModal({ series: null, docType: d.key })}>
                      <PlusOutlined />
                    </button>
                  </Tooltip>
                )}
              </header>

              {loading && !data ? (
                <div className="nm-card sk" />
              ) : active.length ? (
                active.map(card)
              ) : (
                <div className="nm-standard">
                  <span className="nm-standard-label">Standard format</span>
                  <b className="nm-mono">{data?.standard?.[d.key] || "—"}</b>
                  <span className="nm-standard-sub">Numbered automatically by date.</span>
                  {canEdit && (
                    <button type="button" className="cp-pill-btn" onClick={() => setModal({ series: null, docType: d.key })}>
                      <PlusOutlined /> Use your own numbering
                    </button>
                  )}
                </div>
              )}

              {archived.length > 0 && (
                <>
                  <button type="button" className="nm-archived-toggle" onClick={() => setShowArchived((m) => ({ ...m, [d.key]: !m[d.key] }))}>
                    {showArchived[d.key] ? "Hide" : "Show"} archived ({archived.length})
                  </button>
                  {showArchived[d.key] && archived.map(card)}
                </>
              )}
            </section>
          );
        })}
      </div>

      <SeriesModal
        open={!!modal}
        series={modal?.series || null}
        docType={modal?.docType || "INVOICE"}
        prefix={prefix}
        hasActive={hasActive}
        onClose={() => setModal(null)}
        onSaved={() => {
          setModal(null);
          refresh();
        }}
      />
    </>
  );
};

export default NumberingPanel;
