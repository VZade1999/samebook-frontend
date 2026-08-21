import React, { useState } from "react";
import { Modal, DatePicker, Input, Button, message, Segmented, Radio } from "antd";
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

type LeaveType = "FULL_DAY" | "HALF_DAY";
type HalfDayPeriod = "AM" | "PM";

const RequestLeaveModal: React.FC<Props> = ({ visible, onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const [leaveType, setLeaveType] = useState<LeaveType>("FULL_DAY");
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>([dayjs(), dayjs()]);
  const [halfDayDate, setHalfDayDate] = useState<Dayjs | null>(dayjs());
  const [halfDayPeriod, setHalfDayPeriod] = useState<HalfDayPeriod>("AM");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const wordCount = reason.trim().split(/\s+/).filter(Boolean).length;
  const reasonValid = reason.trim().length >= MIN_CHARS && wordCount >= MIN_WORDS;
  const datesValid = leaveType === "FULL_DAY" ? !!range : !!halfDayDate;
  const isValid = reasonValid && datesValid;

  const reset = () => {
    setLeaveType("FULL_DAY");
    setRange([dayjs(), dayjs()]);
    setHalfDayDate(dayjs());
    setHalfDayPeriod("AM");
    setReason("");
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      const payload =
        leaveType === "FULL_DAY"
          ? {
              from_date: range![0].format("YYYY-MM-DD"),
              to_date: range![1].format("YYYY-MM-DD"),
              leave_type: "FULL_DAY" as const,
              reason: reason.trim(),
            }
          : {
              from_date: halfDayDate!.format("YYYY-MM-DD"),
              to_date: halfDayDate!.format("YYYY-MM-DD"),
              leave_type: "HALF_DAY" as const,
              half_day_period: halfDayPeriod,
              reason: reason.trim(),
            };

      const response = await dispatch(requestLeave(payload) as any);
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
            Leave Type
          </div>
          <Segmented
            block
            value={leaveType}
            onChange={(val) => setLeaveType(val as LeaveType)}
            options={[
              { label: "Full Day", value: "FULL_DAY" },
              { label: "Half Day", value: "HALF_DAY" },
            ]}
          />
        </div>

        {leaveType === "FULL_DAY" ? (
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
        ) : (
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--muted-foreground)" }}>
                Date
              </div>
              <DatePicker
                style={{ width: "100%" }}
                value={halfDayDate}
                onChange={(val) => setHalfDayDate(val)}
                format="DD MMM YYYY"
              />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--muted-foreground)" }}>
                Half
              </div>
              <Radio.Group
                value={halfDayPeriod}
                onChange={(e) => setHalfDayPeriod(e.target.value)}
                optionType="button"
              >
                <Radio.Button value="AM">AM</Radio.Button>
                <Radio.Button value="PM">PM</Radio.Button>
              </Radio.Group>
            </div>
          </div>
        )}

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
              color: reasonValid ? "#059669" : "var(--muted-foreground)",
            }}
          >
            {reason.trim().length} characters, {reason.trim() ? wordCount : 0} words
            {!reasonValid && reason.length > 0 ? ` — need at least ${MIN_CHARS} characters and ${MIN_WORDS} words` : ""}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default RequestLeaveModal;
