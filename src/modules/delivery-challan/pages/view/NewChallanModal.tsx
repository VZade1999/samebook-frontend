import React, { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Spin } from "antd";
import {
  CarOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  FileSearchOutlined,
  FileTextOutlined,
  ReloadOutlined,
  SearchOutlined,
  SwapOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { challanService } from "../../services/challanService";
import { Avatar, count, inr, shortDate } from "./shared";
import type { EligibleQuotation } from "./types";

export type NewChallanChoice =
  | { kind: "quotation"; quotationId: number }
  | { kind: "customer" }
  | { kind: "transfer" };

type Kind = NewChallanChoice["kind"];

const KINDS: { key: Kind; icon: React.ReactNode; title: string; text: string }[] = [
  {
    key: "quotation",
    icon: <FileTextOutlined />,
    title: "Against a quotation",
    text: "Customer, items and rates come from an approved quotation. Send all of it, or part.",
  },
  {
    key: "customer",
    icon: <UserOutlined />,
    title: "To a customer, without one",
    text: "Samples, goods on approval, job work, repairs or an exhibition.",
  },
  {
    key: "transfer",
    icon: <SwapOutlined />,
    title: "Between your warehouses",
    text: "Moves stock from one of your warehouses to another. No customer.",
  },
];

/**
 * First step of a new challan: what is being sent. For a quotation it lists
 * the approved quotations that still have goods to send (searchable); the
 * page then opens the challan form for the choice.
 */
const NewChallanModal: React.FC<{
  open: boolean;
  /** Open on this kind (e.g. "Quotations to send" in the hero opens on quotations). */
  startWith?: Kind;
  onCancel: () => void;
  onPick: (choice: NewChallanChoice) => void;
}> = ({ open, startWith = "quotation", onCancel, onPick }) => {
  const [kind, setKind] = useState<Kind>(startWith);
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<EligibleQuotation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [picked, setPicked] = useState<EligibleQuotation | null>(null);
  const req = useRef(0);

  const load = useCallback(async (q: string) => {
    const id = ++req.current;
    setLoading(true);
    setFailed(false);
    try {
      const res: any = await challanService.getEligibleQuotations(q || undefined);
      if (id !== req.current) return;
      setRows(res?.data?.data?.rows || []);
      setTotal(Number(res?.data?.data?.total || 0));
    } catch {
      if (id === req.current) setFailed(true);
    } finally {
      if (id === req.current) setLoading(false);
    }
  }, []);

  // Fresh state every time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setKind(startWith);
    setSearch("");
    setPicked(null);
    load("");
  }, [open, startWith, load]);

  // Search as you type (after a short pause).
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => load(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const ready = kind !== "quotation" || !!picked;
  const go = () => {
    if (!ready) return;
    if (kind === "quotation" && picked) onPick({ kind: "quotation", quotationId: picked.id });
    else if (kind === "customer") onPick({ kind: "customer" });
    else if (kind === "transfer") onPick({ kind: "transfer" });
  };

  return (
    <Modal open={open} onCancel={onCancel} footer={null} width={720} rootClassName="qp-portal ip-portal dc-portal" destroyOnHidden title={null}>
      <div className="ip-ni dc-new">
        <div className="ip-pm-head">
          <span className="ip-pm-icon dc-icon" aria-hidden>
            <CarOutlined />
          </span>
          <div>
            <h3>New delivery challan</h3>
            <p>What are you sending?</p>
          </div>
        </div>

        <div className="dc-kinds" role="radiogroup" aria-label="What are you sending?">
          {KINDS.map((k) => (
            <button key={k.key} type="button" role="radio" aria-checked={kind === k.key} className={`dc-kind${kind === k.key ? " on" : ""}`} onClick={() => setKind(k.key)}>
              <span className="dc-kind-icon" aria-hidden>
                {k.icon}
              </span>
              <b>{k.title}</b>
              <small>{k.text}</small>
            </button>
          ))}
        </div>

        {kind === "quotation" && (
          <>
            <span className="ip-pm-label">
              Approved quotations with goods still to send <em>{total ? count(total) : ""}</em>
            </span>
            <label className="qp-search ip-ni-search">
              <SearchOutlined />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search quotation number or customer" aria-label="Search approved quotations" />
              {search && (
                <button type="button" onClick={() => setSearch("")} aria-label="Clear search">
                  <CloseCircleFilled />
                </button>
              )}
            </label>
            <div className={`ip-ni-list${loading && rows.length ? " busy" : ""}`} role="radiogroup" aria-label="Approved quotations">
              {failed ? (
                <div className="ip-ni-empty">
                  <span>Couldn't load the quotations.</span>
                  <button type="button" className="qp-btn ghost sm" onClick={() => load(search.trim())}>
                    <ReloadOutlined /> Try again
                  </button>
                </div>
              ) : !rows.length && loading ? (
                <div className="ip-ni-empty">
                  <Spin size="small" /> Loading approved quotations…
                </div>
              ) : !rows.length ? (
                <div className="ip-ni-empty">
                  <FileSearchOutlined />
                  <span>
                    {search
                      ? "No approved quotation with goods still to send matches that search."
                      : "Every approved quotation is fully sent. Approve a quotation first, or send goods without one."}
                  </span>
                </div>
              ) : (
                rows.map((q) => {
                  const on = picked?.id === q.id;
                  return (
                    <div key={q.id} className={`ip-ni-opt dc-opt${on ? " on" : ""}`}>
                      <button type="button" role="radio" aria-checked={on} onClick={() => setPicked(q)} className="ip-ni-opt-main">
                        <span className="ip-ni-radio" aria-hidden>
                          {on ? <CheckCircleFilled /> : null}
                        </span>
                        <Avatar name={q.customer_name} seed={q.customer_id || q.customer_name} size={34} />
                        <span className="ip-ni-opt-text">
                          <b>{q.customer_name || "—"}</b>
                          <small>
                            <span className="qd-mono">{q.quotation_number}</span>
                            {q.quotation_date ? ` · ${shortDate(q.quotation_date)}` : ""} · {count(q.pending_items)} of {count(q.items)} line{q.items === 1 ? "" : "s"} left
                            {q.challans ? ` · ${count(q.challans)} challan${q.challans === 1 ? "" : "s"} so far` : ""}
                          </small>
                        </span>
                        <span className="ip-ni-opt-amt">
                          <b>{inr(q.pending_value)}</b>
                          <small>{q.invoiced ? "to send · invoiced" : "still to send"}</small>
                        </span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
            {total > rows.length && !search && <div className="ip-ni-more">Showing the {count(rows.length)} most recent of {count(total)} — search to find others.</div>}
          </>
        )}

        <div className={`ip-ni-sum dc-sum${ready ? "" : " empty"}`} aria-live="polite">
          {kind === "quotation" ? (
            picked ? (
              <span>
                A challan for <b>{picked.customer_name}</b> from <b>{picked.quotation_number}</b>, with the {count(picked.pending_items)} line{picked.pending_items === 1 ? "" : "s"} still to send filled in — lower the quantities for a part delivery.
              </span>
            ) : (
              <span>Pick the quotation you are sending goods for.</span>
            )
          ) : kind === "customer" ? (
            <span>You'll choose the customer and add the items yourself. Pick a reason such as on approval, job work or repair.</span>
          ) : (
            <span>You'll choose the two warehouses and the items. Stock moves between them when the challan is dispatched.</span>
          )}
        </div>

        <div className="ip-pm-foot">
          <button type="button" className="qp-btn ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="qp-btn primary" onClick={go} disabled={!ready}>
            Continue
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default NewChallanModal;
