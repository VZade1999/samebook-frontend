import React from 'react';

import { Table } from 'antd';

interface Props {
  items: any[];
}

const InvoiceItemsTable: React.FC<Props> = ({
  items,
}) => {
  const columns = [
    {
      title: 'Product',
      dataIndex: 'product_name',
    },

    {
      title: 'HSN',
      dataIndex: 'hsn_code',
    },

    {
      title: 'Qty',
      dataIndex: 'qty',
    },

    {
      title: 'Unit',
      dataIndex: 'unit',
    },

    {
      title: 'Rate',
      dataIndex: 'rate',
    },

    {
      title: 'Discount %',
      dataIndex: 'discount_percent',
    },

    {
      title: 'Total',
      dataIndex: 'total',
    },
  ];

  return (
    <Table
      rowKey="id"
      pagination={false}
      columns={columns}
      dataSource={items || []}
    />
  );
};

export default InvoiceItemsTable;