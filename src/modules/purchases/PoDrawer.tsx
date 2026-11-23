import React, { useCallback, useEffect, useState } from "react";
import { Button, DatePicker, Drawer, Dropdown, Input, InputNumber, Modal, Select, Spin, message } from "antd";
import {
  CheckOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EllipsisOutlined,
  FileDoneOutlined,
  ImportOutlined,
  MailOutlined,
  RollbackOutlined,
  SendOutlined,
  StopOutlined,
  UndoOutlined,
  WarningOutlined,
  WhatsAppOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { useWarehouseList } from "@/modules/stock/pickers";
import { type PoDetail, apiError, cancelReceipt, deletePo, getPo, poAction, receiveGoods } from "./api";
import { ACTIVITY, BILL_STATUS, PO_STATUS, TAX_TYPE, day, qtyText, rs, rs2, when } from "./format";
import { downloadPoPdf } from "./poPdf";

/** Ask for a short reason (cancel, close, send back…); resolves null when dismissed. */
export const askReason = (title: string, placeholder: string, okText: string, danger = true) =>
  new Promise<string | null>((resolve) => {
    let text = "";
    Modal.confirm({
      title,
      icon: null,
      content: <Input.TextArea autoFocus rows={3} maxLength={300} placeholder={placeholder} onChange={(e) => (text = e.target.value)} />,
      okText,
      okButtonProps: { danger },
      onOk: () => {
        if (text.trim().length < 3) {
          message.warning("Write a few words (at least 3 letters)");
          return Promise.reject();
        }
        resolve(text.trim());
      },
      onCancel: () => resolve(null),
    });
  });

// ── Receive goods ───────────────────────────────────────────────────────────

const ReceiveModal: React.FC<{ po: PoDetail | null; onClose: (updated?: PoDetail) => void }> = ({ po, onClose }) => {
  const { list: warehouses } = useWarehouseList(!!po);
  const [rows, setRows] = useState<Record<number, { received: number | null; rejected: number | null; reason: string }>>({});
  const [head, setHead] = useState<any>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!po) return;
    setRows(Object.fromEntries(po.lines.map((l) => [l.id, { received: l.pending > 0 ? l.pending : null, rejected: null, reason: "" }])));
    setHead({ receipt_date: dayjs(), warehouse_id: po.warehouse_id });
  }, [po]);
  if (!po) return null;
  const set = (id: number, patch: any) => setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } }));
  const submit = async () => {
    const lines = po.lines
      .map((l) => ({ po_item_id: l.id, received_qty: rows[l.id]?.received || 0, rejected_qty: rows[l.id]?.rejected || 0, reject_reason: rows[l.id]?.reason || null }))
      .filter((l) => l.received_qty > 0);
    if (!lines.length) return message.warning("Enter how much arrived of at least one item");
    setSaving(true);
    try {
      const r = await receiveGoods(po.id, {
        ...head,
        receipt_date: head.receipt_date ? dayjs(head.receipt_date).format("YYYY-MM-DD") : undefined,
        lines,
      });
      message.success(r.message || "Goods received");
      onClose(r);
    } catch (e) {
      message.error(apiError(e, "Couldn't save the goods received"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={!!po} title={`Receive goods — ${po.po_number}`} onCancel={() => onClose()} onOk={submit} okText="Save goods received" confirmLoading={saving} width={820} destroyOnHidden className="pu-modal">
      <div className="pu-grid" style={{ marginBottom: 10 }}>
        <label>
          <span className="pu-label">Arrived on</span>
          <DatePicker style={{ width: "100%" }} format="D MMM YYYY" allowClear={false} value={head.receipt_date} onChange={(d) => setHead({ ...head, receipt_date: d })} disabledDate={(d) => !!d && d.isAfter(dayjs(), "day")} />
        </label>
        <label>
          <span className="pu-label">Into warehouse</span>
          <Select style={{ width: "100%" }} value={head.warehouse_id ?? undefined} onChange={(v) => setHead({ ...head, warehouse_id: v })} options={(warehouses || []).map((w) => ({ value: w.id, label: w.name }))} placeholder="Choose" />
        </label>
        <label>
          <span className="pu-label">Supplier's bill no.</span>
          <Input maxLength={50} value={head.supplier_invoice_no} onChange={(e) => setHead({ ...head, supplier_invoice_no: e.target.value })} />
        </label>
        <label>
          <span className="pu-label">Supplier's challan no.</span>
          <Input maxLength={50} value={head.supplier_challan_no} onChange={(e) => setHead({ ...head, supplier_challan_no: e.target.value })} />
        </label>
        <label>
          <span className="pu-label">Vehicle no.</span>
          <Input maxLength={32} value={head.vehicle_number} onChange={(e) => setHead({ ...head, vehicle_number: e.target.value.toUpperCase() })} placeholder="MH12 AB 1234" />
        </label>
        <label>
          <span className="pu-label">E-way bill no.</span>
          <Input maxLength={14} value={head.eway_bill_number} onChange={(e) => setHead({ ...head, eway_bill_number: e.target.value.replace(/\D/g, "") })} placeholder="12 digits" />
        </label>
      </div>
      <div className="pu-scroll">
        <table className="pu-lines pu-recv">
          <thead>
            <tr>
              <th>Item</th>
              <th className="r">Ordered</th>
              <th className="r">Arrived before</th>
              <th>Arrived now</th>
              <th>Rejected</th>
              <th>Why rejected</th>
            </tr>
          </thead>
          <tbody>
            {po.lines.map((l) => {
              const r = rows[l.id] || { received: null, rejected: null, reason: "" };
              const whole = !!l.product_id;
              return (
                <tr key={l.id}>
                  <td>
                    {l.item_name}
                    <span className="sub">{l.pending > 0 ? `${qtyText(l.pending, l.unit)} still to come` : "Everything arrived"}</span>
                  </td>
                  <td className="r">{qtyText(l.qty, l.unit)}</td>
                  <td className="r">{qtyText(l.received)}</td>
                  <td>
                    <InputNumber min={0} precision={whole ? 0 : 3} value={r.received} onChange={(v) => set(l.id, { received: v })} />
                  </td>
                  <td>
                    <InputNumber min={0} precision={whole ? 0 : 3} value={r.rejected} onChange={(v) => set(l.id, { rejected: v })} />
                  </td>
                  <td>
                    <Input maxLength={200} value={r.reason} disabled={!r.rejected} placeholder={r.rejected ? "Broken, wrong size…" : ""} onChange={(e) => set(l.id, { reason: e.target.value })} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="pu-muted" style={{ marginTop: 10 }}>Accepted goods (arrived − rejected) go into stock in that warehouse at once. Rejected goods never enter stock.</p>
    </Modal>
  );
};

// ── Details ─────────────────────────────────────────────────────────────────

const PoDrawer: React.FC<{
  id: number | null;
  onClose: () => void;
  onChanged: () => void;
  onEdit: (po: PoDetail, mode: "edit" | "amend") => void;
  reloadKey?: number;
}> = ({ id, onClose, onChanged, onEdit, reloadKey }) => {
  const navigate = useNavigate();
  const [po, setPo] = useState<PoDetail | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [receiving, setReceiving] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    getPo(id)
      .then(setPo)
      .catch((e) => {
        message.error(apiError(e, "Couldn't open the purchase order"));
        onClose();
      });
  }, [id, onClose]);
  useEffect(() => {
    setPo(null);
    load();
  }, [load, reloadKey]);

  const run = async (key: string, fn: () => Promise<PoDetail | { message: string }>) => {
    setBusy(key);
    try {
      const r: any = await fn();
      message.success(r?.message || "Done");
      if (r?.lines) setPo(r);
      else load();
      onChanged();
    } catch (e) {
      message.error(apiError(e, "That didn't work"));
    } finally {
      setBusy(null);
    }
  };

  const pdf = async () => {
    if (!po) return;
    setBusy("pdf");
    try {
      await downloadPoPdf(po);
    } finally {
      setBusy(null);
    }
  };

  const shareText = po
    ? `Purchase order ${po.po_number} dated ${day(po.po_date)} from ${po.buyer?.name || "us"}${po.grand_total ? ` for ${rs2(po.grand_total)}` : ""}. The PO PDF is attached — please quote our PO number on your invoice.`
    : "";

  const c = po?.can;
  const more = po
    ? ([
        c?.amend && { key: "amend", icon: <EditOutlined />, label: "Amend (change an approved PO)", onClick: () => onEdit(po, "amend") },
        c?.close && {
          key: "close",
          icon: <StopOutlined />,
          label: "Close — the rest won't come",
          onClick: async () => {
            const why = await askReason(`Close ${po.po_number}?`, "Why won't the rest come? e.g. supplier out of stock", "Close PO");
            if (why) run("close", () => poAction(po.id, "close", { reason: why }));
          },
        },
        c?.reopen && { key: "reopen", icon: <UndoOutlined />, label: "Reopen", onClick: () => run("reopen", () => poAction(po.id, "reopen")) },
        c?.cancel && {
          key: "cancel",
          danger: true,
          icon: <CloseCircleOutlined />,
          label: "Cancel PO",
          onClick: async () => {
            const why = await askReason(`Cancel ${po.po_number}?`, "Why? e.g. supplier can't deliver", "Cancel PO");
            if (why) run("cancel", () => poAction(po.id, "cancel", { reason: why }));
          },
        },
        c?.delete && {
          key: "delete",
          danger: true,
          icon: <DeleteOutlined />,
          label: "Delete draft",
          onClick: () =>
            Modal.confirm({
              title: `Delete ${po.po_number}?`,
              content: "It never went to the supplier. This can't be undone.",
              okText: "Delete",
              okButtonProps: { danger: true },
              onOk: () =>
                deletePo(po.id).then((r) => {
                  message.success(r.message);
                  onChanged();
                  onClose();
                }),
            }),
        },
      ].filter(Boolean) as any[])
    : [];

  const intra = po?.tax_type === "INTRA_STATE";
  const st = po ? PO_STATUS[po.status] : null;
  const late = po && ["APPROVED", "SENT", "PARTLY_RECEIVED"].includes(po.status) && po.expected_date && po.expected_date < dayjs().format("YYYY-MM-DD");
  return (
    <Drawer open={!!id} onClose={onClose} size="min(780px, 100vw)" title={null} rootClassName="pu-drawer" destroyOnHidden>
      {!po ? (
        <div className="pu-empty">
          <Spin />
        </div>
      ) : (
        <>
          <div className="pu-dhead">
            <div className="pu-dhead-top">
              <span className={`pu-chip ${st?.tone}`}>{st?.label}</span>
              {po.revision > 0 && <span className="pu-chip violet">Amendment {po.revision}</span>}
              {late && (
                <span className="pu-chip bad">
                  <WarningOutlined /> Late — expected {day(po.expected_date)}
                </span>
              )}
            </div>
            <h3>
              {po.po_number} · {po.supplier?.name}
            </h3>
            <p>
              {day(po.po_date)}
              {po.expected_date ? ` · expected ${day(po.expected_date)}` : ""} · {TAX_TYPE[po.tax_type]}
            </p>
            {!po.money_hidden && <div className="pu-big">{rs2(po.grand_total)}</div>}
            <div className="pu-actions">
              {c?.edit && (
                <Button icon={<EditOutlined />} onClick={() => onEdit(po, "edit")}>
                  Edit
                </Button>
              )}
              {c?.submit && (
                <Button type="primary" icon={<SendOutlined />} loading={busy === "submit"} onClick={() => run("submit", () => poAction(po.id, "submit"))}>
                  Submit
                </Button>
              )}
              {c?.approve && (
                <Button type="primary" icon={<CheckOutlined />} loading={busy === "approve"} onClick={() => run("approve", () => poAction(po.id, "approve"))}>
                  Approve
                </Button>
              )}
              {c?.send_back && (
                <Button
                  icon={<RollbackOutlined />}
                  loading={busy === "send-back"}
                  onClick={async () => {
                    const note = await askReason(`Send ${po.po_number} back?`, "What should change? e.g. get a better rate", "Send back", false);
                    if (note) run("send-back", () => poAction(po.id, "send-back", { note }));
                  }}
                >
                  Send back
                </Button>
              )}
              {c?.pdf && (
                <Button icon={<DownloadOutlined />} loading={busy === "pdf"} onClick={pdf}>
                  PDF
                </Button>
              )}
              {c?.mark_sent && (
                <Dropdown
                  menu={{
                    items: [
                      { key: "wa", icon: <WhatsAppOutlined />, label: "Share on WhatsApp", onClick: () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener") },
                      {
                        key: "mail",
                        icon: <MailOutlined />,
                        label: "Share by email",
                        onClick: () => window.open(`mailto:${po.supplier?.email || ""}?subject=${encodeURIComponent(`Purchase order ${po.po_number}`)}&body=${encodeURIComponent(shareText)}`, "_self"),
                      },
                      { type: "divider" },
                      { key: "sent", icon: <CheckOutlined />, label: "Mark as sent", onClick: () => run("sent", () => poAction(po.id, "sent")) },
                    ],
                  }}
                >
                  <Button type="primary" icon={<SendOutlined />} loading={busy === "sent"}>
                    Send to supplier
                  </Button>
                </Dropdown>
              )}
              {c?.receive && (
                <Button type={c?.mark_sent ? "default" : "primary"} icon={<ImportOutlined />} onClick={() => setReceiving(true)}>
                  Receive goods
                </Button>
              )}
              {c?.bill && (
                <Button icon={<FileDoneOutlined />} onClick={() => navigate(`/app/purchase-bills?new=1&po=${po.id}`)}>
                  Enter supplier bill
                </Button>
              )}
              {more.length > 0 && (
                <Dropdown menu={{ items: more }} trigger={["click"]}>
                  <Button icon={<EllipsisOutlined />} aria-label="More actions" />
                </Dropdown>
              )}
            </div>
          </div>

          {po.status === "PENDING_APPROVAL" && !c?.approve && <div className="pu-sec"><div className="pu-note warn">Waiting for someone who can approve purchase orders.</div></div>}
          {(po.status === "CANCELLED" || po.status === "CLOSED") && po.close_reason && (
            <div className="pu-sec">
              <div className={`pu-note ${po.status === "CANCELLED" ? "bad" : ""}`}>
                {po.status === "CANCELLED" ? "Cancelled" : "Closed"} {when(po.closed_at)}: {po.close_reason}
              </div>
            </div>
          )}

          <div className="pu-sec">
            <div className="pu-parties">
              <div className="pu-party">
                <em>Supplier</em>
                <b>{po.supplier?.name}</b>
                {(po.supplier?.address?.lines || []).map((l: string) => (
                  <p key={l}>{l}</p>
                ))}
                <p>{po.supplier?.gstin ? `GSTIN ${po.supplier.gstin}` : "Unregistered"}{po.supplier?.msme_type ? ` · MSME ${po.supplier.msme_type.toLowerCase()}` : ""}</p>
              </div>
              <div className="pu-party">
                <em>Deliver to</em>
                <b>{po.ship_to?.name || "—"}</b>
                {(po.ship_to?.lines || []).map((l: string) => (
                  <p key={l}>{l}</p>
                ))}
                <p>Bill to {po.buyer?.name}{po.buyer?.gstin ? ` · GSTIN ${po.buyer.gstin}` : ""}</p>
              </div>
            </div>
          </div>

          <div className="pu-sec">
            <div className="pu-facts">
              <div>
                <span>Place of supply</span>
                <b>{po.place_of_supply ? `${po.place_of_supply} (${po.place_of_supply_code})` : "—"}</b>
              </div>
              <div>
                <span>Payment terms</span>
                <b>{po.payment_terms || "—"}</b>
              </div>
              <div>
                <span>Delivery terms</span>
                <b>{po.delivery_terms || "—"}</b>
              </div>
              <div>
                <span>Supplier's ref.</span>
                <b>{po.supplier_ref || "—"}</b>
              </div>
              <div>
                <span>Made by</span>
                <b>{po.created_by || "—"}</b>
              </div>
              <div>
                <span>Approved by</span>
                <b>{po.approved_by ? `${po.approved_by}, ${when(po.approved_at)}` : "—"}</b>
              </div>
            </div>
          </div>

          <div className="pu-sec">
            <h4>Items</h4>
            <div className="pu-scroll">
              <table className="pu-lines">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="r">Ordered</th>
                    <th className="r">Arrived</th>
                    {!po.money_hidden && (
                      <>
                        <th className="r">Rate</th>
                        <th className="r">GST</th>
                        <th className="r">Amount</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {po.lines.map((l) => (
                    <tr key={l.id}>
                      <td>
                        {l.item_name}
                        <span className="sub">{[l.hsn_code ? `HSN ${l.hsn_code}` : null, l.billed ? `${qtyText(l.billed)} billed` : null].filter(Boolean).join(" · ")}</span>
                      </td>
                      <td className="r">{qtyText(l.qty, l.unit)}</td>
                      <td className="r">
                        {qtyText(l.received)}
                        {l.pending > 0 && l.received > 0 && <span className="sub">{qtyText(l.pending)} to come</span>}
                      </td>
                      {!po.money_hidden && (
                        <>
                          <td className="r">
                            {rs2(l.rate)}
                            {l.discount_percent ? <span className="sub">−{l.discount_percent}%</span> : null}
                          </td>
                          <td className="r">{l.gst_rate}%</td>
                          <td className="r">{rs2(l.amount)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!po.money_hidden && (
              <div className="pu-totals" style={{ marginTop: 10 }}>
                {Number(po.discount_amount) > 0 && (
                  <div>
                    <span>Discount</span>
                    <b>−{rs2(po.discount_amount)}</b>
                  </div>
                )}
                {Number(po.freight_charges) > 0 && po.freight_gst && (
                  <div>
                    <span>Freight / packing</span>
                    <b>{rs2(po.freight_charges)}</b>
                  </div>
                )}
                <div>
                  <span>Taxable value</span>
                  <b>{rs2(po.taxable_amount)}</b>
                </div>
                {intra ? (
                  <>
                    <div>
                      <span>CGST</span>
                      <b>{rs2(po.cgst_amount)}</b>
                    </div>
                    <div>
                      <span>SGST</span>
                      <b>{rs2(po.sgst_amount)}</b>
                    </div>
                  </>
                ) : po.tax_type === "INTER_STATE" ? (
                  <div>
                    <span>IGST</span>
                    <b>{rs2(po.igst_amount)}</b>
                  </div>
                ) : null}
                {Number(po.freight_charges) > 0 && !po.freight_gst && (
                  <div>
                    <span>Freight (no GST)</span>
                    <b>{rs2(po.freight_charges)}</b>
                  </div>
                )}
                {Number(po.round_off) !== 0 && (
                  <div>
                    <span>Round off</span>
                    <b>{rs2(po.round_off)}</b>
                  </div>
                )}
                <div className="grand">
                  <span>Total</span>
                  <b>{rs2(po.grand_total)}</b>
                </div>
              </div>
            )}
          </div>

          {po.receipts.length > 0 && (
            <div className="pu-sec">
              <h4>Goods received</h4>
              {po.receipts.map((r) => (
                <div key={r.id} className={`pu-receipt${r.status === "CANCELLED" ? " cancelled" : ""}`}>
                  <div className="pu-receipt-head">
                    <b>{r.grn_number}</b>
                    <span>{day(r.receipt_date)}</span>
                    <span>· {r.warehouse_name}</span>
                    {r.status === "CANCELLED" && <span className="pu-chip bad">Undone</span>}
                    <span style={{ flex: 1 }} />
                    {r.status === "RECEIVED" && po.can.undo_receipt && (
                      <Button
                        size="small"
                        type="text"
                        danger
                        icon={<UndoOutlined />}
                        loading={busy === `grn${r.id}`}
                        onClick={async () => {
                          const why = await askReason(`Undo ${r.grn_number}?`, "Why? e.g. entered twice by mistake", "Undo receipt");
                          if (why) run(`grn${r.id}`, () => cancelReceipt(r.id, why));
                        }}
                      >
                        Undo
                      </Button>
                    )}
                  </div>
                  <p>{r.lines.map((x) => `${qtyText(x.accepted_qty, x.unit)} ${x.item_name}${x.rejected_qty ? ` (${qtyText(x.rejected_qty)} rejected: ${x.reject_reason || "—"})` : ""}`).join(" · ")}</p>
                  <p>{[r.supplier_invoice_no ? `Bill ${r.supplier_invoice_no}` : null, r.supplier_challan_no ? `Challan ${r.supplier_challan_no}` : null, r.vehicle_number ? `Vehicle ${r.vehicle_number}` : null, r.eway_bill_number ? `E-way ${r.eway_bill_number}` : null, r.received_by ? `by ${r.received_by}` : null].filter(Boolean).join(" · ")}</p>
                  {r.cancel_reason && <p>Undone: {r.cancel_reason}</p>}
                </div>
              ))}
            </div>
          )}

          {po.bills.length > 0 && (
            <div className="pu-sec">
              <h4>Supplier bills</h4>
              <div className="pu-links">
                {po.bills.map((b) => (
                  <button key={b.id} type="button" className="pu-link" onClick={() => navigate(`/app/purchase-bills?open=${b.id}`)}>
                    {b.bill_number} · {rs(b.grand_total)}
                    <small>
                      {BILL_STATUS[b.status]?.label}
                      {b.balance_amount > 0 ? ` · ${rs(b.balance_amount)} due` : ""}
                    </small>
                  </button>
                ))}
              </div>
            </div>
          )}

          {(po.notes || po.terms_conditions) && (
            <div className="pu-sec">
              <h4>Notes & terms</h4>
              {po.notes && <p style={{ whiteSpace: "pre-wrap", margin: "0 0 8px" }}>{po.notes}</p>}
              {po.terms_conditions && <p className="pu-muted" style={{ whiteSpace: "pre-wrap", margin: 0 }}>{po.terms_conditions}</p>}
            </div>
          )}

          <div className="pu-sec">
            <h4>History</h4>
            <ul className="pu-timeline">
              {po.activity.map((a) => (
                <li key={a.id}>
                  <b>{ACTIVITY[a.action] || a.action}</b>
                  {a.note ? ` — ${a.note}` : ""}
                  <br />
                  {a.user_name ? `${a.user_name} · ` : ""}
                  {when(a.created_at)}
                </li>
              ))}
            </ul>
          </div>
          <ReceiveModal
            po={receiving ? po : null}
            onClose={(updated) => {
              setReceiving(false);
              if (updated) {
                setPo(updated);
                onChanged();
              }
            }}
          />
        </>
      )}
    </Drawer>
  );
};

export default PoDrawer;
