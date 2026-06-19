import React, { useEffect, useState } from "react";
import { Card, Form, Input, Row, Col, Select, Spin } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { StorageService } from "@/storage";
import { getCompanyDetails } from "@/modules/companies/redux/companyActions";
import { BuildingOffice2Icon } from "@heroicons/react/24/outline";

const { TextArea } = Input;
const { Option } = Select;

/* ─── Design tokens ─────────────────────────────────────────────────────── */
const tokens = {
  // Palette: deep navy + warm white + amber accent
  navy: "#0F1F3D",
  navyMid: "#1A3560",
  surface: "#F8F9FC",
  surfaceCard: "#FFFFFF",
  border: "#E4E8F0",
  borderFocus: "#3B6FE8",
  accent: "#3B6FE8",
  accentLight: "#EBF0FD",
  text: "#0F1F3D",
  textMuted: "#6B7A99",
  textLight: "#A0ABBF",
  amber: "#F59E0B",
  radius: "12px",
  radiusSm: "8px",
  shadow: "0 1px 3px rgba(15,31,61,0.06), 0 4px 16px rgba(15,31,61,0.06)",
  shadowHover: "0 4px 20px rgba(59,111,232,0.12)",
};

/* ─── Injected global styles ────────────────────────────────────────────── */
const injectStyles = () => {
  const id = "bd-premium-styles";
  if (document.getElementById(id)) return;
  const s = document.createElement("style");
  s.id = id;
  s.textContent = `
    /* Card shell */
    .bd-card .ant-card {
      border-radius: ${tokens.radius} !important;
      border: 1px solid ${tokens.border} !important;
      box-shadow: ${tokens.shadow} !important;
      background: ${tokens.surfaceCard} !important;
      overflow: hidden;
    }
    .bd-card .ant-card-head {
      background: linear-gradient(135deg, ${tokens.navy} 0%, ${tokens.navyMid} 100%) !important;
      border-bottom: none !important;
      padding: 0 !important;
      min-height: unset !important;
    }
    .bd-card .ant-card-head-title { padding: 0 !important; }
    .bd-card .ant-card-body {
      padding: 28px 28px 20px !important;
      background: ${tokens.surfaceCard};
    }

    /* Form label */
    .bd-card .ant-form-item-label > label {
      font-size: 11.5px !important;
      font-weight: 600 !important;
      letter-spacing: 0.5px !important;
      text-transform: uppercase !important;
      color: ${tokens.textMuted} !important;
    }

    /* Input / TextArea */
    .bd-card .ant-input,
    .bd-card .ant-input-affix-wrapper,
    .bd-card .ant-select-selector {
      border-radius: ${tokens.radiusSm} !important;
      border-color: ${tokens.border} !important;
      background: ${tokens.surface} !important;
      color: ${tokens.text} !important;
      font-size: 14px !important;
      transition: all 0.18s ease !important;
    }
    .bd-card .ant-input:focus,
    .bd-card .ant-select-focused .ant-select-selector {
      border-color: ${tokens.borderFocus} !important;
      box-shadow: 0 0 0 3px rgba(59,111,232,0.10) !important;
      background: #fff !important;
    }
    .bd-card .ant-input[disabled],
    .bd-card .ant-input-disabled,
    .bd-card textarea[disabled] {
      background: ${tokens.surface} !important;
      color: ${tokens.text} !important;
      cursor: default !important;
      opacity: 1 !important;
    }
    .bd-card .ant-select-disabled .ant-select-selector {
      background: ${tokens.surface} !important;
      color: ${tokens.text} !important;
    }

    /* Select multi-tag */
    .bd-card .ant-select-multiple .ant-select-selection-item {
      background: ${tokens.accentLight} !important;
      border-color: #C7D8FA !important;
      border-radius: 6px !important;
      color: ${tokens.accent} !important;
      font-size: 12px !important;
      font-weight: 500 !important;
    }
    .bd-card .ant-select-multiple .ant-select-selection-item-remove {
      color: ${tokens.accent} !important;
    }

    /* Section divider label */
    .bd-section-divider {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 20px 0 16px;
    }
    .bd-section-divider span {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: ${tokens.textLight};
    }
    .bd-section-divider::before,
    .bd-section-divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: ${tokens.border};
    }
    .bd-section-divider::before { flex: 0 0 0px; }

    /* Responsive */
    @media (max-width: 575px) {
      .bd-card .ant-card-body { padding: 20px 16px 14px !important; }
    }
  `;
  document.head.appendChild(s);
};
injectStyles();

/* ─── Card header ───────────────────────────────────────────────────────── */
const CardHeader = () => (
  <div style={{
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "18px 24px",
  }}>
    <div style={{
      width: 36,
      height: 36,
      borderRadius: 10,
      background: "rgba(255,255,255,0.12)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
        <path d="M3 21h18M9 8h1m5 0h1M9 12h1m5 0h1M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"/>
      </svg>
    </div>
    <div>
      <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>Business Details</div>
      <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 11.5, marginTop: 2 }}>Company address, GST & contact information</div>
    </div>
  </div>
);

/* ─── Section divider ───────────────────────────────────────────────────── */
const SectionDivider = ({ label }: { label: string }) => (
  <div className="bd-section-divider"><span>{label}</span></div>
);

/* ─── Component ─────────────────────────────────────────────────────────── */
const BusinessDetails = () => {
  const form = Form.useFormInstance();
  const storageService: any = new StorageService();
  const storedCompany = storageService.getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS);
  const initialCompany = storedCompany ? JSON.parse(storedCompany) : null;
  const dispatch = useDispatch();
  const companyState = useSelector((state: any) => state.companies || {});

  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState<any>(initialCompany);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [metadata, setMetadata] = useState<any[]>([]);
  const [selectedAddressIds, setSelectedAddressIds] = useState<any[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<any[]>([]);
  const [selectedPhoneIds, setSelectedPhoneIds] = useState<any[]>([]);
  const [selectedEmailIds, setSelectedEmailIds] = useState<any[]>([]);

  const businessDetailsSnapshotValue = Form.useWatch("businessDetailsSnapshot", form);
  const companyPhoneOptionId = "company-primary-phone";
  const companyEmailOptionId = "company-primary-email";

  const getPhoneValue = (item: any) =>
    item?.phone || item?.mobile || item?.manager_phone || item?.primary_phone || item?.phone_number || "";
  const getEmailValue = (item: any) =>
    item?.email || item?.primary_email || item?.manager_email || "";

  const buildPhoneOptions = (companyData: any, addressList: any[], locationList: any[]) => [
    ...(companyData?.primary_phone ? [{ id: companyPhoneOptionId, label: "Primary Phone", detail: companyData.primary_phone, value: companyData.primary_phone }] : []),
    ...addressList.map((a) => { const p = getPhoneValue(a); if (!p) return null; return { id: `address-phone-${a.id}`, label: `${a.type || "Address"}${a.label ? ` · ${a.label}` : ""}`, detail: p, value: p }; }).filter(Boolean),
    ...locationList.map((l) => { const p = getPhoneValue(l); if (!p) return null; return { id: `location-phone-${l.id}`, label: `${l.location_type || "Location"}${l.name ? ` · ${l.name}` : ""}`, detail: p, value: p }; }).filter(Boolean),
  ];

  const buildEmailOptions = (companyData: any, addressList: any[], locationList: any[]) => [
    ...(companyData?.primary_email ? [{ id: companyEmailOptionId, label: "Primary Email", detail: companyData.primary_email, value: companyData.primary_email }] : []),
    ...addressList.map((a) => { const e = getEmailValue(a); if (!e) return null; return { id: `address-email-${a.id}`, label: `${a.type || "Address"}${a.label ? ` · ${a.label}` : ""}`, detail: e, value: e }; }).filter(Boolean),
    ...locationList.map((l) => { const e = getEmailValue(l); if (!e) return null; return { id: `location-email-${l.id}`, label: `${l.location_type || "Location"}${l.name ? ` · ${l.name}` : ""}`, detail: e, value: e }; }).filter(Boolean),
  ];

  const buildContactValue = (selectedIds: any[], options: any[]) =>
    options.filter((o) => selectedIds.includes(o.id)).map((o) => o.value).join(", ");

  const buildBusinessAddress = (addressIds: any[], locationIds: any[], addressData: any[] = addresses, locationData: any[] = locations) => {
    const selectedAddresses = addressData.filter((a) => addressIds.includes(a.id));
    const selectedLocations = locationData.filter((l) => locationIds.includes(l.id));
    return [
      ...selectedAddresses.map((sel) => `${sel.type ? `${sel.type}: ` : ""}${sel.line_1 || ""} ${sel.line_2 || ""} ${sel.city || ""} ${sel.state || ""} ${sel.postal_code || ""}`.trim()),
      ...selectedLocations.map((sel) => { const addr = sel.address || { line_1: sel.address_line_1, line_2: sel.address_line_2, city: sel.address_city, state: sel.address_state, postal_code: sel.address_postal_code }; return `${sel.location_type ? `${sel.location_type}: ` : ""}${addr.line_1 || ""} ${addr.line_2 || ""} ${addr.city || ""} ${addr.state || ""} ${addr.postal_code || ""}`.trim(); }),
    ].filter(Boolean).join("\n\n");
  };

  useEffect(() => {
    const companyId = company?.id ?? initialCompany?.id;
    if (!companyId) return;
    dispatch(getCompanyDetails(companyId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!companyState) return;
    setLoading(!!companyState.loading);
    const details = companyState.companyDetails;
    if (details) {
      const existingSnapshotRaw = form.getFieldValue("businessDetailsSnapshot");
      const existingSnapshot = existingSnapshotRaw ? (typeof existingSnapshotRaw === "string" ? JSON.parse(existingSnapshotRaw) : existingSnapshotRaw) : null;
      const detailsAddresses = details.addresses || [];
      const detailsLocations = details.locations || [];
      const defaultAddressIds = detailsAddresses.filter((a: any) => a.is_default === 1).map((a: any) => a.id);
      const initialAddressIds = Array.isArray(existingSnapshot?.selectedAddress) ? existingSnapshot.selectedAddress : defaultAddressIds.length ? defaultAddressIds : detailsAddresses.length ? [detailsAddresses[0].id] : [];
      const initialLocationIds = Array.isArray(existingSnapshot?.selectedLocation) ? existingSnapshot.selectedLocation : [];
      const initialPhoneIds = Array.isArray(existingSnapshot?.selectedPhones) ? existingSnapshot.selectedPhones : details.primary_phone ? [companyPhoneOptionId] : [];
      const initialEmailIds = Array.isArray(existingSnapshot?.selectedEmails) ? existingSnapshot.selectedEmails : details.primary_email ? [companyEmailOptionId] : [];

      setCompany(details); setAddresses(detailsAddresses); setLocations(detailsLocations); setMetadata(details.metadata || []);
      setSelectedAddressIds(initialAddressIds); setSelectedLocationIds(initialLocationIds); setSelectedPhoneIds(initialPhoneIds); setSelectedEmailIds(initialEmailIds);

      const phoneOptions = buildPhoneOptions(details, detailsAddresses, detailsLocations);
      const emailOptions = buildEmailOptions(details, detailsAddresses, detailsLocations);
      const initialBusinessAddress = existingSnapshot?.businessAddress ?? buildBusinessAddress(initialAddressIds, initialLocationIds, detailsAddresses, detailsLocations);
      const initialBusinessGST = existingSnapshot?.gst_no ?? details.gst_no ?? "";
      const initialBusinessPhone = existingSnapshot?.businessPhone ?? buildContactValue(initialPhoneIds, phoneOptions);
      const initialBusinessEmail = existingSnapshot?.businessEmail ?? buildContactValue(initialEmailIds, emailOptions);
      const initialBusinessMeta = Array.isArray(existingSnapshot?.businessMeta) ? existingSnapshot.businessMeta : [];

      try { storageService.setItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS, JSON.stringify(details)); } catch (e) {}

      if (form) {
        form.setFieldsValue({
          businessName: existingSnapshot?.businessName ?? details.name,
          selectedAddress: initialAddressIds, selectedLocation: initialLocationIds,
          selectedPhones: initialPhoneIds, selectedEmails: initialEmailIds,
          businessAddress: initialBusinessAddress, businessGST: initialBusinessGST,
          businessPhone: initialBusinessPhone, businessEmail: initialBusinessEmail,
          businessMeta: initialBusinessMeta,
          businessDetailsSnapshot: JSON.stringify({ businessName: existingSnapshot?.businessName ?? details.name, selectedAddress: initialAddressIds, selectedLocation: initialLocationIds, selectedPhones: initialPhoneIds, selectedEmails: initialEmailIds, businessAddress: initialBusinessAddress, businessGST: initialBusinessGST, businessPhone: initialBusinessPhone, businessEmail: initialBusinessEmail, businessMeta: initialBusinessMeta }),
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyState?.companyDetails, businessDetailsSnapshotValue]);

  const updateSnapshot = (patch: any) => {
    form.setFieldsValue({
      businessDetailsSnapshot: JSON.stringify({
        businessName: company?.name,
        selectedAddress: selectedAddressIds, selectedLocation: selectedLocationIds,
        selectedPhones: selectedPhoneIds, selectedEmails: selectedEmailIds,
        businessAddress: form.getFieldValue("businessAddress") || "",
        businessGST: form.getFieldValue("businessGST") || "",
        businessPhone: form.getFieldValue("businessPhone") || "",
        businessEmail: form.getFieldValue("businessEmail") || "",
        businessMeta: form.getFieldValue("businessMeta") || [],
        ...patch,
      }),
    });
  };

  const handleAddressChange = (value: any[]) => {
    const ids = value || [];
    setSelectedAddressIds(ids);
    const combined = buildBusinessAddress(ids, selectedLocationIds);
    form.setFieldsValue({ selectedAddress: ids, businessAddress: combined });
    updateSnapshot({ selectedAddress: ids, businessAddress: combined });
    try { form.validateFields(["selectedAddress", "selectedLocation"]); } catch (e) {}
  };

  const handleLocationChange = (value: any[]) => {
    const ids = value || [];
    setSelectedLocationIds(ids);
    const combined = buildBusinessAddress(selectedAddressIds, ids);
    form.setFieldsValue({ selectedLocation: ids, businessAddress: combined });
    updateSnapshot({ selectedLocation: ids, businessAddress: combined });
    try { form.validateFields(["selectedAddress", "selectedLocation"]); } catch (e) {}
  };

  const handlePhoneChange = (value: any[]) => {
    const ids = value || [];
    setSelectedPhoneIds(ids);
    const phoneValue = buildContactValue(ids, buildPhoneOptions(company, addresses, locations));
    form.setFieldsValue({ selectedPhones: ids, businessPhone: phoneValue });
    updateSnapshot({ selectedPhones: ids, businessPhone: phoneValue });
    try { form.validateFields(["selectedPhones"]); } catch (e) {}
  };

  const handleEmailChange = (value: any[]) => {
    const ids = value || [];
    setSelectedEmailIds(ids);
    const emailValue = buildContactValue(ids, buildEmailOptions(company, addresses, locations));
    form.setFieldsValue({ selectedEmails: ids, businessEmail: emailValue });
    updateSnapshot({ selectedEmails: ids, businessEmail: emailValue });
    try { form.validateFields(["selectedEmails"]); } catch (e) {}
  };

  const handleMetadataChange = (value: any[]) => {
    const ids = value || [];
    form.setFieldsValue({ businessMeta: ids });
    updateSnapshot({ businessMeta: ids });
  };

  const phoneOptions = buildPhoneOptions(company, addresses, locations);
  const emailOptions = buildEmailOptions(company, addresses, locations);

  return (
    <div className="bd-card">
      <Card title={<CardHeader />} bordered={false}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 160 }}>
            <Spin size="large" />
          </div>
        ) : (
          <>
            <Form.Item name="businessDetailsSnapshot" hidden><Input type="hidden" /></Form.Item>

            {/* Company name */}
            <Form.Item label="Company Name" name="businessName">
              <Input placeholder="—" disabled prefix={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={tokens.textLight} strokeWidth="1.8"><path d="M3 21h18M9 8h1m5 0h1M9 12h1m5 0h1M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"/></svg>
              } />
            </Form.Item>

            <SectionDivider label="Address Selection" />

            <Row gutter={[16, 0]}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Addresses"
                  name="selectedAddress"
                  dependencies={["selectedLocation"]}
                  rules={[{ validator: (_: any) => { const sa = form.getFieldValue("selectedAddress") || []; const sl = form.getFieldValue("selectedLocation") || []; return (sa.length || sl.length) ? Promise.resolve() : Promise.reject(new Error("Select at least one address or location")); } }]}
                >
                  <Select mode="multiple" value={selectedAddressIds} placeholder="Choose addresses" onChange={handleAddressChange} allowClear optionLabelProp="label">
                    {addresses.map((a) => (
                      <Option key={a.id} value={a.id} label={<span><strong>{a.type || "Address"}</strong>{a.label ? ` · ${a.label}` : ""}</span>}>
                        <span><strong>{a.type || "Address"}</strong>{a.label ? ` · ${a.label}` : ""}{` — ${a.line_1 || ""} ${a.city || ""}`.trim()}</span>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Locations"
                  name="selectedLocation"
                  dependencies={["selectedAddress"]}
                  rules={[{ validator: (_: any) => { const sa = form.getFieldValue("selectedAddress") || []; const sl = form.getFieldValue("selectedLocation") || []; return (sa.length || sl.length) ? Promise.resolve() : Promise.reject(new Error("Select at least one address or location")); } }]}
                >
                  <Select mode="multiple" value={selectedLocationIds} placeholder="Choose locations" onChange={handleLocationChange} allowClear optionLabelProp="label">
                    {locations.map((l) => (
                      <Option key={l.id} value={l.id} label={<span><strong>{l.location_type || "Location"}</strong>{` · ${l.name}`}</span>}>
                        <span><strong>{l.location_type || "Location"}</strong>{` · ${l.name}`}</span>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="Business Address" name="businessAddress">
              <TextArea rows={3} disabled style={{ resize: "none" }} />
            </Form.Item>

            <SectionDivider label="Contact & Tax" />

            <Form.Item label="GST Number" name="businessGST">
              <Input placeholder="—" disabled prefix={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={tokens.textLight} strokeWidth="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
              } />
            </Form.Item>

            <Row gutter={[16, 0]}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Phone Numbers"
                  name="selectedPhones"
                  rules={[{ validator: (_: any, v: any[]) => v?.length ? Promise.resolve() : Promise.reject(new Error("Select at least one phone number")) }]}
                >
                  <Select mode="multiple" value={selectedPhoneIds} placeholder="Choose phone numbers" onChange={handlePhoneChange} allowClear optionLabelProp="label">
                    {phoneOptions.map((p) => (
                      <Option key={p?.id} value={p?.id} label={<span><strong>{p?.label}</strong> · {p?.detail}</span>}>
                        <span><strong>{p?.label}</strong>{` · ${p?.detail}`}</span>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Email Addresses"
                  name="selectedEmails"
                  rules={[{ validator: (_: any, v: any[]) => v?.length ? Promise.resolve() : Promise.reject(new Error("Select at least one email address")) }]}
                >
                  <Select mode="multiple" value={selectedEmailIds} placeholder="Choose email addresses" onChange={handleEmailChange} allowClear optionLabelProp="label">
                    {emailOptions.map((e) => (
                      <Option key={e?.id} value={e?.id} label={<span><strong>{e?.label}</strong> · {e?.detail}</span>}>
                        <span><strong>{e?.label}</strong>{` · ${e?.detail}`}</span>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 0]}>
              <Col xs={24} md={12}>
                <Form.Item label="Phone (display)" name="businessPhone">
                  <Input disabled placeholder="—" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Email (display)" name="businessEmail">
                  <Input type="email" disabled placeholder="—" />
                </Form.Item>
              </Col>
            </Row>

            {metadata.length > 0 && (
              <>
                <SectionDivider label="Additional Metadata" />
                <Form.Item label="Metadata" name="businessMeta">
                  <Select mode="multiple" placeholder="Select applicable metadata" onChange={handleMetadataChange} allowClear optionLabelProp="label">
                    {metadata.map((m) => (
                      <Option key={m.id} value={m.id} label={<span><strong>{m.key}</strong> · {m.value}</span>}>
                        <span><strong>{m.key}</strong>{` · ${m.value}`}</span>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default BusinessDetails;