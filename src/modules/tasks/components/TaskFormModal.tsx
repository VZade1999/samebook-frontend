import React, { useEffect, useMemo, useState } from "react";
import { DatePicker, Form, Input, Modal, Select, Spin, TimePicker, message } from "antd";
import {
  AimOutlined,
  ApartmentOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  CheckSquareOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  FileTextOutlined,
  FlagFilled,
  FlagOutlined,
  LinkOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { tasksService } from "../services/tasksService";
import { useTasksMeta } from "../hooks";
import { LINK_META, PRIORITIES, PRIORITY_META, TYPE_META, TaskPriority, TaskType, emitTasksChanged, errText } from "../constants";
import { Avatar, TypeIcon } from "./TaskBits";

// Header gradient, icon and copy per type.
const TYPE_LOOK: Record<TaskType, { from: string; to: string; icon: React.ReactNode; hint: string; card: string; placeholder: string }> = {
  TASK: {
    from: "#2563EB", to: "#1E3A8A", icon: <CheckSquareOutlined />,
    hint: "A piece of work for one person.", card: "One person's work",
    placeholder: "What needs to be done?",
  },
  GOAL: {
    from: "#047857", to: "#064E3B", icon: <AimOutlined />,
    hint: "A result to achieve — break it into tasks.", card: "Result, split into tasks",
    placeholder: "e.g. Shortlist 5 candidates",
  },
  EPIC: {
    from: "#6D28D9", to: "#312E81", icon: <ThunderboltOutlined />,
    hint: "A big initiative made of goals and tasks.", card: "Big initiative",
    placeholder: "e.g. Launch GST e-invoicing",
  },
  SUBTASK: {
    from: "#475569", to: "#1E293B", icon: <ApartmentOutlined />,
    hint: "A small step inside a task.", card: "Small step of a task",
    placeholder: "e.g. Prepare the question list",
  },
};

/** Type picker as cards (antd Form passes value/onChange). */
const TypeCards: React.FC<{ choices: TaskType[]; value?: TaskType; onChange?: (v: TaskType) => void }> = ({ choices, value, onChange }) => (
  <div className="tf-types" style={{ gridTemplateColumns: `repeat(${choices.length}, minmax(0, 1fr))` }}>
    {choices.map((t) => {
      const m = TYPE_META[t];
      const active = value === t;
      return (
        <button
          type="button"
          key={t}
          className={`tf-type${active ? " active" : ""}`}
          style={{ ["--tf-c" as any]: m.color, ["--tf-bg" as any]: m.bg }}
          onClick={() => onChange?.(t)}
        >
          {active && <CheckCircleFilled className="tf-type-check" />}
          <span className="tf-type-icon">{TYPE_LOOK[t].icon}</span>
          <span className="tf-type-name">{m.label}</span>
          <span className="tf-type-desc">{TYPE_LOOK[t].card}</span>
        </button>
      );
    })}
  </div>
);

/** Priority as a row of coloured flags. */
const PriorityPicker: React.FC<{ value?: TaskPriority; onChange?: (v: TaskPriority) => void }> = ({ value, onChange }) => (
  <div className="tf-prio">
    {[...PRIORITIES].reverse().map((p) => (
      <button
        type="button"
        key={p}
        className={`tf-prio-btn${value === p ? " active" : ""}`}
        style={{ ["--tf-p" as any]: PRIORITY_META[p].color }}
        onClick={() => onChange?.(p)}
        title={`${PRIORITY_META[p].label} priority`}
      >
        <FlagFilled /> <span>{PRIORITY_META[p].label}</span>
      </button>
    ))}
  </div>
);

const ALLOWED_PARENTS: Record<TaskType, TaskType[]> = {
  EPIC: [],
  GOAL: ["EPIC"],
  TASK: ["EPIC", "GOAL"],
  SUBTASK: ["TASK"],
};
const ALLOWED_CHILDREN: Record<TaskType, TaskType[]> = {
  EPIC: ["GOAL", "TASK"],
  GOAL: ["TASK"],
  TASK: ["SUBTASK"],
  SUBTASK: [],
};

export interface ParentRef {
  id: number;
  key: string;
  type: TaskType;
  title: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (task: any) => void;
  /** Create directly under this item (type choices follow the hierarchy). */
  parent?: ParentRef | null;
  defaultType?: TaskType;
  /** Pre-fill the due date (YYYY-MM-DD), e.g. when creating from the calendar. */
  defaultDueDate?: string;
}

const myUserId = () => {
  try {
    return Number(JSON.parse(sessionStorage.getItem("user_details") || "{}")?.id) || null;
  } catch {
    return null;
  }
};

const TaskFormModal: React.FC<Props> = ({ open, onClose, onCreated, parent, defaultType, defaultDueDate }) => {
  const [form] = Form.useForm();
  const meta = useTasksMeta();
  const [saving, setSaving] = useState(false);
  const [parentOptions, setParentOptions] = useState<ParentRef[]>([]);
  const [linkOptions, setLinkOptions] = useState<{ value: number; label: string }[]>([]);
  const [linkLoading, setLinkLoading] = useState(false);

  const typeChoices = useMemo<TaskType[]>(() => {
    if (parent) return ALLOWED_CHILDREN[parent.type];
    // Big → small, matching the hierarchy.
    return meta?.can.create_epic ? ["EPIC", "GOAL", "TASK", "SUBTASK"] : ["GOAL", "TASK", "SUBTASK"];
  }, [parent, meta]);
  // Default to a plain Task when it's on offer — the most common choice.
  const defaultChoice: TaskType = typeChoices.includes("TASK") ? "TASK" : typeChoices[0];

  const type: TaskType = Form.useWatch("type", form) || defaultChoice;
  const linkType: string | undefined = Form.useWatch("link_type", form);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({
      type: defaultType && typeChoices.includes(defaultType) ? defaultType : defaultChoice,
      priority: "NORMAL",
      assignee_id: myUserId() ?? undefined,
      parent_id: parent?.id,
      due_date: defaultDueDate ? dayjs(defaultDueDate) : undefined,
    });
    setLinkOptions([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Parent picker (only when not creating under a fixed parent).
  useEffect(() => {
    if (!open || parent) return;
    const allowed = ALLOWED_PARENTS[type] || [];
    if (!allowed.length) {
      setParentOptions([]);
      form.setFieldValue("parent_id", undefined);
      return;
    }
    // A different type allows different parents â€” start the choice over.
    form.setFieldValue("parent_id", undefined);
    let alive = true;
    tasksService
      .list({ type: allowed.join(","), limit: 200, scope: meta?.can.manage ? "team" : undefined })
      .then((r) => alive && setParentOptions(r.data.data.rows || []))
      .catch(() => alive && setParentOptions([]));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, open, parent, meta?.can.manage]);

  const searchLinks = (q: string) => {
    if (!linkType) return;
    setLinkLoading(true);
    tasksService
      .linkSearch(linkType, q)
      .then((r) =>
        setLinkOptions(
          (r.data.data || []).map((o: any) => ({ value: o.id, label: o.sub ? `${o.label} â€” ${o.sub}` : o.label })),
        ),
      )
      .catch(() => setLinkOptions([]))
      .finally(() => setLinkLoading(false));
  };

  useEffect(() => {
    form.setFieldValue("link_id", undefined);
    setLinkOptions([]);
    if (linkType) searchLinks("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkType]);

  const submit = async () => {
    let v: any;
    try {
      v = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        type: v.type,
        title: v.title.trim(),
        description: v.description?.trim() || undefined,
        parent_id: v.parent_id || undefined,
        assignee_id: v.assignee_id || undefined,
        priority: v.priority,
        due_date: v.due_date ? dayjs(v.due_date).format("YYYY-MM-DD") : undefined,
        due_time: v.due_date && v.due_time ? dayjs(v.due_time).format("HH:mm") : undefined,
        link_type: v.link_type && v.link_id ? v.link_type : undefined,
        link_id: v.link_type && v.link_id ? v.link_id : undefined,
      };
      const res = await tasksService.create(payload);
      message.success(`${res.data.data.key} created`);
      emitTasksChanged();
      onCreated?.(res.data.data);
      onClose();
    } catch (err) {
      message.error(errText(err, "Could not create"));
    } finally {
      setSaving(false);
    }
  };

  const needsParent = type === "SUBTASK" && !parent;
  const look = TYPE_LOOK[type] || TYPE_LOOK.TASK;

  return (
    <Modal
      open={open}
      title={null}
      footer={null}
      closable={false}
      onCancel={() => !saving && onClose()}
      width={660}
      destroyOnHidden
      rootClassName="tk-modal tf"
      styles={{ body: { padding: 0 } }}
    >
      <div
        className="tf-shell"
        style={{ ["--tf-from" as any]: look.from, ["--tf-to" as any]: look.to, ["--tf-accent" as any]: TYPE_META[type].color }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            submit();
          }
        }}
      >
        {/* Header follows the chosen type */}
        <div className="tf-hero">
          <div className="tf-hero-glow" />
          <div className="tf-hero-row">
            <span className="tf-hero-icon">{look.icon}</span>
            <div className="tf-hero-text">
              <div className="tf-hero-title">{parent ? `Add under ${parent.key}` : `New ${TYPE_META[type].label.toLowerCase()}`}</div>
              <div className="tf-hero-sub">{look.hint}</div>
            </div>
            <button className="tf-close" onClick={() => !saving && onClose()} aria-label="Close"><CloseOutlined /></button>
          </div>
          {parent && (
            <div className="tf-parent">
              <TypeIcon type={parent.type} size={18} /> <b>{parent.key}</b> <span>{parent.title}</span>
            </div>
          )}
        </div>

        {!meta ? (
          <div className="tf-loading"><Spin /></div>
        ) : (
          <Form form={form} layout="vertical" requiredMark={false} className="tf-form">
            {/* Type cards */}
            <Form.Item name="type" className="tf-types-item">
              <TypeCards choices={typeChoices} />
            </Form.Item>

            <Form.Item
              name="title"
              className="tf-title-item"
              rules={[{ required: true, whitespace: true, message: "Give it a short title" }, { max: 200 }]}
            >
              <Input
                variant="borderless"
                className="tf-title"
                placeholder={look.placeholder}
                autoFocus
                maxLength={200}
              />
            </Form.Item>

            {!parent && (ALLOWED_PARENTS[type] || []).length > 0 && (
              <Form.Item
                name="parent_id"
                label={<span className="tf-label"><ApartmentOutlined /> {needsParent ? "Parent task" : "Part of"} {!needsParent && <em>optional</em>}</span>}
                rules={needsParent ? [{ required: true, message: "A subtask must belong to a task" }] : []}
              >
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder={`Choose ${ALLOWED_PARENTS[type].map((t) => `a ${TYPE_META[t].label.toLowerCase()}`).join(" or ")}`}
                  options={parentOptions.map((p) => ({
                    value: p.id,
                    label: `${p.key} · ${p.title}`,
                  }))}
                  optionRender={(o) => {
                    const p = parentOptions.find((x) => x.id === o.value);
                    return p ? (
                      <span className="tf-opt"><TypeIcon type={p.type} size={18} /> <b>{p.key}</b> {p.title}</span>
                    ) : o.label;
                  }}
                />
              </Form.Item>
            )}

            <div className="tf-grid">
              <Form.Item name="assignee_id" label={<span className="tf-label"><UserOutlined /> Assign to</span>}>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Unassigned"
                  options={meta.assignees.map((u) => ({ value: u.id, label: u.name }))}
                  optionRender={(o) => <span className="tf-opt"><Avatar name={String(o.label)} size={22} /> {o.label}</span>}
                  labelRender={(o) => <span className="tf-opt"><Avatar name={String(o.label)} size={20} /> {o.label}</span>}
                  notFoundContent="No colleagues with access to Tasks"
                />
              </Form.Item>
              <Form.Item name="priority" label={<span className="tf-label"><FlagOutlined /> Priority</span>}>
                <PriorityPicker />
              </Form.Item>
              <Form.Item name="due_date" label={<span className="tf-label"><CalendarOutlined /> Due date</span>}>
                <DatePicker
                  style={{ width: "100%" }}
                  format="DD MMM YYYY"
                  placeholder="Pick a date"
                  presets={[
                    { label: "Today", value: dayjs() },
                    { label: "Tomorrow", value: dayjs().add(1, "day") },
                    { label: "Next Monday", value: dayjs().add(((8 - dayjs().day()) % 7) || 7, "day") },
                    { label: "In a week", value: dayjs().add(7, "day") },
                  ]}
                />
              </Form.Item>
              <Form.Item name="due_time" label={<span className="tf-label"><ClockCircleOutlined /> Time <em>optional</em></span>}>
                <TimePicker style={{ width: "100%" }} format="HH:mm" minuteStep={15} placeholder="Any time" />
              </Form.Item>
            </div>

            <Form.Item name="description" label={<span className="tf-label"><FileTextOutlined /> Details <em>optional</em></span>}>
              <Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }} maxLength={10000} placeholder="Context, steps, acceptance criteria…" />
            </Form.Item>

            {meta.link_types.length > 0 && (
              <div className="tf-link">
                <div className="tf-link-head"><LinkOutlined /> Link to a record <em>optional</em></div>
                <div className="tf-grid">
                  <Form.Item name="link_type" className="tf-nolabel">
                    <Select
                      allowClear
                      placeholder="Customer, quotation or invoice"
                      options={meta.link_types.map((t) => ({ value: t, label: LINK_META[t]?.label || t }))}
                    />
                  </Form.Item>
                  <Form.Item name="link_id" className="tf-nolabel" rules={linkType ? [{ required: true, message: "Pick a record" }] : []}>
                    <Select
                      showSearch
                      disabled={!linkType}
                      filterOption={false}
                      onSearch={searchLinks}
                      loading={linkLoading}
                      placeholder={linkType ? "Search…" : "Choose a type first"}
                      options={linkOptions}
                    />
                  </Form.Item>
                </div>
              </div>
            )}
          </Form>
        )}

        <div className="tf-footer">
          <span className="tf-hint"><kbd>Ctrl</kbd> + <kbd>Enter</kbd> to create</span>
          <div className="tf-footer-btns">
            <button className="tf-btn ghost" onClick={() => !saving && onClose()} disabled={saving}>Cancel</button>
            <button className="tf-btn primary" onClick={submit} disabled={saving || !meta}>
              {saving ? <Spin size="small" /> : <PlusOutlined />} Create {TYPE_META[type].label.toLowerCase()}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TaskFormModal;