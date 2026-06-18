import React from 'react';

import {
  Card,
  Row,
  Col,
  Tag,
  Typography,
} from 'antd';

const { Title, Text } =
  Typography;

interface Props {
  invoice: any;
}

const InvoiceHeader: React.FC<Props> = ({
  invoice,
}) => {
  return (
    <Card>
      <Row justify="space-between">
        <Col>
          <Title level={4}>
            Invoice #
            {
              invoice?.invoice_number
            }
          </Title>

          <Text>
            Quotation :
            {
              invoice?.quotation_number
            }
          </Text>
        </Col>

        <Col>
          <Tag
            color={
              invoice?.status ===
              'PAID'
                ? 'green'
                : 'blue'
            }
          >
            {invoice?.status}
          </Tag>
        </Col>
      </Row>

      <Row
        gutter={24}
        style={{
          marginTop: 16,
        }}
      >
        <Col span={8}>
          <Text strong>
            Invoice Date
          </Text>

          <br />

          <Text>
            {invoice?.invoice_date}
          </Text>
        </Col>

        <Col span={8}>
          <Text strong>
            Due Date
          </Text>

          <br />

          <Text>
            {invoice?.due_date}
          </Text>
        </Col>

        <Col span={8}>
          <Text strong>
            Customer
          </Text>

          <br />

          <Text>
            {
              invoice?.customer_name
            }
          </Text>
        </Col>
      </Row>
    </Card>
  );
};

export default InvoiceHeader;