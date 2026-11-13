import React, { useMemo, useState } from "react";
import { DatePicker } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { CalendarOutlined, StopOutlined } from "@ant-design/icons";
import { whenLabel } from "../constants";

export interface QuickPick {
  key: string;
  label: string;
  at: Dayjs;
}

/** Sensible next-step times for a salesperson, relative to now. */
export const quickPicks = (now = dayjs()): QuickPick[] => {
  const at = (d: Dayjs, h: number, m = 0) => d.hour(h).minute(m).second(0).millisecond(0);
  const picks: QuickPick[] = [];
  if (now.hour() < 18) picks.push({ key: "2h", label: "In 2 hours", at: now.add(2, "hour").second(0).millisecond(0) });
  if (now.hour() < 17) picks.push({ key: "eve", label: "This evening", at: at(now, 18) });
  picks.push({ key: "tom", label: "Tomorrow 11 AM", at: at(now.add(1, "day"), 11) });
  picks.push({ key: "2d", label: "In 2 days", at: at(now.add(2, "day"), 11) });
  const monday = now.day() === 0 ? now.add(1, "day") : now.add(8 - now.day(), "day");
  picks.push({ key: "wk", label: "Next week", at: at(monday, 11) });
  return picks;
};

interface Props {
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  /** Show a "No follow-up" choice (clears it). */
  allowNone?: boolean;
  size?: "sm" | "md";
}

const FollowUpPicker: React.FC<Props> = ({ value, onChange, allowNone, size = "md" }) => {
  const picks = useMemo(() => quickPicks(), []);
  const [custom, setCustom] = useState(false);
  const matched = value ? picks.find((p) => Math.abs(p.at.valueOf() - dayjs(value).valueOf()) < 60_000) : null;
  const showCustom = custom || (!!value && !matched);

  return (
    <div className={`crm-fupick ${size}`}>
      <div className="crm-fupick-chips" role="radiogroup" aria-label="Next follow-up">
        {picks.map((p) => (
          <button
            type="button"
            key={p.key}
            role="radio"
            aria-checked={matched?.key === p.key}
            className={`crm-chip${matched?.key === p.key ? " on" : ""}`}
            onClick={() => {
              setCustom(false);
              onChange(p.at.toISOString());
            }}
            title={whenLabel(p.at.toISOString())}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          role="radio"
          aria-checked={showCustom}
          className={`crm-chip${showCustom ? " on" : ""}`}
          onClick={() => setCustom(true)}
        >
          <CalendarOutlined /> Pick a time
        </button>
        {allowNone && (
          <button
            type="button"
            role="radio"
            aria-checked={value === null}
            className={`crm-chip muted${value === null ? " on" : ""}`}
            onClick={() => {
              setCustom(false);
              onChange(null);
            }}
          >
            <StopOutlined /> No follow-up
          </button>
        )}
      </div>
      {showCustom && (
        <DatePicker
          className="crm-fupick-date"
          showTime={{ format: "h:mm A", use12Hours: true, minuteStep: 5 }}
          format="ddd, D MMM YYYY · h:mm A"
          value={value ? dayjs(value) : null}
          disabledDate={(d) => d.isBefore(dayjs().startOf("day"))}
          onChange={(d) => onChange(d ? d.second(0).millisecond(0).toISOString() : null)}
          placeholder="Choose date and time"
          allowClear={false}
          needConfirm={false}
        />
      )}
      {value && <div className="crm-fupick-when">Next follow-up: <b>{whenLabel(value)}</b></div>}
    </div>
  );
};

export default FollowUpPicker;
