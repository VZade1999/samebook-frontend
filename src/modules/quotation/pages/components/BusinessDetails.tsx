import { useEffect, useState } from "react";
import { Form, Input, Row, Col, Select, Spin } from "antd";
import { IdcardOutlined, ShopOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { StorageService } from "@/storage";
import { getCompanyDetails } from "@/modules/companies/redux/companyActions";
import FormSection from "./FormSection";

const { TextArea } = Input;
const { Option } = Select;

const Divider = ({ label }: { label: string }) => <div className="qf-divider">{label}</div>;

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
  const needOneAddress = { validator: () => { const sa = form.getFieldValue("selectedAddress") || []; const sl = form.getFieldValue("selectedLocation") || []; return (sa.length || sl.length) ? Promise.resolve() : Promise.reject(new Error("Select at least one address or location")); } };

  return (
    <FormSection id="qf-business" step={2} icon={<ShopOutlined />} title="Your business" sub="Address, GSTIN and contacts printed on the quotation">
      {loading && !addresses.length ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 160 }}>
          <Spin />
        </div>
      ) : (
        <>
          <Form.Item name="businessDetailsSnapshot" hidden><Input type="hidden" /></Form.Item>

          <Row gutter={[14, 0]}>
            <Col xs={24} md={14}>
              <Form.Item label="Company name" name="businessName">
                <Input placeholder="—" disabled prefix={<ShopOutlined />} />
              </Form.Item>
            </Col>
            <Col xs={24} md={10}>
              <Form.Item label="GSTIN" name="businessGST">
                <Input placeholder="—" disabled prefix={<IdcardOutlined />} className="qp-mono" />
              </Form.Item>
            </Col>
          </Row>

          <Divider label="Address" />
          <Row gutter={[14, 0]}>
            <Col xs={24} md={12}>
              <Form.Item label="Addresses" name="selectedAddress" dependencies={["selectedLocation"]} rules={[needOneAddress]}>
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
              <Form.Item label="Locations" name="selectedLocation" dependencies={["selectedAddress"]} rules={[needOneAddress]}>
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
          <Form.Item label="Printed address" name="businessAddress">
            <TextArea autoSize={{ minRows: 2, maxRows: 5 }} disabled />
          </Form.Item>

          <Divider label="Contact" />
          <Row gutter={[14, 0]}>
            <Col xs={24} md={12}>
              <Form.Item label="Phone numbers" name="selectedPhones" rules={[{ validator: (_: any, v: any[]) => v?.length ? Promise.resolve() : Promise.reject(new Error("Select at least one phone number")) }]}>
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
              <Form.Item label="Email addresses" name="selectedEmails" rules={[{ validator: (_: any, v: any[]) => v?.length ? Promise.resolve() : Promise.reject(new Error("Select at least one email address")) }]}>
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
          {/* What the selections above print as. */}
          <Form.Item name="businessPhone" hidden><Input /></Form.Item>
          <Form.Item name="businessEmail" hidden><Input /></Form.Item>

          {metadata.length > 0 && (
            <>
              <Divider label="Extra details" />
              <Form.Item label="Show on the quotation" name="businessMeta" style={{ marginBottom: 4 }}>
                <Select mode="multiple" placeholder="e.g. MSME number, FSSAI licence" onChange={handleMetadataChange} allowClear optionLabelProp="label">
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
    </FormSection>
  );
};

export default BusinessDetails;
