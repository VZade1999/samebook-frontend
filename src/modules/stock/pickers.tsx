import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Input, message, Select } from "antd";
import { PlusOutlined, StarFilled } from "@ant-design/icons";
import { apiError, createCategory, createWarehouse, getCategoryDirectory, getWarehouseCards } from "./stockApi";

export interface CategoryOption {
  id: number;
  name: string;
  parent_id: number | null;
}
export interface WarehouseOption {
  id: number;
  name: string;
  is_default: boolean;
}

/** The company's categories (null while loading or when the person can't see them). */
export function useCategoryList(enabled: boolean) {
  const [list, setList] = useState<CategoryOption[] | null>(null);
  const reload = useCallback(
    () =>
      getCategoryDirectory()
        .then((d) => setList(d.categories.map((c) => ({ id: c.id, name: c.name, parent_id: c.parent_id }))))
        .catch(() => setList(null)),
    [],
  );
  useEffect(() => {
    if (enabled) reload();
  }, [enabled, reload]);
  return { list, setList, reload };
}

/** The company's active warehouses, default first. */
export function useWarehouseList(enabled: boolean) {
  const [list, setList] = useState<WarehouseOption[] | null>(null);
  const reload = useCallback(
    () =>
      getWarehouseCards()
        .then((d) => setList(d.warehouses.map((w) => ({ id: w.id, name: w.name, is_default: w.is_default }))))
        .catch(() => setList(null)),
    [],
  );
  useEffect(() => {
    if (enabled) reload();
  }, [enabled, reload]);
  return { list, setList, reload };
}

/** "Wires & cables › House wire" for a sub-category. */
export const categoryLabel = (c: CategoryOption, all: CategoryOption[]) => {
  const parent = c.parent_id ? all.find((p) => p.id === c.parent_id) : null;
  return parent ? `${parent.name} › ${c.name}` : c.name;
};

/** Main categories first, each followed by its sub-categories. */
const ordered = (all: CategoryOption[]) => {
  const byName = (a: CategoryOption, b: CategoryOption) => a.name.localeCompare(b.name, "en", { sensitivity: "base", numeric: true });
  const mains = all.filter((c) => !c.parent_id || !all.some((p) => p.id === c.parent_id)).sort(byName);
  return mains.flatMap((m) => [m, ...all.filter((c) => c.parent_id === m.id).sort(byName)]);
};

/**
 * Pick a category — or add a new one (optionally under a main category)
 * without leaving the form.
 */
export const CategoryPicker: React.FC<{
  value?: number | null;
  onChange?: (v: number | null) => void;
  categories: CategoryOption[];
  canAdd: boolean;
  onAdded: (c: CategoryOption) => void;
  placeholder?: string;
  id?: string;
}> = ({ value, onChange, categories, canAdd, onAdded, placeholder = "No category", id }) => {
  const [name, setName] = useState("");
  const [parent, setParent] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const options = useMemo(() => ordered(categories).map((c) => ({ value: c.id, label: categoryLabel(c, categories) })), [categories]);
  const mains = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);

  const add = async () => {
    const n = name.trim();
    if (!n) return;
    setSaving(true);
    try {
      const r = await createCategory({ name: n, parent_category_id: parent });
      if (r?.data?.id) {
        const c = { id: Number(r.data.id), name: n, parent_id: parent };
        onAdded(c);
        onChange?.(c.id);
        message.success(r.message || `${n} added`);
        setName("");
        setParent(null);
        // Done: show the new category picked, with the list closed.
        setOpen(false);
      }
    } catch (e) {
      message.error(apiError(e, "Couldn't add the category"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Select
      id={id}
      open={open}
      onOpenChange={setOpen}
      allowClear
      showSearch
      optionFilterProp="label"
      placeholder={placeholder}
      value={value ?? undefined}
      onChange={(v) => onChange?.(v ?? null)}
      options={options}
      popupRender={(menu) => (
        <>
          {menu}
          {canAdd && (
            <div className="st-add-row" onMouseDown={(e) => e.stopPropagation()}>
              <Input
                size="small"
                placeholder="New category name"
                value={name}
                maxLength={120}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  // Keep typing here away from the list's own keys; Escape still closes it.
                  if (e.key === "Escape") return setOpen(false);
                  e.stopPropagation();
                  if (e.key === "Enter") add();
                }}
              />
              {mains.length > 0 && (
                <Select
                  size="small"
                  value={parent ?? 0}
                  onChange={(v) => setParent(v || null)}
                  options={[{ value: 0, label: "Main category" }, ...mains.map((m) => ({ value: m.id, label: `Under ${m.name}` }))]}
                  style={{ width: 150 }}
                  aria-label="Where the new category goes"
                />
              )}
              <Button size="small" type="primary" icon={<PlusOutlined />} loading={saving} disabled={!name.trim()} onClick={add}>
                Add
              </Button>
            </div>
          )}
        </>
      )}
    />
  );
};

/** Pick a warehouse (★ = default) — or add a new one on the spot. */
export const WarehousePicker: React.FC<{
  value?: number | null;
  onChange?: (v: number | null) => void;
  warehouses: WarehouseOption[];
  canAdd: boolean;
  onAdded: (w: WarehouseOption) => void;
  placeholder?: string;
  allowClear?: boolean;
  exclude?: number | null;
  id?: string;
}> = ({ value, onChange, warehouses, canAdd, onAdded, placeholder = "Choose a warehouse", allowClear = false, exclude, id }) => {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const add = async () => {
    const n = name.trim();
    if (!n) return;
    setSaving(true);
    try {
      const r = await createWarehouse({ name: n });
      if (r?.data?.id) {
        const w = { id: Number(r.data.id), name: n, is_default: warehouses.length === 0 };
        onAdded(w);
        onChange?.(w.id);
        message.success(r.message || `${n} added`);
        setName("");
        setOpen(false);
      }
    } catch (e) {
      message.error(apiError(e, "Couldn't add the warehouse"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Select
      id={id}
      open={open}
      onOpenChange={setOpen}
      allowClear={allowClear}
      showSearch
      optionFilterProp="title"
      placeholder={placeholder}
      value={value ?? undefined}
      onChange={(v) => onChange?.(v ?? null)}
      options={warehouses
        .filter((w) => w.id !== exclude)
        .map((w) => ({
          value: w.id,
          title: w.name,
          label: (
            <span className="st-wh-opt">
              {w.name}
              {w.is_default && (
                <span className="st-default" title="Default warehouse">
                  <StarFilled /> default
                </span>
              )}
            </span>
          ),
        }))}
      popupRender={(menu) => (
        <>
          {menu}
          {canAdd && (
            <div className="st-add-row" onMouseDown={(e) => e.stopPropagation()}>
              <Input
                size="small"
                placeholder="New warehouse name"
                value={name}
                maxLength={255}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") return setOpen(false);
                  e.stopPropagation();
                  if (e.key === "Enter") add();
                }}
              />
              <Button size="small" type="primary" icon={<PlusOutlined />} loading={saving} disabled={!name.trim()} onClick={add}>
                Add
              </Button>
            </div>
          )}
        </>
      )}
    />
  );
};
