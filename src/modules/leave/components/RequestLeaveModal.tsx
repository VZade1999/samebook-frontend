import React, { useState } from "react";
import { Modal, DatePicker, Input, Button, message } from "antd";
import { useDispatch } from "react-redux";
import dayjs, { Dayjs } from "dayjs";
import { requestLeave } from "../redux/leaveActions";

const { RangePicker } = DatePicker;

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MIN_CHARS = 10;
const MIN_WORDS = 4;

const RequestLeaveModal: React.FC<Props> = ({ visible, onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>([dayjs(), dayjs()]);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const wordCount = reason.trim().split(/\s+/).filter(Boolean).length;
  const isValid = !!range && reason.trim().length >= MIN_CHARS && wordCount >= MIN_WORDS;

  const reset = () => {
    setRange([dayjs(), dayjs()]);
    setReason("");
  };

  const handleSubmit = async () => {
    if (!isValid || !range) return;
    setLoading(true);
    try {
      const response = await dispatch(
        requestLeave({
          from_date: range[0].format("YYYY-MM-DD"),
          to_date: range[1].format("YYYY-MM-DD"),
          reason: reason.trim(),
        }) as any,
      );
      if (response.meta.requestStatus === "fulfilled") {
        message.success("Leave requested — pending approval");
        reset();
        onSuccess();
        onClose();
      } else {
        message.error(response.payload?.message || "Failed to request leave");
      }
    } catch {
      message.error("Failed to request leave");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Request Leave"
      open={visible}
      onCancel={onClose}
      afterClose={reset}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="save" type="primary" loading={loading} disabled={!isValid} onClick={handleSubmit}>
          Submit Request
        </Button>,
      ]}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--muted-foreground)" }}>
            Leave Dates
          </div>
          <RangePicker
            style={{ width: "100%" }}
            value={range as any}
            onChange={(vals) => setRange(vals as [Dayjs, Dayjs] | null)}
            format="DD MMM YYYY"
          />
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--muted-foreground)" }}>
            Reason
          </div>
          <Input.TextArea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Briefly explain why you need this leave (at least 10 characters, 4 words)"
          />
          <div
            style={{
              fontSize: 11.5,
              marginTop: 4,
              color: isValid ? "#059669" : "var(--muted-foreground)",
            }}
          >
            {reason.trim().length} characters, {reason.trim() ? wordCount : 0} words
            {!isValid && reason.length > 0 ? ` — need at least ${MIN_CHARS} characters and ${MIN_WORDS} words` : ""}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default RequestLeaveModal;
