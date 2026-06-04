import React, { useEffect } from "react";
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
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { useDispatch } from "react-redux";
import { updateProduct } from "../../redux/productActions";
import ProductService from "../../redux";

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

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const payload: any = {
        id: product?.id,
        ...values,
      };

      if (variants.length > 0) {
        payload.variants = variants.map((v) => {
          const { id, tempId, isNew, ...rest } = v;
          return isNew ? rest : { ...rest, id };
        });
      }
      if (images.length > 0) {
        payload.images = images.map((i) => {
          const { id, tempId, isNew, ...rest } = i;
          return isNew ? rest : { ...rest, id };
        });
      }
      if (inventory.length > 0) {
        payload.inventory = inventory.map((inv) => {
          const { id, tempId, isNew, ...rest } = inv;
          return isNew ? rest : { ...rest, id };
        });
      }
      if (metadata.length > 0) {
        payload.metadata = metadata.map((m) => {
          const { id, tempId, isNew, ...rest } = m;
          return isNew ? rest : { ...rest, id };
        });
      }

      dispatch(updateProduct(payload));
      handleClose();
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
    <Modal
      title="Edit Product"
      open={open}
      onCancel={handleClose}
      width={"95%"}
      style={{ maxWidth: 1000 }}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={handleClear}>Reset</Button>
          <Button type="primary" onClick={handleSave}>
            Update
          </Button>
        </div>
      }
    >
      <Tabs
        items={[
          {
            key: "basic",
            label: "Basic Info",
            children: (
              <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                <Row gutter={16}>
                  <Col span={12}>
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
                  <Col span={12}>
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
                  <Col span={12}>
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
                  <Col span={12}>
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
                  <Col span={8}>
                    <Form.Item label="Price" name="price" rules={[{ required: true }]}>
                      <InputNumber
                        style={{ width: "100%" }}
                        placeholder="0.00"
                        min={0}
                        step={0.01}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Cost Price" name="cost_price">
                      <InputNumber
                        style={{ width: "100%" }}
                        placeholder="0.00"
                        min={0}
                        step={0.01}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
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
                  <Col span={8}>
                    <Form.Item label="Stock Quantity" name="stock_quantity">
                      <InputNumber
                        style={{ width: "100%" }}
                        placeholder="0"
                        min={0}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Minimum Stock" name="minimum_stock">
                      <InputNumber
                        style={{ width: "100%" }}
                        placeholder="0"
                        min={0}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Unit" name="unit">
                      <Input placeholder="e.g., pcs, box, unit" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Category ID" name="category_id">
                      <InputNumber
                        style={{ width: "100%" }}
                        placeholder="Category ID"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
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
    </Modal>
  );
};

export default EditProductModal;
