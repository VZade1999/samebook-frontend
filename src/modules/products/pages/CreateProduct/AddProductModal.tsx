import React from "react";
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Button,
  Row,
  Col,
  Tabs,
  Card,
  Table,
  Popconfirm,
  Spin,
} from "antd";
import { DeleteOutlined, PlusOutlined, ShopOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { createProduct } from "../../redux/productActions";
import { StorageService } from "@/storage";

// ─── Global Styles ────────────────────────────────────────────────────────────
// Mirrors EditCompanyModal/EditCustomerModal's design system (.eco-*/.ecm-*)
// under a .prdm- prefix so this modal reads as part of the same app.
const ModalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    .prdm-root { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; color: var(--foreground); }

    .prdm-modal .ant-modal-content { border-radius: 16px !important; overflow: hidden !important; padding: 0 !important; box-shadow: 0 20px 60px rgba(0,0,0,.22) !important; }
    .prdm-modal .ant-modal-header { display: none !important; }
    .prdm-modal .ant-modal-body   { padding: 0 !important; }
    .prdm-modal .ant-modal-close  { display: none !important; }

    .prdm-header {
      background: #1E1B4B; padding: 20px 24px;
      display: flex; align-items: center; justify-content: space-between;
      position: relative; overflow: hidden;
    }
    .prdm-header::after {
      content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 16px;
      background: var(--card); border-radius: 16px 16px 0 0;
    }
    .prdm-header-noise {
      position: absolute; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
      pointer-events: none;
    }
    .prdm-header-left { display: flex; align-items: center; gap: 12px; position: relative; z-index: 1; }
    .prdm-header-icon {
      width: 36px; height: 36px; background: rgba(255,255,255,0.15); border-radius: 10px;
      display: flex; align-items: center; justify-content: center; color: #fff; font-size: 15px;
    }
    .prdm-header-title { font-size: 17px; font-weight: 700; color: #fff; letter-spacing: -0.3px; }
    .prdm-header-sub    { font-size: 12px; color: rgba(255,255,255,0.55); margin-top: 2px; }
    .prdm-close-btn {
      position: relative; z-index: 1;
      width: 32px; height: 32px; border-radius: 8px; border: none;
      background: rgba(255,255,255,0.12); color: #fff; font-size: 16px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background .15s; font-family: 'Inter', sans-serif;
    }
    .prdm-close-btn:hover { background: rgba(255,255,255,0.22); }

    .prdm-body { padding: 16px 24px 0; max-height: 66vh; overflow-y: auto; }
    .prdm-body::-webkit-scrollbar { width: 5px; }
    .prdm-body::-webkit-scrollbar-track { background: transparent; }
    .prdm-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }

    .prdm-root .ant-tabs-nav::before { border-color: var(--border) !important; }
    .prdm-root .ant-tabs-tab { font-size: 12.5px !important; font-weight: 600 !important; }
    .prdm-root .ant-tabs-tab-active .ant-tabs-tab-btn { color: #4F46E5 !important; }
    .prdm-root .ant-tabs-ink-bar { background: #4F46E5 !important; }

    .prdm-root .ant-form-item-label > label {
      font-size: 11px !important; font-weight: 600 !important; letter-spacing: 0.3px !important;
      color: var(--muted-foreground) !important; text-transform: uppercase !important;
    }
    .prdm-root .ant-input,
    .prdm-root .ant-input-number,
    .prdm-root .ant-input-affix-wrapper {
      border-radius: 8px !important; font-size: 13px !important; font-family: 'Inter', sans-serif !important;
      background: var(--muted) !important; border-color: var(--border) !important;
    }
    .prdm-root .ant-input-number { width: 100% !important; }
    .prdm-root .ant-input:focus,
    .prdm-root .ant-input-number-focused {
      border-color: #4F46E5 !important; box-shadow: 0 0 0 3px rgba(79,70,229,.1) !important; background: var(--card) !important;
    }

    .prdm-footer {
      padding: 16px 24px; border-top: 1px solid var(--border);
      display: flex; align-items: center; justify-content: flex-end; gap: 10px;
      background: var(--card); position: sticky; bottom: 0;
    }
    .prdm-cancel-btn {
      padding: 9px 20px; border: 1px solid var(--border); border-radius: 8px;
      background: var(--card); color: var(--foreground); font-size: 13px; font-weight: 600;
      font-family: 'Inter', sans-serif; cursor: pointer; transition: all .15s;
    }
    .prdm-cancel-btn:hover { background: var(--muted); }
    .prdm-cancel-btn:disabled { opacity: .6; cursor: not-allowed; }
    .prdm-save-btn {
      padding: 9px 22px; border: none; border-radius: 8px;
      background: #4F46E5; color: #fff; font-size: 13px; font-weight: 700;
      font-family: 'Inter', sans-serif; cursor: pointer; transition: all .15s;
      display: flex; align-items: center; gap: 7px;
    }
    .prdm-save-btn:hover:not(:disabled) { background: #4338CA; transform: translateY(-1px); }
    .prdm-save-btn:disabled { opacity: .75; cursor: not-allowed; transform: none; }

    @media (max-width: 640px) {
      .prdm-body { padding: 16px 16px 0; }
      .prdm-header, .prdm-footer { padding: 16px; }
    }
  `}</style>
);

interface AddProductModalProps {
  open: boolean;
  onClose: () => void;
}

const AddProductModal: React.FC<AddProductModalProps> = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const storageService: any = new StorageService();
  const [form] = Form.useForm();
  const [variants, setVariants] = React.useState<any[]>([]);
  const [images, setImages] = React.useState<any[]>([]);
  const [inventory, setInventory] = React.useState<any[]>([]);
  const [metadata, setMetadata] = React.useState<any[]>([]);

  const handleClear = () => {
    form.resetFields();
    setVariants([]);
    setImages([]);
    setInventory([]);
    setMetadata([]);
  };

  const productState = useSelector((state: any) => state.products);
  const createLoading = productState?.createLoading || false;
  const error = productState?.error;

  const prevCreateLoadingRef = React.useRef<boolean>(createLoading);

  React.useEffect(() => {
    if (prevCreateLoadingRef.current && !createLoading && !error) {
      handleClear();
      onClose();
    }
    prevCreateLoadingRef.current = createLoading;
  }, [createLoading, error]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const companyId: any = JSON.parse(
        storageService.getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS)
      ).id;

      const payload: any = {
        ...values,
        company_id: companyId,
      };

      if (variants.length > 0) {
        payload.variants = variants.map((v) => {
          const { id, ...rest } = v;
          return rest;
        });
      }
      if (images.length > 0) {
        payload.images = images.map((i) => {
          const { id, ...rest } = i;
          return rest;
        });
      }
      if (inventory.length > 0) {
        payload.inventory = inventory.map((inv) => {
          const { id, ...rest } = inv;
          return rest;
        });
      }
      if (metadata.length > 0) {
        payload.metadata = metadata.map((m) => {
          const { id, ...rest } = m;
          return rest;
        });
      }

      dispatch(createProduct(payload));
    } catch {
      // Ant Design handles field validation feedback
    }
  };

  const handleClose = () => {
    handleClear();
    onClose();
  };

  const addVariant = () => {
    setVariants([
      ...variants,
      {
        id: Date.now(),
        sku: "",
        price: 0,
        compare_at_price: 0,
        cost_price: 0,
        is_default: false,
      },
    ]);
  };

  const removeVariant = (id: number) => {
    setVariants(variants.filter((v) => v.id !== id));
  };

  const updateVariant = (id: number, field: string, value: any) => {
    setVariants(
      variants.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  const addImage = () => {
    setImages([...images, { id: Date.now(), url: "", sort_order: 0 }]);
  };

  const removeImage = (id: number) => {
    setImages(images.filter((i) => i.id !== id));
  };

  const updateImage = (id: number, field: string, value: any) => {
    setImages(images.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const addInventory = () => {
    setInventory([
      ...inventory,
      { id: Date.now(), stock_level: 0, stock_policy: "", warehouse_id: null },
    ]);
  };

  const removeInventory = (id: number) => {
    setInventory(inventory.filter((i) => i.id !== id));
  };

  const updateInventory = (id: number, field: string, value: any) => {
    setInventory(
      inventory.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  };

  const addMetadata = () => {
    setMetadata([...metadata, { id: Date.now(), key: "", value: "" }]);
  };

  const removeMetadata = (id: number) => {
    setMetadata(metadata.filter((m) => m.id !== id));
  };

  const updateMetadata = (id: number, field: string, value: any) => {
    setMetadata(
      metadata.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  return (
    <>
      <ModalStyles />
      <Modal
        open={open}
        onCancel={handleClose}
        width="95%"
        style={{ maxWidth: 1000, top: 20 }}
        footer={null}
        destroyOnClose
        className="prdm-modal"
      >
        <div className="prdm-root">
          {/* ── Header ── */}
          <div className="prdm-header">
            <div className="prdm-header-noise" />
            <div className="prdm-header-left">
              <div className="prdm-header-icon"><ShopOutlined /></div>
              <div>
                <div className="prdm-header-title">Add Product</div>
                <div className="prdm-header-sub">Create a new product for your catalog</div>
              </div>
            </div>
            <button className="prdm-close-btn" onClick={handleClose}>✕</button>
          </div>

          {/* ── Body ── */}
          <div className="prdm-body">
      <Tabs
        items={[
          {
            key: "basic",
            label: "Basic Info",
            children: (
              <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Product Name"
                      name="name"
                      rules={[
                        { required: true, message: "Product name is required" },
                        { min: 2, message: "Minimum 2 characters" },
                        { max: 255, message: "Maximum 255 characters" },
                      ]}
                    >
                      <Input placeholder="Enter product name" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Product Code"
                      name="product_code"
                      rules={[
                        { max: 100, message: "Maximum 100 characters" },
                      ]}
                    >
                      <Input placeholder="Enter product code" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="SKU"
                      name="sku"
                      rules={[
                        { required: true, message: "SKU is required" },
                        { max: 100, message: "Maximum 100 characters" },
                      ]}
                    >
                      <Input placeholder="Enter SKU" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Barcode"
                      name="barcode"
                      rules={[
                        { max: 255, message: "Maximum 255 characters" },
                      ]}
                    >
                      <Input placeholder="Enter barcode" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} sm={12} md={8}>
                    <Form.Item label="Price" name="price" rules={[{ required: true }]}>
                      <InputNumber
                        style={{ width: "100%" }}
                        placeholder="0.00"
                        min={0}
                        step={0.01}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Form.Item label="Cost Price" name="cost_price">
                      <InputNumber
                        style={{ width: "100%" }}
                        placeholder="0.00"
                        min={0}
                        step={0.01}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Form.Item label="Tax %" name="tax_percentage">
                      <InputNumber
                        style={{ width: "100%" }}
                        placeholder="0.00"
                        min={0}
                        max={100}
                        step={0.01}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} sm={12} md={8}>
                    <Form.Item label="Stock Quantity" name="stock_quantity">
                      <InputNumber
                        style={{ width: "100%" }}
                        placeholder="0"
                        min={0}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Form.Item label="Minimum Stock" name="minimum_stock">
                      <InputNumber
                        style={{ width: "100%" }}
                        placeholder="0"
                        min={0}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} md={8}>
                    <Form.Item label="Unit" name="unit">
                      <Input placeholder="e.g., pcs, box, unit" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item label="Category ID" name="category_id">
                      <InputNumber
                        style={{ width: "100%" }}
                        placeholder="Category ID"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="Image URL" name="image_url">
                      <Input placeholder="https://..." />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item label="Description" name="description">
                  <Input.TextArea
                    placeholder="Enter product description"
                    rows={3}
                  />
                </Form.Item>
              </Form>
            ),
          },
          {
            key: "variants",
            label: `Variants (${variants.length})`,
            children: (
              <div style={{ marginTop: 16 }}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={addVariant}
                  style={{ marginBottom: 16 }}
                >
                  Add Variant
                </Button>
                {variants.length > 0 ? (
                  <Table
                    dataSource={variants}
                    columns={[
                      {
                        title: "SKU",
                        dataIndex: "sku",
                        key: "sku",
                        render: (_, record) => (
                          <Input
                            value={record.sku}
                            onChange={(e) =>
                              updateVariant(record.id, "sku", e.target.value)
                            }
                            placeholder="Enter variant SKU"
                          />
                        ),
                      },
                      {
                        title: "Price",
                        dataIndex: "price",
                        key: "price",
                        render: (_, record) => (
                          <InputNumber
                            value={record.price}
                            onChange={(val) =>
                              updateVariant(record.id, "price", val)
                            }
                            min={0}
                            step={0.01}
                          />
                        ),
                      },
                      {
                        title: "Compare Price",
                        dataIndex: "compare_at_price",
                        key: "compare_at_price",
                        render: (_, record) => (
                          <InputNumber
                            value={record.compare_at_price}
                            onChange={(val) =>
                              updateVariant(record.id, "compare_at_price", val)
                            }
                            min={0}
                            step={0.01}
                          />
                        ),
                      },
                      {
                        title: "Cost Price",
                        dataIndex: "cost_price",
                        key: "cost_price",
                        render: (_, record) => (
                          <InputNumber
                            value={record.cost_price}
                            onChange={(val) =>
                              updateVariant(record.id, "cost_price", val)
                            }
                            min={0}
                            step={0.01}
                          />
                        ),
                      },
                      {
                        title: "Action",
                        key: "action",
                        render: (_, record) => (
                          <Popconfirm
                            title="Remove Variant"
                            description="Are you sure?"
                            onConfirm={() => removeVariant(record.id)}
                            okText="Yes"
                            cancelText="No"
                          >
                            <Button type="text" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        ),
                      },
                    ]}
                    pagination={false}
                    rowKey="id"
                    scroll={{ x: "max-content" }}
                  />
                ) : (
                  <Card style={{ textAlign: "center", color: "#999" }}>
                    No variants added
                  </Card>
                )}
              </div>
            ),
          },
          {
            key: "images",
            label: `Images (${images.length})`,
            children: (
              <div style={{ marginTop: 16 }}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={addImage}
                  style={{ marginBottom: 16 }}
                >
                  Add Image
                </Button>
                {images.length > 0 ? (
                  <Table
                    dataSource={images}
                    columns={[
                      {
                        title: "Image URL",
                        dataIndex: "url",
                        key: "url",
                        render: (_, record) => (
                          <Input
                            value={record.url}
                            onChange={(e) =>
                              updateImage(record.id, "url", e.target.value)
                            }
                            placeholder="Enter image URL"
                          />
                        ),
                      },
                      {
                        title: "Sort Order",
                        dataIndex: "sort_order",
                        key: "sort_order",
                        width: 120,
                        render: (_, record) => (
                          <InputNumber
                            value={record.sort_order}
                            onChange={(val) =>
                              updateImage(record.id, "sort_order", val)
                            }
                            min={0}
                          />
                        ),
                      },
                      {
                        title: "Action",
                        key: "action",
                        width: 80,
                        render: (_, record) => (
                          <Popconfirm
                            title="Remove Image"
                            description="Are you sure?"
                            onConfirm={() => removeImage(record.id)}
                            okText="Yes"
                            cancelText="No"
                          >
                            <Button type="text" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        ),
                      },
                    ]}
                    pagination={false}
                    rowKey="id"
                    scroll={{ x: "max-content" }}
                  />
                ) : (
                  <Card style={{ textAlign: "center", color: "#999" }}>
                    No images added
                  </Card>
                )}
              </div>
            ),
          },
          {
            key: "inventory",
            label: `Inventory (${inventory.length})`,
            children: (
              <div style={{ marginTop: 16 }}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={addInventory}
                  style={{ marginBottom: 16 }}
                >
                  Add Inventory
                </Button>
                {inventory.length > 0 ? (
                  <Table
                    dataSource={inventory}
                    columns={[
                      {
                        title: "Stock Level",
                        dataIndex: "stock_level",
                        key: "stock_level",
                        render: (_, record) => (
                          <InputNumber
                            value={record.stock_level}
                            onChange={(val) =>
                              updateInventory(record.id, "stock_level", val)
                            }
                            min={0}
                          />
                        ),
                      },
                      {
                        title: "Stock Policy",
                        dataIndex: "stock_policy",
                        key: "stock_policy",
                        render: (_, record) => (
                          <Input
                            value={record.stock_policy}
                            onChange={(e) =>
                              updateInventory(record.id, "stock_policy", e.target.value)
                            }
                            placeholder="e.g., FIFO, LIFO"
                          />
                        ),
                      },
                      {
                        title: "Warehouse ID",
                        dataIndex: "warehouse_id",
                        key: "warehouse_id",
                        render: (_, record) => (
                          <InputNumber
                            value={record.warehouse_id}
                            onChange={(val) =>
                              updateInventory(record.id, "warehouse_id", val)
                            }
                          />
                        ),
                      },
                      {
                        title: "Action",
                        key: "action",
                        width: 80,
                        render: (_, record) => (
                          <Popconfirm
                            title="Remove Inventory"
                            description="Are you sure?"
                            onConfirm={() => removeInventory(record.id)}
                            okText="Yes"
                            cancelText="No"
                          >
                            <Button type="text" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        ),
                      },
                    ]}
                    pagination={false}
                    rowKey="id"
                    scroll={{ x: "max-content" }}
                  />
                ) : (
                  <Card style={{ textAlign: "center", color: "#999" }}>
                    No inventory records added
                  </Card>
                )}
              </div>
            ),
          },
          {
            key: "metadata",
            label: `Metadata (${metadata.length})`,
            children: (
              <div style={{ marginTop: 16 }}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={addMetadata}
                  style={{ marginBottom: 16 }}
                >
                  Add Metadata
                </Button>
                {metadata.length > 0 ? (
                  <Table
                    dataSource={metadata}
                    columns={[
                      {
                        title: "Key",
                        dataIndex: "key",
                        key: "key",
                        render: (_, record) => (
                          <Input
                            value={record.key}
                            onChange={(e) =>
                              updateMetadata(record.id, "key", e.target.value)
                            }
                            placeholder="Enter metadata key"
                          />
                        ),
                      },
                      {
                        title: "Value",
                        dataIndex: "value",
                        key: "value",
                        render: (_, record) => (
                          <Input.TextArea
                            value={record.value}
                            onChange={(e) =>
                              updateMetadata(record.id, "value", e.target.value)
                            }
                            placeholder="Enter metadata value"
                            rows={1}
                          />
                        ),
                      },
                      {
                        title: "Action",
                        key: "action",
                        width: 80,
                        render: (_, record) => (
                          <Popconfirm
                            title="Remove Metadata"
                            description="Are you sure?"
                            onConfirm={() => removeMetadata(record.id)}
                            okText="Yes"
                            cancelText="No"
                          >
                            <Button type="text" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        ),
                      },
                    ]}
                    pagination={false}
                    rowKey="id"
                    scroll={{ x: "max-content" }}
                  />
                ) : (
                  <Card style={{ textAlign: "center", color: "#999" }}>
                    No metadata added
                  </Card>
                )}
              </div>
            ),
          },
        ]}
      />
          </div>

          {/* ── Footer ── */}
          <div className="prdm-footer">
            <button className="prdm-cancel-btn" onClick={handleClear} disabled={createLoading}>Clear</button>
            <button className="prdm-save-btn" onClick={handleSave} disabled={createLoading}>
              {createLoading ? <Spin size="small" /> : null}
              {createLoading ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default AddProductModal;
