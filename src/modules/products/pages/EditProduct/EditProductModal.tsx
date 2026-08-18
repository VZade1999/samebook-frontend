import React, { useEffect, useRef } from "react";
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
  notification,
  Spin,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { updateProduct } from "../../redux/productActions";
import ProductService from "../../redux";

// ─── Global Styles ────────────────────────────────────────────────────────────
// Same chrome as AddProductModal (.prdm-*) so both product modals — and the
// rest of the app's "premium" modals — read as one consistent design system.
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

interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  category_id: number | null;
  stock_quantity: number | null;
  description: string | null;
  created_at: string;
  product_code?: string;
  barcode?: string;
  cost_price?: number;
  tax_percentage?: number;
  minimum_stock?: number;
  unit?: string;
  image_url?: string;
  variants?: any[];
  images?: any[];
  inventory?: any[];
  metadata?: any[];
}

interface EditProductModalProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
}

const EditProductModal: React.FC<EditProductModalProps> = ({
  open,
  onClose,
  product,
}) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const productService = new ProductService();
  const [detailProduct, setDetailProduct] = React.useState<Product | null>(null);
  const [variants, setVariants] = React.useState<any[]>([]);
  const [images, setImages] = React.useState<any[]>([]);
  const [inventory, setInventory] = React.useState<any[]>([]);
  const [metadata, setMetadata] = React.useState<any[]>([]);

  const getRecordKey = (record: any) => record?.id ?? record?.tempId;

  const currentProduct = detailProduct ?? product;

  useEffect(() => {
    if (!open) {
      setDetailProduct(null);
      return;
    }

    if (!product?.id) {
      setDetailProduct(null);
      return;
    }

    productService
      .getProduct(product.id)
      .then((response: any) => {
        if (response?.data?.success && response.data.data) {
          setDetailProduct(response.data.data);
        } else {
          setDetailProduct(product);
        }
      })
      .catch(() => {
        notification.error({
          message: "Couldn't load full product details",
          description: "Showing the summary from the list instead — variants, images, and inventory may be incomplete. Try reopening this modal.",
        });
        setDetailProduct(product);
      });
  }, [open, product?.id]);

  useEffect(() => {
    if (open && currentProduct) {
      form.setFieldsValue({
        name: currentProduct.name,
        product_code: currentProduct.product_code,
        sku: currentProduct.sku,
        barcode: currentProduct.barcode,
        price: currentProduct.price,
        cost_price: currentProduct.cost_price,
        tax_percentage: currentProduct.tax_percentage,
        stock_quantity: currentProduct.stock_quantity,
        minimum_stock: currentProduct.minimum_stock,
        unit: currentProduct.unit,
        category_id: currentProduct.category_id,
        image_url: currentProduct.image_url,
        description: currentProduct.description,
      });

      setVariants(
        (currentProduct.variants || []).map((v: any) => ({
          id: v.id,
          sku: v.sku,
          price: v.price,
          compare_at_price: v.compare_at_price,
          cost_price: v.cost_price,
          is_default: v.is_default,
        })),
      );

      setImages(
        (currentProduct.images || []).map((i: any) => ({
          id: i.id,
          url: i.url,
          sort_order: i.sort_order,
        })),
      );

      setInventory(
        (currentProduct.inventory || []).map((inv: any) => ({
          id: inv.id,
          stock_level: inv.stock_level,
          stock_policy: inv.stock_policy,
          warehouse_id: inv.warehouse_id,
        })),
      );

      setMetadata(
        (currentProduct.metadata || []).map((m: any) => ({
          id: m.id,
          key: m.key,
          value: m.value,
        })),
      );
    }
  }, [open, currentProduct, form]);

  const handleClose = () => {
    form.resetFields();
    setVariants([]);
    setImages([]);
    setInventory([]);
    setMetadata([]);
    onClose();
  };

  const handleClear = () => {
    if (product) {
      form.setFieldsValue({
        name: product.name,
        product_code: product.product_code,
        sku: product.sku,
        barcode: product.barcode,
        price: product.price,
        cost_price: product.cost_price,
        tax_percentage: product.tax_percentage,
        stock_quantity: product.stock_quantity,
        minimum_stock: product.minimum_stock,
        unit: product.unit,
        category_id: product.category_id,
        image_url: product.image_url,
        description: product.description,
      });
    }
  };

  const productState = useSelector((state: any) => state.products);
  const updateLoading = productState?.updateLoading || false;
  const error = productState?.error;

  const prevUpdateLoadingRef = useRef<boolean>(updateLoading);

  useEffect(() => {
    if (prevUpdateLoadingRef.current && !updateLoading && !error) {
      handleClose();
    }
    prevUpdateLoadingRef.current = updateLoading;
  }, [updateLoading, error]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const payload: any = {
        id: product?.id,
        ...values,
      };

      // Always send these (even as []), not just when non-empty — omitting
      // the field entirely (the old `if (list.length > 0)` guard) meant the
      // backend never learned a section had been cleared out completely, so
      // removing every variant/image/etc. silently failed to delete them.
      payload.variants = variants.map((v) => {
        const { id, tempId, isNew, ...rest } = v;
        return isNew ? rest : { ...rest, id };
      });
      payload.images = images.map((i) => {
        const { id, tempId, isNew, ...rest } = i;
        return isNew ? rest : { ...rest, id };
      });
      payload.inventory = inventory.map((inv) => {
        const { id, tempId, isNew, ...rest } = inv;
        return isNew ? rest : { ...rest, id };
      });
      payload.metadata = metadata.map((m) => {
        const { id, tempId, isNew, ...rest } = m;
        return isNew ? rest : { ...rest, id };
      });

      dispatch(updateProduct(payload));
    } catch {
      // Ant Design handles validation feedback
    }
  };

  const addVariant = () => {
    setVariants([
      ...variants,
      {
        tempId: Date.now(),
        sku: "",
        price: 0,
        compare_at_price: 0,
        cost_price: 0,
        is_default: false,
        isNew: true,
      },
    ]);
  };

  const removeVariant = (key: number) => {
    setVariants(variants.filter((v) => getRecordKey(v) !== key));
  };

  const updateVariant = (key: number, field: string, value: any) => {
    setVariants(
      variants.map((v) =>
        getRecordKey(v) === key ? { ...v, [field]: value } : v,
      ),
    );
  };

  const addImage = () => {
    setImages([
      ...images,
      { tempId: Date.now(), url: "", sort_order: 0, isNew: true },
    ]);
  };

  const removeImage = (key: number) => {
    setImages(images.filter((i) => getRecordKey(i) !== key));
  };

  const updateImage = (key: number, field: string, value: any) => {
    setImages(
      images.map((i) =>
        getRecordKey(i) === key ? { ...i, [field]: value } : i,
      ),
    );
  };

  const addInventory = () => {
    setInventory([
      ...inventory,
      {
        tempId: Date.now(),
        stock_level: 0,
        stock_policy: "",
        warehouse_id: null,
        isNew: true,
      },
    ]);
  };

  const removeInventory = (key: number) => {
    setInventory(inventory.filter((i) => getRecordKey(i) !== key));
  };

  const updateInventory = (key: number, field: string, value: any) => {
    setInventory(
      inventory.map((i) =>
        getRecordKey(i) === key ? { ...i, [field]: value } : i,
      ),
    );
  };

  const addMetadata = () => {
    setMetadata([
      ...metadata,
      { tempId: Date.now(), key: "", value: "", isNew: true },
    ]);
  };

  const removeMetadata = (key: number) => {
    setMetadata(metadata.filter((m) => getRecordKey(m) !== key));
  };

  const updateMetadata = (key: number, field: string, value: any) => {
    setMetadata(
      metadata.map((m) =>
        getRecordKey(m) === key ? { ...m, [field]: value } : m,
      ),
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
              <div className="prdm-header-icon"><EditOutlined /></div>
              <div>
                <div className="prdm-header-title">Edit Product</div>
                <div className="prdm-header-sub">{currentProduct?.name || "Update product details"}</div>
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
                      <Input placeholder="Enter SKU" disabled />
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
                              updateVariant(getRecordKey(record), "sku", e.target.value)
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
                              updateVariant(getRecordKey(record), "price", val)
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
                              updateVariant(getRecordKey(record), "compare_at_price", val)
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
                              updateVariant(getRecordKey(record), "cost_price", val)
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
                            onConfirm={() => removeVariant(getRecordKey(record))}
                            okText="Yes"
                            cancelText="No"
                          >
                            <Button type="text" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        ),
                      },
                    ]}
                    pagination={false}
                    rowKey={(record) => getRecordKey(record)}
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
                                updateImage(getRecordKey(record), "url", e.target.value)
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
                                updateImage(getRecordKey(record), "sort_order", val)
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
                            onConfirm={() => removeImage(getRecordKey(record))}
                            okText="Yes"
                            cancelText="No"
                          >
                            <Button type="text" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        ),
                      },
                    ]}
                    pagination={false}
                    rowKey={(record) => getRecordKey(record)}
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
                                updateInventory(getRecordKey(record), "stock_level", val)
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
                                updateInventory(getRecordKey(record), "stock_policy", e.target.value)
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
                                updateInventory(getRecordKey(record), "warehouse_id", val)
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
                              onConfirm={() => removeInventory(getRecordKey(record))}
                            okText="Yes"
                            cancelText="No"
                          >
                            <Button type="text" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        ),
                      },
                    ]}
                    pagination={false}
                    rowKey={(record) => getRecordKey(record)}
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
                                updateMetadata(getRecordKey(record), "key", e.target.value)
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
                                updateMetadata(getRecordKey(record), "value", e.target.value)
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
                              onConfirm={() => removeMetadata(getRecordKey(record))}
                            okText="Yes"
                            cancelText="No"
                          >
                            <Button type="text" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        ),
                      },
                    ]}
                    pagination={false}
                    rowKey={(record) => getRecordKey(record)}
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
            <button className="prdm-cancel-btn" onClick={handleClear} disabled={updateLoading}>Reset</button>
            <button className="prdm-save-btn" onClick={handleSave} disabled={updateLoading}>
              {updateLoading ? <Spin size="small" /> : null}
              {updateLoading ? "Updating…" : "Update"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default EditProductModal;
