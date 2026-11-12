import React from "react";
import { DatePicker, Dropdown, Tooltip } from "antd";
import { CalendarOutlined, CheckOutlined, DownOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { PRESETS, type PresetKey, rangeText } from "../utils/dates";
import { ago } from "../utils/format";

const MAIN: PresetKey[] = ["today", "7d", "30d", "mtd", "qtd", "fytd"];

interface Props {
  preset: PresetKey;
  custom: [string, string] | null;
  onPreset: (k: PresetKey) => void;
  onCustom: (r: [string, string]) => void;
  compare: { from: string; to: string } | null;
  loading: boolean;
  updatedAt: string | null;
  onRefresh: () => void;
  today: Dayjs;
}

/**
 * One row above everything it scopes: date presets first, a custom range
 * behind them, the comparison period spelled out, and refresh.
 */
const FilterBar: React.FC<Props> = ({ preset, custom, onPreset, onCustom, compare, loading, updatedAt, onRefresh, today }) => {
  const more = PRESETS.filter((p) => !MAIN.includes(p.key));
  const moreActive = more.find((p) => p.key === preset);

  return (
    <div className={`db-filter${loading ? " loading" : ""}`}>
      <div className="db-presets" role="group" aria-label="Period">
        {PRESETS.filter((p) => MAIN.includes(p.key)).map((p) => (
          <button
            key={p.key}
            className={`db-preset${preset === p.key ? " active" : ""}`}
            aria-pressed={preset === p.key}
            onClick={() => onPreset(p.key)}
            title={p.label}
          >
            {p.short}
          </button>
        ))}
        <Dropdown
          trigger={["click"]}
          menu={{
            items: more.map((p) => ({
              key: p.key,
              label: (
                <span className="db-menu-row">
                  <span>{p.label}</span>
                  {preset === p.key && <CheckOutlined />}
                </span>
              ),
            })),
            onClick: ({ key }) => onPreset(key as PresetKey),
          }}
        >
          <button className={`db-preset${moreActive ? " active" : ""}`} aria-haspopup="menu">
            {moreActive ? moreActive.short : "More"} <DownOutlined className="db-caret" />
          </button>
        </Dropdown>
      </div>

      <DatePicker.RangePicker
        className={`db-range${preset === "custom" ? " active" : ""}`}
        value={custom ? [dayjs(custom[0]), dayjs(custom[1])] : null}
        format="D MMM YYYY"
        allowClear={false}
        suffixIcon={<CalendarOutlined />}
        placeholder={["Custom from", "to"]}
        disabledDate={(d) => d.isAfter(today, "day") || d.isBefore(today.subtract(5, "year"), "day")}
        presets={[
          { label: "Last 6 months", value: [today.subtract(6, "month").add(1, "day"), today] },
          { label: "Last 12 months", value: [today.subtract(12, "month").add(1, "day"), today] },
          { label: "This calendar year", value: [today.startOf("year"), today] },
        ]}
        onChange={(v) => {
          if (v && v[0] && v[1]) onCustom([v[0].format("YYYY-MM-DD"), v[1].format("YYYY-MM-DD")]);
        }}
      />

      <div className="db-filter-right">
        {compare && (
          <span className="db-compare" title="Changes are shown against this period">
            vs <b>{rangeText(compare.from, compare.to)}</b>
          </span>
        )}
        <Tooltip title={updatedAt ? `Updated ${ago(updatedAt)} · refresh` : "Refresh"}>
          <button className="db-icon-btn" onClick={onRefresh} aria-label="Refresh" disabled={loading}>
            <ReloadOutlined spin={loading} />
          </button>
        </Tooltip>
      </div>
      <span className="db-filter-progress" aria-hidden />
    </div>
  );
};

export default FilterBar;
