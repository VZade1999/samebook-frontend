import React, { useEffect, useState } from 'react';
import { Form, Select, DatePicker, message } from 'antd';
import { FileTextOutlined, CalendarOutlined, ClockCircleOutlined, CloseOutlined, ThunderboltOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useDispatch } from 'react-redux';
import { generateInvoice } from '../redux/invoiceActions';
import QuotationService from '../../quotation/redux/index';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const quotationService = new QuotationService();

// ─── Scoped styles ────────────────────────────────────────────────────────────
const ModalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    /* ── Overlay ── */
    .igm-overlay {
      position: fixed;
      inset: 0;
      background: rgba(17, 24, 39, 0.55);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: igm-fade-in .18s ease;
    }
    @keyframes igm-fade-in { from { opacity: 0 } to { opacity: 1 } }

    /* ── Dialog ── */
    .igm-dialog {
      background: #fff;
      border-radius: 16px;
      width: 100%;
      max-width: 480px;
      box-shadow: 0 24px 60px rgba(0,0,0,.18), 0 8px 20px rgba(0,0,0,.1);
      overflow: hidden;
      animation: igm-slide-up .2s cubic-bezier(.16,1,.3,1);
      font-family: 'Inter', -apple-system, sans-serif;
    }
    @keyframes igm-slide-up {
      from { opacity: 0; transform: translateY(20px) scale(0.97) }
      to   { opacity: 1; transform: translateY(0)   scale(1) }
    }

    /* ── Header ── */
    .igm-header {
      background: linear-gradient(135deg, #1E1B4B 0%, #312E81 55%, #4338CA 100%);
      padding: 24px 24px 20px;
      position: relative;
      overflow: hidden;
    }
    .igm-header-noise {
      position: absolute;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
      pointer-events: none;
    }
    .igm-header-content {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }
    .igm-header-left { display: flex; align-items: center; gap: 12px; }
    .igm-header-icon {
      width: 40px; height: 40px;
      background: rgba(255,255,255,0.15);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
      color: #fff;
      flex-shrink: 0;
    }
    .igm-header-title {
      font-size: 17px;
      font-weight: 700;
      color: #fff;
      letter-spacing: -0.3px;
    }
    .igm-header-sub {
      font-size: 12px;
      color: rgba(255,255,255,0.6);
      margin-top: 2px;
    }
    .igm-close-btn {
      width: 32px; height: 32px;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      color: rgba(255,255,255,0.8);
      font-size: 13px;
      transition: all .15s;
      flex-shrink: 0;
    }
    .igm-close-btn:hover {
      background: rgba(255,255,255,0.2);
      color: #fff;
    }

    /* ── Body ── */
    .igm-body { padding: 24px; }

    /* ── Field groups ── */
    .igm-field { margin-bottom: 20px; }
    .igm-field:last-child { margin-bottom: 0; }

    .igm-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      color: #6B7280;
      margin-bottom: 7px;
    }
    .igm-label-icon {
      width: 18px; height: 18px;
      background: #EEF2FF;
      border-radius: 4px;
      display: flex; align-items: center; justify-content: center;
      color: #4F46E5;
      font-size: 10px;
    }
    .igm-required {
      color: #DC2626;
      margin-left: 1px;
    }

    /* Override Ant Design Select & DatePicker inside this modal */
    .igm-body .ant-select .ant-select-selector {
      border-radius: 10px !important;
      border: 1.5px solid #E5E7EB !important;
      padding: 6px 12px !important;
      height: auto !important;
      min-height: 42px !important;
      font-size: 14px !important;
      font-family: 'Inter', sans-serif !important;
      background: #FAFAFA !important;
      transition: border-color .15s, box-shadow .15s !important;
    }
    .igm-body .ant-select:hover .ant-select-selector,
    .igm-body .ant-select-focused .ant-select-selector {
      border-color: #4F46E5 !important;
      box-shadow: 0 0 0 3px rgba(79,70,229,.1) !important;
      background: #fff !important;
    }
    .igm-body .ant-select-selection-placeholder {
      color: #9CA3AF !important;
      font-size: 13px !important;
    }
    .igm-body .ant-picker {
      border-radius: 10px !important;
      border: 1.5px solid #E5E7EB !important;
      padding: 9px 12px !important;
      height: auto !important;
      font-size: 14px !important;
      font-family: 'Inter', sans-serif !important;
      background: #FAFAFA !important;
      width: 100% !important;
      transition: border-color .15s, box-shadow .15s !important;
    }
    .igm-body .ant-picker:hover,
    .igm-body .ant-picker-focused {
      border-color: #4F46E5 !important;
      box-shadow: 0 0 0 3px rgba(79,70,229,.1) !important;
      background: #fff !important;
    }
    .igm-body .ant-picker input {
      font-family: 'Inter', sans-serif !important;
      font-size: 14px !important;
    }
    .igm-body .ant-form-item { margin-bottom: 0 !important; }
    .igm-body .ant-form-item-explain-error {
      font-size: 12px !important;
      margin-top: 4px !important;
      color: #DC2626 !important;
    }

    /* ── Date row ── */
    .igm-date-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    @media (max-width: 400px) {
      .igm-date-row { grid-template-columns: 1fr; }
    }

    /* ── Divider ── */
    .igm-divider {
      border: none;
      border-top: 1px solid #F3F4F6;
      margin: 0;
    }

    /* ── Footer ── */
    .igm-footer {
      padding: 16px 24px;
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      background: #FAFAFA;
    }
    .igm-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 10px 20px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      border: none;
      transition: all .15s;
      white-space: nowrap;
    }
    .igm-btn-cancel {
      background: #fff;
      color: #374151;
      border: 1.5px solid #E5E7EB !important;
    }
    .igm-btn-cancel:hover {
      background: #F9FAFB;
      border-color: #D1D5DB !important;
    }
    .igm-btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }
    .igm-btn-submit {
      background: linear-gradient(135deg, #4F46E5 0%, #4338CA 100%);
      color: #fff;
      box-shadow: 0 2px 8px rgba(79,70,229,.3);
    }
    .igm-btn-submit:hover:not(:disabled) {
      background: linear-gradient(135deg, #4338CA 0%, #3730A3 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(79,70,229,.4);
    }
    .igm-btn-submit:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
    }

    /* ── Spinner inside button ── */
    .igm-spinner {
      width: 13px; height: 13px;
      border: 2px solid rgba(255,255,255,0.35);
      border-top-color: #fff;
      border-radius: 50%;
      animation: igm-spin .6s linear infinite;
    }
    @keyframes igm-spin { to { transform: rotate(360deg); } }

    /* ── Info strip ── */
    .igm-info-strip {
      background: #EEF2FF;
      border: 1px solid #C7D2FE;
      border-radius: 10px;
      padding: 12px 14px;
      display: flex;
      gap: 10px;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    .igm-info-icon {
      color: #4F46E5;
      font-size: 14px;
      margin-top: 1px;
      flex-shrink: 0;
    }
    .igm-info-text {
      font-size: 12px;
      color: #3730A3;
      line-height: 1.5;
    }
  `}</style>
);

// ─── Component ────────────────────────────────────────────────────────────────
const GenerateInvoiceModal: React.FC<Props> = ({ visible, onClose }) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [quotationsLoading, setQuotationsLoading] = useState(false);

  useEffect(() => {
    if (visible) loadApprovedQuotations();
  }, [visible]);

  const loadApprovedQuotations = async () => {
    setQuotationsLoading(true);
    try {
      const response = await quotationService.getQuotations({ status: 'APPROVED' });
      setQuotations(response?.data?.data?.rows || []);
    } catch {
      message.error('Failed to load quotations');
    } finally {
      setQuotationsLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      dispatch(
        generateInvoice({
          quotation_id: values.quotation_id,
          invoice_date: values.invoice_date.format('YYYY-MM-DD'),
          due_date: values.due_date.format('YYYY-MM-DD'),
        }),
      );
      message.success('Invoice generation started');
      form.resetFields();
      onClose();
    } catch {
      // validation errors handled by form
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    form.resetFields();
    onClose();
  };

  if (!visible) return null;

  return (
    <>
      <ModalStyles />
      <div className="igm-overlay" onClick={handleClose}>
        <div className="igm-dialog" onClick={e => e.stopPropagation()}>

          {/* ── Header ── */}
          <div className="igm-header">
            <div className="igm-header-noise" />
            <div className="igm-header-content">
              <div className="igm-header-left">
                <div className="igm-header-icon">
                  <FileTextOutlined />
                </div>
                <div>
                  <div className="igm-header-title">Generate Invoice</div>
                  <div className="igm-header-sub">From an approved quotation</div>
                </div>
              </div>
              <button className="igm-close-btn" onClick={handleClose}>
                <CloseOutlined />
              </button>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="igm-body">
            <div className="igm-info-strip">
              <ThunderboltOutlined className="igm-info-icon" />
              <span className="igm-info-text">
                Only <strong>approved quotations</strong> are eligible for invoice generation.
                Items, pricing, and customer details are carried over automatically.
              </span>
            </div>

            <Form form={form} layout="vertical">
              {/* Quotation */}
              <div className="igm-field">
                <div className="igm-label">
                  <div className="igm-label-icon"><FileTextOutlined /></div>
                  Quotation<span className="igm-required">*</span>
                </div>
                <Form.Item
                  name="quotation_id"
                  rules={[{ required: true, message: 'Please select a quotation' }]}
                >
                  <Select
                    showSearch
                    placeholder="Select approved quotation…"
                    optionFilterProp="label"
                    loading={quotationsLoading}
                    notFoundContent={
                      quotationsLoading
                        ? 'Loading…'
                        : 'No approved quotations found'
                    }
                    options={quotations.map(q => ({
                      value: q.id,
                      label: `${q.quotation_number} — ${q.customer_name}`,
                    }))}
                  />
                </Form.Item>
              </div>

              {/* Dates */}
              <div className="igm-date-row">
                <div className="igm-field">
                  <div className="igm-label">
                    <div className="igm-label-icon"><CalendarOutlined /></div>
                    Invoice Date<span className="igm-required">*</span>
                  </div>
                  <Form.Item
                    name="invoice_date"
                    initialValue={dayjs()}
                    rules={[{ required: true, message: 'Required' }]}
                  >
                    <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" />
                  </Form.Item>
                </div>

                <div className="igm-field">
                  <div className="igm-label">
                    <div className="igm-label-icon"><ClockCircleOutlined /></div>
                    Due Date<span className="igm-required">*</span>
                  </div>
                  <Form.Item
                    name="due_date"
                    initialValue={dayjs().add(30, 'day')}
                    rules={[{ required: true, message: 'Required' }]}
                  >
                    <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" />
                  </Form.Item>
                </div>
              </div>
            </Form>
          </div>

          <hr className="igm-divider" />

          {/* ── Footer ── */}
          <div className="igm-footer">
            <button className="igm-btn igm-btn-cancel" onClick={handleClose} disabled={loading}>
              Cancel
            </button>
            <button className="igm-btn igm-btn-submit" onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <span className="igm-spinner" />
                  Generating…
                </>
              ) : (
                <>
                  <ThunderboltOutlined />
                  Generate Invoice
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </>
  );
};

export default GenerateInvoiceModal;