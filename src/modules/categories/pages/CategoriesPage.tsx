import React, { useEffect, useMemo, useState } from "react";
import { Table, Tag, Empty, Popconfirm, message } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  AppstoreOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { getCategories, deleteCategory } from "../redux/categoriesActions";
import AddCategoryModal from "../components/AddCategoryModal";
import EditCategoryModal from "../components/EditCategoryModal";

// ─── Design tokens ────────────────────────────────────────────────────────────
// Mirrors the roles/permissions/companies design system exactly (--rol-*/--prm-*
// prefixes) so this page reads as part of the same app.
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    :root {
      --cat-bg: var(--background);
      --cat-surface: var(--card);
      --cat-border: var(--border);
      --cat-accent: #4F46E5;
      --cat-accent-light: #EEF2FF;
      --cat-text: var(--foreground);
      --cat-muted: var(--muted-foreground);
      --cat-radius: 12px;
      --cat-radius-sm: 8px;
      --cat-shadow: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04);
      --cat-shadow-md: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
    }

    .cat-root {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--cat-bg);
      min-height: 100vh;
      color: var(--cat-text);
    }

    .cat-header {
      background: #1E1B4B;
      padding: 28px 28px 52px;
      position: relative;
      overflow: hidden;
    }
    .cat-header::after {
      content: '';
      position: absolute; bottom: -1px; left: 0; right: 0; height: 28px;
      background: var(--cat-bg); border-radius: 24px 24px 0 0;
    }
    .cat-header-noise {
      position: absolute; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
      pointer-events: none;
    }
    .cat-header-content {
      position: relative; z-index: 1;
      display: flex; align-items: flex-start; justify-content: space-between;
      flex-wrap: wrap; gap: 16px;
    }
    .cat-page-title {
      font-size: clamp(22px, 4vw, 30px);
      font-weight: 700; color: #fff; letter-spacing: -0.5px;
      display: flex; align-items: center; gap: 12px;
    }
    .cat-page-title-icon {
      width: 36px; height: 36px; background: rgba(255,255,255,0.15);
      border-radius: 10px; display: flex; align-items: center; justify-content: center;
      font-size: 16px;
    }
    .cat-page-subtitle { color: rgba(255,255,255,0.6); font-size: 13px; margin-top: 6px; padding-left: 48px; }
    .cat-add-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 20px; background: #fff; color: var(--cat-accent);
      border: none; border-radius: var(--cat-radius-sm); font-size: 13px; font-weight: 700;
      cursor: pointer; box-shadow: var(--cat-shadow-md); transition: all .15s;
      white-space: nowrap; font-family: 'Inter', sans-serif;
    }
    .cat-add-btn:hover { background: var(--cat-accent-light); transform: translateY(-1px); }

    .cat-toolbar { padding: 0 24px; margin-top: -18px; position: relative; z-index: 2; margin-bottom: 16px; }
    .cat-toolbar-inner {
      background: var(--cat-surface); border: 1px solid var(--cat-border);
      border-radius: var(--cat-radius); box-shadow: var(--cat-shadow);
      padding: 14px 16px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    }
    .cat-search-wrap { position: relative; flex: 1; min-width: 200px; }
    .cat-search-icon {
      position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
      color: var(--cat-muted); font-size: 14px; pointer-events: none;
    }
    .cat-search {
      width: 100%; padding: 8px 12px 8px 34px;
      border: 1px solid var(--cat-border); border-radius: var(--cat-radius-sm);
      font-size: 13px; font-family: 'Inter', sans-serif; color: var(--cat-text);
      background: var(--muted); outline: none; transition: border-color .15s, box-shadow .15s;
    }
    .cat-search:focus {
      border-color: var(--cat-accent); box-shadow: 0 0 0 3px rgba(79,70,229,.1); background: var(--cat-surface);
    }
    .cat-search::placeholder { color: var(--cat-muted); }
    .cat-icon-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 14px; border: 1px solid var(--cat-border);
      border-radius: var(--cat-radius-sm); background: var(--muted);
      color: var(--cat-text); font-size: 13px; font-weight: 500;
      font-family: 'Inter', sans-serif; cursor: pointer;
      transition: all .15s; white-space: nowrap;
    }
    .cat-icon-btn:hover { background: var(--cat-accent-light); border-color: var(--cat-accent); color: var(--cat-accent); }
    .cat-icon-btn:disabled { opacity: .6; cursor: not-allowed; }

    .cat-body { padding: 0 24px 40px; }

    .cat-card {
      background: var(--cat-surface); border: 1px solid var(--cat-border);
      border-radius: var(--cat-radius); box-shadow: var(--cat-shadow); overflow: hidden;
    }

    .cat-table-wrap .ant-table { font-size: 13px !important; font-family: 'Inter', sans-serif !important; }
    .cat-table-wrap .ant-table-thead > tr > th {
      background: var(--muted) !important; color: var(--cat-muted) !important;
      font-size: 11px !important; font-weight: 600 !important;
      text-transform: uppercase !important; letter-spacing: 0.5px !important;
      border-bottom: 1px solid var(--cat-border) !important; padding: 10px 16px !important;
    }
    .cat-table-wrap .ant-table-tbody > tr > td {
      border-bottom: 1px solid var(--cat-border) !important; padding: 12px 16px !important; vertical-align: middle !important;
    }
    .cat-table-wrap .ant-table-tbody > tr:last-child > td { border-bottom: none !important; }
    .cat-table-wrap .ant-table-tbody > tr:hover > td { background: var(--muted) !important; }
    .cat-name-cell { font-weight: 700; color: var(--cat-accent); }
    .cat-desc-cell { color: var(--cat-muted); }

    .cat-row-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 5px;
      height: 30px; padding: 0 10px; border-radius: 7px; border: 1px solid var(--cat-border);
      background: var(--cat-surface); color: var(--cat-text); cursor: pointer; transition: all .15s;
      font-size: 12px; font-weight: 500; font-family: 'Inter', sans-serif;
    }
    .cat-row-btn.primary { background: var(--cat-accent); border-color: var(--cat-accent); color: #fff; }
    .cat-row-btn.primary:hover { background: #4338CA; }
    .cat-row-btn.danger { color: #DC2626; border-color: #FCA5A5; }
    .cat-row-btn.danger:hover { background: #FFF5F5; }
    .cat-row-btn:disabled { opacity: .6; cursor: not-allowed; }
    .cat-row-btn.wide { flex: 1; }

    .cat-item-card {
      background: var(--cat-surface); border: 1px solid var(--cat-border);
      border-radius: var(--cat-radius); box-shadow: var(--cat-shadow);
      padding: 14px 16px; margin-bottom: 12px;
    }
    .cat-item-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .cat-item-name { font-weight: 700; font-size: 15px; color: var(--cat-accent); }
    .cat-item-desc { font-size: 13px; color: var(--cat-muted); line-height: 1.5; margin-bottom: 12px; }
    .cat-item-card-actions { display: flex; gap: 8px; padding-top: 10px; border-top: 1px solid var(--cat-border); }

    .cat-loading { text-align: center; padding: 48px 0; color: var(--cat-muted); }

    @media (max-width: 767px) {
      .cat-header { padding: 20px 16px 44px; }
      .cat-toolbar { padding: 0 16px; }
      .cat-body { padding: 0 16px 40px; }
      .cat-add-btn span { display: none; }
      .cat-page-subtitle { padding-left: 0; margin-top: 8px; }
    }
  `}</style>
);

const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
};

const CategoriesPage = () => {
  const dispatch = useDispatch();
  const isMobile = useIsMobile();
  const { list, loading } = useSelector((state: any) => state.categories);

  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchCategories = () => {
    dispatch(getCategories() as any);
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoryById = useMemo(() => {
    const map = new Map<number, any>();
    (list || []).forEach((c: any) => map.set(c.id, c));
    return map;
  }, [list]);

  const filteredList = useMemo(() => {
    if (!search.trim()) return list || [];
    const q = search.trim().toLowerCase();
    return (list || []).filter((c: any) => c.name?.toLowerCase().includes(q));
  }, [list, search]);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const response = await (dispatch(deleteCategory(id) as any));
      if (response.meta.requestStatus === "fulfilled") {
        message.success("Category deleted");
      } else {
        message.error(response.payload?.message || "Delete failed");
      }
    } catch {
      message.error("Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const openEdit = (record: any) => {
    setSelectedCategory(record);
    setEditOpen(true);
  };

  const columns = [
    {
      title: "Category",
      dataIndex: "name",
      render: (name: string) => <span className="cat-name-cell">{name}</span>,
    },
    {
      title: "Parent",
      dataIndex: "parent_category_id",
      render: (parentId: number) =>
        parentId ? categoryById.get(parentId)?.name || `#${parentId}` : "—",
    },
    {
      title: "Description",
      dataIndex: "description",
      render: (desc: string) => <span className="cat-desc-cell">{desc || "—"}</span>,
    },
    {
      title: "Actions",
      width: 180,
      render: (_: any, record: any) => <RowActions record={record} />,
    },
  ];

  const RowActions = ({ record, block = false }: { record: any; block?: boolean }) => (
    <div style={{ display: "flex", gap: 8, width: block ? "100%" : undefined }}>
      <button className={`cat-row-btn primary ${block ? "wide" : ""}`} onClick={() => openEdit(record)}>
        <EditOutlined /> {block ? "Edit" : ""}
      </button>
      <Popconfirm
        title="Delete Category?"
        description="This action cannot be undone."
        onConfirm={() => handleDelete(record.id)}
        okText="Yes"
        cancelText="No"
        okButtonProps={{ danger: true }}
      >
        <button className={`cat-row-btn danger ${block ? "wide" : ""}`} disabled={deletingId === record.id}>
          <DeleteOutlined /> {block ? "Delete" : ""}
        </button>
      </Popconfirm>
    </div>
  );

  const CategoryCard = ({ record }: { record: any }) => (
    <div className="cat-item-card">
      <div className="cat-item-card-header">
        <span className="cat-item-name">{record.name}</span>
        <Tag icon={<AppstoreOutlined />} color="blue" style={{ margin: 0 }}>
          {record.parent_category_id
            ? categoryById.get(record.parent_category_id)?.name || "Sub"
            : "Top-level"}
        </Tag>
      </div>
      <div className="cat-item-desc">{record.description || "No description provided."}</div>
      <div className="cat-item-card-actions">
        <RowActions record={record} block />
      </div>
    </div>
  );

  return (
    <div className="cat-root">
      <GlobalStyles />

      <div className="cat-header">
        <div className="cat-header-noise" />
        <div className="cat-header-content">
          <div>
            <div className="cat-page-title">
              <div className="cat-page-title-icon">
                <AppstoreOutlined />
              </div>
              Categories
            </div>
            <div className="cat-page-subtitle">Organize products into categories and subcategories</div>
          </div>
          <button className="cat-add-btn" onClick={() => setAddOpen(true)}>
            <PlusOutlined />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      <div className="cat-toolbar">
        <div className="cat-toolbar-inner">
          <div className="cat-search-wrap">
            <SearchOutlined className="cat-search-icon" />
            <input
              className="cat-search"
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="cat-icon-btn" onClick={fetchCategories} disabled={loading}>
            <ReloadOutlined spin={loading} />
          </button>
        </div>
      </div>

      <div className="cat-body">
        {isMobile ? (
          loading ? (
            <div className="cat-loading">Loading…</div>
          ) : filteredList.length === 0 ? (
            <div className="cat-card">
              <Empty description="No categories found" style={{ padding: 32 }} />
            </div>
          ) : (
            filteredList.map((category: any) => <CategoryCard key={category.id} record={category} />)
          )
        ) : (
          <div className="cat-card cat-table-wrap">
            <Table
              rowKey="id"
              loading={loading}
              columns={columns}
              dataSource={filteredList}
              scroll={{ x: "max-content" }}
              locale={{ emptyText: <Empty description="No categories found" /> }}
              pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ["10", "25", "50"] }}
            />
          </div>
        )}
      </div>

      <AddCategoryModal
        visible={addOpen}
        categories={list || []}
        onClose={() => setAddOpen(false)}
        onSuccess={fetchCategories}
      />
      <EditCategoryModal
        visible={editOpen}
        category={selectedCategory}
        categories={list || []}
        onClose={() => {
          setEditOpen(false);
          setSelectedCategory(null);
        }}
        onSuccess={fetchCategories}
      />
    </div>
  );
};

export default CategoriesPage;
