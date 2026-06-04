import React, { useEffect, useMemo, useState } from "react";

import { Button, Input, Popconfirm, Space, Table, Tag, Typography } from "antd";

import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
} from "@ant-design/icons";

import { useDispatch, useSelector } from "react-redux";

import debounce from "lodash/debounce";

import EditCustomerModal from "../components/EditCustomerModal";
import AddCustomerModal from "../components/AddCustomerModal";
import { deleteCustomer, getCustomers } from "../redux/customerActions";
import CustomerDetailsDrawer from "../components/CustomerDetailsDrawer";

const { Search } = Input;
const { Text } = Typography;

const CustomerListPage = () => {
  const dispatch = useDispatch();

  // =========================
  // REDUX STATE
  // =========================

  const { list, loading, pagination } = useSelector(
    (state: any) => state.customers,
  );

  // =========================
  // LOCAL STATES
  // =========================

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);

  const [limit, setLimit] = useState(10);

  const [addCustomerOpen, setAddCustomerOpen] = useState(false);

  const [editCustomerOpen, setEditCustomerOpen] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const [customerDetailsOpen, setCustomerDetailsOpen] = useState(false);

  // =========================
  // FETCH CUSTOMERS
  // =========================

  const fetchCustomers = (customSearch?: string) => {
    dispatch(
      getCustomers({
        page,
        limit,

        search: customSearch ?? search,
      }),
    );
  };

  // =========================
  // INITIAL LOAD
  // =========================

  useEffect(() => {
    fetchCustomers();
  }, [page, limit]);

  // =========================
  // DEBOUNCED SEARCH
  // =========================

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        setPage(1);

        dispatch(
          getCustomers({
            page: 1,
            limit,
            search: value,
          }),
        );
      }, 500),

    [limit],
  );

  // =========================
  // HANDLE SEARCH
  // =========================

  const handleSearch = (value: string) => {
    setSearch(value);

    debouncedSearch(value);
  };

  // =========================
  // HANDLE EDIT
  // =========================

  const handleEdit = (customer: any) => {
    setSelectedCustomer(customer);

    setEditCustomerOpen(true);
  };

  // =========================
  // HANDLE DELETE
  // =========================

  const handleDelete = (customer: any) => {
    dispatch(deleteCustomer(customer.id));
  };

  // =========================
  // HANDLE VIEW
  // =========================

  const handleView = (customer: any) => {
    setSelectedCustomer(customer);

    setCustomerDetailsOpen(true);
  };

  // =========================
  // TABLE COLUMNS
  // =========================

  const columns = [
    {
      title: "Display Name",

      dataIndex: "display_name",

      key: "display_name",

      width: 250,

      render: (value: string, record: any) => (
        <div>
          <Text strong>{value || "N/A"}</Text>

          {record.company_name && (
            <div>
              <Text type="secondary">{record.company_name}</Text>
            </div>
          )}
        </div>
      ),
    },

    {
      title: "Type",

      dataIndex: "customer_type",

      key: "customer_type",

      width: 150,

      render: (value: string) => {
        const color = value === "BUSINESS" ? "blue" : "green";

        return <Tag color={color}>{value}</Tag>;
      },
    },

    {
      title: "Email",

      dataIndex: "email",

      key: "email",

      width: 250,

      render: (value: string) => value || "-",
    },

    {
      title: "Phone",

      dataIndex: "phone",

      key: "phone",

      width: 180,

      render: (value: string) => value || "-",
    },

    {
      title: "GST Number",

      dataIndex: "gst_number",

      key: "gst_number",

      width: 220,

      render: (value: string) => value || "-",
    },

    {
      title: "Industry",

      dataIndex: "industry",

      key: "industry",

      width: 180,

      render: (value: string) => value || "-",
    },

    {
      title: "Created At",

      dataIndex: "created_at",

      key: "created_at",

      width: 200,

      render: (value: string) =>
        value ? new Date(value).toLocaleString() : "-",
    },

    {
      title: "Action",

      key: "action",

      fixed: "right" as const,

      width: 180,

      render: (_: any, record: any) => (
        <Space>
          <Button
            type="text"
            icon={
              <EyeOutlined
                style={{
                  color: "#1677ff",
                }}
              />
            }
            onClick={() => handleView(record)}
          />

          <Button
            type="text"
            icon={
              <EditOutlined
                style={{
                  color: "#1677ff",
                }}
              />
            }
            onClick={() => handleEdit(record)}
          />

          <Popconfirm
            title="Delete Customer"
            description="Are you sure you want to delete this customer?"
            okText="Yes"
            cancelText="No"
            okButtonProps={{
              danger: true,
            }}
            onConfirm={() => handleDelete(record)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* =========================
          HEADER
      ========================= */}

      <div
        style={{
          display: "flex",

          justifyContent: "space-between",

          alignItems: "center",

          marginBottom: 20,

          gap: 16,

          flexWrap: "wrap",
        }}
      >
        <Search
          allowClear
          placeholder="Search by name, email, phone, GST..."
          style={{
            width: 350,
          }}
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAddCustomerOpen(true)}
        >
          Add Customer
        </Button>
      </div>

      {/* =========================
          TABLE
      ========================= */}

      <Table
        rowKey="id"
        bordered
        loading={loading}
        columns={columns}
        dataSource={list || []}
        scroll={{
          x: 1400,
        }}
        pagination={{
          current: page,

          pageSize: limit,

          total: pagination?.total || 0,

          showSizeChanger: true,

          onChange: (currentPage, pageSize) => {
            setPage(currentPage);

            setLimit(pageSize);
          },
        }}
      />

      {/* =========================
          ADD MODAL
      ========================= */}

      <AddCustomerModal
        open={addCustomerOpen}
        onClose={() => setAddCustomerOpen(false)}
      />

      {/* =========================
          EDIT MODAL
      ========================= */}

      <EditCustomerModal
        open={editCustomerOpen}
        customer={selectedCustomer}
        onClose={() => {
          setEditCustomerOpen(false);

          setSelectedCustomer(null);
        }}
      />

      {/* =========================
          VIEW MODAL
      ========================= */}

      <CustomerDetailsDrawer
        open={customerDetailsOpen}
        customer={selectedCustomer}
        onClose={() => {
          setCustomerDetailsOpen(false);

          setSelectedCustomer(null);
        }}
      />
    </div>
  );
};

export default CustomerListPage;
