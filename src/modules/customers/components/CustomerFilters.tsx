import React from "react";

import {
  Button,
  Col,
  Input,
  Row,
  Select,
  Space,
} from "antd";

import {
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";

const { Option } = Select;

interface CustomerFiltersProps {
  filters: any;

  onChange: (
    key: string,
    value: any,
  ) => void;

  onReset: () => void;
}

const CustomerFilters: React.FC<
  CustomerFiltersProps
> = ({
  filters,
  onChange,
  onReset,
}) => {
  return (
    <div
      style={{
        background: "#fff",

        padding: 16,

        borderRadius: 8,

        marginBottom: 20,

        border:
          "1px solid #f0f0f0",
      }}
    >
      {/* =========================
          FILTER ROW
      ========================= */}

      <Row gutter={[16, 16]}>
        {/* =========================
            SEARCH
        ========================= */}

        <Col
          xs={24}
          sm={24}
          md={12}
          lg={8}
        >
          <Input
            allowClear
            prefix={
              <SearchOutlined />
            }
            placeholder="Search customer, GST, phone, email..."
            value={
              filters.search
            }
            onChange={(e) =>
              onChange(
                "search",
                e.target.value,
              )
            }
          />
        </Col>

        {/* =========================
            CUSTOMER TYPE
        ========================= */}

        <Col
          xs={24}
          sm={12}
          md={6}
          lg={4}
        >
          <Select
            allowClear
            style={{
              width: "100%",
            }}
            placeholder="Customer Type"
            value={
              filters.customer_type
            }
            onChange={(value) =>
              onChange(
                "customer_type",
                value,
              )
            }
          >
            <Option value="BUSINESS">
              Business
            </Option>

            <Option value="INDIVIDUAL">
              Individual
            </Option>
          </Select>
        </Col>

        {/* =========================
            INDUSTRY
        ========================= */}

        <Col
          xs={24}
          sm={12}
          md={6}
          lg={4}
        >
          <Select
            allowClear
            showSearch
            style={{
              width: "100%",
            }}
            placeholder="Industry"
            value={
              filters.industry
            }
            onChange={(value) =>
              onChange(
                "industry",
                value,
              )
            }
          >
            <Option value="IT">
              IT
            </Option>

            <Option value="MANUFACTURING">
              Manufacturing
            </Option>

            <Option value="PHARMA">
              Pharma
            </Option>

            <Option value="CONSTRUCTION">
              Construction
            </Option>

            <Option value="AUTOMOBILE">
              Automobile
            </Option>

            <Option value="FMCG">
              FMCG
            </Option>

            <Option value="TEXTILE">
              Textile
            </Option>

            <Option value="OTHER">
              Other
            </Option>
          </Select>
        </Col>

        {/* =========================
            STATUS
        ========================= */}

        <Col
          xs={24}
          sm={12}
          md={6}
          lg={4}
        >
          <Select
            allowClear
            style={{
              width: "100%",
            }}
            placeholder="Status"
            value={
              filters.is_active
            }
            onChange={(value) =>
              onChange(
                "is_active",
                value,
              )
            }
          >
            <Option value={1}>
              Active
            </Option>

            <Option value={0}>
              Inactive
            </Option>
          </Select>
        </Col>

        {/* =========================
            RESET
        ========================= */}

        <Col
          xs={24}
          sm={12}
          md={6}
          lg={4}
        >
          <Space
            style={{
              width: "100%",
            }}
          >
            <Button
              icon={
                <ReloadOutlined />
              }
              onClick={
                onReset
              }
            >
              Reset
            </Button>
          </Space>
        </Col>
      </Row>
    </div>
  );
};

export default CustomerFilters;