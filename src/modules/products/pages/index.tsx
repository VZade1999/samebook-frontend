import React, { useState, useEffect } from "react";
import {
  Table, Input, Pagination, Space, Empty, Button, Popconfirm, Tag, Grid,
} from "antd";
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  BarcodeOutlined, AppstoreOutlined, DollarOutlined, InboxOutlined,
} from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { deleteProduct, getProducts } from "../redux/productActions";
import EditProductModal from "./EditProduct/EditProductModal";
import ProductDetailsDrawer from "./ProductDetailsDrawer";
import { useAccess } from "@/permissions/useAccess";
import AddProductModal from "./CreateProduct/AddProductModal";

const { useBreakpoint } = Grid;

interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  category_id: number | null;
  stock_quantity: number | null;
  description: string | null;
  created_at: string;
}

// ─── Stock badge helper ───────────────────────────────────────────────────────
const StockBadge: React.FC<{ qty: number | null }> = ({ qty }) => {
  const stock = Number(qty);
  if (!Number.isFinite(stock)) return <span style={styles.dash}>—</span>;
  const color = stock === 0 ? "red" : stock < 10 ? "orange" : "green";
  const label = stock === 0 ? "Out of stock" : stock < 10 ? `Low (${stock})` : `${stock}`;
  return <Tag color={color} style={{ borderRadius: 6, fontSize: 12 }}>{label}</Tag>;
};

// ─── Mobile Product Card ──────────────────────────────────────────────────────
const ProductCard: React.FC<{
  product: Product;
  canEdit: boolean;
  canDelete: boolean;
  onView: (p: Product) => void;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
}> = ({ product, canEdit, canDelete, onView, onEdit, onDelete }) => {
  const price = Number(product.price);
  const priceStr = Number.isFinite(price) ? `$${price.toFixed(2)}` : "—";

  return (
    <div style={styles.card}>
      {/* Header */}
      <div style={styles.cardHeader}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <button style={styles.cardNameBtn} onClick={() => onView(product)}>
            {product.name}
          </button>
          {product.sku && (
            <div style={styles.cardSku}>
              <BarcodeOutlined style={{ marginRight: 4, fontSize: 11 }} />
              {product.sku}
            </div>
          )}
        </div>
        <div style={styles.cardPrice}>{priceStr}</div>
      </div>

      {/* Info rows */}
      <div style={styles.cardBody}>
        <div style={styles.cardRow}>
          <InboxOutlined style={styles.cardIcon} />
          <span style={styles.cardLabel}>Stock</span>
          <StockBadge qty={product.stock_quantity} />
        </div>
        {product.category_id != null && (
          <div style={styles.cardRow}>
            <AppstoreOutlined style={styles.cardIcon} />
            <span style={styles.cardLabel}>Category</span>
            <span style={styles.cardValue}>#{product.category_id}</span>
          </div>
        )}
        {product.description && (
          <div style={styles.cardDesc}>{product.description}</div>
        )}
      </div>

      {/* Actions */}
      <div style={styles.cardActions}>
        <Button size="small" icon={<EyeOutlined />} onClick={() => onView(product)} style={styles.actionBtn}>
          View
        </Button>
        {canEdit && (
          <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(product)} style={styles.actionBtn}>
            Edit
          </Button>
        )}
        {canDelete && (
          <Popconfirm
            title="Delete Product"
            description="Are you sure you want to delete this product?"
            onConfirm={() => onDelete(product)}
            okText="Yes" cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} style={styles.actionBtn}>
              Delete
            </Button>
          </Popconfirm>
        )}
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const ProductListPage: React.FC = () => {
  const dispatch = useDispatch();
  const { can } = useAccess();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [searchFilters, setSearchFilters] = useState({ name: "", sku: "", category_id: "" });
  const [debouncedFilters, setDebouncedFilters] = useState(searchFilters);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedFilters(searchFilters), 500);
    return () => clearTimeout(timer);
  }, [searchFilters]);

  const productState = useSelector((state: any) => state.products);
  const products = productState?.products || [];
  const pagination = productState?.products?.pagination || {};
  const total = pagination?.total || 0;
  const loading = productState?.loading || false;
  const productList: Product[] = products?.products || [];

  useEffect(() => {
    dispatch(
      getProducts({
        ...debouncedFilters,
        category_id: debouncedFilters.category_id ? Number(debouncedFilters.category_id) : undefined,
        page,
        limit: pageSize,
      })
    );
  }, [dispatch, debouncedFilters, page, pageSize]);

  const handleSearchChange = (column: keyof typeof searchFilters, value: string) => {
    setSearchFilters((prev) => ({ ...prev, [column]: value }));
    setPage(1);
  };

  const renderSearchDropdown = (key: keyof typeof searchFilters, placeholder: string) => (
    <div style={{ padding: 8 }}>
      <Input
        allowClear
        placeholder={placeholder}
        prefix={<SearchOutlined />}
        value={searchFilters[key]}
        onChange={(e) => handleSearchChange(key, e.target.value)}
        style={{ width: 220 }}
      />
    </div>
  );

  const handleDelete = (record: Product) => dispatch(deleteProduct(record.id));
  const handleEdit = (record: Product) => { setSelectedProduct(record); setIsEditModalOpen(true); };
  const handleView = (record: Product) => { setSelectedProductId(record.id); setIsDetailOpen(true); };

  const columns: TableColumnsType<Product> = [
    {
      title: "Name", dataIndex: "name", key: "name", width: 200,
      filterDropdown: () => renderSearchDropdown("name", "Search product name…"),
      filterIcon: <SearchOutlined />,
      render: (v, r) => (
        <Button type="link" style={{ padding: 0, fontWeight: 500 }} onClick={() => handleView(r)}>{v}</Button>
      ),
    },
    {
      title: "SKU", dataIndex: "sku", key: "sku", width: 160,
      filterDropdown: () => renderSearchDropdown("sku", "Search SKU…"),
      filterIcon: <SearchOutlined />,
      render: (v) => <span style={{ fontFamily: "monospace", fontSize: 13 }}>{v || "—"}</span>,
    },
    {
      title: "Category", dataIndex: "category_id", key: "category_id", width: 130,
      filterDropdown: () => renderSearchDropdown("category_id", "Search category ID…"),
      filterIcon: <SearchOutlined />,
      render: (v) => v != null ? `#${v}` : "—",
    },
    {
      title: "Price", dataIndex: "price", key: "price", width: 120,
      render: (v) => {
        const p = Number(v);
        return Number.isFinite(p)
          ? <span style={{ fontWeight: 600, color: "#0958d9" }}>${p.toFixed(2)}</span>
          : "—";
      },
    },
    {
      title: "Stock", dataIndex: "stock_quantity", key: "stock_quantity", width: 140,
      render: (v) => <StockBadge qty={v} />,
    },
    {
      title: "Description", dataIndex: "description", key: "description",
      ellipsis: true,
      render: (v) => v || <span style={styles.dash}>—</span>,
    },
    {
      title: "Action", key: "action", fixed: "right", width: 140,
      render: (_, record) => (
        <Space size="small">
          <Button type="text" icon={<EyeOutlined style={{ color: "#1677ff" }} />} onClick={() => handleView(record)} />
          {can("products.edit") && (
            <Button type="text" icon={<EditOutlined style={{ color: "#1677ff" }} />} onClick={() => handleEdit(record)} />
          )}
          {can("products.delete") && (
            <Popconfirm
              title="Delete Product" description="Are you sure?"
              onConfirm={() => handleDelete(record)}
              okText="Yes" cancelText="No" okButtonProps={{ danger: true }}
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: isMobile ? 12 : 20, background: "#f5f7fa", minHeight: "100vh" }}>
      {/* Page header */}
      <div style={styles.pageHeader}>
        <div>
          <div style={styles.pageTitle}>Products</div>
          {total > 0 && <div style={styles.pageSubtitle}>{total} total</div>}
        </div>
        {!isMobile && can("products.create") && (
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => setIsModalOpen(true)}>
            Add Product
          </Button>
        )}
      </div>

      {/* Mobile search bar */}
      {isMobile && (
        <div style={styles.mobileSearch}>
          <Input
            allowClear
            prefix={<SearchOutlined style={{ color: "#bbb" }} />}
            placeholder="Search name…"
            value={searchFilters.name}
            onChange={(e) => handleSearchChange("name", e.target.value)}
            size="large"
            style={{ borderRadius: 10 }}
          />
        </div>
      )}

      {/* Content */}
      {isMobile ? (
        <div>
          {loading ? (
            <div style={{ textAlign: "center", padding: 48, color: "#999" }}>Loading…</div>
          ) : productList.length === 0 ? (
            <Empty description="No products found" style={{ marginTop: 48 }} />
          ) : (
            productList.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                canEdit={can("products.edit")}
                canDelete={can("products.delete")}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          )}

          {total > 0 && (
            <div style={styles.mobilePagination}>
              <span style={styles.paginationInfo}>
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
              </span>
              <Pagination
                current={page} pageSize={pageSize} total={total}
                simple onChange={(p) => setPage(p)}
              />
            </div>
          )}
        </div>
      ) : (
        /* Desktop table */
        <div style={styles.tableCard}>
          <Table
            columns={columns}
            dataSource={productList.map((p) => ({ ...p, stock_quantity: p.stock_quantity ?? null, key: p.id }))}
            pagination={false}
            loading={loading}
            bordered={false}
            scroll={{ x: "max-content" }}
            locale={{ emptyText: <Empty description="No products found" /> }}
          />
          {total > 0 && (
            <div style={styles.desktopPagination}>
              <span style={{ color: "#888", fontSize: 13 }}>
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
              </span>
              <Pagination
                current={page} pageSize={pageSize} total={total}
                showSizeChanger showQuickJumper
                pageSizeOptions={["5", "10", "25", "50"]}
                onChange={(p) => setPage(p)}
                onShowSizeChange={(_, size) => { setPageSize(size); setPage(1); }}
              />
            </div>
          )}
        </div>
      )}

      {/* Mobile FAB */}
      {isMobile && can("products.create") && (
        <button style={styles.fab} onClick={() => setIsModalOpen(true)} aria-label="Add Product">
          <PlusOutlined style={{ fontSize: 22, color: "#fff" }} />
        </button>
      )}

      {/* Modals */}
      <AddProductModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <EditProductModal
        open={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setSelectedProduct(null); }}
        product={selectedProduct}
      />
      <ProductDetailsDrawer
        open={isDetailOpen}
        productId={selectedProductId}
        onClose={() => { setIsDetailOpen(false); setSelectedProductId(null); }}
      />
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  pageHeader: {
    display: "flex", alignItems: "flex-start", justifyContent: "space-between",
    marginBottom: 16, flexWrap: "wrap", gap: 8,
  },
  pageTitle: { fontSize: 22, fontWeight: 700, color: "#1a1a2e", letterSpacing: -0.3 },
  pageSubtitle: { fontSize: 13, color: "#999", marginTop: 2 },
  mobileSearch: { marginBottom: 14 },
  dash: { color: "#ccc" },

  // Cards
  card: {
    background: "#fff", borderRadius: 14, padding: 16, marginBottom: 12,
    boxShadow: "0 1px 4px rgba(0,0,0,.07)", border: "1px solid #f0f0f0",
  },
  cardHeader: { display: "flex", alignItems: "flex-start", marginBottom: 10, gap: 8 },
  cardNameBtn: {
    background: "none", border: "none", cursor: "pointer", padding: 0,
    fontSize: 16, fontWeight: 600, color: "#1677ff", textAlign: "left",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%",
  },
  cardSku: { fontSize: 11, color: "#aaa", marginTop: 3, fontFamily: "monospace" },
  cardPrice: { fontSize: 18, fontWeight: 700, color: "#0958d9", flexShrink: 0 },
  cardBody: { display: "flex", flexDirection: "column", gap: 7, marginBottom: 12 },
  cardRow: { display: "flex", alignItems: "center", gap: 6 },
  cardLabel: { fontSize: 12, color: "#aaa", minWidth: 58, flexShrink: 0 },
  cardIcon: { color: "#bbb", fontSize: 13 },
  cardValue: { fontSize: 13, color: "#333" },
  cardDesc: {
    fontSize: 12, color: "#888", lineHeight: 1.5, marginTop: 2,
    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
  },
  cardActions: {
    display: "flex", gap: 8, paddingTop: 10,
    borderTop: "1px solid #f5f5f5", flexWrap: "wrap",
  },
  actionBtn: { borderRadius: 8, fontSize: 12 },

  // Pagination
  mobilePagination: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginTop: 16, flexWrap: "wrap", gap: 8,
  },
  paginationInfo: { fontSize: 12, color: "#999" },
  desktopPagination: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginTop: 20, paddingTop: 16, borderTop: "1px solid #f5f5f5", flexWrap: "wrap", gap: 10,
  },

  // FAB
  fab: {
    position: "fixed", bottom: 24, right: 20, width: 56, height: 56,
    borderRadius: "50%", background: "#1677ff", border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 4px 14px rgba(22,119,255,.45)", zIndex: 1000,
  },

  // Desktop
  tableCard: {
    background: "#fff", borderRadius: 12, padding: "4px 0",
    boxShadow: "0 1px 4px rgba(0,0,0,.08)", overflow: "hidden",
  },
};

export default ProductListPage;