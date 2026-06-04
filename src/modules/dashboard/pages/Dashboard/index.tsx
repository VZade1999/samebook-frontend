import { Card, Col, Row, Typography } from "antd";
import React from "react";
import "./styles.scss";

const { Title } = Typography;

const DashboardPage = () => {
  return (
    <div className="dashboard-page">
      <div className="dashboard-page__header">
        <Title level={2}>Dashboard 📊</Title>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24} md={8}>
          <Card>
            <h3>Total Revenue</h3>

            <h2>₹ 2,50,000</h2>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card>
            <h3>Total Customers</h3>

            <h2>1,240</h2>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card>
            <h3>Pending quotation</h3>

            <h2>45</h2>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
