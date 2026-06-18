import React, { useState } from 'react';
import { Button } from 'antd';
import { FileAddOutlined } from '@ant-design/icons';
import GenerateInvoiceModal from './GenerateInvoiceModal';



const GenerateInvoiceButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="primary"
        icon={<FileAddOutlined />}
        onClick={() => setOpen(true)}
      >
        Generate Invoice
      </Button>

      <GenerateInvoiceModal
        visible={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
};

export default GenerateInvoiceButton;