import React, { useState, useEffect, useRef } from "react";
import {
  Table, Input, Pagination, Empty, Popconfirm, Tag, Grid, Spin,
} from "antd";
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  BarcodeOutlined, AppstoreOutlined, InboxOutlined, ReloadOutlined,
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

// ─── Design tokens ────────────────────────────────────────────────────────────
// Mirrors the invoice/quotation/customers/companies/users design system
// exactly (--inv-*/--qt-*/--cus-*/--comp-*/--usr-* prefixes) so this page
// reads as part of the same app.
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    :root {
      --prd-bg: var(--background);
      --prd-surface: var(--card);
      --prd-border: var(--border);
      --prd-accent: #4F46E5;
      --prd-accent-light: #EEF2FF;
      --prd-success: #059669;
      --prd-danger: #DC2626;
      --prd-warning: #D97706;
      --prd-text: var(--foreground);
      --prd-muted: var(--muted-foreground);
      --prd-radius: 12px;
      --prd-radius-sm: 8px;
      --prd-shadow: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04);
      --prd-shadow-md: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
    }

    .prd-root {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--prd-bg);
      min-height: 100vh;
      color: var(--prd-text);
    }

    /* ── Page header ── */
    .prd-header {
      background: #1E1B4B;
      padding: 28px 28px 52px;
      position: relative;
      overflow: hidden;
    }
    .prd-header::after {
      content: '';
      position: absolute; bottom: -1px; left: 0; right: 0; height: 28px;
      background: var(--prd-bg); border-radius: 24px 24px 0 0;
    }
    .prd-header-noise {
      position: absolute; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
      pointer-events: none;
    }
    .prd-header-content {
      position: relative; z-index: 1;
      display: flex; align-items: flex-start; justify-content: space-between;
      flex-wrap: wrap; gap: 16px;
    }
    .prd-page-title {
      font-size: clamp(22px, 4vw, 30px);
      font-weight: 700; color: #fff; letter-spacing: -0.5px;
      display: flex; align-items: center; gap: 12px;
    }
    .prd-page-title-icon {
      width: 36px; height: 36px; background: rgba(255,255,255,0.15);
      border-radius: 10px; display: flex; align-items: center; justify-content: center;
      font-size: 16px;
    }
    .prd-page-subtitle { color: rgba(255,255,255,0.6); font-size: 13px; margin-top: 6px; padding-left: 48px; }
    .prd-add-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 20px; background: #fff; color: var(--prd-accent);
      border: none; border-radius: var(--prd-radius-sm); font-size: 13px; font-weight: 700;
      cursor: pointer; box-shadow: var(--prd-shadow-md); transition: all .15s;
      white-space: nowrap; font-family: 'Inter', sans-serif;
    }
    .prd-add-btn:hover { background: var(--prd-accent-light); transform: translateY(-1px); }

    /* ── Toolbar ── */
    .prd-toolbar { padding: 0 24px; margin-top: -18px; position: relative; z-index: 2; margin-bottom: 16px; }
    .prd-toolbar-inner {
      background: var(--prd-surface); border: 1px solid var(--prd-border);
      border-radius: var(--prd-radius); box-shadow: var(--prd-shadow);
      padding: 14px 16px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    }
    .prd-search-wrap { position: relative; flex: 1; min-width: 200px; }
    .prd-search-icon {
      position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
      color: var(--prd-muted); font-size: 14px; pointer-events: none;
    }
    .prd-search {
      width: 100%; padding: 8px 12px 8px 34px;
      border: 1px solid var(--prd-border); border-radius: var(--prd-radius-sm);
      font-size: 13px; font-family: 'Inter', sans-serif; color: var(--prd-text);
      background: var(--muted); outline: none; transition: border-color .15s, box-shadow .15s;
    }
    .prd-search:focus {
      border-color: var(--prd-accent); box-shadow: 0 0 0 3px rgba(79,70,229,.1); background: var(--prd-surface);
    }
    .prd-search::placeholder { color: var(--prd-muted); }
    .prd-icon-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 14px; border: 1px solid var(--prd-border);
      border-radius: var(--prd-radius-sm); background: var(--muted);
      color: var(--prd-text); font-size: 13px; font-weight: 500;
      font-family: 'Inter', sans-serif; cursor: pointer;
      transition: all .15s; white-space: nowrap;
    }
    .prd-icon-btn:hover { background: var(--prd-accent-light); border-color: var(--prd-accent); color: var(--prd-accent); }
    .prd-icon-btn:disabled { opacity: .6; cursor: not-allowed; }

    /* ── Body ── */
    .prd-body { padding: 0 24px 40px; }

    /* ── Card ── */
    .prd-card {
      background: var(--prd-surface); border: 1px solid var(--prd-border);
      border-radius: var(--prd-radius); box-shadow: var(--prd-shadow); overflow: hidden;
    }

    /* ── Table overrides ── */
    .prd-table-wrap .ant-table { font-size: 13px !important; font-family: 'Inter', sans-serif !important; }
    .prd-table-wrap .ant-table-thead > tr > th {
      background: var(--muted) !important; color: var(--prd-muted) !important;
      font-size: 11px !important; font-weight: 600 !important;
      text-transform: uppercase !important; letter-spacing: 0.5px !important;
      border-bottom: 1px solid var(--prd-border) !important; padding: 10px 16px !important;
    }
    .prd-table-wrap .ant-table-tbody > tr > td {
      border-bottom: 1px solid var(--prd-border) !important; padding: 12px 16px !important; vertical-align: middle !important;
    }
    .prd-table-wrap .ant-table-tbody > tr:last-child > td { border-bottom: none !important; }
    .prd-table-wrap .ant-table-tbody > tr:hover > td { background: var(--muted) !important; }
    .prd-name-btn {
      background: none; border: none; cursor: pointer; padding: 0;
      font-size: 13px; font-weight: 600; color: var(--prd-accent); text-align: left;
    }
    .prd-name-btn:hover { text-decoration: underline; }
    .prd-sku-cell { font-family: 'Courier New', monospace; font-size: 12px; color: var(--prd-muted); }
    .prd-price-cell { font-weight: 700; color: var(--prd-accent); font-variant-numeric: tabular-nums; }
    .prd-dash { color: var(--prd-muted); }

    /* ── Row action buttons ── */
    .prd-row-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 30px; height: 30px; border-radius: 7px; border: 1px solid var(--prd-border);
      background: var(--prd-surface); color: var(--prd-text); cursor: pointer; transition: all .15s;
      font-size: 13px;
    }
    .prd-row-btn.primary { background: var(--prd-accent); border-color: var(--prd-accent); color: #fff; }
    .prd-row-btn.primary:hover { background: #4338CA; }
    .prd-row-btn.danger { color: #DC2626; border-color: #FCA5A5; }
    .prd-row-btn.danger:hover { background: #FFF5F5; }
    .prd-row-btn:disabled { opacity: .6; cursor: not-allowed; }

    /* ── Mobile card ── */
    .prd-mobile-card {
      background: var(--prd-surface); border: 1px solid var(--prd-border);
      border-radius: var(--prd-radius); box-shadow: var(--prd-shadow);
      padding: 16px; margin-bottom: 12px;
    }
    .prd-mobile-card-header { display: flex; align-items: flex-start; margin-bottom: 10px; gap: 8px; }
    .prd-mobile-name-btn {
      background: none; border: none; cursor: pointer; padding: 0;
      font-size: 16px; font-weight: 700; color: var(--prd-accent); text-align: left;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
    }
    .prd-mobile-sku { font-size: 11px; color: var(--prd-muted); margin-top: 3px; font-family: 'Courier New', monospace; }
    .prd-mobile-price { font-size: 18px; font-weight: 700; color: var(--prd-accent); flex-shrink: 0; }
    .prd-mobile-body { display: flex; flex-direction: column; gap: 7px; margin-bottom: 12px; }
    .prd-mobile-row { display: flex; align-items: center; gap: 6px; }
    .prd-mobile-label { font-size: 12px; color: var(--prd-muted); min-width: 58px; flex-shrink: 0; }
    .prd-mobile-icon { color: var(--prd-muted); font-size: 13px; }
    .prd-mobile-value { font-size: 13px; color: var(--prd-text); }
    .prd-mobile-desc {
      font-size: 12px; color: var(--prd-muted); line-height: 1.5; margin-top: 2px;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .prd-mobile-actions {
      display: flex; gap: 8px; padding-top: 10px;
      border-top: 1px solid var(--prd-border); flex-wrap: wrap;
    }
    .prd-mobile-actions .prd-row-btn { width: auto; padding: 0 12px; gap: 6px; flex: 1; }

    /* ── Loading / empty / pagination ── */
    .prd-loading { text-align: center; padding: 48px 0; color: var(--prd-muted); }
    .prd-pagination-wrap {
      display: flex; justify-content: space-between; align-items: center;
      margin-top: 16px; flex-wrap: wrap; gap: 8;
    }
    .prd-pagination-info { font-size: 12px; color: var(--prd-muted); }
    .prd-desktop-pagination {
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px 20px; border-top: 1px solid var(--prd-border); flex-wrap: wrap; gap: 10px;
    }

    /* ── FAB (mobile) ── */
    .prd-fab {
      position: fixed; bottom: 24px; right: 20px; width: 56px; height: 56px;
      border-radius: 50%; background: var(--prd-accent); border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 14px rgba(79,70,229,.45); z-index: 1000;
    }

    /* ── Responsive ── */
    @media (max-width: 767px) {
      .prd-header { padding: 20px 16px 44px; }
      .prd-toolbar { padding: 0 16px; }
      .prd-body { padding: 0 16px 40px; }
      .prd-add-btn span { display: none; }
      .prd-page-subtitle { padding-left: 0; margin-top: 8px; }
    }
  `}</style>
);

// ─── Stock badge helper ───────────────────────────────────────────────────────
const StockBadge: React.FC<{ qty: number | null }> = ({ qty }) => {
  const stock = Number(qty);
  if (!Number.isFinite(stock)) return <span className="prd-dash">—</span>;
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
  deletingId: number | null;
}> = ({ product, canEdit, canDelete, onView, onEdit, onDelete, deletingId }) => {
  const price = Number(product.price);
  const priceStr = Number.isFinite(price) ? `₹${price.toFixed(2)}` : "—";

  return (
    <div className="prd-mobile-card">
      <div className="prd-mobile-card-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <button className="prd-mobile-name-btn" onClick={() => onView(product)}>
            {product.name}
          </button>
          {product.sku && (
            <div className="prd-mobile-sku">
              <BarcodeOutlined style={{ marginRight: 4, fontSize: 11 }} />
              {product.sku}
            </div>
          )}
        </div>
        <div className="prd-mobile-price">{priceStr}</div>
      </div>

      <div className="prd-mobile-body">
        <div className="prd-mobile-row">
          <InboxOutlined className="prd-mobile-icon" />
          <span className="prd-mobile-label">Stock</span>
          <StockBadge qty={product.stock_quantity} />
        </div>
        {product.category_id != null && (
          <div className="prd-mobile-row">
            <AppstoreOutlined className="prd-mobile-icon" />
            <span className="prd-mobile-label">Category</span>
            <span className="prd-mobile-value">#{product.category_id}</span>
          </div>
        )}
        {product.description && (
          <div className="prd-mobile-desc">{product.description}</div>
        )}
      </div>

      <div className="prd-mobile-actions">
        <button className="prd-row-btn" onClick={() => onView(product)}>
          <EyeOutlined /> View
        </button>
        {canEdit && (
          <button className="prd-row-btn primary" onClick={() => onEdit(product)}>
            <EditOutlined /> Edit
          </button>
        )}
        {canDelete && (
          <Popconfirm
            title="Delete Product"
            description="Are you sure you want to delete this product?"
            onConfirm={() => onDelete(product)}
            okText="Yes" cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <button className="prd-row-btn danger" disabled={deletingId === product.id}>
              {deletingId === product.id ? <Spin size="small" /> : <DeleteOutlined />} Delete
            </button>
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

  const fetchProducts = () => {
    dispatch(
      getProducts({
        ...debouncedFilters,
        category_id: debouncedFilters.category_id ? Number(debouncedFilters.category_id) : undefined,
        page,
        limit: pageSize,
      })
    );
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);
  const deleteLoading = productState?.deleteLoading || false;
  const prevDeleteLoadingRef = useRef<boolean>(deleteLoading);

  useEffect(() => {
    if (prevDeleteLoadingRef.current && !deleteLoading) {
      setDeletingProductId(null);
    }
    prevDeleteLoadingRef.current = deleteLoading;
  }, [deleteLoading]);

  const handleDelete = (record: Product) => {
    setDeletingProductId(record.id);
    dispatch(deleteProduct(record.id));
  };
  const handleEdit = (record: Product) => { setSelectedProduct(record); setIsEditModalOpen(true); };
  const handleView = (record: Product) => { setSelectedProductId(record.id); setIsDetailOpen(true); };

  const columns: TableColumnsType<Product> = [
    {
      title: "Name", dataIndex: "name", key: "name", width: 200,
      filterDropdown: () => renderSearchDropdown("name", "Search product name…"),
      filterIcon: <SearchOutlined />,
      render: (v, r) => (
        <button className="prd-name-btn" onClick={() => handleView(r)}>{v}</button>
      ),
    },
    {
      title: "SKU", dataIndex: "sku", key: "sku", width: 160,
      filterDropdown: () => renderSearchDropdown("sku", "Search SKU…"),
      filterIcon: <SearchOutlined />,
      render: (v) => <span className="prd-sku-cell">{v || "—"}</span>,
    },
    {
      title: "Category", dataIndex: "category_id", key: "category_id", width: 130,
      filterDropdown: () => renderSearchDropdown("category_id", "Search category ID…"),
      filterIcon: <SearchOutlined />,
      render: (v) => v != null ? `#${v}` : <span className="prd-dash">—</span>,
    },
    {
      title: "Price", dataIndex: "price", key: "price", width: 120,
      render: (v) => {
        const p = Number(v);
        return Number.isFinite(p)
          ? <span className="prd-price-cell">₹{p.toFixed(2)}</span>
          : <span className="prd-dash">—</span>;
      },
    },
    {
      title: "Stock", dataIndex: "stock_quantity", key: "stock_quantity", width: 140,
      render: (v) => <StockBadge qty={v} />,
    },
    {
      title: "Description", dataIndex: "description", key: "description",
      ellipsis: true,
      render: (v) => v || <span className="prd-dash">—</span>,
    },
    {
      title: "Action", key: "action", fixed: "right", width: 140,
      render: (_, record) => (
        <div style={{ display: "flex", gap: 6 }}>
          <button className="prd-row-btn" onClick={() => handleView(record)} title="View">
            <EyeOutlined />
          </button>
          {can("products.edit") && (
            <button className="prd-row-btn primary" onClick={() => handleEdit(record)} title="Edit">
              <EditOutlined />
            </button>
          )}
          {can("products.delete") && (
            <Popconfirm
              title="Delete Product" description="Are you sure?"
              onConfirm={() => handleDelete(record)}
              okText="Yes" cancelText="No" okButtonProps={{ danger: true }}
            >
              <button className="prd-row-btn danger" disabled={deletingProductId === record.id} title="Delete">
                {deletingProductId === record.id ? <Spin size="small" /> : <DeleteOutlined />}
              </button>
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="prd-root">
      <GlobalStyles />

      {/* ── Page header ── */}
      <div className="prd-header">
        <div className="prd-header-noise" />
        <div className="prd-header-content">
          <div>
            <div className="prd-page-title">
              <div className="prd-page-title-icon">
                <AppstoreOutlined />
              </div>
              Products
            </div>
            <div className="prd-page-subtitle">{total > 0 ? `${total} products` : "Manage your product catalog"}</div>
          </div>
          {can("products.create") && (
            <button className="prd-add-btn" onClick={() => setIsModalOpen(true)}>
              <PlusOutlined />
              <span>Add Product</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="prd-toolbar">
        <div className="prd-toolbar-inner">
          <div className="prd-search-wrap">
            <SearchOutlined className="prd-search-icon" />
            <input
              className="prd-search"
              placeholder="Search name…"
              value={searchFilters.name}
              onChange={(e) => handleSearchChange("name", e.target.value)}
            />
          </div>
          <button className="prd-icon-btn" onClick={fetchProducts} disabled={loading}>
            <ReloadOutlined spin={loading} />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="prd-body">
        {isMobile ? (
          <div>
            {loading ? (
              <div className="prd-loading"><Spin /></div>
            ) : productList.length === 0 ? (
              <div className="prd-card"><Empty description="No products found" style={{ padding: 32 }} /></div>
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
                  deletingId={deletingProductId}
                />
              ))
            )}

            {total > 0 && (
              <div className="prd-pagination-wrap">
                <span className="prd-pagination-info">
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
          <div className="prd-card prd-table-wrap">
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
              <div className="prd-desktop-pagination">
                <span style={{ color: "var(--prd-muted)", fontSize: 13 }}>
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
      </div>

      {/* Mobile FAB */}
      {isMobile && can("products.create") && (
        <button className="prd-fab" onClick={() => setIsModalOpen(true)} aria-label="Add Product">
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

export default ProductListPage;
