import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Form, Input, message, Modal, Select, Spin, Tooltip } from "antd";
import {
  AppstoreOutlined,
  DeleteOutlined,
  EditOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
  TagsOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import "@/modules/dashboard/styles/dashboard.scss";
import { count } from "@/modules/dashboard/utils/format";
import { useAccess } from "@/permissions/useAccess";
import { StorageService } from "@/storage";
import "@/modules/products/catalog/products.scss";
import { type CategoryDirectory, type CategoryNode, apiError, createCategory, getCategoryDirectory, removeCategory, updateCategory } from "./stockApi";
import "./stock.scss";

const companyName = () => {
  try {
    return JSON.parse(new StorageService().getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS) || "{}")?.name || "Your company";
  } catch {
    return "Your company";
  }
};
const plural = (n: number, one: string, many = `${one}s`) => `${count(n)} ${n === 1 ? one : many}`;
const byName = (a: CategoryNode, b: CategoryNode) => a.name.localeCompare(b.name, "en", { sensitivity: "base", numeric: true });

/** Add or edit a category: name, where it goes (main or under one), description. */
const CategoryForm: React.FC<{
  open: boolean;
  node: CategoryNode | null;
  parentId: number | null;
  all: CategoryNode[];
  onClose: (saved: boolean) => void;
}> = ({ open, node, parentId, all, onClose }) => {
  const [form] = Form.useForm<{ name: string; parent: number; description?: string }>();
  const [saving, setSaving] = useState(false);
  const hasKids = !!node && all.some((c) => c.parent_id === node.id);
  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({ name: node?.name ?? "", parent: (node ? node.parent_id : parentId) ?? 0, description: node?.description ?? "" });
  }, [open, node, parentId, form]);
  const mains = all.filter((c) => !c.parent_id && c.id !== node?.id).sort(byName);
  const save = async () => {
    let v: { name: string; parent: number; description?: string };
    try {
      v = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      const body = { name: v.name.trim(), description: v.description?.trim() || "", parent_category_id: v.parent || null };
      const r = node ? await updateCategory(node.id, body) : await createCategory(body);
      message.success(r?.message || "Saved");
      onClose(true);
    } catch (e) {
      message.error(apiError(e, "Couldn't save the category"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={open} onCancel={() => onClose(false)} footer={null} closable={false} width={520} destroyOnHidden className="pc-dialog" rootClassName="pc-portal" centered>
      <div className="pc-dlg-head">
        <span className="pc-thumb">
          <TagsOutlined />
        </span>
        <div>
          <h3>{node ? "Edit category" : parentId ? "Add a sub-category" : "Add a category"}</h3>
          <p>{node ? node.name : "Group products so they're easy to find, filter and report on."}</p>
        </div>
        <button type="button" className="pc-x" onClick={() => onClose(false)} aria-label="Close">
          ✕
        </button>
      </div>
      <div className="pc-dlg-body">
        <Form form={form} layout="vertical" requiredMark="optional" onFinish={save}>
          <Form.Item name="name" label="Name" rules={[{ required: true, whitespace: true, message: "Give it a name" }, { max: 120 }]}>
            <Input placeholder="e.g. Wires & cables" autoFocus maxLength={120} />
          </Form.Item>
          <Form.Item name="parent" label="Goes under" extra={hasKids ? "It has sub-categories, so it stays a main category." : "Two levels: a main category and its sub-categories."}>
            <Select disabled={hasKids} options={[{ value: 0, label: "— Main category —" }, ...mains.map((m) => ({ value: m.id, label: m.name }))]} />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ max: 500 }]}>
            <Input.TextArea rows={2} maxLength={500} placeholder="Optional" />
          </Form.Item>
        </Form>
      </div>
      <div className="pc-dlg-foot">
        <span className="pc-foot-gap" />
        <button type="button" className="pc-btn ghost" onClick={() => onClose(false)} disabled={saving}>
          Cancel
        </button>
        <button type="button" className="pc-btn primary" onClick={save} disabled={saving}>
          {saving ? <Spin size="small" /> : node ? <SaveOutlined /> : <PlusOutlined />} {node ? "Save" : "Add category"}
        </button>
      </div>
    </Modal>
  );
};

/** Delete a category: choose where its products go; its sub-categories become main ones. */
const RemoveCategory: React.FC<{ node: CategoryNode | null; all: CategoryNode[]; onClose: (done: boolean) => void }> = ({ node, all, onClose }) => {
  const [to, setTo] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  useEffect(() => setTo(0), [node]);
  if (!node) return null;
  const kids = all.filter((c) => c.parent_id === node.id);
  const targets = all.filter((c) => c.id !== node.id).sort(byName);
  const go = async () => {
    setSaving(true);
    try {
      const r = await removeCategory(node.id, to || null);
      message.success(r?.message || `${node.name} deleted`);
      onClose(true);
    } catch (e) {
      message.error(apiError(e, "Couldn't delete it"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open onCancel={() => onClose(false)} footer={null} closable={false} width={500} className="pc-dialog" rootClassName="pc-portal" centered>
      <div className="pc-dlg-head">
        <span className="pc-thumb">
          <DeleteOutlined />
        </span>
        <div>
          <h3>Delete {node.name}?</h3>
          <p>Your products stay — only the category goes.</p>
        </div>
        <button type="button" className="pc-x" onClick={() => onClose(false)} aria-label="Close">
          ✕
        </button>
      </div>
      <div className="pc-dlg-body">
        <p className="ct-remove-note">
          {node.products ? `It has ${plural(node.products, "product")}.` : "It has no products."}
          {kids.length ? ` Its ${plural(kids.length, "sub-category", "sub-categories")} (${kids.map((k) => k.name).join(", ")}) will become main categories.` : ""}
        </p>
        {node.products > 0 && (
          <label className="st-field" style={{ marginBottom: 12 }}>
            <span>Move its products to</span>
            <Select
              value={to}
              onChange={setTo}
              showSearch
              optionFilterProp="label"
              options={[{ value: 0, label: "No category" }, ...targets.map((c) => ({ value: c.id, label: c.parent_id ? `${all.find((p) => p.id === c.parent_id)?.name || ""} › ${c.name}` : c.name }))]}
            />
          </label>
        )}
      </div>
      <div className="pc-dlg-foot">
        <span className="pc-foot-gap" />
        <button type="button" className="pc-btn ghost" onClick={() => onClose(false)} disabled={saving}>
          Cancel
        </button>
        <button type="button" className="pc-btn danger" onClick={go} disabled={saving}>
          {saving ? <Spin size="small" /> : <DeleteOutlined />} Delete category
        </button>
      </div>
    </Modal>
  );
};

/** Categories: main categories and their sub-categories, with how many products each holds. */
const CategoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const { can } = useAccess();
  const company = useMemo(companyName, []);
  const canAdd = can("categories.create");
  const canEdit = can("categories.edit");
  const canDelete = can("categories.delete");
  const seesProducts = can("products.view");
  const [data, setData] = useState<CategoryDirectory | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<{ node: CategoryNode | null; parentId: number | null } | null>(null);
  const [removing, setRemoving] = useState<CategoryNode | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getCategoryDirectory());
      setFailed(false);
    } catch (e) {
      setFailed(true);
      message.error(apiError(e, "Couldn't load your categories"));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  if (!data) {
    return (
      <div className="db-root ct-root">
        <div className="db-hero skeleton st-hero-sk">
          {failed && (
            <div className="st-failed">
              Couldn't load your categories.
              <button type="button" className="db-btn white" onClick={load}>
                <ReloadOutlined /> Try again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const all = data.categories;
  const mains = all.filter((c) => !c.parent_id).sort(byName);
  const subs = all.filter((c) => c.parent_id);
  const categorised = data.total_products - data.uncategorised;
  const share = data.total_products ? (categorised / data.total_products) * 100 : 0;
  const q = search.trim().toLowerCase();
  const hit = (c: CategoryNode) => !q || c.name.toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q);
  const visible = mains.filter((m) => hit(m) || all.some((k) => k.parent_id === m.id && hit(k)));
  const products = (id: number | "none") => seesProducts && navigate(`/app/products?category=${id}`);

  const row = (c: CategoryNode, sub: boolean, i: number) => (
    <li key={c.id} className={`ct-row${sub ? " sub" : ""}`} style={{ animationDelay: `${Math.min(i, 14) * 18}ms` }}>
      <span className="ct-icon">{sub ? <FolderOutlined /> : <FolderOpenOutlined />}</span>
      <span className="ct-name">
        <button type="button" onClick={() => products(c.id)} title={seesProducts ? `See its products` : undefined}>
          {c.name}
        </button>
        <em>{c.description || (sub ? "Sub-category" : c.children ? plural(c.children, "sub-category", "sub-categories") : "Main category")}</em>
      </span>
      <span className="ct-count">
        <b>{count(sub ? c.products : c.total)}</b>
        <em>{!sub && c.children && c.products !== c.total ? `${count(c.products)} directly` : (sub ? c.products : c.total) === 1 ? "product" : "products"}</em>
      </span>
      <span className="ct-acts">
        {canAdd && !sub && (
          <Tooltip title="Add a sub-category">
            <button type="button" className="pc-icon" onClick={() => setForm({ node: null, parentId: c.id })} aria-label={`Add a sub-category to ${c.name}`}>
              <PlusOutlined />
            </button>
          </Tooltip>
        )}
        {canEdit && (
          <Tooltip title="Edit">
            <button type="button" className="pc-icon" onClick={() => setForm({ node: c, parentId: null })} aria-label={`Edit ${c.name}`}>
              <EditOutlined />
            </button>
          </Tooltip>
        )}
        {canDelete && (
          <Tooltip title="Delete">
            <button type="button" className="pc-icon" onClick={() => setRemoving(c)} aria-label={`Delete ${c.name}`}>
              <DeleteOutlined />
            </button>
          </Tooltip>
        )}
      </span>
    </li>
  );

  let i = 0;
  return (
    <div className={`db-root ct-root${loading ? " refreshing" : ""}`}>
      <div className="db-hero">
        <div className="db-hero-orb a" />
        <div className="db-hero-orb b" />
        <div className="db-hero-grid" />
        <div className="db-hero-inner">
          <div className="db-hero-left">
            <div className="db-hero-eyebrow">
              Categories
              <span className="db-hero-company">{company}</span>
            </div>
            <div className="db-hero-title">
              <span className="db-hero-icon">
                <TagsOutlined />
              </span>
              Your categories
            </div>
            <div className="db-hero-sub">Group products so they're easy to find, filter and report on — a main category and its sub-categories.</div>
            <div className="db-hero-figure">
              <span className="db-hero-figure-label">Categories</span>
              <span className="db-hero-number">{count(all.length)}</span>
              <span className="db-hero-figure-foot">
                <span>
                  {plural(mains.length, "main category", "main categories")} · {plural(subs.length, "sub-category", "sub-categories")}
                </span>
              </span>
            </div>
          </div>
          <div className="db-hero-right">
            <div className="db-hero-meter">
              <div className="db-hero-meter-top">
                <span className="db-hero-meter-label">Products with a category</span>
                <b>{Math.round(share)}%</b>
              </div>
              <div className="db-hero-track" role="img" aria-label={`${Math.round(share)}% of products have a category`}>
                <span style={{ width: `${Math.min(100, share)}%` }} />
              </div>
              <div className="db-hero-meter-foot">
                <span>
                  {count(categorised)} of {count(data.total_products)}
                </span>
                <span>{count(data.uncategorised)} without</span>
              </div>
            </div>
            <div className="db-hero-btns">
              {seesProducts && data.uncategorised > 0 && (
                <button type="button" className="db-btn glass" onClick={() => products("none")} title="See the products without a category">
                  <AppstoreOutlined /> Uncategorised ({count(data.uncategorised)})
                </button>
              )}
              {canAdd && (
                <button type="button" className="db-btn white" onClick={() => setForm({ node: null, parentId: null })}>
                  <PlusOutlined /> Add category
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="pc-bar">
        <Input allowClear prefix={<SearchOutlined />} placeholder="Search categories…" value={search} onChange={(e) => setSearch(e.target.value)} className="pc-search" aria-label="Search categories" />
        <span className="pc-count">
          {plural(visible.length, "main category", "main categories")} shown
        </span>
      </div>

      <section className="pc-card">
        {visible.length ? (
          <ul className="ct-tree">
            {visible.map((m) => [row(m, false, i++), ...all.filter((k) => k.parent_id === m.id).sort(byName).filter((k) => !q || hit(k) || hit(m)).map((k) => row(k, true, i++))])}
          </ul>
        ) : (
          <div className="st-empty">
            <TagsOutlined />
            <b>{q ? "Nothing matches" : "No categories yet"}</b>
            <span>{q ? "Try another search." : "Start with a few main ones — e.g. Wires & cables › House wire, Switches & sockets, MCBs & DBs."}</span>
            {!q && canAdd && (
              <div className="st-empty-btns">
                <button type="button" className="pc-btn primary" onClick={() => setForm({ node: null, parentId: null })}>
                  <PlusOutlined /> Add category
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      <CategoryForm
        open={!!form}
        node={form?.node ?? null}
        parentId={form?.parentId ?? null}
        all={all}
        onClose={(saved) => {
          setForm(null);
          if (saved) load();
        }}
      />
      <RemoveCategory
        node={removing}
        all={all}
        onClose={(done) => {
          setRemoving(null);
          if (done) load();
        }}
      />
    </div>
  );
};

export default CategoriesPage;
