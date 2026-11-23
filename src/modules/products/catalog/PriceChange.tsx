import React, { useEffect, useMemo, useState } from "react";
import { InputNumber, message, Modal, Select, Spin } from "antd";
import { CheckOutlined, PercentageOutlined } from "@ant-design/icons";
import { type CatalogProduct, type PriceMode, apiError, bulkPrice, newPrice, rupees } from "./productsApi";

const MODES: { mode: PriceMode; title: string; hint: string }[] = [
  { mode: "percent", title: "By a percentage", hint: "e.g. +8% for a new price list" },
  { mode: "amount", title: "By an amount", hint: "add or take off ₹ per unit" },
  { mode: "set", title: "One price for all", hint: "set the same price" },
];
const SHOW = 60;

/**
 * Raise, cut or set the price of the chosen products. The preview uses the
 * same formula as the server, so what you see is what gets saved.
 */
const PriceChange: React.FC<{ products: CatalogProduct[] | null; onClose: (changed: boolean) => void }> = ({ products, onClose }) => {
  const open = !!products?.length;
  const list = products || [];
  const [mode, setMode] = useState<PriceMode>("percent");
  const [value, setValue] = useState<number | null>(null);
  const [round, setRound] = useState<0 | 1 | 5 | 10>(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setMode("percent");
      setValue(null);
      setRound(list.length > 1 ? 1 : 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const problem =
    value === null || !Number.isFinite(value)
      ? "Enter a number"
      : mode === "percent" && (value < -90 || value > 500 || value === 0)
        ? "Use a change between −90% and +500%"
        : mode === "amount" && value === 0
          ? "Enter an amount to add or take off"
          : mode === "set" && value < 0
            ? "Enter a price of ₹0 or more"
            : null;

  const rows = useMemo(
    () => list.map((p) => ({ p, next: problem ? p.price : newPrice(p.price, mode, Number(value), round) })),
    [list, mode, value, round, problem],
  );
  const changing = rows.filter((r) => r.next !== r.p.price);
  const unchanged = rows.length - changing.length;

  const apply = async () => {
    if (problem || !changing.length) return;
    setSaving(true);
    try {
      const r = await bulkPrice({ ids: list.map((p) => p.id), mode, value: Number(value), round });
      message.success(`${r.updated} price${r.updated === 1 ? "" : "s"} updated${r.unchanged ? ` · ${r.unchanged} unchanged` : ""}`);
      onClose(true);
    } catch (e) {
      message.error(apiError(e, "Couldn't change the prices"));
    } finally {
      setSaving(false);
    }
  };

  const one = list.length === 1;
  return (
    <Modal open={open} onCancel={() => onClose(false)} footer={null} closable={false} width={600} destroyOnHidden className="pc-dialog" rootClassName="pc-portal" centered>
      <div className="pc-dlg-head">
        <span className="pc-thumb">
          <PercentageOutlined />
        </span>
        <div>
          <h3>{one ? "Change price" : `Change ${list.length} prices`}</h3>
          <p>{one ? list[0]?.name : "Check the preview, then save — every price changes in one go."}</p>
        </div>
        <button type="button" className="pc-x" onClick={() => onClose(false)} aria-label="Close">
          ✕
        </button>
      </div>
      <div className="pc-dlg-body">
        <div className="pc-modes" role="radiogroup" aria-label="How to change the price">
          {MODES.map((m) => (
            <button
              key={m.mode}
              type="button"
              role="radio"
              aria-checked={mode === m.mode}
              className={`pc-mode${mode === m.mode ? " on" : ""}`}
              onClick={() => {
                setMode(m.mode);
                setValue(null);
              }}
            >
              <b>{m.title}</b>
              <span>{m.hint}</span>
            </button>
          ))}
        </div>
        <div className="pc-grid">
          <div>
            <InputNumber
              autoFocus
              value={value}
              onChange={(v) => setValue(v === null ? null : Number(v))}
              placeholder={mode === "percent" ? "8 or −5" : mode === "amount" ? "50 or −20" : "0.00"}
              prefix={mode === "percent" ? undefined : "₹"}
              suffix={mode === "percent" ? "%" : undefined}
              min={mode === "set" ? 0 : undefined}
              step={mode === "percent" ? 1 : 10}
              precision={mode === "percent" ? 2 : 2}
              style={{ width: "100%" }}
              aria-label="Change"
              onPressEnter={apply}
            />
            <div className="pc-hint">{mode === "set" ? "Every chosen product gets this price." : "Use a minus sign to lower prices."}</div>
          </div>
          <div>
            <Select
              value={round}
              onChange={setRound}
              style={{ width: "100%" }}
              aria-label="Rounding"
              options={[
                { value: 0, label: "Keep paise" },
                { value: 1, label: "Round to nearest ₹1" },
                { value: 5, label: "Round to nearest ₹5" },
                { value: 10, label: "Round to nearest ₹10" },
              ]}
            />
            <div className="pc-hint">Rounding applies to the new price.</div>
          </div>
        </div>

        <div className="pc-preview" aria-live="polite">
          <div className="pc-preview-h">
            <span>{problem ? problem : `${changing.length} will change${unchanged ? ` · ${unchanged} stay the same` : ""}`}</span>
            <span>Old → new</span>
          </div>
          <ul>
            {rows.slice(0, SHOW).map(({ p, next }) => (
              <li key={p.id}>
                <span title={p.name}>{p.name}</span>
                <b>
                  {next !== p.price ? (
                    <>
                      <s>{rupees(p.price)}</s>
                      <span className={next > p.price ? "up" : "down"}>{rupees(next)}</span>
                    </>
                  ) : (
                    <span className="pc-muted">{rupees(p.price)}</span>
                  )}
                </b>
              </li>
            ))}
          </ul>
          {rows.length > SHOW && <div className="pc-preview-more">…and {rows.length - SHOW} more</div>}
        </div>
        <p className="pc-note" style={{ margin: "10px 0 12px" }}>
          Quotations already made keep their rates. When you next quote one of these at a different rate, its price follows that rate, as it does today.
        </p>
      </div>
      <div className="pc-dlg-foot">
        <span className="pc-foot-gap" />
        <button type="button" className="pc-btn ghost" onClick={() => onClose(false)} disabled={saving}>
          Cancel
        </button>
        <button type="button" className="pc-btn primary" onClick={apply} disabled={saving || !!problem || !changing.length}>
          {saving ? <Spin size="small" /> : <CheckOutlined />} {changing.length ? `Update ${changing.length} price${changing.length === 1 ? "" : "s"}` : "Nothing to change"}
        </button>
      </div>
    </Modal>
  );
};

export default PriceChange;
