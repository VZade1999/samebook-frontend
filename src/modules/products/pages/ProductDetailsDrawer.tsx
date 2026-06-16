import React, { useEffect, useState } from "react";
import {
  Drawer, Spin, Typography, Table, Image, Tabs, Card, Space, Empty, Tag, Grid,
} from "antd";
import {
  BarcodeOutlined, DollarOutlined, InboxOutlined, AppstoreOutlined,
  CheckCircleOutlined, CloseCircleOutlined,
} from "@ant-design/icons";
import ProductService from "../redux";

const productService = new ProductService();
const { useBreakpoint } = Grid;

interface ProductDetailsDrawerProps {
  open: boolean;
  productId: number | null;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v: any) => (v != null ? `$${Number(v).toFixed(2)}` : "—");
const dash = (v: any) => (v != null && v !== "" ? v : "—");

const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div style={styles.infoRow}>
    <span style={styles.infoLabel}>{label}</span>
    <span style={styles.infoValue}>{value}</span>
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={styles.sectionTitle}>{children}</div>
);

// ─── Basic Info Tab ───────────────────────────────────────────────────────────
const BasicInfoTab: React.FC<{ product: any; isMobile: boolean }> = ({ product, isMobile }) => (
  <div style={{ marginTop: 12 }}>
    {/* Status banner */}
    <div style={styles.statusBanner}>
      {product.is_active ? (
        <Tag icon={<CheckCircleOutlined />} color="success" style={styles.statusTag}>Active</Tag>
      ) : (
        <Tag icon={<CloseCircleOutlined />} color="error" style={styles.statusTag}>Inactive</Tag>
      )}
    </div>

    {/* Price highlight cards */}
    <div style={{ ...styles.priceGrid, gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr" }}>
      <div style={styles.priceCard}>
        <div style={styles.priceCardLabel}>Sell Price</div>
        <div style={{ ...styles.priceCardValue, color: "#0958d9" }}>{fmt(product.price)}</div>
      </div>
      <div style={styles.priceCard}>
        <div style={styles.priceCardLabel}>Cost Price</div>
        <div style={styles.priceCardValue}>{fmt(product.cost_price)}</div>
      </div>
      {!isMobile && (
        <div style={styles.priceCard}>
          <div style={styles.priceCardLabel}>Tax</div>
          <div style={styles.priceCardValue}>
            {product.tax_percentage ? `${product.tax_percentage}%` : "—"}
          </div>
        </div>
      )}
    </div>

    {/* Core details */}
    <SectionTitle>Identification</SectionTitle>
    <div style={styles.infoCard}>
      <InfoRow label="Product Code" value={dash(product.product_code)} />
      <InfoRow label="SKU" value={
        <span style={{ fontFamily: "monospace", fontSize: 13 }}>{dash(product.sku)}</span>
      } />
      <InfoRow label="Barcode" value={dash(product.barcode)} />
      <InfoRow label="Category" value={product.category_id != null ? `#${product.category_id}` : "—"} />
      <InfoRow label="Unit" value={dash(product.unit)} />
    </div>

    <SectionTitle>Inventory</SectionTitle>
    <div style={styles.infoCard}>
      <InfoRow label="Stock Qty" value={
        <Tag color={
          product.stock_quantity === 0 ? "red"
            : product.stock_quantity < 10 ? "orange"
            : "green"
        } style={{ borderRadius: 6 }}>
          {product.stock_quantity ?? "—"}
        </Tag>
      } />
      <InfoRow label="Min Stock" value={dash(product.minimum_stock)} />
      {isMobile && (
        <InfoRow label="Tax" value={product.tax_percentage ? `${product.tax_percentage}%` : "—"} />
      )}
    </div>

    {product.description && (
      <>
        <SectionTitle>Description</SectionTitle>
        <div style={{ ...styles.infoCard, color: "#555", lineHeight: 1.6, fontSize: 13 }}>
          {product.description}
        </div>
      </>
    )}

    <SectionTitle>Timestamps</SectionTitle>
    <div style={styles.infoCard}>
      <InfoRow label="Created" value={dash(product.created_at)} />
    </div>
  </div>
);

// ─── Variants Tab ─────────────────────────────────────────────────────────────
const VariantsTab: React.FC<{ variants: any[]; isMobile: boolean }> = ({ variants, isMobile }) => {
  if (!variants?.length) return <Empty style={{ marginTop: 32 }} description="No variants" />;

  if (isMobile) {
    return (
      <div style={{ marginTop: 12 }}>
        {variants.map((v, i) => (
          <div key={v.id ?? i} style={styles.subCard}>
            <div style={styles.subCardHeader}>
              <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{v.sku || `Variant ${i + 1}`}</span>
              {v.is_default && <Tag color="blue" style={{ borderRadius: 6 }}>Default</Tag>}
            </div>
            <div style={styles.subCardGrid}>
              <div style={styles.miniStat}>
                <div style={styles.miniLabel}>Price</div>
                <div style={{ ...styles.miniValue, color: "#0958d9" }}>{fmt(v.price)}</div>
              </div>
              <div style={styles.miniStat}>
                <div style={styles.miniLabel}>Compare</div>
                <div style={styles.miniValue}>{fmt(v.compare_at_price)}</div>
              </div>
              <div style={styles.miniStat}>
                <div style={styles.miniLabel}>Cost</div>
                <div style={styles.miniValue}>{fmt(v.cost_price)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Table
      dataSource={variants}
      columns={[
        { title: "SKU", dataIndex: "sku", key: "sku", render: (t) => <span style={{ fontFamily: "monospace" }}>{t || "—"}</span> },
        { title: "Price", dataIndex: "price", key: "price", render: fmt },
        { title: "Compare Price", dataIndex: "compare_at_price", key: "compare_at_price", render: fmt },
        { title: "Cost Price", dataIndex: "cost_price", key: "cost_price", render: fmt },
        { title: "Default", dataIndex: "is_default", key: "is_default", render: (v) => v ? <Tag color="blue">Yes</Tag> : "No" },
      ]}
      pagination={false}
      rowKey="id"
      style={{ marginTop: 12 }}
      size="small"
    />
  );
};

// ─── Images Tab ───────────────────────────────────────────────────────────────
const ImagesTab: React.FC<{ images: any[]; isMobile: boolean }> = ({ images, isMobile }) => {
  if (!images?.length) return <Empty style={{ marginTop: 32 }} description="No images" />;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)",
        gap: 12,
      }}>
        {images.map((img: any) => (
          <div key={img.id} style={styles.imgCard}>
            <Image
              src={img.url}
              alt={img.url}
              style={{ width: "100%", height: isMobile ? 120 : 150, objectFit: "cover", borderRadius: "10px 10px 0 0" }}
              preview
            />
            <div style={styles.imgCaption}>Order: {img.sort_order ?? "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Inventory Tab ────────────────────────────────────────────────────────────
const InventoryTab: React.FC<{ inventory: any[]; isMobile: boolean }> = ({ inventory, isMobile }) => {
  if (!inventory?.length) return <Empty style={{ marginTop: 32 }} description="No inventory records" />;

  if (isMobile) {
    return (
      <div style={{ marginTop: 12 }}>
        {inventory.map((inv, i) => (
          <div key={inv.id ?? i} style={styles.subCard}>
            <div style={styles.subCardHeader}>
              <span style={{ fontWeight: 600 }}>Warehouse {inv.warehouse_id || "—"}</span>
              <Tag color={inv.is_active ? "green" : "default"} style={{ borderRadius: 6 }}>
                {inv.is_active ? "Active" : "Inactive"}
              </Tag>
            </div>
            <InfoRow label="Stock Level" value={inv.stock_level || "0"} />
            <InfoRow label="Policy" value={dash(inv.stock_policy)} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <Table
      dataSource={inventory}
      columns={[
        { title: "Warehouse", dataIndex: "warehouse_id", key: "warehouse_id", render: (t) => t || "—" },
        { title: "Stock Level", dataIndex: "stock_level", key: "stock_level", render: (t) => t || "0" },
        { title: "Policy", dataIndex: "stock_policy", key: "stock_policy", render: (t) => t || "—" },
        { title: "Status", dataIndex: "is_active", key: "is_active", render: (v) => <Tag color={v ? "green" : "default"}>{v ? "Active" : "Inactive"}</Tag> },
      ]}
      pagination={false}
      rowKey="id"
      style={{ marginTop: 12 }}
      size="small"
    />
  );
};

// ─── Metadata Tab ─────────────────────────────────────────────────────────────
const MetadataTab: React.FC<{ metadata: any[]; isMobile: boolean }> = ({ metadata, isMobile }) => {
  if (!metadata?.length) return <Empty style={{ marginTop: 32 }} description="No metadata" />;

  if (isMobile) {
    return (
      <div style={{ marginTop: 12 }}>
        {metadata.map((m, i) => (
          <div key={m.id ?? i} style={styles.subCard}>
            <InfoRow label={m.key} value={m.value ?? "—"} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <Table
      dataSource={metadata}
      columns={[
        { title: "Key", dataIndex: "key", key: "key", width: 200 },
        { title: "Value", dataIndex: "value", key: "value", ellipsis: true },
      ]}
      pagination={false}
      rowKey="id"
      style={{ marginTop: 12 }}
      size="small"
    />
  );
};

// ─── Main Drawer ──────────────────────────────────────────────────────────────
const ProductDetailsDrawer: React.FC<ProductDetailsDrawerProps> = ({ open, productId, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  useEffect(() => {
    if (!open || !productId) { setProduct(null); return; }

    const fetchProduct = async () => {
      setLoading(true);
      try {
        const response = await productService.getProduct(productId);
        if (response?.data?.data) setProduct(response.data.data);
      } catch (error) {
        console.error("Failed to load product details", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [open, productId]);

  const tabItems = product
    ? [
        {
          key: "basic",
          label: "Basic Info",
          children: <BasicInfoTab product={product} isMobile={isMobile} />,
        },
        {
          key: "variants",
          label: `Variants${product.variants?.length ? ` (${product.variants.length})` : ""}`,
          children: <VariantsTab variants={product.variants} isMobile={isMobile} />,
        },
        {
          key: "images",
          label: `Images${product.images?.length ? ` (${product.images.length})` : ""}`,
          children: <ImagesTab images={product.images} isMobile={isMobile} />,
        },
        {
          key: "inventory",
          label: `Inventory${product.inventory?.length ? ` (${product.inventory.length})` : ""}`,
          children: <InventoryTab inventory={product.inventory} isMobile={isMobile} />,
        },
        {
          key: "metadata",
          label: `Metadata${product.metadata?.length ? ` (${product.metadata.length})` : ""}`,
          children: <MetadataTab metadata={product.metadata} isMobile={isMobile} />,
        },
      ]
    : [];

  return (
    <Drawer
      title={
        product ? (
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{product.name}</div>
            {product.sku && (
              <div style={{ fontSize: 12, color: "#999", fontFamily: "monospace", fontWeight: 400 }}>
                SKU: {product.sku}
              </div>
            )}
          </div>
        ) : "Product Details"
      }
      placement="right"
      width={isMobile ? "100%" : 700}
      onClose={onClose}
      open={open}
      styles={{ body: { padding: isMobile ? 14 : 24 } }}
    >
      {loading ? (
        <div style={{ textAlign: "center", paddingTop: 80 }}>
          <Spin size="large" />
          <div style={{ marginTop: 12, color: "#999", fontSize: 13 }}>Loading product…</div>
        </div>
      ) : product ? (
        <Tabs
          items={tabItems}
          tabBarStyle={{ marginBottom: 0, position: "sticky", top: 0, background: "#fff", zIndex: 10 }}
          size={isMobile ? "small" : "middle"}
        />
      ) : (
        <Empty description="No product details available." style={{ marginTop: 80 }} />
      )}
    </Drawer>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  statusBanner: { marginBottom: 14 },
  statusTag: { fontSize: 13, padding: "3px 10px", borderRadius: 8 },

  priceGrid: { display: "grid", gap: 10, marginBottom: 20 },
  priceCard: {
    background: "#f8faff", border: "1px solid #e8f0fe", borderRadius: 12,
    padding: "12px 16px", textAlign: "center",
  },
  priceCardLabel: { fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  priceCardValue: { fontSize: 20, fontWeight: 700, color: "#1a1a2e" },

  sectionTitle: {
    fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase",
    letterSpacing: 0.6, marginBottom: 8, marginTop: 18,
  },
  infoCard: {
    background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: 10,
    padding: "4px 12px",
  },
  infoRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "9px 0", borderBottom: "1px solid #f5f5f5",
  },
  infoLabel: { fontSize: 13, color: "#999", flexShrink: 0, marginRight: 12 },
  infoValue: { fontSize: 13, color: "#1a1a2e", fontWeight: 500, textAlign: "right", wordBreak: "break-word" },

  subCard: {
    background: "#fff", border: "1px solid #eef0f4", borderRadius: 12,
    padding: 14, marginBottom: 10,
  },
  subCardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  subCardGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 4 },
  miniStat: { textAlign: "center" as const, background: "#f8faff", borderRadius: 8, padding: "8px 4px" },
  miniLabel: { fontSize: 10, color: "#aaa", textTransform: "uppercase" as const, letterSpacing: 0.4 },
  miniValue: { fontSize: 14, fontWeight: 600, color: "#333", marginTop: 2 },

  imgCard: {
    background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12,
    overflow: "hidden",
  },
  imgCaption: { fontSize: 11, color: "#999", textAlign: "center" as const, padding: "6px 0" },
};

export default ProductDetailsDrawer;