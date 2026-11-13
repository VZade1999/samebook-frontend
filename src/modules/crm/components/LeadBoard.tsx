import React, { useState } from "react";
import { Tooltip } from "antd";
import { CloseCircleFilled, InboxOutlined, TrophyFilled, UserOutlined } from "@ant-design/icons";
import { inrCompact } from "@/modules/dashboard/utils/format";
import { Lead, STAGE, StageKey, ago } from "../constants";
import { Avatar, FollowUpChip, Money, RatingBadge, SourceChip } from "./Bits";

export interface BoardColumn {
  stage: StageKey;
  label: string;
  count: number;
  value: number;
  items: Lead[];
}

interface CardProps {
  lead: Lead;
  onOpen: (id: number) => void;
  dragging: boolean;
  onDragStart?: (e: React.DragEvent, lead: Lead) => void;
  onDragEnd?: () => void;
}

export const LeadCard: React.FC<CardProps> = ({ lead, onOpen, dragging, onDragStart, onDragEnd }) => {
  const closed = lead.stage === "WON" || lead.stage === "LOST";
  return (
    <article
      className={`crm-card${dragging ? " dragging" : ""}${lead.follow_up_state === "OVERDUE" ? " late" : ""}`}
      draggable={!!onDragStart && lead.can.work}
      onDragStart={(e) => onDragStart?.(e, lead)}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(lead.id)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen(lead.id))}
      tabIndex={0}
      role="button"
      aria-label={`${lead.key} ${lead.name}${lead.company_name ? `, ${lead.company_name}` : ""}`}
    >
      <div className="crm-card-top">
        <div className="crm-card-id">
          <b title={lead.name}>{lead.name}</b>
          <small>{lead.company_name || [lead.city, lead.state].filter(Boolean).join(", ") || lead.key}</small>
        </div>
        <RatingBadge rating={lead.rating} />
      </div>
      {lead.requirement && <p className="crm-card-req">{lead.requirement}</p>}
      {lead.stage === "LOST" && lead.lost_reason && <p className="crm-card-reason">{lead.lost_reason}</p>}
      <div className="crm-card-foot">
        <SourceChip source={lead.source} detail={lead.source_detail} compact />
        <Money value={lead.estimated_value} compact />
        {!closed && <FollowUpChip lead={lead} showNone />}
        {closed && <span className="crm-card-when">{ago(lead.won_at || lead.lost_at)}</span>}
        <span className="crm-spacer" />
        {lead.enquiry_count > 1 && (
          <Tooltip title={`Enquired ${lead.enquiry_count} times`}>
            <span className="crm-badge hot sm">{lead.enquiry_count}×</span>
          </Tooltip>
        )}
        {lead.owner ? (
          <Avatar name={lead.owner.name} seed={lead.owner.id} size={22} title={`Owner: ${lead.owner.name}`} />
        ) : (
          <Tooltip title="Unassigned — anyone can take it">
            <span className="crm-avatar empty sm">
              <UserOutlined />
            </span>
          </Tooltip>
        )}
      </div>
    </article>
  );
};

interface Props {
  columns: BoardColumn[];
  onOpen: (id: number) => void;
  onMove: (lead: Lead, to: StageKey) => void;
  closedDays: number;
}

/** Kanban of the pipeline. Drag a card to another column to move it. */
const LeadBoard: React.FC<Props> = ({ columns, onOpen, onMove, closedDays }) => {
  const [drag, setDrag] = useState<Lead | null>(null);
  const [over, setOver] = useState<StageKey | null>(null);

  return (
    <div className="crm-board" role="list" aria-label="Pipeline">
      {columns.map((c) => {
        const s = STAGE[c.stage];
        const closed = c.stage === "WON" || c.stage === "LOST";
        const canDrop = !!drag && drag.stage !== c.stage;
        return (
          <section
            key={c.stage}
            role="listitem"
            className={`crm-col${closed ? " closed" : ""}${over === c.stage && canDrop ? " over" : ""}${drag && !canDrop ? " dim" : ""}`}
            style={{ ["--stage" as any]: s.color }}
            onDragOver={(e) => {
              if (!canDrop) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (over !== c.stage) setOver(c.stage);
            }}
            onDragLeave={(e) => {
              if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setOver((o) => (o === c.stage ? null : o));
            }}
            onDrop={(e) => {
              e.preventDefault();
              const lead = drag;
              setDrag(null);
              setOver(null);
              if (lead && lead.stage !== c.stage) onMove(lead, c.stage);
            }}
          >
            <header className="crm-col-head">
              <div className="crm-col-title">
                <i />
                <span>{s.label}</span>
                <b>{c.count}</b>
              </div>
              <div className="crm-col-sub">
                {closed ? (
                  <span>
                    {c.stage === "WON" ? <TrophyFilled /> : <CloseCircleFilled />} last {closedDays} days
                  </span>
                ) : (
                  <span>{s.hint}</span>
                )}
                {c.value > 0 && <em>{inrCompact(c.value)}</em>}
              </div>
            </header>
            <div className="crm-col-body">
              {c.items.length === 0 ? (
                <div className="crm-col-empty">
                  <InboxOutlined />
                  <span>{drag && canDrop ? `Drop here to move to ${s.label}` : closed ? "Nothing yet" : "No leads here"}</span>
                </div>
              ) : (
                c.items.map((l) => (
                  <LeadCard
                    key={l.id}
                    lead={l}
                    onOpen={onOpen}
                    dragging={drag?.id === l.id}
                    onDragStart={(e, lead) => {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", String(lead.id));
                      setDrag(lead);
                    }}
                    onDragEnd={() => {
                      setDrag(null);
                      setOver(null);
                    }}
                  />
                ))
              )}
              {c.count > c.items.length && (
                <div className="crm-col-more">+{c.count - c.items.length} more — use the list view or a filter</div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default LeadBoard;
