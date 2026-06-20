import React, { useEffect, useRef, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Col,
  Input,
  Progress,
  Row,
  Typography,
  Upload,
  message,
} from "antd";
import {
  EditOutlined,
  CloseOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  CameraOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  BellOutlined,
  BankOutlined,
} from "@ant-design/icons";
import { StorageService } from "@/storage";

const { Title, Text } = Typography;

/* ─── Inline styles injected once ───────────────────────────────────────── */
const STYLES = `
  *, *::before, *::after { box-sizing: border-box; }

  .pp-root {
    min-height: 100vh;
    background: #F4F6FB;
    padding: 32px 24px 48px;
    font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif;
  }

  .pp-page-title {
    font-size: 24px !important;
    font-weight: 800 !important;
    color: #0F1F3D !important;
    letter-spacing: -0.5px !important;
    margin: 0 0 24px !important;
  }

  /* ── Layout columns ── */
  .pp-left  { display: flex; flex-direction: column; gap: 16px; }
  .pp-right { display: flex; flex-direction: column; gap: 16px; }

  /* ── Shared card shell ── */
  .pp-card.ant-card {
    border-radius: 16px !important;
    border: 1px solid #E8ECF4 !important;
    box-shadow: 0 1px 4px rgba(15,31,61,0.05), 0 4px 16px rgba(15,31,61,0.04) !important;
  }
  .pp-card .ant-card-body { padding: 24px !important; }

  /* ── Photo card ── */
  .pp-photo-wrap {
    display: flex;
    align-items: center;
    gap: 24px;
  }
  .pp-avatar-ring {
    position: relative;
    flex-shrink: 0;
  }
  .pp-avatar-ring .ant-avatar {
    border: 3px solid #ffffff;
    box-shadow: 0 4px 18px rgba(15,31,61,0.14);
  }
  .pp-avatar-btn {
    position: absolute;
    bottom: 2px;
    right: 2px;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: #3B6FE8;
    border: 2px solid #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .pp-avatar-btn:hover { background: #1A4FBF; }
  .pp-avatar-btn .anticon { color: #fff; font-size: 11px; }

  .pp-photo-info { flex: 1; }
  .pp-upload-btn.ant-btn {
    border-radius: 8px !important;
    border-color: #D0D8EA !important;
    color: #0F1F3D !important;
    font-weight: 600 !important;
    font-size: 13px !important;
    height: 36px !important;
    padding: 0 16px !important;
    transition: border-color 0.15s, background 0.15s !important;
  }
  .pp-upload-btn.ant-btn:hover {
    border-color: #3B6FE8 !important;
    color: #3B6FE8 !important;
    background: #EBF0FD !important;
  }
  .pp-photo-hint {
    font-size: 12px !important;
    color: #8A95A8 !important;
    margin-top: 8px !important;
    line-height: 1.6 !important;
    display: block;
  }

  /* ── Section card ── */
  .pp-section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  .pp-section-title {
    font-size: 15px !important;
    font-weight: 700 !important;
    color: #0F1F3D !important;
    margin: 0 !important;
  }
  .pp-edit-btn.ant-btn {
    border-radius: 8px !important;
    border-color: #E4E8F0 !important;
    color: #3B6FE8 !important;
    font-weight: 600 !important;
    font-size: 13px !important;
    height: 34px !important;
    padding: 0 14px !important;
    display: flex !important;
    align-items: center !important;
    gap: 5px !important;
    transition: all 0.15s ease !important;
  }
  .pp-edit-btn.ant-btn:hover {
    border-color: #3B6FE8 !important;
    background: #EBF0FD !important;
  }
  .pp-cancel-btn.ant-btn {
    border: none !important;
    color: #8A95A8 !important;
    font-weight: 600 !important;
    font-size: 13px !important;
    height: 34px !important;
    padding: 0 10px !important;
    box-shadow: none !important;
    transition: color 0.15s !important;
  }
  .pp-cancel-btn.ant-btn:hover { color: #EF4444 !important; }

  /* ── Info field (read mode) ── */
  .pp-fields-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px 16px;
  }
  .pp-fields-grid-2 { grid-template-columns: repeat(2, 1fr); }
  .pp-fields-grid-1 { grid-template-columns: 1fr; }

  .pp-field-label {
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    color: #8A95A8;
    margin-bottom: 5px;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .pp-field-label .anticon { font-size: 11px; }
  .pp-field-value {
    font-size: 14.5px;
    font-weight: 600;
    color: #0F1F3D;
    line-height: 1.4;
  }
  .pp-field-empty {
    font-size: 14px;
    color: #B8C4D8;
    font-style: italic;
  }

  /* ── Edit mode inputs ── */
  .pp-input-wrap { display: flex; gap: 10px; align-items: center; }
  .pp-input.ant-input {
    border-radius: 9px !important;
    border: 1.5px solid #3B6FE8 !important;
    background: #F0F5FF !important;
    font-size: 14px !important;
    color: #0F1F3D !important;
    height: 40px !important;
    box-shadow: 0 0 0 3px rgba(59,111,232,0.10) !important;
    transition: all 0.15s ease !important;
  }
  .pp-input.ant-input:focus {
    box-shadow: 0 0 0 3.5px rgba(59,111,232,0.16) !important;
  }
  .pp-save-btn.ant-btn {
    border-radius: 9px !important;
    background: linear-gradient(135deg, #3B6FE8 0%, #1A4FBF 100%) !important;
    border: none !important;
    color: #fff !important;
    font-weight: 700 !important;
    font-size: 13.5px !important;
    height: 40px !important;
    padding: 0 20px !important;
    box-shadow: 0 3px 12px rgba(59,111,232,0.32) !important;
    white-space: nowrap;
    transition: transform 0.15s ease, box-shadow 0.15s ease !important;
  }
  .pp-save-btn.ant-btn:hover {
    transform: translateY(-1px) !important;
    box-shadow: 0 6px 18px rgba(59,111,232,0.40) !important;
  }

  /* ── Progress card ── */
  .pp-progress-card.ant-card {
    border-radius: 16px !important;
    border: 1px solid #E8ECF4 !important;
    box-shadow: 0 1px 4px rgba(15,31,61,0.05), 0 4px 16px rgba(15,31,61,0.04) !important;
    position: sticky;
    top: 24px;
  }
  .pp-progress-card .ant-card-body { padding: 24px !important; }
  .pp-progress-title {
    font-size: 15px !important;
    font-weight: 700 !important;
    color: #0F1F3D !important;
    margin: 0 0 20px !important;
  }
  .pp-donut-wrap {
    display: flex;
    justify-content: center;
    margin-bottom: 24px;
  }
  .pp-donut-wrap .ant-progress-inner { background: #EEF1F8 !important; }

  /* Progress checklist */
  .pp-checklist { display: flex; flex-direction: column; gap: 12px; }
  .pp-check-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .pp-check-left { display: flex; align-items: center; gap: 8px; }
  .pp-check-icon-done { color: #3B6FE8; font-size: 14px; }
  .pp-check-icon-todo { color: #C5CDD9; font-size: 13px; font-weight: 700; }
  .pp-check-label {
    font-size: 13.5px;
    font-weight: 500;
    color: #4A5568;
  }
  .pp-check-label.done { color: #0F1F3D; font-weight: 600; }
  .pp-check-pct {
    font-size: 12.5px;
    font-weight: 700;
  }
  .pp-check-pct.done { color: #8A95A8; }
  .pp-check-pct.todo { color: #10B981; }

  /* ── Role badge ── */
  .pp-role-badge {
    display: inline-block;
    background: #EBF0FD;
    color: #3B6FE8;
    border: 1px solid #C7D8FA;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
    padding: 3px 12px;
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }

  /* ══════════════════════════════
     RESPONSIVE
  ══════════════════════════════ */
  @media (max-width: 991px) {
    .pp-fields-grid { grid-template-columns: repeat(2, 1fr); }
    .pp-progress-card { position: static; }
  }
  @media (max-width: 767px) {
    .pp-root { padding: 20px 14px 40px; }
    .pp-page-title { font-size: 20px !important; margin-bottom: 16px !important; }
    .pp-fields-grid { grid-template-columns: 1fr 1fr; gap: 14px 12px; }
    .pp-photo-wrap { flex-direction: column; align-items: flex-start; gap: 16px; }
    .pp-input-wrap { flex-direction: column; align-items: stretch; }
    .pp-save-btn.ant-btn { width: 100% !important; }
  }
  @media (max-width: 480px) {
    .pp-root { padding: 16px 10px 32px; }
    .pp-card .ant-card-body { padding: 18px !important; }
    .pp-fields-grid { grid-template-columns: 1fr; }
    .pp-progress-card .ant-card-body { padding: 18px !important; }
  }
  @media (prefers-reduced-motion: reduce) {
    .pp-save-btn.ant-btn { transition: none !important; }
    .pp-save-btn.ant-btn:hover { transform: none !important; }
  }
`;

function useInlineStyles(css: string, id: string) {
  useEffect(() => {
    if (document.getElementById(id)) return;
    const tag = document.createElement("style");
    tag.id = id;
    tag.textContent = css;
    document.head.appendChild(tag);
    return () => {
      document.getElementById(id)?.remove();
    };
  }, []);
}

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface UserDetails {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;

  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  bloodGroup?: string;
  permanentAddress?: string;

  aadharNo?: string;
  panNo?: string;
  emergencyContact?: string;

  bankName?: string;
  branchName?: string;
  accountNumber?: string;
  accountType?: string;
  ifscCode?: string;
  micrCode?: string;
  salaryPaymentMode?: string;

  role?: string[];
}

type EditSection = "personal" | "bank" | null;

/* ─── Progress checklist config ─────────────────────────────────────────── */
const CHECKLIST = [
  { key: "account", label: "Setup account", pct: 10, icon: <UserOutlined /> },
  {
    key: "photo",
    label: "Upload your photo",
    pct: 5,
    icon: <CameraOutlined />,
  },
  { key: "personal", label: "Personal info", pct: 10, icon: <UserOutlined /> },
  {
    key: "location",
    label: "Location",
    pct: 20,
    icon: <EnvironmentOutlined />,
  },
  { key: "bio", label: "Biography", pct: 15, icon: <FileTextOutlined /> },
  { key: "bank", label: "Bank details", pct: 30, icon: <BankOutlined /> },
];

/* ─── Component ─────────────────────────────────────────────────────────── */
const Profile = () => {
  useInlineStyles(STYLES, "pp-styles");

  const storageService = new StorageService();
  const stored =
    storageService.getItem(StorageService.STORAGE_KEYS.USER_DETAILS) ?? "{}";
  const initial: UserDetails = JSON.parse(stored);

  const [user, setUser] = useState<UserDetails>(initial);
  const [editing, setEditing] = useState<EditSection>(null);
  const [draft, setDraft] = useState<Partial<UserDetails>>({});
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* Compute which checklist items are done */
  const done = {
    account: true,
    photo: !!avatarUrl,
    personal: !!(user.firstName && user.email && user.phone),
    location: !!user.location,
    bio: !!user.bio,
    notifications: false,
    bank: false,
  };
  const totalPct = CHECKLIST.reduce(
    (sum, c) => sum + (done[c.key as keyof typeof done] ? c.pct : 0),
    0,
  );

  const startEdit = (section: EditSection) => {
    setEditing(section);
    setDraft({ ...user });
  };
  const cancelEdit = () => {
    setEditing(null);
    setDraft({});
  };

  const saveSection = (section: EditSection) => {
    const updated = { ...user, ...draft };
    setUser(updated);
    storageService.setItem(
      StorageService.STORAGE_KEYS.USER_DETAILS,
      JSON.stringify(updated),
    );
    setEditing(null);
    message.success("Changes saved");
  };

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      message.error("Only JPG or PNG allowed");
      return;
    }
    const url = URL.createObjectURL(file);
    setAvatarUrl(url);
    message.success("Photo updated");
  };

  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || "—";

  return (
    <div className="pp-root">
      <Title className="pp-page-title">Edit Profile</Title>

      <Row gutter={[20, 20]} align="top">
        {/* ── LEFT COLUMN ── */}
        <Col xs={24} lg={17} className="pp-left">
          {/* Photo card */}
          <Card className="pp-card" bordered={false}>
            <div className="pp-photo-wrap">
              <div className="pp-avatar-ring">
                <Avatar
                  size={88}
                  src={avatarUrl || undefined}
                  icon={!avatarUrl ? <UserOutlined /> : undefined}
                  style={{
                    background: avatarUrl ? "transparent" : "#3B6FE8",
                    fontSize: 36,
                  }}
                />
                <div
                  className="pp-avatar-btn"
                  onClick={() => fileRef.current?.click()}
                >
                  <CameraOutlined />
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  style={{ display: "none" }}
                  onChange={handleAvatarFile}
                />
              </div>

              <div className="pp-photo-info">
                <Button
                  className="pp-upload-btn"
                  onClick={() => fileRef.current?.click()}
                >
                  Upload new photo
                </Button>
                <Text className="pp-photo-hint">
                  At least 800×800 px recommended.
                  <br />
                  JPG or PNG is allowed.
                </Text>
              </div>
            </div>
          </Card>

          {/* Personal Info card */}
          <Card className="pp-card" bordered={false}>
            <div className="pp-section-head">
              <Title level={5} className="pp-section-title">
                Personal Info
              </Title>
              {editing === "personal" ? (
                <Button
                  className="pp-cancel-btn"
                  onClick={cancelEdit}
                  icon={<CloseOutlined />}
                >
                  Cancel
                </Button>
              ) : (
                <Button
                  className="pp-edit-btn"
                  onClick={() => startEdit("personal")}
                  icon={<EditOutlined />}
                >
                  Edit
                </Button>
              )}
            </div>

            {editing === "personal" ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                <Row gutter={[12, 12]}>
                  <Col xs={24} sm={12}>
                    <div className="pp-field-label">First Name</div>
                    <Input
                      className="pp-input"
                      value={draft.firstName}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, firstName: e.target.value }))
                      }
                      placeholder="First name"
                    />
                  </Col>
                  <Col xs={24} sm={12}>
                    <div className="pp-field-label">Last Name</div>
                    <Input
                      className="pp-input"
                      value={draft.lastName}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, lastName: e.target.value }))
                      }
                      placeholder="Last name"
                    />
                  </Col>
                  <Col xs={24} sm={12}>
                    <div className="pp-field-label">Email</div>
                    <Input
                      className="pp-input"
                      value={draft.email}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, email: e.target.value }))
                      }
                      placeholder="Email address"
                    />
                  </Col>
                  <Col xs={24} sm={12}>
                    <div className="pp-field-label">Phone</div>
                    <Input
                      className="pp-input"
                      value={draft.phone}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, phone: e.target.value }))
                      }
                      placeholder="Phone number"
                    />
                  </Col>
                  <Col xs={24} sm={12}>
                    <div className="pp-field-label">Date Of Birth</div>

                    <Input
                      type="date"
                      className="pp-input"
                      value={draft.dateOfBirth}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          dateOfBirth: e.target.value,
                        }))
                      }
                    />
                  </Col>

                  <Col xs={24} sm={12}>
                    <div className="pp-field-label">Gender</div>

                    <Input
                      className="pp-input"
                      value={draft.gender}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          gender: e.target.value,
                        }))
                      }
                      placeholder="Male / Female"
                    />
                  </Col>

                  <Col xs={24} sm={12}>
                    <div className="pp-field-label">Marital Status</div>

                    <Input
                      className="pp-input"
                      value={draft.maritalStatus}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          maritalStatus: e.target.value,
                        }))
                      }
                      placeholder="Single / Married"
                    />
                  </Col>

                  <Col xs={24} sm={12}>
                    <div className="pp-field-label">Blood Group</div>

                    <Input
                      className="pp-input"
                      value={draft.bloodGroup}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          bloodGroup: e.target.value,
                        }))
                      }
                      placeholder="O+"
                    />
                  </Col>

                  <Col xs={24}>
                    <div className="pp-field-label">Permanent Address</div>

                    <Input.TextArea
                      className="pp-input"
                      rows={3}
                      value={draft.permanentAddress}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          permanentAddress: e.target.value,
                        }))
                      }
                    />
                  </Col>
                </Row>
                <Row gutter={[12, 12]}>
                  <Col xs={24} sm={12}>
                    <div className="pp-field-label">Aadhar Number</div>
                    <Input
                      className="pp-input"
                      value={draft.aadharNo}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, aadharNo: e.target.value }))
                      }
                      placeholder="Aadhar number"
                    />
                  </Col>
                  <Col xs={24} sm={12}>
                    <div className="pp-field-label">PAN Number</div>
                    <Input
                      className="pp-input"
                      value={draft.panNo}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, panNo: e.target.value }))
                      }
                      placeholder="PAN number"
                    />
                  </Col>
                  <Col xs={24} sm={12}>
                    <div className="pp-field-label">
                      Emergency Contact Number
                    </div>
                    <Input
                      className="pp-input"
                      value={draft.emergencyContact}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          emergencyContact: e.target.value,
                        }))
                      }
                      placeholder="Emergency contact number"
                    />
                  </Col>
                  <div>
                    <div className="pp-field-label">Date Of Birth</div>

                    <div
                      className={
                        user.dateOfBirth ? "pp-field-value" : "pp-field-empty"
                      }
                    >
                      {user.dateOfBirth || "Not set"}
                    </div>
                  </div>

                  <div>
                    <div className="pp-field-label">Gender</div>

                    <div
                      className={
                        user.gender ? "pp-field-value" : "pp-field-empty"
                      }
                    >
                      {user.gender || "Not set"}
                    </div>
                  </div>

                  <div>
                    <div className="pp-field-label">Marital Status</div>

                    <div
                      className={
                        user.maritalStatus ? "pp-field-value" : "pp-field-empty"
                      }
                    >
                      {user.maritalStatus || "Not set"}
                    </div>
                  </div>

                  <div>
                    <div className="pp-field-label">Blood Group</div>

                    <div
                      className={
                        user.bloodGroup ? "pp-field-value" : "pp-field-empty"
                      }
                    >
                      {user.bloodGroup || "Not set"}
                    </div>
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <div className="pp-field-label">Permanent Address</div>

                    <div
                      className={
                        user.permanentAddress
                          ? "pp-field-value"
                          : "pp-field-empty"
                      }
                    >
                      {user.permanentAddress || "Not set"}
                    </div>
                  </div>
                </Row>
                <div>
                  <Button
                    className="pp-save-btn"
                    onClick={() => saveSection("personal")}
                  >
                    Save changes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="pp-fields-grid">
                <div>
                  <div className="pp-field-label">
                    <UserOutlined /> Full Name
                  </div>
                  <div className="pp-field-value">{fullName}</div>
                </div>
                <div>
                  <div className="pp-field-label">
                    <MailOutlined /> Email
                  </div>
                  <div
                    className={user.email ? "pp-field-value" : "pp-field-empty"}
                  >
                    {user.email || "Not set"}
                  </div>
                </div>
                <div>
                  <div className="pp-field-label">
                    <PhoneOutlined /> Phone
                  </div>
                  <div
                    className={user.phone ? "pp-field-value" : "pp-field-empty"}
                  >
                    {user.phone || "Not set"}
                  </div>
                </div>
                <div>
                  <div className="pp-field-label">
                    <PhoneOutlined /> Aadhar No
                  </div>
                  <div
                    className={
                      user.aadharNo ? "pp-field-value" : "pp-field-empty"
                    }
                  >
                    {user.aadharNo || "Not set"}
                  </div>
                </div>
                <div>
                  <div className="pp-field-label">
                    <PhoneOutlined /> PAN No
                  </div>
                  <div
                    className={user.panNo ? "pp-field-value" : "pp-field-empty"}
                  >
                    {user.panNo || "Not set"}
                  </div>
                </div>
                <div>
                  <div className="pp-field-label">
                    <PhoneOutlined />
                    Emergency Contact Number
                  </div>
                  <div
                    className={
                      user.emergencyContact
                        ? "pp-field-value"
                        : "pp-field-empty"
                    }
                  >
                    {user.emergencyContact || "Not set"}
                  </div>
                  
                </div>
                <div>
                  <div className="pp-field-label">
                    <PhoneOutlined />
                    DOB
                  </div>
                  <div
                    className={
                      user.dateOfBirth
                        ? "pp-field-value"
                        : "pp-field-empty"
                    }
                  >
                    {user.dateOfBirth || "Not set"}
                  </div>
                  
                </div>
                 <div>
                  <div className="pp-field-label">
                    <PhoneOutlined />
                    Gendra
                  </div>
                  <div
                    className={
                      user.gender
                        ? "pp-field-value"
                        : "pp-field-empty"
                    }
                  >
                    {user.gender || "Not set"}
                  </div>
                  
                </div>

                 <div>
                  <div className="pp-field-label">
                    <PhoneOutlined />
                    Marital Status
                  </div>
                  <div
                    className={
                      user.maritalStatus
                        ? "pp-field-value"
                        : "pp-field-empty"
                    }
                  >
                    {user.maritalStatus || "Not set"}
                  </div>
                  
                </div>

                <div>
                  <div className="pp-field-label">
                    <PhoneOutlined />
                    Blood Group 
                  </div>
                  <div
                    className={
                      user.bloodGroup
                        ? "pp-field-value"
                        : "pp-field-empty"
                    }
                  >
                    {user.bloodGroup || "Not set"}
                  </div>
                  
                </div>

                 <div>
                  <div className="pp-field-label">
                    <PhoneOutlined />
                    Permanent Address  
                  </div>
                  <div
                    className={
                      user.permanentAddress
                        ? "pp-field-value"
                        : "pp-field-empty"
                    }
                  >
                    {user.permanentAddress || "Not set"}
                  </div>
                  
                </div>

              </div>
            )}
          </Card>

          {/* Role card */}
          <Card className="pp-card" bordered={false}>
            <div className="pp-section-head" style={{ marginBottom: 16 }}>
              <Title level={5} className="pp-section-title">
                Role & Access
              </Title>
            </div>
            <div className="pp-field-label" style={{ marginBottom: 10 }}>
              <UserOutlined /> Assigned Role
            </div>
            {user.role?.length ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {user.role.map((r, i) => (
                  <span key={i} className="pp-role-badge">
                    {r}
                  </span>
                ))}
              </div>
            ) : (
              <span className="pp-field-empty">No role assigned</span>
            )}
          </Card>

          <Card
  className="pp-card"
  bordered={false}
>
  <div className="pp-section-head">
    <Title
      level={5}
      className="pp-section-title"
    >
      Bank & Salary Details
    </Title>

    {editing === "bank" ? (
      <Button
        className="pp-cancel-btn"
        onClick={cancelEdit}
      >
        Cancel
      </Button>
    ) : (
      <Button
        className="pp-edit-btn"
        onClick={() =>
          startEdit("bank")
        }
      >
        Edit
      </Button>
    )}
  </div>

  {editing === "bank" ? (
    <>
      <Row gutter={[12, 12]}>
        <Col span={12}>
          <Input
            className="pp-input"
            placeholder="Bank Name"
            value={draft.bankName}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                bankName:
                  e.target.value,
              }))
            }
          />
        </Col>

        <Col span={12}>
          <Input
            className="pp-input"
            placeholder="Branch Name"
            value={draft.branchName}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                branchName:
                  e.target.value,
              }))
            }
          />
        </Col>

        <Col span={24}>
          <Input
            className="pp-input"
            placeholder="Branch Address"
          />
        </Col>

        <Col span={12}>
          <Input
            className="pp-input"
            placeholder="Account Number"
            value={
              draft.accountNumber
            }
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                accountNumber:
                  e.target.value,
              }))
            }
          />
        </Col>

        <Col span={12}>
          <Input
            className="pp-input"
            placeholder="Account Type"
            value={
              draft.accountType
            }
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                accountType:
                  e.target.value,
              }))
            }
          />
        </Col>

        <Col span={12}>
          <Input
            className="pp-input"
            placeholder="IFSC Code"
            value={draft.ifscCode}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                ifscCode:
                  e.target.value,
              }))
            }
          />
        </Col>

        <Col span={12}>
          <Input
            className="pp-input"
            placeholder="MICR Code"
            value={draft.micrCode}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                micrCode:
                  e.target.value,
              }))
            }
          />
        </Col>

        <Col span={12}>
          <Input
            className="pp-input"
            placeholder="Salary Payment Mode"
            value={
              draft.salaryPaymentMode
            }
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                salaryPaymentMode:
                  e.target.value,
              }))
            }
          />
        </Col>
      </Row>

      <br />

      <Button
        className="pp-save-btn"
        onClick={() =>
          saveSection("bank")
        }
      >
        Save Changes
      </Button>
    </>
  ) : (
    <div className="pp-fields-grid">
      <div>
        <div className="pp-field-label">
          Bank Name
        </div>
        <div className="pp-field-value">
          {user.bankName ||
            "Not set"}
        </div>
      </div>

      <div>
        <div className="pp-field-label">
          Branch Name
        </div>
        <div className="pp-field-value">
          {user.branchName ||
            "Not set"}
        </div>
      </div>

      <div>
        <div className="pp-field-label">
          Account Number
        </div>
        <div className="pp-field-value">
          {user.accountNumber ||
            "Not set"}
        </div>
      </div>

      <div>
        <div className="pp-field-label">
          Account Type
        </div>
        <div className="pp-field-value">
          {user.accountType ||
            "Not set"}
        </div>
      </div>

      <div>
        <div className="pp-field-label">
          IFSC Code
        </div>
        <div className="pp-field-value">
          {user.ifscCode ||
            "Not set"}
        </div>
      </div>

      <div>
        <div className="pp-field-label">
          MICR Code
        </div>
        <div className="pp-field-value">
          {user.micrCode ||
            "Not set"}
        </div>
      </div>

      <div>
        <div className="pp-field-label">
          Salary Payment Mode
        </div>
        <div className="pp-field-value">
          {user.salaryPaymentMode ||
            "Not set"}
        </div>
      </div>
    </div>
  )}
</Card>
        </Col>

        {/* ── RIGHT COLUMN — Progress ── */}
        <Col xs={24} lg={7} className="pp-right">
          <Card className="pp-progress-card" bordered={false}>
            <Title level={5} className="pp-progress-title">
              Complete your profile
            </Title>

            <div className="pp-donut-wrap">
              <Progress
                type="circle"
                percent={totalPct}
                size={130}
                strokeColor={{
                  "0%": "#3B6FE8",
                  "100%": "#10B981",
                }}
                trailColor="#EEF1F8"
                strokeWidth={10}
                format={(pct) => (
                  <span
                    style={{ fontSize: 22, fontWeight: 800, color: "#0F1F3D" }}
                  >
                    {pct}%
                  </span>
                )}
              />
            </div>

            <div className="pp-checklist">
              {CHECKLIST.map((item) => {
                const isDone = done[item.key as keyof typeof done];
                return (
                  <div className="pp-check-item" key={item.key}>
                    <div className="pp-check-left">
                      {isDone ? (
                        <CheckCircleFilled className="pp-check-icon-done" />
                      ) : (
                        <CloseCircleFilled
                          style={{ color: "#C5CDD9", fontSize: 14 }}
                        />
                      )}
                      <span
                        className={`pp-check-label${isDone ? " done" : ""}`}
                      >
                        {item.label}
                      </span>
                    </div>
                    <span
                      className={`pp-check-pct${isDone ? " done" : " todo"}`}
                    >
                      {isDone ? `${item.pct}%` : `+${item.pct}%`}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Profile;
