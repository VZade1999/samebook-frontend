import React, { useEffect } from "react";
import { Form, Select, Tooltip } from "antd";
import { NumberOutlined } from "@ant-design/icons";
import type { FormInstance } from "antd";
import { useActiveSeries } from "./numberingService";
import type { DocType } from "./rules";
import "./numbering.scss";

/**
 * "Numbered as …" line for a new document's form. Shows nothing while the
 * company uses the standard format; one series → the number it will get;
 * several → a picker (the default is preselected). The value goes into the
 * form field `name` (sent to the API as series_id; omitted = default).
 */
const SeriesField: React.FC<{
  docType: DocType;
  form: FormInstance;
  name?: string;
  /** Wrap the field, e.g. in a form's own label markup. Not called when there is nothing to show. */
  wrap?: (field: React.ReactNode, label: string) => React.ReactNode;
  className?: string;
}> = ({ docType, form, name = "series_id", wrap, className }) => {
  // Fresh on every open: next numbers move as documents are made.
  const { series } = useActiveSeries(docType, true, true);
  const value = Form.useWatch(name, form);
  const def = series[0];

  // Keep the chosen series valid (e.g. archived in another tab).
  useEffect(() => {
    if (!series.length) return;
    if (value == null || !series.some((s) => s.id === value)) form.setFieldValue(name, def?.id);
  }, [series, value, def, form, name]);

  if (!series.length) return null;
  const chosen = series.find((s) => s.id === value) || def;
  const label = "Numbering series";

  const field =
    series.length === 1 ? (
      <div className={`nm-field-one ${className || ""}`}>
        <Form.Item name={name} hidden>
          <input type="hidden" />
        </Form.Item>
        <NumberOutlined />
        <span>
          Will be numbered <b className="nm-mono">{chosen.next_preview}</b>
        </span>
        <Tooltip title={`From the “${chosen.name}” series. The exact number is given when you save — if someone else saves first, you get the next one.`}>
          <em>{chosen.name}</em>
        </Tooltip>
      </div>
    ) : (
      <Form.Item
        name={name}
        className={className}
        label={wrap ? undefined : label}
        extra={
          <span className="nm-field-extra">
            Next number <b className="nm-mono">{chosen.next_preview}</b>
          </span>
        }
      >
        <Select
          options={series.map((s) => ({
            value: s.id,
            label: (
              <span className="nm-opt">
                <span>{s.name}</span>
                <span className="nm-mono nm-opt-next">{s.next_preview}</span>
                {s.is_default && <span className="nm-opt-def">Default</span>}
              </span>
            ),
          }))}
        />
      </Form.Item>
    );

  return <>{wrap && series.length > 1 ? wrap(field, label) : field}</>;
};

export default SeriesField;
