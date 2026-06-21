import React from "react";
import { Select } from "antd";
import {
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  BankOutlined,
  UserOutlined,
  ShopOutlined,
} from "@ant-design/icons";

const { Option } = Select;

// ─── Styles ───────────────────────────────────────────────────────────────────
const FilterStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    .cf-root {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .cf-inner {
      background: #fff;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,.06);
      padding: 12px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    /* ── Search ── */
    .cf-search-wrap {
      position: relative;
      flex: 1;
      min-width: 200px;
    }
    .cf-search-icon {
      position: absolute;
      left: 11px;
      top: 50%;
      transform: translateY(-50%);
      color: #9CA3AF;
      font-size: 14px;
      pointer-events: none;
    }
    .cf-search {
      width: 100%;
      padding: 8px 12px 8px 34px;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      font-size: 13px;
      font-family: 'Inter', sans-serif;
      color: #111827;
      background: #FAFAFA;
      outline: none;
      transition: border-color .15s, box-shadow .15s;
    }
    .cf-search:focus {
      border-color: #4F46E5;
      box-shadow: 0 0 0 3px rgba(79,70,229,.1);
      background: #fff;
    }
    .cf-search::placeholder { color: #9CA3AF; }

    /* ── Select wrap ── */
    .cf-select-wrap {
      position: relative;
      min-width: 148px;
    }
    .cf-select-icon {
      position: absolute;
      left: 11px;
      top: 50%;
      transform: translateY(-50%);
      color: #9CA3AF;
      font-size: 13px;
      pointer-events: none;
      z-index: 1;
    }
    .cf-root .cf-select-wrap .ant-select-selector {
      padding-left: 30px !important;
      font-family: 'Inter', sans-serif !important;
      font-size: 13px !important;
      border-radius: 8px !important;
      border-color: #E5E7EB !important;
      background: #FAFAFA !important;
      height: 36px !important;
      display: flex !important;
      align-items: center !important;
    }
    .cf-root .cf-select-wrap .ant-select-selector:hover,
    .cf-root .cf-select-wrap .ant-select-focused .ant-select-selector {
      border-color: #4F46E5 !important;
      box-shadow: 0 0 0 3px rgba(79,70,229,.1) !important;
      background: #fff !important;
    }
    .cf-root .cf-select-wrap .ant-select-selection-placeholder {
      color: #9CA3AF !important;
      font-size: 13px !important;
    }

    /* ── Divider ── */
    .cf-divider {
      width: 1px;
      height: 20px;
      background: #E5E7EB;
      flex-shrink: 0;
    }

    /* ── Active filters pill ── */
    .cf-active-count {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      background: #EEF2FF;
      color: #4F46E5;
      border-radius: 99px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }

    /* ── Reset button ── */
    .cf-reset-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      background: #FAFAFA;
      color: #6B7280;
      font-size: 12px;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      transition: all .12s;
      white-space: nowrap;
    }
    .cf-reset-btn:hover {
      background: #FEF2F2;
      border-color: #FECACA;
      color: #DC2626;
    }

    @media (max-width: 768px) {
      .cf-inner { gap: 8px; }
      .cf-search-wrap { min-width: 0; }
      .cf-select-wrap { min-width: 0; flex: 1; }
      .cf-divider { display: none; }
    }
    @media (max-width: 480px) {
      .cf-search-wrap,
      .cf-select-wrap { flex: 1 1 calc(50% - 4px); }
    }
  `}</style>
);

// ─── Props ────────────────────────────────────────────────────────────────────
interface CustomerFiltersProps {
  filters: any;
  onChange: (key: string, value: any) => void;
  onReset: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
const CustomerFilters: React.FC<CustomerFiltersProps> = ({
  filters,
  onChange,
  onReset,
}) => {
  // Count active filters (excluding search which has its own visible input)
  const activeCount = [
    filters.customer_type,
    filters.industry,
    filters.is_active !== undefined && filters.is_active !== null ? true : false,
  ].filter(Boolean).length;

  return (
    <>
      <FilterStyles />
      <div className="cf-root">
        <div className="cf-inner">
          {/* ── Search ── */}
          <div className="cf-search-wrap">
            <SearchOutlined className="cf-search-icon" />
            <input
              className="cf-search"
              placeholder="Search by name, email, phone, GST…"
              value={filters.search || ""}
              onChange={(e) => onChange("search", e.target.value)}
            />
          </div>

          <div className="cf-divider" />

          {/* ── Customer type ── */}
          <div className="cf-select-wrap">
            <FilterOutlined className="cf-select-icon" />
            <Select
              allowClear
              style={{ width: "100%" }}
              placeholder="All Types"
              value={filters.customer_type || undefined}
              onChange={(v) => onChange("customer_type", v)}
              dropdownStyle={{ fontFamily: "'Inter', sans-serif" }}
            >
              <Option value="BUSINESS">
                <BankOutlined style={{ marginRight: 6, color: "#1D4ED8" }} />
                Business
              </Option>
              <Option value="INDIVIDUAL">
                <UserOutlined style={{ marginRight: 6, color: "#059669" }} />
                Individual
              </Option>
            </Select>
          </div>

          {/* ── Industry ── */}
          <div className="cf-select-wrap">
            <ShopOutlined className="cf-select-icon" />
            <Select
              allowClear
              showSearch
              style={{ width: "100%" }}
              placeholder="All Industries"
              value={filters.industry || undefined}
              onChange={(v) => onChange("industry", v)}
              dropdownStyle={{ fontFamily: "'Inter', sans-serif" }}
            >
              <Option value="IT">IT</Option>
              <Option value="MANUFACTURING">Manufacturing</Option>
              <Option value="PHARMA">Pharma</Option>
              <Option value="CONSTRUCTION">Construction</Option>
              <Option value="AUTOMOBILE">Automobile</Option>
              <Option value="FMCG">FMCG</Option>
              <Option value="TEXTILE">Textile</Option>
              <Option value="OTHER">Other</Option>
            </Select>
          </div>

          {/* ── Status ── */}
          <div className="cf-select-wrap" style={{ minWidth: 120 }}>
            <div className="cf-select-icon" style={{ left: 11 }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="6.5" cy="6.5" r="5.5" stroke="#9CA3AF" strokeWidth="1.2" />
                <circle cx="6.5" cy="6.5" r="2.5" fill="#9CA3AF" />
              </svg>
            </div>
            <Select
              allowClear
              style={{ width: "100%" }}
              placeholder="Any Status"
              value={
                filters.is_active !== undefined && filters.is_active !== null
                  ? filters.is_active
                  : undefined
              }
              onChange={(v) => onChange("is_active", v)}
              dropdownStyle={{ fontFamily: "'Inter', sans-serif" }}
            >
              <Option value={1}>
                <span
                  style={{
                    display: "inline-block",
                    width: 7, height: 7,
                    borderRadius: "50%",
                    background: "#059669",
                    marginRight: 7,
                    verticalAlign: "middle",
                  }}
                />
                Active
              </Option>
              <Option value={0}>
                <span
                  style={{
                    display: "inline-block",
                    width: 7, height: 7,
                    borderRadius: "50%",
                    background: "#D1D5DB",
                    marginRight: 7,
                    verticalAlign: "middle",
                  }}
                />
                Inactive
              </Option>
            </Select>
          </div>

          {/* ── Active count + Reset ── */}
          {activeCount > 0 && (
            <div className="cf-active-count">
              <FilterOutlined style={{ fontSize: 10 }} />
              {activeCount} filter{activeCount !== 1 ? "s" : ""}
            </div>
          )}

          <button className="cf-reset-btn" type="button" onClick={onReset}>
            <ReloadOutlined style={{ fontSize: 12 }} />
            Reset
          </button>
        </div>
      </div>
    </>
  );
};

export default CustomerFilters;