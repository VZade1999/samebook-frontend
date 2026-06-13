import React, { useEffect, useState } from "react";
import { Card, Form, Input, Row, Col, Select, Spin } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { StorageService } from "@/storage";
import { getCompanyDetails } from "@/modules/companies/redux/companyActions";

const { TextArea } = Input;
const { Option } = Select;

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
  const [selectedMetadataIds, setSelectedMetadataIds] = useState<any[]>([]);
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
    ...(companyData?.primary_phone
      ? [
          {
            id: companyPhoneOptionId,
            label: "Primary Phone",
            detail: companyData.primary_phone,
            value: companyData.primary_phone,
          },
        ]
      : []),
    ...addressList
      .map((address) => {
        const phone = getPhoneValue(address);
        if (!phone) return null;
        return {
          id: `address-phone-${address.id}`,
          label: `${address.type || "Address"}${address.label ? ` · ${address.label}` : ""}`,
          detail: phone,
          value: phone,
        };
      })
      .filter(Boolean),
    ...locationList
      .map((location) => {
        const phone = getPhoneValue(location);
        if (!phone) return null;
        return {
          id: `location-phone-${location.id}`,
          label: `${location.location_type || "Location"}${location.name ? ` · ${location.name}` : ""}`,
          detail: phone,
          value: phone,
        };
      })
      .filter(Boolean),
  ];

  const buildEmailOptions = (companyData: any, addressList: any[], locationList: any[]) => [
    ...(companyData?.primary_email
      ? [
          {
            id: companyEmailOptionId,
            label: "Primary Email",
            detail: companyData.primary_email,
            value: companyData.primary_email,
          },
        ]
      : []),
    ...addressList
      .map((address) => {
        const email = getEmailValue(address);
        if (!email) return null;
        return {
          id: `address-email-${address.id}`,
          label: `${address.type || "Address"}${address.label ? ` · ${address.label}` : ""}`,
          detail: email,
          value: email,
        };
      })
      .filter(Boolean),
    ...locationList
      .map((location) => {
        const email = getEmailValue(location);
        if (!email) return null;
        return {
          id: `location-email-${location.id}`,
          label: `${location.location_type || "Location"}${location.name ? ` · ${location.name}` : ""}`,
          detail: email,
          value: email,
        };
      })
      .filter(Boolean),
  ];

  const buildContactValue = (selectedIds: any[], options: any[]) =>
    options
      .filter((option) => selectedIds.includes(option.id))
      .map((option) => option.value)
      .join(", ");

  const buildBusinessAddress = (
    addressIds: any[],
    locationIds: any[],
    addressData: any[] = addresses,
    locationData: any[] = locations,
  ) => {
    const selectedAddresses = addressData.filter((address) => addressIds.includes(address.id));
    const selectedLocations = locationData.filter((location) => locationIds.includes(location.id));

    const addressParts = [
      ...selectedAddresses.map((sel) =>
        `${sel.type ? `${sel.type}: ` : ""}${sel.line_1 || ""} ${sel.line_2 || ""} ${sel.city || ""} ${sel.state || ""} ${sel.postal_code || ""}`.trim(),
      ),
      ...selectedLocations.map((sel) => {
        const addr = sel.address || {
          line_1: sel.address_line_1,
          line_2: sel.address_line_2,
          city: sel.address_city,
          state: sel.address_state,
          postal_code: sel.address_postal_code,
        };
        return `${sel.location_type ? `${sel.location_type}: ` : ""}${addr.line_1 || ""} ${addr.line_2 || ""} ${addr.city || ""} ${addr.state || ""} ${addr.postal_code || ""}`.trim();
      }),
    ].filter(Boolean);

    return addressParts.join("\n\n");
  };

  // Dispatch saga to fetch latest company details on mount
  useEffect(() => {
    const companyId = company?.id ?? initialCompany?.id;
    if (!companyId) return;
    dispatch(getCompanyDetails(companyId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // react to store updates and restore snapshot selections when editing quotations
  useEffect(() => {
    if (!companyState) return;
    setLoading(!!companyState.loading);
    const details = companyState.companyDetails;
    if (details) {
      const existingSnapshotRaw = form.getFieldValue('businessDetailsSnapshot');
      const existingSnapshot = existingSnapshotRaw
        ? typeof existingSnapshotRaw === 'string'
          ? JSON.parse(existingSnapshotRaw)
          : existingSnapshotRaw
        : null;

      const detailsAddresses = details.addresses || [];
      const detailsLocations = details.locations || [];
      const defaultAddressIds = detailsAddresses.filter((address: any) => address.is_default === 1).map((address: any) => address.id);
      const initialAddressIds = Array.isArray(existingSnapshot?.selectedAddress)
        ? existingSnapshot.selectedAddress
        : defaultAddressIds.length
        ? defaultAddressIds
        : detailsAddresses.length
        ? [detailsAddresses[0].id]
        : [];
      const initialLocationIds = Array.isArray(existingSnapshot?.selectedLocation)
        ? existingSnapshot.selectedLocation
        : [];
      const initialPhoneIds = Array.isArray(existingSnapshot?.selectedPhones)
        ? existingSnapshot.selectedPhones
        : details.primary_phone
        ? [companyPhoneOptionId]
        : [];
      const initialEmailIds = Array.isArray(existingSnapshot?.selectedEmails)
        ? existingSnapshot.selectedEmails
        : details.primary_email
        ? [companyEmailOptionId]
        : [];

      setCompany(details);
      setAddresses(detailsAddresses);
      setLocations(detailsLocations);
      setMetadata(details.metadata || []);
      setSelectedAddressIds(initialAddressIds);
      setSelectedLocationIds(initialLocationIds);
      setSelectedPhoneIds(initialPhoneIds);
      setSelectedEmailIds(initialEmailIds);

      const phoneOptions = buildPhoneOptions(details, detailsAddresses, detailsLocations);
      const emailOptions = buildEmailOptions(details, detailsAddresses, detailsLocations);
      const initialBusinessAddress = existingSnapshot?.businessAddress ?? buildBusinessAddress(initialAddressIds, initialLocationIds, detailsAddresses, detailsLocations);
      const initialBusinessGST = existingSnapshot?.businessGST ?? details.gst_number ?? "";
      const initialBusinessPhone = existingSnapshot?.businessPhone ?? buildContactValue(initialPhoneIds, phoneOptions);
      const initialBusinessEmail = existingSnapshot?.businessEmail ?? buildContactValue(initialEmailIds, emailOptions);
      const initialBusinessMeta = Array.isArray(existingSnapshot?.businessMeta) ? existingSnapshot.businessMeta : [];

      try {
        storageService.setItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS, JSON.stringify(details));
      } catch (e) {}

      if (form) {
        form.setFieldsValue({
          businessName: existingSnapshot?.businessName ?? details.name,
          selectedAddress: initialAddressIds,
          selectedLocation: initialLocationIds,
          selectedPhones: initialPhoneIds,
          selectedEmails: initialEmailIds,
          businessAddress: initialBusinessAddress,
          businessGST: initialBusinessGST,
          businessPhone: initialBusinessPhone,
          businessEmail: initialBusinessEmail,
          businessMeta: initialBusinessMeta,
          businessDetailsSnapshot: JSON.stringify({
            businessName: existingSnapshot?.businessName ?? details.name,
            selectedAddress: initialAddressIds,
            selectedLocation: initialLocationIds,
            selectedPhones: initialPhoneIds,
            selectedEmails: initialEmailIds,
            businessAddress: initialBusinessAddress,
            businessGST: initialBusinessGST,
            businessPhone: initialBusinessPhone,
            businessEmail: initialBusinessEmail,
            businessMeta: initialBusinessMeta,
          }),
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyState?.companyDetails, businessDetailsSnapshotValue]);

  const handleAddressChange = (value: any[]) => {
    const selectedIds = value || [];
    setSelectedAddressIds(selectedIds);
    const combined = buildBusinessAddress(selectedIds, selectedLocationIds);
    form.setFieldsValue({
      selectedAddress: selectedIds,
      businessAddress: combined,
      businessDetailsSnapshot: JSON.stringify({
        businessName: company?.name,
        selectedAddress: selectedIds,
        selectedLocation: selectedLocationIds,
        selectedPhones: selectedPhoneIds,
        selectedEmails: selectedEmailIds,
        businessAddress: combined,
        businessGST: form.getFieldValue('businessGST') || '',
        businessPhone: form.getFieldValue('businessPhone') || '',
        businessEmail: form.getFieldValue('businessEmail') || '',
        businessMeta: form.getFieldValue('businessMeta') || [],
      }),
    });
    // re-validate address/location combined requirement
    try {
      form.validateFields(['selectedAddress', 'selectedLocation']);
    } catch (e) {}
  };

  const handleLocationChange = (value: any[]) => {
    const selectedIds = value || [];
    setSelectedLocationIds(selectedIds);
    const combined = buildBusinessAddress(selectedAddressIds, selectedIds);
    form.setFieldsValue({
      selectedLocation: selectedIds,
      businessAddress: combined,
      businessDetailsSnapshot: JSON.stringify({
        businessName: company?.name,
        selectedAddress: selectedAddressIds,
        selectedLocation: selectedIds,
        selectedPhones: selectedPhoneIds,
        selectedEmails: selectedEmailIds,
        businessAddress: combined,
        businessGST: form.getFieldValue('businessGST') || '',
        businessPhone: form.getFieldValue('businessPhone') || '',
        businessEmail: form.getFieldValue('businessEmail') || '',
        businessMeta: form.getFieldValue('businessMeta') || [],
      }),
    });
    // re-validate address/location combined requirement
    try {
      form.validateFields(['selectedAddress', 'selectedLocation']);
    } catch (e) {}
  };

  const handlePhoneChange = (value: any[]) => {
    const selectedIds = value || [];
    setSelectedPhoneIds(selectedIds);
    const phoneOptions = buildPhoneOptions(company, addresses, locations);
    const phoneValue = buildContactValue(selectedIds, phoneOptions);
    form.setFieldsValue({
      selectedPhones: selectedIds,
      businessPhone: phoneValue,
      businessDetailsSnapshot: JSON.stringify({
        businessName: company?.name,
        selectedAddress: selectedAddressIds,
        selectedLocation: selectedLocationIds,
        selectedPhones: selectedIds,
        selectedEmails: selectedEmailIds,
        businessAddress: form.getFieldValue('businessAddress') || '',
        businessGST: form.getFieldValue('businessGST') || '',
        businessPhone: phoneValue,
        businessEmail: form.getFieldValue('businessEmail') || '',
        businessMeta: form.getFieldValue('businessMeta') || [],
      }),
    });
    // re-validate phone requirement
    try {
      form.validateFields(['selectedPhones']);
    } catch (e) {}
  };

  const handleEmailChange = (value: any[]) => {
    const selectedIds = value || [];
    setSelectedEmailIds(selectedIds);
    const emailOptions = buildEmailOptions(company, addresses, locations);
    const emailValue = buildContactValue(selectedIds, emailOptions);
    form.setFieldsValue({
      selectedEmails: selectedIds,
      businessEmail: emailValue,
      businessDetailsSnapshot: JSON.stringify({
        businessName: company?.name,
        selectedAddress: selectedAddressIds,
        selectedLocation: selectedLocationIds,
        selectedPhones: selectedPhoneIds,
        selectedEmails: selectedIds,
        businessAddress: form.getFieldValue('businessAddress') || '',
        businessGST: form.getFieldValue('businessGST') || '',
        businessPhone: form.getFieldValue('businessPhone') || '',
        businessEmail: emailValue,
        businessMeta: form.getFieldValue('businessMeta') || [],
      }),
    });
    // re-validate email requirement
    try {
      form.validateFields(['selectedEmails']);
    } catch (e) {}
  };

  const handleMetadataChange = (value: any[]) => {
    const selectedIds = value || [];
    setSelectedMetadataIds(selectedIds);
    form.setFieldsValue({
      businessMeta: selectedIds,
      businessDetailsSnapshot: JSON.stringify({
        businessName: company?.name,
        selectedAddress: selectedAddressIds,
        selectedLocation: selectedLocationIds,
        selectedPhones: selectedPhoneIds,
        selectedEmails: selectedEmailIds,
        businessAddress: form.getFieldValue('businessAddress') || '',
        businessGST: form.getFieldValue('businessGST') || '',
        businessPhone: form.getFieldValue('businessPhone') || '',
        businessEmail: form.getFieldValue('businessEmail') || '',
        businessMeta: selectedIds,
      }),
    });
  };

  const phoneOptions = buildPhoneOptions(company, addresses, locations);
  const emailOptions = buildEmailOptions(company, addresses, locations);

  return (
    <Card title="Business Details" className="section-card">
      {loading ? (
        <Spin />
      ) : (
        <>
          <Form.Item name="businessDetailsSnapshot" hidden>
            <Input type="hidden" />
          </Form.Item>
          <Form.Item label="Business Name" name="businessName">
            <Input placeholder="Business name" disabled />
          </Form.Item>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Select Address"
                name="selectedAddress"
                dependencies={["selectedLocation"]}
                rules={[
                  {
                    validator: (_: any) => {
                      const sa = form.getFieldValue("selectedAddress") || [];
                      const sl = form.getFieldValue("selectedLocation") || [];
                      return (Array.isArray(sa) && sa.length) || (Array.isArray(sl) && sl.length)
                        ? Promise.resolve()
                        : Promise.reject(new Error("Please select at least one address or one location"));
                    },
                  },
                ]}
              >
                <Select
                  mode="multiple"
                  value={selectedAddressIds}
                  placeholder="Choose one or more addresses"
                  onChange={handleAddressChange}
                  allowClear
                  optionLabelProp="label"
                >
                  {addresses.map((a) => (
                    <Option
                      key={a.id}
                      value={a.id}
                      label={
                        <span>
                          <strong>{a.type || 'Address'}</strong>
                          {a.label ? ` · ${a.label}` : ''}
                        </span>
                      }
                    >
                      <span>
                        <strong>{a.type || 'Address'}</strong>
                        {a.label ? ` · ${a.label}` : ''}
                        {` — ${a.line_1 || ''} ${a.city || ''}`.trim()}
                      </span>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Select Location"
                name="selectedLocation"
                dependencies={["selectedAddress"]}
                rules={[
                  {
                    validator: (_: any) => {
                      const sa = form.getFieldValue("selectedAddress") || [];
                      const sl = form.getFieldValue("selectedLocation") || [];
                      return (Array.isArray(sa) && sa.length) || (Array.isArray(sl) && sl.length)
                        ? Promise.resolve()
                        : Promise.reject(new Error("Please select at least one address or one location"));
                    },
                  },
                ]}
              >
                <Select
                  mode="multiple"
                  value={selectedLocationIds}
                  placeholder="Choose one or more locations"
                  onChange={handleLocationChange}
                  allowClear
                  optionLabelProp="label"
                >
                  {locations.map((l) => (
                    <Option
                      key={l.id}
                      value={l.id}
                      label={
                        <span>
                          <strong>{l.location_type || 'Location'}</strong>
                          {` · ${l.name}`}
                        </span>
                      }
                    >
                      <span>
                        <strong>{l.location_type || 'Location'}</strong>
                        {` · ${l.name}`}
                      </span>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Select Phone(s)"
                name="selectedPhones"
                rules={[
                  {
                    validator: (_: any, value: any[]) =>
                      value && value.length
                        ? Promise.resolve()
                        : Promise.reject(new Error("Please select at least one phone number")),
                  },
                ]}
              >
                <Select
                  mode="multiple"
                  value={selectedPhoneIds}
                  placeholder="Choose one or more phone numbers"
                  onChange={handlePhoneChange}
                  allowClear
                  optionLabelProp="label"
                >
                  {phoneOptions.map((phone) => (
                    <Option key={phone?.id} value={phone?.id} label={<span><strong>{phone?.label}</strong> · {phone?.detail}</span>}>
                      <span>
                        <strong>{phone?.label}</strong>
                        {` · ${phone?.detail}`}
                      </span>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Select Email(s)"
                name="selectedEmails"
                rules={[
                  {
                    validator: (_: any, value: any[]) =>
                      value && value.length
                        ? Promise.resolve()
                        : Promise.reject(new Error("Please select at least one email address")),
                  },
                ]}
              >
                <Select
                  mode="multiple"
                  value={selectedEmailIds}
                  placeholder="Choose one or more emails"
                  onChange={handleEmailChange}
                  allowClear
                  optionLabelProp="label"
                >
                  {emailOptions.map((email) => (
                    <Option key={email?.id} value={email?.id} label={<span><strong>{email?.label}</strong> · {email?.detail}</span>}>
                      <span>
                        <strong>{email?.label}</strong>
                        {` · ${email?.detail}`}
                      </span>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Business Address" name="businessAddress">
            <TextArea rows={3} placeholder="Business address" disabled />
          </Form.Item>

          <Form.Item label="GST Number" name="businessGST">
            <Input placeholder="GST number" disabled />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="Phone Number" name="businessPhone">
                <Input placeholder="Phone number" disabled />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Email" name="businessEmail">
                <Input type="email" placeholder="Business email" disabled />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Metadata (pick if applicable)" name="businessMeta">
            <Select
              mode="multiple"
              placeholder="Choose one or more metadata items"
              onChange={handleMetadataChange}
              allowClear
              optionLabelProp="label"
            >
              {metadata.map((m) => (
                <Option key={m.id} value={m.id} label={<span><strong>{m.key}</strong> · {m.value}</span>}>
                  <span>
                    <strong>{m.key}</strong>
                    {` · ${m.value}`}
                  </span>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </>
      )}
    </Card>
  );
};

export default BusinessDetails;
