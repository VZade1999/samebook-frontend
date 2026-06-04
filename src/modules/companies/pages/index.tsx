import React, { useEffect, useState } from "react";
import { Table, Input, Pagination, Card, Space, Empty, Button, Popconfirm, Drawer, Divider, Typography, Tag } from "antd";
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import type { TableColumnsType } from "antd";
import { deleteCompany, getCompanies } from "../redux/companyActions";
import AddCompanyModal from "./CreateCompany/AddCompanyModal";
import EditCompanyModal from "./EditCompany/EditCompanyModal";
import { useAccess } from "@/permissions/useAccess";

interface Company {
  id: number;
  name: string;
  company_prefix?: string;
  legal_name?: string;
  registration_number?: string;
  tax_id?: string;
  website?: string;
  industry?: string;
  primary_email?: string;
  primary_phone?: string;
  status?: string;
  created_at?: string;
  addresses?: any[];
  locations?: any[];
  metadata?: any[];
}

const CompanyPage: React.FC = () => {
  const dispatch = useDispatch();
  const { can } = useAccess();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailsCompany, setDetailsCompany] = useState<any | null>(null);

  const companyState = useSelector((state: any) => state.companies);
  const companies = companyState?.companies || { companies: [], pagination: {} };
  const pagination = companies?.pagination || {};
  const total = pagination?.total || 0;
  const loading = companyState?.loading || false;

  useEffect(() => {
    dispatch(
      getCompanies({
        search: search || undefined,
        page,
        limit: pageSize,
      }),
    );
  }, [dispatch, page, pageSize, search]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleDelete = (record: Company) => {
    dispatch(deleteCompany(record.id));
  };

  const handleEdit = (record: Company) => {
    setSelectedCompany(record);
    setIsEditModalOpen(true);
  };

  const openDetails = (record: any) => {
    setDetailsCompany(record);
    setDetailsVisible(true);
  };

  const closeDetails = () => {
    setDetailsVisible(false);
    setDetailsCompany(null);
  };

  const columns: TableColumnsType<Company> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: 250,
      filterDropdown: () => (
        <div style={{ padding: 8 }}>
          <Input
            allowClear
            placeholder="Search name..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ width: 220 }}
          />
        </div>
      ),
      filterIcon: <SearchOutlined />,
      render: (value, record) => (
        <Button type="link" onClick={() => openDetails(record)}>{value}</Button>
      ),
    },
    {
      title: "Legal Name",
      dataIndex: "legal_name",
      key: "legal_name",
      width: 220,
      render: (value) => value || "-",
    },
    {
      title: "Tax ID",
      dataIndex: "tax_id",
      key: "tax_id",
      width: 180,
      render: (value) => value || "-",
    },
    {
      title: "Industry",
      dataIndex: "industry",
      key: "industry",
      width: 180,
      render: (value) => value || "-",
    },
    {
      title: "Email",
      dataIndex: "primary_email",
      key: "primary_email",
      width: 220,
      render: (value) => value || "-",
    },
    {
      title: "Phone",
      dataIndex: "primary_phone",
      key: "primary_phone",
      width: 180,
      render: (value) => value || "-",
    },
    {
      title: "Address",
      dataIndex: "addresses",
      key: "addresses",
      width: 360,
      render: (_, record) => {
        const addrArr = record.addresses || [];
        const addr = addrArr.length > 0 ? addrArr[addrArr.length - 1] : null; // show latest
        if (!addr) return "-";
        const parts = [addr.line_1, addr.line_2, addr.city, addr.state, addr.country, addr.postal_code].filter(Boolean);
        return parts.length > 0 ? parts.join(", ") : "-";
      },
    },
    {
      title: "Locations",
      dataIndex: "locations",
      key: "locations",
      width: 220,
      render: (_, record) => {
        const locs = record.locations || [];
        if (!locs || locs.length === 0) return "-";
        const latest = locs[locs.length - 1];
        return latest && latest.name ? latest.name : `${locs.length} locations`;
      },
    },
    {
      title: "Metadata",
      dataIndex: "metadata",
      key: "metadata",
      width: 220,
      render: (_, record) => {
        const md = record.metadata || [];
        if (!md || md.length === 0) return "-";
        const latest = md[md.length - 1];
        if (!latest) return `${md.length} items`;
        return latest.key ? `${latest.key}: ${latest.value}` : `${md.length} items`;
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (value) => value || "active",
    },
    {
      title: "Action",
      key: "action",
      fixed: "right",
      width: 140,
      render: (_, record) => (
        <Space size="small">
          {can("customer.update") ? (
            <Button
              type="text"
              icon={<EditOutlined style={{ color: "#1677ff" }} />}
              onClick={() => handleEdit(record)}
            />
          ) : null}
          {can("customer.delete") ? (
            <Popconfirm
              title="Delete Company"
              description="Are you sure you want to delete this company?"
              onConfirm={() => handleDelete(record)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 10 }}>
      <Card
        title="Companies"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
            Add Company
          </Button>
        }
      >
        <Space direction="vertical" style={{ width: "100%" }} size="large">
          <Table
            columns={columns}
            dataSource={companies?.companies?.map((company: Company) => ({
              ...company,
              key: company.id,
            }))}
            pagination={false}
            loading={loading}
            bordered
            scroll={{ x: "max-content" }}
            locale={{ emptyText: <Empty description="No companies found" /> }}
          />

          {total > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 16,
                padding: "0 8px",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div>
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} records
              </div>
              <Pagination
                current={page}
                pageSize={pageSize}
                total={total}
                showSizeChanger
                showQuickJumper
                pageSizeOptions={["5", "10", "25", "50"]}
                onChange={(newPage) => setPage(newPage)}
                onShowSizeChange={(_, size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            </div>
          )}
        </Space>
      </Card>
      <AddCompanyModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <EditCompanyModal
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedCompany(null);
        }}
        company={selectedCompany}
      />
      <Drawer title={detailsCompany?.name || 'Company Details'} placement="right" onClose={closeDetails} open={detailsVisible} width={720}>
        {detailsCompany ? (
          <div>
            <Typography.Title level={4}>Addresses</Typography.Title>
            {detailsCompany.addresses && detailsCompany.addresses.length > 0 ? (
              detailsCompany.addresses.slice().reverse().map((a: any, idx: number) => (
                <div key={`addr-${idx}`} style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 6, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div><strong>{a.label || a.type || 'Address'}</strong></div>
                    {a.is_default ? <Tag color="blue">Default</Tag> : null}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    {[a.line_1, a.line_2, a.city, a.state, a.country, a.postal_code].filter(Boolean).join(', ')}
                  </div>
                  {a.phone ? <div>Phone: {a.phone}</div> : null}
                  {a.fax ? <div>Fax: {a.fax}</div> : null}
                  {a.notes ? <div style={{ marginTop: 8 }}>{a.notes}</div> : null}
                </div>
              ))
            ) : (
              <Empty description="No addresses" />
            )}

            <Divider />
            <Typography.Title level={4}>Locations</Typography.Title>
            {detailsCompany.locations && detailsCompany.locations.length > 0 ? (
              detailsCompany.locations.slice().reverse().map((l: any, idx: number) => (
                <div key={`loc-${idx}`} style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 6, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div><strong>{l.name || 'Location'}</strong></div>
                    <div>{l.location_type}</div>
                  </div>
                  <div style={{ marginTop: 8 }}>{[l.address_line_1, l.address_line_2, l.address_city, l.address_state, l.address_country, l.address_postal_code].filter(Boolean).join(', ')}</div>
                  {l.manager_name ? <div>Manager: {l.manager_name} ({l.manager_phone || '-'})</div> : null}
                  {l.notes ? <div style={{ marginTop: 8 }}>{l.notes}</div> : null}
                </div>
              ))
            ) : (
              <Empty description="No locations" />
            )}

            <Divider />
            <Typography.Title level={4}>Metadata</Typography.Title>
            {detailsCompany.metadata && detailsCompany.metadata.length > 0 ? (
              detailsCompany.metadata.slice().reverse().map((m: any, idx: number) => (
                <div key={`meta-${idx}`} style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 6, marginBottom: 12 }}>
                  <div><strong>{m.key}</strong>: {m.value}</div>
                  {m.data_type ? <div>Type: {m.data_type}</div> : null}
                  {m.is_sensitive ? <Tag color="red">Sensitive</Tag> : null}
                </div>
              ))
            ) : (
              <Empty description="No metadata" />
            )}
          </div>
        ) : null}
      </Drawer>
    </div>
  );
};

export default CompanyPage;
