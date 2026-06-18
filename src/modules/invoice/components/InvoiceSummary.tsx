import React from 'react';

import {
  Card,
  Row,
  Col,
  Statistic,
} from 'antd';

interface Props {
  invoice: any;
}

const InvoiceSummary: React.FC<Props> = ({
  invoice,
}) => {
  return (
    <Card title="Invoice Summary">
      <Row gutter={16}>
        <Col span={6}>
          <Statistic
            title="Sub Total"
            value={invoice?.sub_total}
            prefix="₹"
          />
        </Col>

        <Col span={6}>
          <Statistic
            title="Discount"
            value={
              invoice?.discount_amount
            }
            prefix="₹"
          />
        </Col>

        <Col span={6}>
          <Statistic
            title="GST"
            value={
              (invoice?.cgst_amount || 0) +
              (invoice?.sgst_amount || 0) +
              (invoice?.igst_amount || 0)
            }
            prefix="₹"
          />
        </Col>

        <Col span={6}>
          <Statistic
            title="Grand Total"
            value={
              invoice?.grand_total
            }
            prefix="₹"
          />
        </Col>
      </Row>
    </Card>
  );
};

export default InvoiceSummary;