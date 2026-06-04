import React, { useEffect, useState } from "react";
import {
  Drawer,
  Spin,
  Descriptions,
  Typography,
  Table,
  Image,
  Tabs,
  Card,
  Space,
  Empty,
} from "antd";
import ProductService from "../redux";

const productService = new ProductService();

interface ProductDetailsDrawerProps {
  open: boolean;
  productId: number | null;
  onClose: () => void;
}

const ProductDetailsDrawer: React.FC<ProductDetailsDrawerProps> = ({
  open,
  productId,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<any>(null);

  useEffect(() => {
    if (!open || !productId) {
      setProduct(null);
      return;
    }

    const fetchProduct = async () => {
      setLoading(true);
      try {
        const response = await productService.getProduct(productId);
        if (response?.data?.data) {
          setProduct(response.data.data);
        }
      } catch (error) {
        console.error("Failed to load product details", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [open, productId]);

  return (
    <Drawer
      title={product ? product.name : "Product details"}
      placement="right"
      width={700}
      onClose={onClose}
      open={open}
    >
      {loading ? (
        <div style={{ textAlign: "center", paddingTop: 48 }}>
          <Spin />
        </div>
      ) : product ? (
        <Tabs
          items={[
            {
              key: "basic",
              label: "Basic Info",
              children: (
                <Descriptions column={1} bordered style={{ marginTop: 16 }}>
                  <Descriptions.Item label="Product Code">
                    {product.product_code || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Name">
                    {product.name}
                  </Descriptions.Item>
                  <Descriptions.Item label="SKU">
                    {product.sku || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Barcode">
                    {product.barcode || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Category ID">
                    {product.category_id ?? "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Price">
                    {product.price != null
                      ? `$${Number(product.price).toFixed(2)}`
                      : "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Cost Price">
                    {product.cost_price != null
                      ? `$${Number(product.cost_price).toFixed(2)}`
                      : "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Tax Percentage">
                    {product.tax_percentage ? `${product.tax_percentage}%` : "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Stock Quantity">
                    {product.stock_quantity ?? "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Minimum Stock">
                    {product.minimum_stock ?? "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Unit">
                    {product.unit || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Status">
                    {product.is_active ? "Active" : "Inactive"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Created At">
                    {product.created_at || "-"}
                  </Descriptions.Item>
                  {product.description && (
                    <Descriptions.Item label="Description">
                      {product.description}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              ),
            },
            {
              key: "variants",
              label: `Variants (${product.variants?.length || 0})`,
              children: product.variants?.length ? (
                <Table
                  dataSource={product.variants}
                  columns={[
                    {
                      title: "SKU",
                      dataIndex: "sku",
                      key: "sku",
                      render: (text) => text || "-",
                    },
                    {
                      title: "Price",
                      dataIndex: "price",
                      key: "price",
                      render: (value) =>
                        value != null ? `$${Number(value).toFixed(2)}` : "-",
                    },
                    {
                      title: "Compare Price",
                      dataIndex: "compare_at_price",
                      key: "compare_at_price",
                      render: (value) =>
                        value != null ? `$${Number(value).toFixed(2)}` : "-",
                    },
                    {
                      title: "Cost Price",
                      dataIndex: "cost_price",
                      key: "cost_price",
                      render: (value) =>
                        value != null ? `$${Number(value).toFixed(2)}` : "-",
                    },
                    {
                      title: "Default",
                      dataIndex: "is_default",
                      key: "is_default",
                      render: (value) => (value ? "Yes" : "No"),
                    },
                  ]}
                  pagination={false}
                  rowKey="id"
                  style={{ marginTop: 16 }}
                />
              ) : (
                <Empty style={{ marginTop: 32 }} description="No variants" />
              ),
            },
            {
              key: "images",
              label: `Images (${product.images?.length || 0})`,
              children: product.images?.length ? (
                <div style={{ marginTop: 16 }}>
                  <Space wrap style={{ width: "100%" }}>
                    {product.images.map((img: any) => (
                      <Card
                        key={img.id}
                        size="small"
                        style={{ width: 180 }}
                        cover={
                          <Image
                            src={img.url}
                            alt={img.url}
                            style={{ height: 150, objectFit: "cover" }}
                            preview
                          />
                        }
                      >
                        <div style={{ fontSize: 12, color: "#666" }}>
                          Order: {img.sort_order}
                        </div>
                      </Card>
                    ))}
                  </Space>
                </div>
              ) : (
                <Empty style={{ marginTop: 32 }} description="No images" />
              ),
            },
            {
              key: "inventory",
              label: `Inventory (${product.inventory?.length || 0})`,
              children: product.inventory?.length ? (
                <Table
                  dataSource={product.inventory}
                  columns={[
                    {
                      title: "Stock Level",
                      dataIndex: "stock_level",
                      key: "stock_level",
                      render: (text) => text || "0",
                    },
                    {
                      title: "Stock Policy",
                      dataIndex: "stock_policy",
                      key: "stock_policy",
                      render: (text) => text || "-",
                    },
                    {
                      title: "Warehouse ID",
                      dataIndex: "warehouse_id",
                      key: "warehouse_id",
                      render: (text) => text || "-",
                    },
                    {
                      title: "Status",
                      dataIndex: "is_active",
                      key: "is_active",
                      render: (value) => (value ? "Active" : "Inactive"),
                    },
                  ]}
                  pagination={false}
                  rowKey="id"
                  style={{ marginTop: 16 }}
                />
              ) : (
                <Empty style={{ marginTop: 32 }} description="No inventory records" />
              ),
            },
            {
              key: "metadata",
              label: `Metadata (${product.metadata?.length || 0})`,
              children: product.metadata?.length ? (
                <Table
                  dataSource={product.metadata}
                  columns={[
                    {
                      title: "Key",
                      dataIndex: "key",
                      key: "key",
                    },
                    {
                      title: "Value",
                      dataIndex: "value",
                      key: "value",
                      ellipsis: true,
                    },
                  ]}
                  pagination={false}
                  rowKey="id"
                  style={{ marginTop: 16 }}
                />
              ) : (
                <Empty style={{ marginTop: 32 }} description="No metadata" />
              ),
            },
          ]}
        />
      ) : (
        <Typography.Text type="secondary">
          No product details available.
        </Typography.Text>
      )}
    </Drawer>
  );
};

export default ProductDetailsDrawer;
