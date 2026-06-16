import React, { useState } from "react";
import { Button, Card, Form, AutoComplete, Input, InputNumber, Row, Col, Divider, Tag } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";

// Mock item data - replace with API call
const mockItems = [
  { id: 1, name: "Laptop" },
  { id: 2, name: "Desktop Computer" },
  { id: 3, name: "Monitor" },
  { id: 4, name: "Keyboard" },
  { id: 5, name: "Mouse" },
  { id: 6, name: "USB Cable" },
  { id: 7, name: "HDMI Cable" },
  { id: 8, name: "Power Supply" },
  { id: 9, name: "RAM Memory" },
  { id: 10, name: "Hard Drive" },
];

// CSS injected once at module level
const injectStyles = () => {
  const id = "quotation-items-styles";
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
    .qi-table-wrap { display: block; }
    .qi-cards-wrap { display: none; }

    @media (max-width: 767px) {
      .qi-table-wrap { display: none; }
      .qi-cards-wrap { display: block; }
    }

    .qi-item-card {
      border: 1px solid #e8e8e8;
      border-radius: 8px;
      padding: 14px 14px 6px;
      margin-bottom: 12px;
      background: #fafafa;
      position: relative;
    }

    .qi-item-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .qi-item-badge {
      font-size: 11px;
      font-weight: 600;
      color: #1677ff;
      background: #e6f4ff;
      border: 1px solid #91caff;
      border-radius: 12px;
      padding: 2px 10px;
      letter-spacing: 0.3px;
    }

    .qi-totals-row {
      display: flex;
      gap: 8px;
      margin-top: 4px;
    }

    .qi-total-box {
      flex: 1;
      background: #fff;
      border: 1px solid #e8e8e8;
      border-radius: 6px;
      padding: 6px 10px;
    }

    .qi-total-box-label {
      font-size: 10px;
      color: #8c8c8c;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .qi-total-box-value {
      font-size: 14px;
      font-weight: 600;
      color: #262626;
      margin-top: 1px;
    }

    /* tighten form items inside cards */
    .qi-item-card .ant-form-item {
      margin-bottom: 10px;
    }
    .qi-item-card .ant-form-item-label > label {
      font-size: 12px;
      color: #595959;
      height: auto;
    }
  `;
  document.head.appendChild(style);
};

injectStyles();

const QuotationItems = () => {
  const form = Form.useFormInstance();
  const [itemOptions, setItemOptions] = useState<any[]>([]);

  const handleItemNameSearch = (value: string) => {
    if (!value.trim()) { setItemOptions([]); return; }
    setItemOptions(
      mockItems
        .filter((item) => item.name.toLowerCase().includes(value.toLowerCase()))
        .map((item) => ({ label: item.name, value: item.name }))
    );
  };

  const handleItemChange = (_fieldName: string, index: number) => {
    const items = form.getFieldValue("items") || [];
    const item = items[index];
    if (!item) return;

    const quantity = item.quantity || 0;
    const price = item.price || 0;
    const discount = item.discount || 0;
    const discountedPrice = price - (price * discount) / 100;
    const total = quantity * discountedPrice;

    form.setFieldsValue({
      items: items.map((itemData: any, idx: number) =>
        idx === index
          ? {
              ...itemData,
              discounted_price: parseFloat(discountedPrice.toFixed(2)),
              total: parseFloat(total.toFixed(2)),
            }
          : itemData
      ),
    });

    calculateAndUpdateSubTotal();
  };

  const calculateAndUpdateSubTotal = () => {
    const items = form.getFieldValue("items") || [];
    const subTotal = items.reduce((sum: number, item: any) => sum + (item.total || 0), 0);
    form.setFieldsValue({ subTotal: parseFloat(subTotal.toFixed(2)) });
  };

  // Shared field renderers so logic isn't duplicated between table and card views
  const renderItemName = (name: number, restField: any) => (
    <Form.Item
      {...restField}
      name={[name, "itemName"]}
      rules={[{ required: true, message: "Please enter item name" }]}
      style={{ marginBottom: 0 }}
    >
      <AutoComplete
        placeholder="Type item name..."
        size="small"
        options={itemOptions}
        onSearch={handleItemNameSearch}
        filterOption={false}
        style={{ width: "100%" }}
        notFoundContent="No items found"
      />
    </Form.Item>
  );

  const renderHSN = (name: number, restField: any) => (
    <Form.Item
      {...restField}
      name={[name, "hsn_code"]}
      rules={[{ required: true, message: "Required" }]}
      style={{ marginBottom: 0 }}
    >
      <Input placeholder="HSN Code" style={{ width: "100%" }} size="small" />
    </Form.Item>
  );

  const renderQty = (name: number, restField: any, index: number) => (
    <Form.Item
      {...restField}
      name={[name, "quantity"]}
      rules={[{ required: true, message: "Required" }]}
      style={{ marginBottom: 0 }}
    >
      <InputNumber
        min={1}
        style={{ width: "100%" }}
        size="small"
        onChange={() => handleItemChange("quantity", index)}
      />
    </Form.Item>
  );

  const renderPrice = (name: number, restField: any, index: number) => (
    <Form.Item
      {...restField}
      name={[name, "price"]}
      rules={[{ required: true, message: "Required" }]}
      style={{ marginBottom: 0 }}
    >
      <InputNumber
        min={0}
        step={0.01}
        style={{ width: "100%" }}
        size="small"
        onChange={() => {
          const items = form.getFieldValue("items") || [];
          if (!items[index]?.discount) {
            form.setFieldsValue({
              items: items.map((item: any, idx: number) =>
                idx === index ? { ...item, discount: 0 } : item
              ),
            });
          }
          handleItemChange("price", index);
        }}
      />
    </Form.Item>
  );

  const renderDiscount = (name: number, restField: any, index: number) => (
    <Form.Item {...restField} name={[name, "discount"]} style={{ marginBottom: 0 }}>
      <InputNumber
        min={0}
        max={100}
        step={0.01}
        style={{ width: "100%" }}
        size="small"
        onChange={() => handleItemChange("discount", index)}
      />
    </Form.Item>
  );

  const renderDiscountedPrice = (name: number, restField: any) => (
    <Form.Item {...restField} name={[name, "discounted_price"]} style={{ marginBottom: 0 }}>
      <InputNumber min={0} step={0.01} style={{ width: "100%" }} size="small" disabled />
    </Form.Item>
  );

  const renderTotal = (name: number, restField: any) => (
    <Form.Item {...restField} name={[name, "total"]} style={{ marginBottom: 0 }}>
      <InputNumber min={0} step={0.01} style={{ width: "100%" }} size="small" disabled />
    </Form.Item>
  );

  const thStyle: React.CSSProperties = {
    padding: "12px",
    textAlign: "left",
    backgroundColor: "#fafafa",
    fontWeight: 600,
    whiteSpace: "nowrap",
  };

  return (
    <Card title="Quotation Items" className="section-card">
      <Form.List name="items">
        {(fields, { add, remove }) => (
          <>
            {/* ─── DESKTOP: Table layout ─────────────────────────────────── */}
            <div className="qi-table-wrap" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f0f0f0" }}>
                    <th style={{ ...thStyle, width: "18%" }}>Item Name</th>
                    <th style={{ ...thStyle, width: "18%" }}>HSN Code</th>
                    <th style={{ ...thStyle, width: "10%" }}>Qty</th>
                    <th style={{ ...thStyle, width: "12%" }}>Price</th>
                    <th style={{ ...thStyle, width: "12%" }}>Discount (%)</th>
                    <th style={{ ...thStyle, width: "18%" }}>Discounted Price</th>
                    <th style={{ ...thStyle, width: "14%" }}>Total</th>
                    <th style={{ ...thStyle, width: "8%", textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map(({ key, name, ...restField }, index) => (
                    <tr key={key} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "8px" }}>{renderItemName(name, restField)}</td>
                      <td style={{ padding: "8px" }}>{renderHSN(name, restField)}</td>
                      <td style={{ padding: "8px" }}>{renderQty(name, restField, index)}</td>
                      <td style={{ padding: "8px" }}>{renderPrice(name, restField, index)}</td>
                      <td style={{ padding: "8px" }}>{renderDiscount(name, restField, index)}</td>
                      <td style={{ padding: "8px" }}>{renderDiscountedPrice(name, restField)}</td>
                      <td style={{ padding: "8px" }}>{renderTotal(name, restField)}</td>
                      <td style={{ padding: "8px", textAlign: "center" }}>
                        <Button
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => { remove(name); setTimeout(calculateAndUpdateSubTotal, 0); }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ─── MOBILE: Card-per-item layout ─────────────────────────── */}
            <div className="qi-cards-wrap">
              {fields.map(({ key, name, ...restField }, index) => (
                <div key={key} className="qi-item-card">
                  {/* Card header: Item # badge + Delete */}
                  <div className="qi-item-card-header">
                    <span className="qi-item-badge">Item {index + 1}</span>
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => { remove(name); setTimeout(calculateAndUpdateSubTotal, 0); }}
                    />
                  </div>

                  {/* Row 1: Item Name (full width) */}
                  <Form.Item
                    {...restField}
                    label="Item Name"
                    name={[name, "itemName"]}
                    rules={[{ required: true, message: "Please enter item name" }]}
                  >
                    <AutoComplete
                      placeholder="Type item name..."
                      options={itemOptions}
                      onSearch={handleItemNameSearch}
                      filterOption={false}
                      style={{ width: "100%" }}
                      notFoundContent="No items found"
                    />
                  </Form.Item>

                  {/* Row 2: HSN Code + Qty */}
                  <Row gutter={12}>
                    <Col span={14}>
                      <Form.Item
                        {...restField}
                        label="HSN Code"
                        name={[name, "hsn_code"]}
                        rules={[{ required: true, message: "Required" }]}
                      >
                        <Input placeholder="HSN Code" style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col span={10}>
                      <Form.Item
                        {...restField}
                        label="Qty"
                        name={[name, "quantity"]}
                        rules={[{ required: true, message: "Required" }]}
                      >
                        <InputNumber
                          min={1}
                          style={{ width: "100%" }}
                          onChange={() => handleItemChange("quantity", index)}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  {/* Row 3: Price + Discount */}
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item
                        {...restField}
                        label="Price (₹)"
                        name={[name, "price"]}
                        rules={[{ required: true, message: "Required" }]}
                      >
                        <InputNumber
                          min={0}
                          step={0.01}
                          style={{ width: "100%" }}
                          onChange={() => {
                            const items = form.getFieldValue("items") || [];
                            if (!items[index]?.discount) {
                              form.setFieldsValue({
                                items: items.map((item: any, idx: number) =>
                                  idx === index ? { ...item, discount: 0 } : item
                                ),
                              });
                            }
                            handleItemChange("price", index);
                          }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        {...restField}
                        label="Discount (%)"
                        name={[name, "discount"]}
                      >
                        <InputNumber
                          min={0}
                          max={100}
                          step={0.01}
                          style={{ width: "100%" }}
                          onChange={() => handleItemChange("discount", index)}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  {/* Row 4: Computed totals — read-only summary boxes */}
                  <div className="qi-totals-row">
                    <div className="qi-total-box">
                      <div className="qi-total-box-label">Discounted Price</div>
                      <Form.Item
                        {...restField}
                        name={[name, "discounted_price"]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber
                          min={0}
                          step={0.01}
                          style={{ width: "100%", border: "none", background: "transparent", boxShadow: "none", padding: 0, fontWeight: 600 }}
                          disabled
                          bordered={false}
                        />
                      </Form.Item>
                    </div>
                    <div className="qi-total-box" style={{ background: "#f0f9ff", borderColor: "#bae0ff" }}>
                      <div className="qi-total-box-label" style={{ color: "#0958d9" }}>Total</div>
                      <Form.Item
                        {...restField}
                        name={[name, "total"]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber
                          min={0}
                          step={0.01}
                          style={{ width: "100%", border: "none", background: "transparent", boxShadow: "none", padding: 0, fontWeight: 700, color: "#0958d9" }}
                          disabled
                          bordered={false}
                        />
                      </Form.Item>
                    </div>
                  </div>
                </div>
              ))}

              {fields.length === 0 && (
                <div style={{ textAlign: "center", color: "#bfbfbf", padding: "24px 0", fontSize: 13 }}>
                  No items added yet. Tap below to add your first item.
                </div>
              )}
            </div>

            <Button
              type="dashed"
              onClick={() => add()}
              block
              icon={<PlusOutlined />}
              style={{ marginTop: "16px" }}
            >
              Add Item
            </Button>
          </>
        )}
      </Form.List>
    </Card>
  );
};

export default QuotationItems;