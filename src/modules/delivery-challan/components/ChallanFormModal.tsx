import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AutoComplete,
  Button,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Spin,
  Switch,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import CustomerService from "@/modules/customers/redux";
import ProductService from "@/modules/products/redux";
import { challanService } from "../services/challanService";
import { createChallan, updateChallan } from "../redux/challanActions";
import SeriesField from "../../numbering/SeriesField";
import {
  loadWarehouses,
  CHALLAN_REASONS,
  addressLines,
  errorMessage,
  formatMoney,
  formatQty,
  parseJson,
} from "../constants";

const { Text } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (challan: any) => void;
  /** Present when editing an existing DRAFT challan (full details object). */
  challan?: any;
  /** Present when creating a challan from an approved quotation. */
  quotationId?: number | string | null;
}

const customerService = new CustomerService();
const productService = new ProductService();

const QUOTATION_REASONS = ["SALE", "PARTIAL_SUPPLY", "SUPPLY_ON_APPROVAL"];

const addressLabel = (a: any) => {
  const place = [a.city, a.state].filter(Boolean).join(", ");
  return `${a.label || a.address_type || "Address"}${place ? ` — ${place}` : ""}`;
};

const useDebounced = (fn: (v: string) => void, delay = 400) => {
  const timer = useRef<any>(null);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return useCallback(
    (v: string) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => fnRef.current(v), delay);
    },
    [delay],
  );
};

const clean = (obj: Record<string, any>) => {
  const out: Record<string, any> = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (typeof v === "string" && v.trim() === "") return;
    out[k] = typeof v === "string" ? v.trim() : v;
  });
  return out;
};

const ChallanFormModal: React.FC<Props> = ({ open, onClose, onSaved, challan, quotationId }) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch<any>();
  const saving = useSelector((state: any) => state.challans?.saving);

  const isEdit = !!challan?.id;
  // Quotation-linked: either creating from a quotation or editing a challan
  // that was created from one. Customer and item lines are then fixed.
  const linkedQuotationId = isEdit ? challan?.quotation_id : quotationId;
  const quotationMode = !!linkedQuotationId;

  const [initLoading, setInitLoading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [quotation, setQuotation] = useState<any>(null);
  const [maxQtyMap, setMaxQtyMap] = useState<Record<string, number>>({});
  const [warehouses, setWarehouses] = useState<any[]>([]);
  // Consignee values as loaded for edit — the backend rebuilds the address
  // snapshots whenever customer/address ids are sent, so they are only sent
  // when the user actually changed them.
  const initialConsignee = useRef<Record<string, any>>({});

  const [customerOptions, setCustomerOptions] = useState<any[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const [products, setProducts] = useState<any[]>([]);
  const [productLoading, setProductLoading] = useState(false);

  const reason = Form.useWatch("reason", form);
  const isTransfer = reason === "STOCK_TRANSFER";
  const watchedItems = Form.useWatch("items", form);

  // ─── Remote searches ───────────────────────────────────────────────────────
  const searchCustomers = useCallback(async (search: string) => {
    setCustomerLoading(true);
    try {
      const res = await customerService.getCustomers({ search, page: 1, limit: 10 });
      setCustomerOptions(res?.data?.data?.customers || []);
    } catch (err) {
      setCustomerOptions([]);
      message.warning(errorMessage(err, "Unable to load customers"));
    } finally {
      setCustomerLoading(false);
    }
  }, []);
  const debouncedCustomerSearch = useDebounced(searchCustomers);

  const searchProducts = useCallback(async (search: string) => {
    if (!search?.trim()) {
      setProducts([]);
      return;
    }
    setProductLoading(true);
    try {
      const res = await productService.getProducts({ search: search.trim(), page: 1, limit: 20 });
      setProducts(res?.data?.data?.products || []);
    } catch (err) {
      setProducts([]);
      // e.g. 403 without products.view — items can still be typed as free text.
      message.warning(errorMessage(err, "Unable to search the product catalog"));
    } finally {
      setProductLoading(false);
    }
  }, []);
  const debouncedProductSearch = useDebounced(searchProducts);

  const loadCustomerWithAddresses = useCallback(async (customer: any) => {
    if (!customer?.id) return null;
    if (Array.isArray(customer.addresses)) return customer;
    try {
      const res = await customerService.getCustomerDetails(customer.id);
      return { ...customer, ...(res?.data?.data || {}) };
    } catch {
      return customer;
    }
  }, []);

  // ─── Initialise on open ────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    form.resetFields();
    setQuotation(null);
    setMaxQtyMap({});
    setSelectedCustomer(null);
    setProducts([]);
    setInitError(null);
    initialConsignee.current = {};

    const init = async () => {
      setInitLoading(true);
      try {
        loadWarehouses()
          .then((list) => !cancelled && setWarehouses(list))
          .catch((err) => {
            if (cancelled) return;
            setWarehouses([]);
            // e.g. 403 without warehouses.view — stock transfers need it.
            message.warning(errorMessage(err, "Unable to load warehouses"));
          });

        let remaining: any = null;
        if (linkedQuotationId) {
          try {
            const res = await challanService.getQuotationRemaining(linkedQuotationId);
            remaining = res?.data?.data;
          } catch (err) {
            // Editing can proceed without client-side max qty — the server
            // re-validates against remaining quantities anyway.
            if (!isEdit) throw err;
          }
          if (cancelled) return;
          setQuotation(remaining?.quotation || null);
        }

        if (isEdit) {
          const items = (challan.items || []).map((it: any) => ({
            quotation_item_id: it.quotation_item_id ?? undefined,
            product_id: it.product_id ?? undefined,
            variant_id: it.variant_id ?? undefined,
            catalog_name: it.product_id ? it.item_name : undefined,
            item_name: it.item_name,
            description: it.description || undefined,
            hsn_code: it.hsn_code || undefined,
            quantity: Number(it.quantity),
            unit: it.unit || undefined,
            rate: Number(it.rate || 0),
          }));

          if (remaining?.items) {
            // This draft's own quantities are already counted as "dispatched"
            // in remaining_qty, so they are added back for the max.
            const ownQty: Record<string, number> = {};
            items.forEach((it: any) => {
              if (it.quotation_item_id) {
                ownQty[it.quotation_item_id] = (ownQty[it.quotation_item_id] || 0) + Number(it.quantity || 0);
              }
            });
            const map: Record<string, number> = {};
            remaining.items.forEach((r: any) => {
              map[r.quotation_item_id] = Number(r.remaining_qty || 0) + (ownQty[r.quotation_item_id] || 0);
            });
            setMaxQtyMap(map);
          }

          if (challan.customer_id && !challan.quotation_id) {
            setCustomerOptions([{ id: challan.customer_id, display_name: challan.customer_name }]);
            loadCustomerWithAddresses({ id: challan.customer_id, display_name: challan.customer_name }).then((c) => {
              if (cancelled) return;
              setSelectedCustomer(c);
              // Pre-select the stored addresses (snapshots are customer_addresses
              // rows, so they carry the id) so they are kept on save.
              const addrs: any[] = c?.addresses || [];
              const has = (id: any) => id != null && addrs.some((a) => Number(a.id) === Number(id));
              const bId = parseJson(challan.billing_address_snapshot)?.id;
              const sId = parseJson(challan.shipping_address_snapshot)?.id;
              const patch: Record<string, any> = {};
              if (has(bId)) patch.billing_address_id = bId;
              if (has(sId)) patch.shipping_address_id = sId;
              initialConsignee.current = {
                ...initialConsignee.current,
                billing_address_id: patch.billing_address_id,
                shipping_address_id: patch.shipping_address_id,
              };
              if (!form.isFieldTouched("billing_address_id") && !form.isFieldTouched("shipping_address_id")) {
                form.setFieldsValue(patch);
              }
            });
          }
          initialConsignee.current = {
            customer_id: challan.customer_id ?? undefined,
            billing_address_id: undefined,
            shipping_address_id: undefined,
          };

          form.setFieldsValue({
            challan_date: challan.challan_date ? dayjs(challan.challan_date) : dayjs(),
            reason: challan.reason,
            customer_id: challan.customer_id ?? undefined,
            place_of_supply: challan.place_of_supply || undefined,
            from_warehouse_id: challan.from_warehouse_id ?? undefined,
            to_warehouse_id: challan.to_warehouse_id ?? undefined,
            transporter_name: challan.transporter_name || undefined,
            vehicle_number: challan.vehicle_number || undefined,
            eway_bill_number: challan.eway_bill_number || undefined,
            notes: challan.notes || undefined,
            affects_stock: challan.affects_stock === undefined ? true : !!Number(challan.affects_stock),
            items,
          });
        } else if (remaining) {
          const map: Record<string, number> = {};
          const items = (remaining.items || [])
            .filter((r: any) => Number(r.remaining_qty) > 0)
            .map((r: any) => {
              map[r.quotation_item_id] = Number(r.remaining_qty);
              return {
                quotation_item_id: r.quotation_item_id,
                product_id: r.product_id ?? undefined,
                variant_id: r.variant_id ?? undefined,
                catalog_name: r.product_id ? r.item_name : undefined,
                item_name: r.item_name,
                description: r.description || undefined,
                hsn_code: r.hsn_code || undefined,
                quantity: Number(r.remaining_qty),
                unit: r.unit || undefined,
                rate: Number(r.rate || 0),
              };
            });
          setMaxQtyMap(map);
          const q = remaining.quotation || {};
          const billing = parseJson(q.billing_address_snapshot);
          form.setFieldsValue({
            challan_date: dayjs(),
            reason: "SALE",
            affects_stock: true,
            place_of_supply: q.place_of_supply || billing?.state || undefined,
            items,
          });
        } else {
          form.setFieldsValue({
            challan_date: dayjs(),
            affects_stock: true,
            items: [{}],
          });
          searchCustomers("");
        }
      } catch (err: any) {
        if (!cancelled) setInitError(errorMessage(err, "Unable to load challan form"));
      } finally {
        if (!cancelled) setInitLoading(false);
      }
    };
    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, linkedQuotationId, challan?.id]);

  // ─── Customer selection ────────────────────────────────────────────────────
  const handleCustomerChange = async (id: any) => {
    const picked = customerOptions.find((c) => Number(c.id) === Number(id));
    if (!picked) {
      setSelectedCustomer(null);
      form.setFieldsValue({ billing_address_id: undefined, shipping_address_id: undefined });
      return;
    }
    const customer = await loadCustomerWithAddresses(picked);
    setSelectedCustomer(customer);
    const addresses: any[] = customer?.addresses || [];
    // Same preference as the backend: primary of the type, then any of the type.
    const ofType = (type: string) =>
      addresses.find((a) => a.address_type === type && Number(a.is_primary) === 1) ||
      addresses.find((a) => a.address_type === type);
    const billing =
      ofType("BILLING") ||
      addresses.find((a) => Number(a.is_primary) === 1) ||
      addresses[0];
    const shipping = ofType("SHIPPING") || billing;
    form.setFieldsValue({
      billing_address_id: billing?.id,
      shipping_address_id: shipping?.id,
      place_of_supply: shipping?.state || billing?.state || form.getFieldValue("place_of_supply"),
    });
  };

  const customerAddresses: any[] = selectedCustomer?.addresses || [];
  const billingId = Form.useWatch("billing_address_id", form);
  const shippingId = Form.useWatch("shipping_address_id", form);
  const billingAddr = customerAddresses.find((a) => Number(a.id) === Number(billingId));
  const shippingAddr = customerAddresses.find((a) => Number(a.id) === Number(shippingId));

  // ─── Product pick (auto-fill) ──────────────────────────────────────────────
  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        key: String(p.id),
        value: p.name,
        product: p,
        label: (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>{p.name}</span>
            <span style={{ color: "#8c8c8c", fontSize: 12 }}>
              {[p.product_code, p.unit].filter(Boolean).join(" · ")}
            </span>
          </div>
        ),
      })),
    [products],
  );

  const handleProductSelect = (index: number, option: any) => {
    const p = option?.product;
    if (!p) return;
    const items = [...(form.getFieldValue("items") || [])];
    items[index] = {
      ...items[index],
      product_id: p.id,
      variant_id: undefined,
      catalog_name: p.name,
      item_name: p.name,
      hsn_code: p.product_code || p.hsn_code || items[index]?.hsn_code,
      unit: p.unit || items[index]?.unit,
      rate: p.price != null ? Number(p.price) : items[index]?.rate,
    };
    form.setFieldsValue({ items });
  };

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleFinish = async (values: any) => {
    const items = (values.items || []).map((it: any) => {
      // A row only stays linked to a catalog product while its name still
      // matches the picked product — retyping the name makes it free text.
      const keepProduct = it.product_id && (quotationMode || it.item_name === it.catalog_name);
      return clean({
        quotation_item_id: it.quotation_item_id,
        product_id: keepProduct ? it.product_id : undefined,
        variant_id: keepProduct ? it.variant_id : undefined,
        item_name: it.item_name,
        description: it.description,
        hsn_code: it.hsn_code,
        quantity: Number(it.quantity),
        unit: it.unit,
        rate: it.rate != null ? Number(it.rate) : undefined,
      });
    });

    if (!items.length) {
      message.error("Add at least one item");
      return;
    }

    const transfer = values.reason === "STOCK_TRANSFER";
    const optionalHeader = {
      place_of_supply: values.place_of_supply,
      from_warehouse_id: values.from_warehouse_id,
      to_warehouse_id: transfer ? values.to_warehouse_id : undefined,
      transporter_name: values.transporter_name,
      vehicle_number: values.vehicle_number ? String(values.vehicle_number).toUpperCase() : undefined,
      eway_bill_number: values.eway_bill_number,
      notes: values.notes,
    };

    let payload: Record<string, any>;
    if (!isEdit) {
      payload = clean({
        challan_date: values.challan_date ? dayjs(values.challan_date).format("YYYY-MM-DD") : undefined,
        reason: values.reason,
        quotation_id: quotationId ? Number(quotationId) : undefined,
        customer_id: !quotationMode && !transfer ? values.customer_id : undefined,
        billing_address_id: !quotationMode && !transfer ? values.billing_address_id : undefined,
        shipping_address_id: !quotationMode && !transfer ? values.shipping_address_id : undefined,
        ...optionalHeader,
        affects_stock: values.affects_stock !== false,
        series_id: values.series_id,
      });
    } else {
      // The update API keeps the stored value for any field that is left out,
      // so cleared optional fields are sent as explicit nulls.
      const header: Record<string, any> = {};
      Object.entries(optionalHeader).forEach(([k, v]) => {
        const s = typeof v === "string" ? v.trim() : v;
        header[k] = s === undefined || s === null || s === "" ? null : s;
      });
      payload = {
        ...header,
        challan_date: values.challan_date ? dayjs(values.challan_date).format("YYYY-MM-DD") : undefined,
        reason: values.reason,
        affects_stock: values.affects_stock !== false,
      };
      if (!payload.challan_date) delete payload.challan_date;

      if (!quotationMode) {
        if (transfer) {
          // A stock transfer has no consignee customer — clear the stored one.
          if (challan?.customer_id != null) payload.customer_id = null;
        } else {
          const init = initialConsignee.current;
          const same = (a: any, b: any) => (a == null && b == null) || Number(a) === Number(b);
          const changed =
            !same(values.customer_id, init.customer_id) ||
            !same(values.billing_address_id, init.billing_address_id) ||
            !same(values.shipping_address_id, init.shipping_address_id) ||
            challan?.reason === "STOCK_TRANSFER";
          if (changed) {
            payload.customer_id = values.customer_id ?? null;
            payload.billing_address_id = values.billing_address_id ?? null;
            payload.shipping_address_id = values.shipping_address_id ?? null;
          }
        }
      }
    }
    payload.items = items;

    try {
      const result = isEdit
        ? await dispatch(updateChallan({ id: challan.id, payload })).unwrap()
        : await dispatch(createChallan(payload)).unwrap();
      message.success(isEdit ? "Delivery challan updated" : "Delivery challan created");
      onSaved(result || challan);
    } catch (err: any) {
      message.error(errorMessage(err, "Unable to save delivery challan"));
    }
  };

  const reasonOptions = quotationMode
    ? CHALLAN_REASONS.filter((r) => QUOTATION_REASONS.includes(r.value))
    : CHALLAN_REASONS;

  const warehouseOptions = warehouses.map((w) => ({ label: w.name, value: w.id }));

  const title = isEdit
    ? `Edit Delivery Challan ${challan?.challan_number || ""}`
    : quotationMode
      ? "New Delivery Challan from Quotation"
      : "New Delivery Challan";

  const noRemaining = quotationMode && !isEdit && !initLoading && quotation && !(watchedItems || []).length;

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      width={1080}
      destroyOnHidden
      mask={{ closable: false }}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="save"
          type="primary"
          loading={saving}
          disabled={initLoading || !!initError || !!noRemaining}
          onClick={() => form.submit()}
        >
          {isEdit ? "Save Changes" : "Create Challan"}
        </Button>,
      ]}
    >
      <Spin spinning={initLoading}>
        {initError && <Alert type="error" showIcon title={initError} style={{ marginBottom: 16 }} />}

        <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark="optional">
          {quotationMode && quotation && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              title={
                <span>
                  Quotation <b>{quotation.quotation_number}</b> — {quotation.customer_name || "Customer"}
                </span>
              }
              description="Customer and addresses are copied from the quotation. Quantities default to what is still pending delivery; reduce them for a partial dispatch."
            />
          )}
          {noRemaining && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              title="Every item of this quotation has already been dispatched on other challans."
            />
          )}
          {!isEdit && <SeriesField docType="DELIVERY_CHALLAN" form={form} />}

          <Row gutter={16}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="challan_date" label="Challan Date" rules={[{ required: true, message: "Select a date" }]}>
                <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="reason" label="Reason for Movement" rules={[{ required: true, message: "Select a reason" }]}>
                <Select
                  placeholder="Select reason"
                  options={reasonOptions}
                  onChange={(v) => {
                    if (v !== "STOCK_TRANSFER") form.setFieldsValue({ to_warehouse_id: undefined });
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={10}>
              <Form.Item name="place_of_supply" label="Place of Supply">
                <Input placeholder="e.g. Maharashtra" maxLength={100} />
              </Form.Item>
            </Col>
          </Row>

          {/* ── Consignee / transfer ─────────────────────────────────────── */}
          {!quotationMode && !isTransfer && (
            <>
              <Divider titlePlacement="start" style={{ marginTop: 0 }}>
                Consignee
              </Divider>
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item
                    name="customer_id"
                    label="Customer"
                    rules={[{ required: true, message: "Select a customer" }]}
                  >
                    <Select
                      showSearch={{ filterOption: false, onSearch: debouncedCustomerSearch }}
                      allowClear
                      placeholder="Search customer"
                      onChange={handleCustomerChange}
                      notFoundContent={customerLoading ? <Spin size="small" /> : "No customers found"}
                      options={customerOptions.map((c) => ({
                        value: c.id,
                        label: c.display_name || c.company_name || c.name || `Customer #${c.id}`,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="billing_address_id" label="Billing Address" extra={addressLines(billingAddr).join(", ")}>
                    <Select
                      allowClear
                      placeholder={isEdit ? "Keep current address" : "Select billing address"}
                      options={customerAddresses.map((a) => ({ value: a.id, label: addressLabel(a) }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="shipping_address_id" label="Shipping Address" extra={addressLines(shippingAddr).join(", ")}>
                    <Select
                      allowClear
                      placeholder={isEdit ? "Keep current address" : "Select shipping address"}
                      options={customerAddresses.map((a) => ({ value: a.id, label: addressLabel(a) }))}
                      onChange={(id) => {
                        const a = customerAddresses.find((x) => Number(x.id) === Number(id));
                        if (a?.state) form.setFieldsValue({ place_of_supply: a.state });
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          <Divider titlePlacement="start" style={{ marginTop: 0 }}>
            {isTransfer ? "Stock Transfer" : "Warehouse & Stock"}
          </Divider>
          <Row gutter={16}>
            <Col xs={24} md={isTransfer ? 8 : 12}>
              <Form.Item
                name="from_warehouse_id"
                label="From Warehouse"
                rules={isTransfer ? [{ required: true, message: "Select source warehouse" }] : []}
                extra={!isTransfer ? "Stock is deducted from this warehouse when the challan is dispatched." : undefined}
              >
                <Select allowClear placeholder="Select warehouse" options={warehouseOptions} />
              </Form.Item>
            </Col>
            {isTransfer && (
              <Col xs={24} md={8}>
                <Form.Item
                  name="to_warehouse_id"
                  label="To Warehouse"
                  dependencies={["from_warehouse_id"]}
                  rules={[
                    { required: true, message: "Select destination warehouse" },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || value !== getFieldValue("from_warehouse_id")) return Promise.resolve();
                        return Promise.reject(new Error("Must differ from the source warehouse"));
                      },
                    }),
                  ]}
                >
                  <Select allowClear placeholder="Select warehouse" options={warehouseOptions} />
                </Form.Item>
              </Col>
            )}
            <Col xs={24} md={isTransfer ? 8 : 12}>
              <Form.Item
                name="affects_stock"
                label="Update Inventory"
                valuePropName="checked"
                extra="Turn off for goods that are not tracked in inventory."
              >
                <Switch checkedChildren="Yes" unCheckedChildren="No" />
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="start" style={{ marginTop: 0 }}>
            Transport
          </Divider>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="transporter_name" label="Transporter">
                <Input placeholder="Transporter name" maxLength={255} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="vehicle_number" label="Vehicle Number">
                <Input placeholder="e.g. MH12AB1234" maxLength={32} style={{ textTransform: "uppercase" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="eway_bill_number" label="E-way Bill Number">
                <Input placeholder="Optional" maxLength={32} />
              </Form.Item>
            </Col>
          </Row>

          {/* ── Items ─────────────────────────────────────────────────────── */}
          <Divider titlePlacement="start" style={{ marginTop: 0 }}>
            Items
          </Divider>
          <Form.List
            name="items"
            rules={[
              {
                validator: async (_, items) => {
                  if (!items || items.length < 1) throw new Error("Add at least one item");
                },
              },
            ]}
          >
            {(fields, { add, remove }, { errors }) => (
              <>
                <Row gutter={8} className="dc-items-head" style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 4 }}>
                  <Col xs={0} md={8}>Item / Description</Col>
                  <Col xs={0} md={3}>HSN</Col>
                  <Col xs={0} md={3}>Qty</Col>
                  <Col xs={0} md={2}>Unit</Col>
                  <Col xs={0} md={3}>Rate (₹)</Col>
                  <Col xs={0} md={4} style={{ textAlign: "right" }}>Value</Col>
                  <Col xs={0} md={1} />
                </Row>
                {fields.map(({ key, name }, index) => {
                  const qItemId = form.getFieldValue(["items", name, "quotation_item_id"]);
                  const maxQty = qItemId != null ? maxQtyMap[qItemId] : undefined;
                  return (
                    <Row
                      key={key}
                      gutter={8}
                      align="top"
                      style={{ borderBottom: "1px solid #f0f0f0", paddingTop: 8, marginBottom: 4 }}
                    >
                      <Form.Item name={[name, "quotation_item_id"]} hidden><Input /></Form.Item>
                      <Form.Item name={[name, "product_id"]} hidden><Input /></Form.Item>
                      <Form.Item name={[name, "variant_id"]} hidden><Input /></Form.Item>
                      <Form.Item name={[name, "catalog_name"]} hidden><Input /></Form.Item>
                      <Col xs={24} md={8}>
                        <Form.Item
                          name={[name, "item_name"]}
                          rules={[{ required: true, message: "Item name is required" }]}
                          style={{ marginBottom: 6 }}
                        >
                          {quotationMode ? (
                            <Input disabled />
                          ) : (
                            <AutoComplete
                              options={productOptions}
                              showSearch={{ onSearch: debouncedProductSearch }}
                              onSelect={(_: any, option: any) => handleProductSelect(index, option)}
                              notFoundContent={productLoading ? <Spin size="small" /> : null}
                              placeholder="Search catalog or type item"
                            />
                          )}
                        </Form.Item>
                        <Form.Item name={[name, "description"]} style={{ marginBottom: 8 }}>
                          <Input size="small" placeholder="Description (optional)" />
                        </Form.Item>
                        <Form.Item noStyle shouldUpdate>
                          {() => {
                            const row = form.getFieldValue(["items", name]) || {};
                            const linked = row.product_id && (quotationMode || row.item_name === row.catalog_name);
                            return linked ? (
                              <Tag color="blue" style={{ marginBottom: 8 }}>
                                Catalog product
                              </Tag>
                            ) : null;
                          }}
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={3}>
                        <Form.Item name={[name, "hsn_code"]} style={{ marginBottom: 8 }}>
                          <Input placeholder="HSN" maxLength={20} />
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={3}>
                        <Form.Item
                          name={[name, "quantity"]}
                          style={{ marginBottom: 8 }}
                          extra={maxQty != null ? <Text type="secondary" style={{ fontSize: 11 }}>Pending: {formatQty(maxQty)}</Text> : undefined}
                          rules={[
                            { required: true, message: "Qty required" },
                            {
                              validator: async (_, v) => {
                                if (v == null || v === "") return;
                                if (Number(v) <= 0) throw new Error("Must be > 0");
                                if (maxQty != null && Number(v) > maxQty) {
                                  throw new Error(`Max ${formatQty(maxQty)}`);
                                }
                              },
                            },
                          ]}
                        >
                          <InputNumber
                            min={0.001}
                            max={maxQty}
                            step={1}
                            precision={3}
                            style={{ width: "100%" }}
                            placeholder="Qty"
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={8} md={2}>
                        <Form.Item name={[name, "unit"]} style={{ marginBottom: 8 }}>
                          <Input placeholder="pcs" maxLength={32} />
                        </Form.Item>
                      </Col>
                      <Col xs={8} md={3}>
                        <Form.Item name={[name, "rate"]} style={{ marginBottom: 8 }}>
                          <InputNumber min={0} step={0.01} precision={2} style={{ width: "100%" }} placeholder="0.00" />
                        </Form.Item>
                      </Col>
                      <Col xs={6} md={4} style={{ textAlign: "right", paddingTop: 5 }}>
                        <Form.Item noStyle shouldUpdate>
                          {() => {
                            const row = form.getFieldValue(["items", name]) || {};
                            return <Text strong>{formatMoney(Number(row.quantity || 0) * Number(row.rate || 0))}</Text>;
                          }}
                        </Form.Item>
                      </Col>
                      <Col xs={2} md={1} style={{ textAlign: "right" }}>
                        <Tooltip title="Remove item">
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            disabled={fields.length <= 1}
                            onClick={() => remove(name)}
                          />
                        </Tooltip>
                      </Col>
                    </Row>
                  );
                })}
                <Form.ErrorList errors={errors} />
                {!quotationMode && (
                  <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({})} style={{ marginTop: 8 }}>
                    Add Item
                  </Button>
                )}
              </>
            )}
          </Form.List>

          <Form.Item noStyle shouldUpdate>
            {() => {
              const items = form.getFieldValue("items") || [];
              const qty = items.reduce((s: number, it: any) => s + Number(it?.quantity || 0), 0);
              const value = items.reduce(
                (s: number, it: any) => s + Number(it?.quantity || 0) * Number(it?.rate || 0),
                0,
              );
              return (
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 24, margin: "12px 0 16px" }}>
                  <Text>
                    Total Qty: <b>{formatQty(qty)}</b>
                  </Text>
                  <Text>
                    Total Value: <b>{formatMoney(value)}</b>
                  </Text>
                </div>
              );
            }}
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Any remarks to print on the challan" />
          </Form.Item>
          <Text type="secondary" style={{ fontSize: 12 }}>
            A delivery challan is not a tax invoice — no GST is charged on it. Values are for reference only.
          </Text>
        </Form>
      </Spin>
    </Modal>
  );
};

export default ChallanFormModal;
