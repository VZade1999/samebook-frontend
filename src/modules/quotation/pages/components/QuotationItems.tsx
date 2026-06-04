import React, { useState } from "react";
import { Button, Card, Form, AutoComplete, InputNumber } from "antd";
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

const QuotationItems = () => {
  const form = Form.useFormInstance();
  const [itemOptions, setItemOptions] = useState<any[]>([]);

  // Handle item name search and auto-suggestion
  const handleItemNameSearch = (value: string) => {
    if (!value.trim()) {
      setItemOptions([]);
      return;
    }

    const filtered = mockItems.filter((item) =>
      item.name.toLowerCase().includes(value.toLowerCase())
    );

    const options = filtered.map((item) => ({
      label: item.name,
      value: item.name,
    }));

    setItemOptions(options);
  };

  // Get auto-complete options for item names
  const getItemNameOptions = (searchValue: string) => {
    if (!searchValue) {
      return [];
    }

    const filtered = mockItems.filter((item) =>
      item.name.toLowerCase().includes(searchValue.toLowerCase())
    );

    return filtered.map((item) => ({
      label: item.name,
      value: item.name,
    }));
  };

  // Calculate item total when quantity, price, or discount changes
  const handleItemChange = (fieldName: string, index: number) => {
    const items = form.getFieldValue("items") || [];
    const item = items[index];

    if (item) {
      const quantity = item.quantity || 0;
      const price = item.price || 0;
      const discount = item.discount || 0;

      // Calculate discounted price
      const discountAmount = (price * discount) / 100;
      const discountedPrice = price - discountAmount;

      // Calculate total
      const total = quantity * discountedPrice;

      // Update form fields
      form.setFieldsValue({
        items: items.map((itemData: any, itemIndex: number) => {
          if (itemIndex === index) {
            return {
              ...itemData,
              discounted_price: parseFloat(discountedPrice.toFixed(2)),
              total: parseFloat(total.toFixed(2)),
            };
          }
          return itemData;
        }),
      });

      // Calculate and update subTotal
      calculateAndUpdateSubTotal();
    }
  };

  // Calculate total of all items and update subTotal
  const calculateAndUpdateSubTotal = () => {
    const items = form.getFieldValue("items") || [];
    const subTotal = items.reduce((sum: number, item: any) => {
      return sum + (item.total || 0);
    }, 0);

    form.setFieldsValue({
      subTotal: parseFloat(subTotal.toFixed(2)),
    });
  };

  return (
    <Card title="Quotation Items" className="section-card">
      <Form.List name="items">
        {(fields, { add, remove }) => (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f0f0f0" }}>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        width: "18%",
                        backgroundColor: "#fafafa",
                        fontWeight: 600,
                      }}
                    >
                      Item Name
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        width: "10%",
                        backgroundColor: "#fafafa",
                        fontWeight: 600,
                      }}
                    >
                      Qty
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        width: "12%",
                        backgroundColor: "#fafafa",
                        fontWeight: 600,
                      }}
                    >
                      Price
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        width: "12%",
                        backgroundColor: "#fafafa",
                        fontWeight: 600,
                      }}
                    >
                      Discount (%)
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        width: "18%",
                        backgroundColor: "#fafafa",
                        fontWeight: 600,
                      }}
                    >
                      Discounted Price
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        width: "14%",
                        backgroundColor: "#fafafa",
                        fontWeight: 600,
                      }}
                    >
                      Total
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "center",
                        width: "8%",
                        backgroundColor: "#fafafa",
                        fontWeight: 600,
                      }}
                    >
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map(({ key, name, ...restField }, index) => (
                    <tr key={key} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "8px" }}>
                        <Form.Item
                          {...restField}
                          name={[name, "itemName"]}
                          rules={[
                            {
                              required: true,
                              message: "Please enter item name",
                            },
                          ]}
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
                      </td>
                      <td style={{ padding: "8px" }}>
                        <Form.Item
                          {...restField}
                          name={[name, "quantity"]}
                          rules={[
                            {
                              required: true,
                              message: "Required",
                            },
                          ]}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber
                            min={1}
                            style={{ width: "100%" }}
                            size="small"
                            onChange={() => handleItemChange("quantity", index)}
                          />
                        </Form.Item>
                      </td>
                      <td style={{ padding: "8px" }}>
                        <Form.Item
                          {...restField}
                          name={[name, "price"]}
                          rules={[
                            {
                              required: true,
                              message: "Required",
                            },
                          ]}
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
                                  items: items.map((item: any, idx: number) => {
                                    if (idx === index) {
                                      return { ...item, discount: 0 };
                                    }
                                    return item;
                                  }),
                                });
                              }
                              handleItemChange("price", index);
                            }}
                          />
                        </Form.Item>
                      </td>
                      <td style={{ padding: "8px" }}>
                        <Form.Item
                          {...restField}
                          name={[name, "discount"]}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber
                            min={0}
                            max={100}
                            step={0.01}
                            style={{ width: "100%" }}
                            size="small"
                            onChange={() => handleItemChange("discount", index)}
                          />
                        </Form.Item>
                      </td>
                      <td style={{ padding: "8px" }}>
                        <Form.Item
                          {...restField}
                          name={[name, "discounted_price"]}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber
                            min={0}
                            step={0.01}
                            style={{ width: "100%" }}
                            size="small"
                            disabled
                          />
                        </Form.Item>
                      </td>
                      <td style={{ padding: "8px" }}>
                        <Form.Item
                          {...restField}
                          name={[name, "total"]}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber
                            min={0}
                            step={0.01}
                            style={{ width: "100%" }}
                            size="small"
                            disabled
                          />
                        </Form.Item>
                      </td>
                      <td style={{ padding: "8px", textAlign: "center" }}>
                        <Button
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => {
                            remove(name);
                            setTimeout(() => {
                              calculateAndUpdateSubTotal();
                            }, 0);
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
