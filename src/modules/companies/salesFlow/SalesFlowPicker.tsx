import React, { useState } from "react";
import { message, Spin } from "antd";
import {
  ApartmentOutlined,
  AppstoreOutlined,
  CarOutlined,
  CheckCircleFilled,
  NodeIndexOutlined,
  ShoppingOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import { useAccess } from "@/permissions/useAccess";
import { SALES_FLOWS, SALES_FLOW_INFO, type SalesFlow, useSalesFlow } from "./salesFlow";
import "./salesFlow.scss";

const ICON: Record<SalesFlow, React.ReactNode> = {
  WITH_GOODS: <ShoppingOutlined />,
  SEND_FIRST: <CarOutlined />,
  BILL_FIRST: <ApartmentOutlined />,
  SERVICES: <ToolOutlined />,
  ALL: <AppstoreOutlined />,
};

const apiError = (e: any, fallback: string) => e?.response?.data?.message || e?.message || fallback;

/** The five ways of selling as cards; read-only without onPick. */
export const SalesFlowPicker: React.FC<{
  value: SalesFlow | null;
  onPick?: (flow: SalesFlow) => void;
  busy?: SalesFlow | null;
}> = ({ value, onPick, busy }) => (
  <div className={`sf-grid${onPick ? "" : " readonly"}`} role="radiogroup" aria-label="How do you sell?">
    {SALES_FLOWS.map((f, i) => {
      const info = SALES_FLOW_INFO[f];
      const on = value === f;
      const body = (
        <>
          <span className="sf-top">
            <span className="sf-icon">{busy === f ? <Spin size="small" /> : ICON[f]}</span>
            {on ? (
              <CheckCircleFilled className="sf-check" aria-hidden />
            ) : !value && f === "ALL" ? (
              <span className="sf-default">Default</span>
            ) : null}
          </span>
          <b className="sf-title">{info.title}</b>
          <span className="sf-text">{info.text}</span>
          <span className="sf-who">{info.who}</span>
          <span className="sf-effect">{info.effect}</span>
        </>
      );
      const cls = `sf-card ${f.toLowerCase()}${on ? " on" : ""}`;
      return onPick ? (
        <button
          key={f}
          type="button"
          role="radio"
          aria-checked={on}
          className={cls}
          style={{ ["--i" as any]: i }}
          disabled={!!busy}
          onClick={() => onPick(f)}
        >
          {body}
        </button>
      ) : (
        <div key={f} role="radio" aria-checked={on} aria-disabled className={cls} style={{ ["--i" as any]: i }}>
          {body}
        </div>
      );
    })}
  </div>
);

const usePick = () => {
  const { flow, known, save } = useSalesFlow();
  const [busy, setBusy] = useState<SalesFlow | null>(null);
  const pick = async (f: SalesFlow) => {
    if (busy || f === flow) return;
    setBusy(f);
    try {
      message.success(await save(f));
    } catch (e) {
      message.error(apiError(e, "Couldn't save — please try again"));
    } finally {
      setBusy(null);
    }
  };
  return { flow, known, busy, pick };
};

/** Company page → "How you sell". */
export const SalesFlowPanel: React.FC<{ canEdit: boolean }> = ({ canEdit }) => {
  const { flow, known, busy, pick } = usePick();
  return (
    <div className="sf-root">
      <SalesFlowPicker value={flow} onPick={canEdit ? pick : undefined} busy={busy} />
      {known && (
        <p className="sf-foot">
          {flow
            ? "Any document can still be made at any time — this only changes which button comes first."
            : "Not chosen yet, so everything shows."}
          {!canEdit && " Only someone who can edit the company can change this."}
        </p>
      )}
    </div>
  );
};

/** Dashboard: asks a company admin once, until a choice (or Skip) is saved. */
export const SalesFlowPrompt: React.FC = () => {
  const { can } = useAccess();
  const { flow, known, busy, pick } = usePick();
  if (!known || flow || !can("companies.edit")) return null;
  return (
    <section className="sf-root sf-prompt" aria-labelledby="sf-prompt-title">
      <div className="sf-prompt-head">
        <span className="sf-prompt-icon">
          <NodeIndexOutlined />
        </span>
        <div className="sf-prompt-titles">
          <h3 id="sf-prompt-title">How does your business sell?</h3>
          <p>Pick the closest one and SameBook puts the right button first. Nothing is ever blocked, and you can change it later on the Company page.</p>
        </div>
        <button type="button" className="sf-skip" onClick={() => pick("ALL")} disabled={!!busy}>
          Skip — show everything
        </button>
      </div>
      <SalesFlowPicker value={null} onPick={pick} busy={busy} />
    </section>
  );
};
