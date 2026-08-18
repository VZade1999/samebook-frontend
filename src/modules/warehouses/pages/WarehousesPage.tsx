import React, { useEffect, useMemo, useState } from "react";
import { Table, Tag, Empty, Popconfirm, message } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ShopOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { getWarehouses, deleteWarehouse } from "../redux/warehousesActions";
import AddWarehouseModal from "../components/AddWarehouseModal";
import EditWarehouseModal from "../components/EditWarehouseModal";

// ─── Design tokens ────────────────────────────────────────────────────────────
// Mirrors the categories/roles/permissions design system exactly so this page
// reads as part of the same app.
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    :root {
      --wh-bg: var(--background);
      --wh-surface: var(--card);
      --wh-border: var(--border);
      --wh-accent: #4F46E5;
      --wh-accent-light: #EEF2FF;
      --wh-text: var(--foreground);
      --wh-muted: var(--muted-foreground);
      --wh-radius: 12px;
      --wh-radius-sm: 8px;
      --wh-shadow: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04);
      --wh-shadow-md: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
    }

    .wh-root {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--wh-bg);
      min-height: 100vh;
      color: var(--wh-text);
    }

    .wh-header {
      background: #1E1B4B;
      padding: 28px 28px 52px;
      position: relative;
      overflow: hidden;
    }
    .wh-header::after {
      content: '';
      position: absolute; bottom: -1px; left: 0; right: 0; height: 28px;
      background: var(--wh-bg); border-radius: 24px 24px 0 0;
    }
    .wh-header-noise {
      position: absolute; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
      pointer-events: none;
    }
    .wh-header-content {
      position: relative; z-index: 1;
      display: flex; align-items: flex-start; justify-content: space-between;
      flex-wrap: wrap; gap: 16px;
    }
    .wh-page-title {
      font-size: clamp(22px, 4vw, 30px);
      font-weight: 700; color: #fff; letter-spacing: -0.5px;
      display: flex; align-items: center; gap: 12px;
    }
    .wh-page-title-icon {
      width: 36px; height: 36px; background: rgba(255,255,255,0.15);
      border-radius: 10px; display: flex; align-items: center; justify-content: center;
      font-size: 16px;
    }
    .wh-page-subtitle { color: rgba(255,255,255,0.6); font-size: 13px; margin-top: 6px; padding-left: 48px; }
    .wh-add-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 20px; background: #fff; color: var(--wh-accent);
      border: none; border-radius: var(--wh-radius-sm); font-size: 13px; font-weight: 700;
      cursor: pointer; box-shadow: var(--wh-shadow-md); transition: all .15s;
      white-space: nowrap; font-family: 'Inter', sans-serif;
    }
    .wh-add-btn:hover { background: var(--wh-accent-light); transform: translateY(-1px); }

    .wh-toolbar { padding: 0 24px; margin-top: -18px; position: relative; z-index: 2; margin-bottom: 16px; }
    .wh-toolbar-inner {
      background: var(--wh-surface); border: 1px solid var(--wh-border);
      border-radius: var(--wh-radius); box-shadow: var(--wh-shadow);
      padding: 14px 16px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    }
    .wh-search-wrap { position: relative; flex: 1; min-width: 200px; }
    .wh-search-icon {
      position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
      color: var(--wh-muted); font-size: 14px; pointer-events: none;
    }
    .wh-search {
      width: 100%; padding: 8px 12px 8px 34px;
      border: 1px solid var(--wh-border); border-radius: var(--wh-radius-sm);
      font-size: 13px; font-family: 'Inter', sans-serif; color: var(--wh-text);
      background: var(--muted); outline: none; transition: border-color .15s, box-shadow .15s;
    }
    .wh-search:focus {
      border-color: var(--wh-accent); box-shadow: 0 0 0 3px rgba(79,70,229,.1); background: var(--wh-surface);
    }
    .wh-search::placeholder { color: var(--wh-muted); }
    .wh-icon-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 14px; border: 1px solid var(--wh-border);
      border-radius: var(--wh-radius-sm); background: var(--muted);
      color: var(--wh-text); font-size: 13px; font-weight: 500;
      font-family: 'Inter', sans-serif; cursor: pointer;
      transition: all .15s; white-space: nowrap;
    }
    .wh-icon-btn:hover { background: var(--wh-accent-light); border-color: var(--wh-accent); color: var(--wh-accent); }
    .wh-icon-btn:disabled { opacity: .6; cursor: not-allowed; }

    .wh-body { padding: 0 24px 40px; }

    .wh-card {
      background: var(--wh-surface); border: 1px solid var(--wh-border);
      border-radius: var(--wh-radius); box-shadow: var(--wh-shadow); overflow: hidden;
    }

    .wh-table-wrap .ant-table { font-size: 13px !important; font-family: 'Inter', sans-serif !important; }
    .wh-table-wrap .ant-table-thead > tr > th {
      background: var(--muted) !important; color: var(--wh-muted) !important;
      font-size: 11px !important; font-weight: 600 !important;
      text-transform: uppercase !important; letter-spacing: 0.5px !important;
      border-bottom: 1px solid var(--wh-border) !important; padding: 10px 16px !important;
    }
    .wh-table-wrap .ant-table-tbody > tr > td {
      border-bottom: 1px solid var(--wh-border) !important; padding: 12px 16px !important; vertical-align: middle !important;
    }
    .wh-table-wrap .ant-table-tbody > tr:last-child > td { border-bottom: none !important; }
    .wh-table-wrap .ant-table-tbody > tr:hover > td { background: var(--muted) !important; }
    .wh-name-cell { font-weight: 700; color: var(--wh-accent); }
    .wh-desc-cell { color: var(--wh-muted); }

    .wh-row-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 5px;
      height: 30px; padding: 0 10px; border-radius: 7px; border: 1px solid var(--wh-border);
      background: var(--wh-surface); color: var(--wh-text); cursor: pointer; transition: all .15s;
      font-size: 12px; font-weight: 500; font-family: 'Inter', sans-serif;
    }
    .wh-row-btn.primary { background: var(--wh-accent); border-color: var(--wh-accent); color: #fff; }
    .wh-row-btn.primary:hover { background: #4338CA; }
    .wh-row-btn.danger { color: #DC2626; border-color: #FCA5A5; }
    .wh-row-btn.danger:hover { background: #FFF5F5; }
    .wh-row-btn:disabled { opacity: .6; cursor: not-allowed; }
    .wh-row-btn.wide { flex: 1; }

    .wh-item-card {
      background: var(--wh-surface); border: 1px solid var(--wh-border);
      border-radius: var(--wh-radius); box-shadow: var(--wh-shadow);
      padding: 14px 16px; margin-bottom: 12px;
    }
    .wh-item-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .wh-item-name { font-weight: 700; font-size: 15px; color: var(--wh-accent); }
    .wh-item-desc { font-size: 13px; color: var(--wh-muted); line-height: 1.5; margin-bottom: 12px; }
    .wh-item-card-actions { display: flex; gap: 8px; padding-top: 10px; border-top: 1px solid var(--wh-border); }

    .wh-loading { text-align: center; padding: 48px 0; color: var(--wh-muted); }

    @media (max-width: 767px) {
      .wh-header { padding: 20px 16px 44px; }
      .wh-toolbar { padding: 0 16px; }
      .wh-body { padding: 0 16px 40px; }
      .wh-add-btn span { display: none; }
      .wh-page-subtitle { padding-left: 0; margin-top: 8px; }
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

const formatLocation = (w: any) => [w.city, w.state].filter(Boolean).join(", ") || "—";

const WarehousesPage = () => {
  const dispatch = useDispatch();
  const isMobile = useIsMobile();
  const { list, loading } = useSelector((state: any) => state.warehouses);

  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchWarehouses = () => {
    dispatch(getWarehouses() as any);
  };

  useEffect(() => {
    fetchWarehouses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredList = useMemo(() => {
    if (!search.trim()) return list || [];
    const q = search.trim().toLowerCase();
    return (list || []).filter((w: any) => w.name?.toLowerCase().includes(q));
  }, [list, search]);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      const response = await (dispatch(deleteWarehouse(id) as any));
      if (response.meta.requestStatus === "fulfilled") {
        message.success("Warehouse deleted");
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
    setSelectedWarehouse(record);
    setEditOpen(true);
  };

  const columns = [
    {
      title: "Warehouse",
      dataIndex: "name",
      render: (name: string) => <span className="wh-name-cell">{name}</span>,
    },
    {
      title: "Location",
      render: (_: any, record: any) => <span className="wh-desc-cell">{formatLocation(record)}</span>,
    },
    {
      title: "Address",
      dataIndex: "address",
      render: (address: string) => <span className="wh-desc-cell">{address || "—"}</span>,
    },
    {
      title: "Actions",
      width: 180,
      render: (_: any, record: any) => <RowActions record={record} />,
    },
  ];

  const RowActions = ({ record, block = false }: { record: any; block?: boolean }) => (
    <div style={{ display: "flex", gap: 8, width: block ? "100%" : undefined }}>
      <button className={`wh-row-btn primary ${block ? "wide" : ""}`} onClick={() => openEdit(record)}>
        <EditOutlined /> {block ? "Edit" : ""}
      </button>
      <Popconfirm
        title="Delete Warehouse?"
        description="This action cannot be undone."
        onConfirm={() => handleDelete(record.id)}
        okText="Yes"
        cancelText="No"
        okButtonProps={{ danger: true }}
      >
        <button className={`wh-row-btn danger ${block ? "wide" : ""}`} disabled={deletingId === record.id}>
          <DeleteOutlined /> {block ? "Delete" : ""}
        </button>
      </Popconfirm>
    </div>
  );

  const WarehouseCard = ({ record }: { record: any }) => (
    <div className="wh-item-card">
      <div className="wh-item-card-header">
        <span className="wh-item-name">{record.name}</span>
        <Tag icon={<ShopOutlined />} color="blue" style={{ margin: 0 }}>
          {formatLocation(record)}
        </Tag>
      </div>
      <div className="wh-item-desc">{record.address || "No address provided."}</div>
      <div className="wh-item-card-actions">
        <RowActions record={record} block />
      </div>
    </div>
  );

  return (
    <div className="wh-root">
      <GlobalStyles />

      <div className="wh-header">
        <div className="wh-header-noise" />
        <div className="wh-header-content">
          <div>
            <div className="wh-page-title">
              <div className="wh-page-title-icon">
                <ShopOutlined />
              </div>
              Warehouses
            </div>
            <div className="wh-page-subtitle">Manage the storage locations your inventory is tracked against</div>
          </div>
          <button className="wh-add-btn" onClick={() => setAddOpen(true)}>
            <PlusOutlined />
            <span>Add Warehouse</span>
          </button>
        </div>
      </div>

      <div className="wh-toolbar">
        <div className="wh-toolbar-inner">
          <div className="wh-search-wrap">
            <SearchOutlined className="wh-search-icon" />
            <input
              className="wh-search"
              placeholder="Search warehouses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="wh-icon-btn" onClick={fetchWarehouses} disabled={loading}>
            <ReloadOutlined spin={loading} />
          </button>
        </div>
      </div>

      <div className="wh-body">
        {isMobile ? (
          loading ? (
            <div className="wh-loading">Loading…</div>
          ) : filteredList.length === 0 ? (
            <div className="wh-card">
              <Empty description="No warehouses found" style={{ padding: 32 }} />
            </div>
          ) : (
            filteredList.map((warehouse: any) => <WarehouseCard key={warehouse.id} record={warehouse} />)
          )
        ) : (
          <div className="wh-card wh-table-wrap">
            <Table
              rowKey="id"
              loading={loading}
              columns={columns}
              dataSource={filteredList}
              scroll={{ x: "max-content" }}
              locale={{ emptyText: <Empty description="No warehouses found" /> }}
              pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ["10", "25", "50"] }}
            />
          </div>
        )}
      </div>

      <AddWarehouseModal visible={addOpen} onClose={() => setAddOpen(false)} onSuccess={fetchWarehouses} />
      <EditWarehouseModal
        visible={editOpen}
        warehouse={selectedWarehouse}
        onClose={() => {
          setEditOpen(false);
          setSelectedWarehouse(null);
        }}
        onSuccess={fetchWarehouses}
      />
    </div>
  );
};

export default WarehousesPage;
