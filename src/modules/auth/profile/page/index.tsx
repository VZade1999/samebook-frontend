import React, { useEffect, useRef, useState } from "react";
import { Input, notification, Spin } from "antd";
import {
  EditOutlined,
  CloseOutlined,
  CheckCircleFilled,
  CameraOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  BankOutlined,
  IdcardOutlined,
  SafetyCertificateOutlined,
  HeartOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { getProfile, updateProfile } from "../redux/profileActions";
import { StorageService } from "@/storage";

// ─── Design tokens ────────────────────────────────────────────────────────────
// Same elevated-indigo system established on the Company page (--comp-*) —
// reused here under a --prof-* prefix so both "self" pages read as one
// consistent, premium design language.
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    :root {
      --prof-bg: var(--background);
      --prof-surface: var(--card);
      --prof-border: var(--border);
      --prof-accent: #4F46E5;
      --prof-accent-2: #818CF8;
      --prof-accent-light: #EEF2FF;
      --prof-text: var(--foreground);
      --prof-muted: var(--muted-foreground);
      --prof-radius: 14px;
      --prof-radius-sm: 8px;
      --prof-shadow: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04);
      --prof-shadow-md: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
      --prof-shadow-lg: 0 24px 48px -12px rgba(30,27,75,.35);
    }

    .prof-root {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--prof-bg);
      min-height: 100vh;
      color: var(--prof-text);
    }

    /* ── Hero ── */
    .prof-hero {
      position: relative; overflow: hidden;
      padding: 40px 28px 108px;
      background:
        radial-gradient(120% 140% at 12% 0%, #4338CA 0%, transparent 55%),
        radial-gradient(90% 120% at 100% 10%, #6D28D9 0%, transparent 50%),
        linear-gradient(160deg, #14123A 0%, #1E1B4B 45%, #2A2470 100%);
    }
    .prof-hero::after {
      content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 36px;
      background: var(--prof-bg); border-radius: 32px 32px 0 0;
    }
    .prof-hero-noise {
      position: absolute; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E");
      pointer-events: none;
    }
    .prof-hero-grid {
      position: absolute; inset: 0; pointer-events: none; opacity: .35;
      background-image:
        linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px);
      background-size: 42px 42px;
      -webkit-mask-image: radial-gradient(70% 90% at 50% 0%, #000 30%, transparent 85%);
              mask-image: radial-gradient(70% 90% at 50% 0%, #000 30%, transparent 85%);
    }
    .prof-glow { position: absolute; border-radius: 50%; filter: blur(70px); pointer-events: none; }
    .prof-glow-1 { width: 320px; height: 320px; top: -120px; right: 8%; background: radial-gradient(circle, rgba(129,140,248,.55), transparent 70%); }
    .prof-glow-2 { width: 260px; height: 260px; bottom: -140px; left: 4%; background: radial-gradient(circle, rgba(99,102,241,.4), transparent 70%); }

    .prof-hero-inner { position: relative; z-index: 1; max-width: 1180px; margin: 0 auto; }
    .prof-eyebrow {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase;
      color: rgba(224,224,255,.75); margin-bottom: 14px;
    }
    .prof-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: #34D399; box-shadow: 0 0 0 4px rgba(52,211,153,.18); }

    /* ── Glass identity card ── */
    .prof-glass {
      background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.14);
      border-radius: 20px; backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
      padding: 24px; display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
      box-shadow: var(--prof-shadow-lg);
    }
    .prof-avatar-ring { position: relative; width: 84px; height: 84px; flex-shrink: 0; }
    .prof-avatar-gradient {
      width: 100%; height: 100%; border-radius: 20px;
      background: linear-gradient(135deg, #818CF8, #4F46E5 60%, #C4B5FD);
      padding: 2.5px; box-shadow: 0 8px 24px rgba(79,70,229,.45);
    }
    .prof-avatar-inner {
      width: 100%; height: 100%; border-radius: 18px; background: rgba(20,18,58,.9);
      display: flex; align-items: center; justify-content: center; overflow: hidden;
      color: #fff; font-size: 30px; position: relative;
    }
    .prof-avatar-inner img { width: 100%; height: 100%; object-fit: cover; }
    .prof-avatar-loading {
      position: absolute; inset: 0; background: rgba(20,18,58,.7);
      display: flex; align-items: center; justify-content: center;
    }
    .prof-avatar-btn {
      position: absolute; bottom: -4px; right: -4px; width: 30px; height: 30px; border-radius: 50%;
      background: #fff; color: var(--prof-accent); border: 3px solid #1E1B4B;
      display: flex; align-items: center; justify-content: center; cursor: pointer;
      font-size: 12px; transition: transform .15s;
    }
    .prof-avatar-btn:hover { transform: scale(1.08); }

    .prof-identity-name { font-size: clamp(20px, 3.2vw, 28px); font-weight: 800; color: #fff; letter-spacing: -0.5px; }
    .prof-identity-sub { color: rgba(224,224,255,.65); font-size: 13px; margin-top: 4px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .prof-identity-sub span { display: inline-flex; align-items: center; gap: 6px; }
    .prof-role-row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
    .prof-role-badge {
      font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px;
      padding: 3px 10px; border-radius: 20px;
      background: rgba(129,140,248,.2); color: #C7D2FE; border: 1px solid rgba(129,140,248,.35);
    }

    /* ── Body ── */
    .prof-body { padding: 0 24px 40px; margin-top: -60px; position: relative; z-index: 2; max-width: 1180px; margin-left: auto; margin-right: auto; }

    /* ── Completeness card ── */
    .prof-progress-card {
      background: var(--prof-surface); border: 1px solid var(--prof-border);
      border-radius: var(--prof-radius); box-shadow: var(--prof-shadow-md);
      padding: 18px 22px; margin-bottom: 20px; display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
    }
    .prof-ring-wrap { position: relative; width: 56px; height: 56px; flex-shrink: 0; }
    .prof-ring-wrap svg { transform: rotate(-90deg); }
    .prof-ring-track { fill: none; stroke: var(--muted); stroke-width: 5; }
    .prof-ring-value { fill: none; stroke: url(#profRingGrad); stroke-width: 5; stroke-linecap: round; transition: stroke-dashoffset .6s ease; }
    .prof-ring-text { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: var(--prof-text); }
    .prof-progress-info { flex: 1; min-width: 200px; }
    .prof-progress-title { font-size: 13.5px; font-weight: 700; color: var(--prof-text); }
    .prof-progress-sub { font-size: 12px; color: var(--prof-muted); margin-top: 2px; }
    .prof-checklist { display: flex; gap: 14px; flex-wrap: wrap; }
    .prof-check-chip { display: flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 600; color: var(--prof-muted); }
    .prof-check-chip.done { color: var(--prof-accent); }
    .prof-check-chip .anticon { font-size: 12px; }

    /* ── Grid ── */
    .prof-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
    @media (max-width: 900px) { .prof-grid { grid-template-columns: 1fr; } }

    /* ── Card ── */
    .prof-card {
      background: var(--prof-surface); border: 1px solid var(--prof-border);
      border-radius: var(--prof-radius); box-shadow: var(--prof-shadow); overflow: hidden;
      position: relative; transition: transform .18s ease, box-shadow .18s ease;
    }
    .prof-card:hover { transform: translateY(-2px); box-shadow: var(--prof-shadow-md); }
    .prof-card::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
      background: linear-gradient(90deg, var(--prof-accent), var(--prof-accent-2));
    }
    .prof-card-header {
      padding: 16px 20px; border-bottom: 1px solid var(--prof-border);
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
    }
    .prof-card-title { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 700; color: var(--prof-text); }
    .prof-card-title .icon {
      width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 14px; background: linear-gradient(135deg, var(--prof-accent), var(--prof-accent-2));
      box-shadow: 0 4px 10px rgba(79,70,229,.35);
    }
    .prof-card-body { padding: 18px 20px; }

    .prof-edit-btn, .prof-cancel-btn, .prof-save-btn {
      display: inline-flex; align-items: center; gap: 6px;
      border-radius: var(--prof-radius-sm); font-size: 12.5px; font-weight: 700;
      cursor: pointer; font-family: 'Inter', sans-serif; height: 32px; padding: 0 12px; border: 1px solid transparent;
      transition: all .15s;
    }
    .prof-edit-btn { background: var(--prof-accent-light); color: var(--prof-accent); border-color: var(--prof-accent-light); }
    .prof-edit-btn:hover { border-color: var(--prof-accent); }
    .prof-cancel-btn { background: transparent; color: var(--prof-muted); }
    .prof-cancel-btn:hover { color: #DC2626; }
    .prof-save-btn { background: linear-gradient(135deg, var(--prof-accent), #4338CA); color: #fff; box-shadow: 0 3px 10px rgba(79,70,229,.35); }
    .prof-save-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(79,70,229,.4); }
    .prof-save-btn:disabled { opacity: .7; cursor: not-allowed; transform: none; }

    /* ── Fields (view mode) ── */
    .prof-fields-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px 20px; }
    .prof-fields-grid.wide { grid-template-columns: repeat(3, 1fr); }
    @media (max-width: 560px) { .prof-fields-grid, .prof-fields-grid.wide { grid-template-columns: 1fr 1fr; } }
    .prof-field-label {
      font-size: 11px; font-weight: 700; letter-spacing: .4px; text-transform: uppercase;
      color: var(--prof-muted); margin-bottom: 4px; display: flex; align-items: center; gap: 5px;
    }
    .prof-field-value { font-size: 13.5px; font-weight: 600; color: var(--prof-text); }
    .prof-field-empty { font-size: 13px; color: var(--prof-muted); font-style: italic; }

    /* ── Edit mode inputs ── */
    .prof-edit-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    @media (max-width: 560px) { .prof-edit-grid { grid-template-columns: 1fr; } }
    .prof-edit-grid .full { grid-column: 1 / -1; }
    .prof-root .ant-input, .prof-root .ant-input-affix-wrapper {
      border-radius: 8px !important; font-size: 13px !important; font-family: 'Inter', sans-serif !important;
      background: var(--muted) !important; border-color: var(--prof-border) !important;
    }
    .prof-root .ant-input:focus, .prof-root .ant-input-affix-wrapper:focus {
      border-color: var(--prof-accent) !important; box-shadow: 0 0 0 3px rgba(79,70,229,.1) !important; background: var(--prof-surface) !important;
    }

    .prof-loading { text-align: center; padding: 64px 0; color: var(--prof-muted); }

    @media (max-width: 640px) {
      .prof-hero { padding: 24px 16px 96px; }
      .prof-body { padding: 0 16px 40px; margin-top: -52px; }
      .prof-glass { padding: 18px; }
    }
  `}</style>
);

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

  avatar?: string;
  role?: string[];
}

type EditSection = "personal" | "bank" | null;

const mapServerToUser = (server: any): Partial<UserDetails> => ({
  firstName: server.first_name,
  lastName: server.last_name,
  email: server.email,
  phone: server.phone,
  dateOfBirth: server.date_of_birth,
  gender: server.gender,
  maritalStatus: server.marital_status,
  bloodGroup: server.blood_group,
  permanentAddress: server.permanent_address,
  aadharNo: server.aadhar_no,
  panNo: server.pan_no,
  emergencyContact: server.emergency_contact,
  bankName: server.bank_name,
  branchName: server.branch_name,
  accountNumber: server.account_number,
  accountType: server.account_type,
  ifscCode: server.ifsc_code,
  micrCode: server.micr_code,
  salaryPaymentMode: server.salary_payment_mode,
  avatar: server.avatar,
});

const PERSONAL_FIELDS: (keyof UserDetails)[] = [
  "firstName",
  "lastName",
  "phone",
  "dateOfBirth",
  "gender",
  "maritalStatus",
  "bloodGroup",
  "permanentAddress",
  "aadharNo",
  "panNo",
  "emergencyContact",
];

const BANK_FIELDS: (keyof UserDetails)[] = [
  "bankName",
  "branchName",
  "accountNumber",
  "accountType",
  "ifscCode",
  "micrCode",
  "salaryPaymentMode",
];

const toServerPayload = (draft: Partial<UserDetails>, keys: (keyof UserDetails)[]) => {
  const keyMap: Record<string, string> = {
    firstName: "first_name",
    lastName: "last_name",
    phone: "phone",
    dateOfBirth: "date_of_birth",
    gender: "gender",
    maritalStatus: "marital_status",
    bloodGroup: "blood_group",
    permanentAddress: "permanent_address",
    aadharNo: "aadhar_no",
    panNo: "pan_no",
    emergencyContact: "emergency_contact",
    bankName: "bank_name",
    branchName: "branch_name",
    accountNumber: "account_number",
    accountType: "account_type",
    ifscCode: "ifsc_code",
    micrCode: "micr_code",
    salaryPaymentMode: "salary_payment_mode",
  };
  const payload: Record<string, any> = {};
  keys.forEach((key) => {
    const value = draft[key];
    if (value !== undefined && value !== "") payload[keyMap[key]] = value;
  });
  return payload;
};

/* ─── Component ─────────────────────────────────────────────────────────── */
const Profile = () => {
  const dispatch = useDispatch();
  const storageService = new StorageService();

  const cached = storageService.getItem(StorageService.STORAGE_KEYS.USER_DETAILS) ?? "{}";
  const initial: UserDetails = JSON.parse(cached);

  const [user, setUser] = useState<UserDetails>(initial);
  const [editing, setEditing] = useState<EditSection>(null);
  const [draft, setDraft] = useState<Partial<UserDetails>>({});
  const [avatarSaving, setAvatarSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const profileState = useSelector((state: any) => state.profile);
  const loading = profileState?.loading || false;
  const saving = profileState?.saving || false;

  useEffect(() => {
    dispatch(getProfile() as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (profileState?.data) {
      const merged = { ...user, ...mapServerToUser(profileState.data) };
      setUser(merged);
      // Cache everything except the (potentially large) base64 avatar, to
      // keep this a small, fast-loading "am I authenticated" snapshot.
      const { avatar, ...cacheable } = merged;
      storageService.setItem(
        StorageService.STORAGE_KEYS.USER_DETAILS,
        JSON.stringify(cacheable),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileState?.data]);

  const done = {
    account: true,
    photo: !!user.avatar,
    personal: !!(user.firstName && user.phone),
    address: !!user.permanentAddress,
    bank: !!user.bankName,
  };
  const WEIGHTS: Record<string, number> = { account: 15, photo: 15, personal: 20, address: 20, bank: 30 };
  const totalPct = Object.entries(done).reduce(
    (sum, [key, isDone]) => sum + (isDone ? WEIGHTS[key] : 0),
    0,
  );

  const RADIUS = 24;
  const CIRC = 2 * Math.PI * RADIUS;
  const ringOffset = CIRC - (totalPct / 100) * CIRC;

  const startEdit = (section: EditSection) => {
    setEditing(section);
    setDraft({ ...user });
  };
  const cancelEdit = () => {
    setEditing(null);
    setDraft({});
  };

  const saveSection = async (section: EditSection) => {
    const keys = section === "personal" ? PERSONAL_FIELDS : BANK_FIELDS;
    const payload = toServerPayload(draft, keys);
    try {
      const response = await dispatch(updateProfile(payload) as any);
      if (response.meta.requestStatus === "fulfilled") {
        notification.success({ message: "Changes saved" });
        setEditing(null);
      } else {
        notification.error({
          message: "Couldn't save changes",
          description: response.payload?.message || "Please try again.",
        });
      }
    } catch {
      notification.error({ message: "Couldn't save changes" });
    }
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      notification.error({ message: "Only JPG, PNG, or WEBP allowed" });
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      notification.error({ message: "Image must be under 3MB" });
      return;
    }
    const base64: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    setAvatarSaving(true);
    try {
      const response = await dispatch(updateProfile({ avatar: base64 }) as any);
      if (response.meta.requestStatus === "fulfilled") {
        notification.success({ message: "Photo updated" });
      } else {
        notification.error({
          message: "Couldn't update photo",
          description: response.payload?.message || "Please try again.",
        });
      }
    } finally {
      setAvatarSaving(false);
    }
  };

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "—";

  const Field = ({ label, value, icon }: { label: string; value?: string; icon?: React.ReactNode }) => (
    <div>
      <div className="prof-field-label">{icon}{label}</div>
      <div className={value ? "prof-field-value" : "prof-field-empty"}>{value || "Not set"}</div>
    </div>
  );

  const EditField = ({
    label,
    field,
    full,
    type = "text",
  }: {
    label: string;
    field: keyof UserDetails;
    full?: boolean;
    type?: string;
  }) => (
    <div className={full ? "full" : ""}>
      <div className="prof-field-label">{label}</div>
      {type === "textarea" ? (
        <Input.TextArea
          rows={3}
          value={(draft[field] as string) || ""}
          onChange={(e) => setDraft((d) => ({ ...d, [field]: e.target.value }))}
        />
      ) : (
        <Input
          type={type}
          value={(draft[field] as string) || ""}
          onChange={(e) => setDraft((d) => ({ ...d, [field]: e.target.value }))}
          placeholder={label}
        />
      )}
    </div>
  );

  if (loading && !profileState?.data) {
    return (
      <div className="prof-root">
        <GlobalStyles />
        <div className="prof-loading"><Spin size="large" /></div>
      </div>
    );
  }

  return (
    <div className="prof-root">
      <GlobalStyles />

      {/* ── Hero ── */}
      <div className="prof-hero">
        <div className="prof-hero-grid" />
        <div className="prof-glow prof-glow-1" />
        <div className="prof-glow prof-glow-2" />
        <div className="prof-hero-noise" />

        <div className="prof-hero-inner">
          <div className="prof-eyebrow">
            <span className="prof-eyebrow-dot" />
            My Profile
          </div>

          <div className="prof-glass">
            <div className="prof-avatar-ring">
              <div className="prof-avatar-gradient">
                <div className="prof-avatar-inner">
                  {user.avatar ? <img src={user.avatar} alt="avatar" /> : <UserOutlined />}
                  {avatarSaving && (
                    <div className="prof-avatar-loading"><Spin size="small" /></div>
                  )}
                </div>
              </div>
              <div className="prof-avatar-btn" onClick={() => fileRef.current?.click()}>
                <CameraOutlined />
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={handleAvatarFile}
              />
            </div>

            <div style={{ minWidth: 0 }}>
              <div className="prof-identity-name">{fullName}</div>
              <div className="prof-identity-sub">
                {user.email && <span><MailOutlined /> {user.email}</span>}
                {user.phone && <span><PhoneOutlined /> {user.phone}</span>}
              </div>
              {!!user.role?.length && (
                <div className="prof-role-row">
                  {user.role.map((r, i) => (
                    <span key={i} className="prof-role-badge">{r}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="prof-body">
        <div className="prof-progress-card">
          <div className="prof-ring-wrap">
            <svg width="56" height="56" viewBox="0 0 56 56">
              <defs>
                <linearGradient id="profRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4F46E5" />
                  <stop offset="100%" stopColor="#818CF8" />
                </linearGradient>
              </defs>
              <circle className="prof-ring-track" cx="28" cy="28" r={RADIUS} />
              <circle
                className="prof-ring-value"
                cx="28" cy="28" r={RADIUS}
                strokeDasharray={CIRC}
                strokeDashoffset={ringOffset}
              />
            </svg>
            <div className="prof-ring-text">{totalPct}%</div>
          </div>
          <div className="prof-progress-info">
            <div className="prof-progress-title">Profile completeness</div>
            <div className="prof-progress-sub">
              {totalPct >= 100 ? "Your profile is fully filled out." : "Fill in the remaining details below."}
            </div>
          </div>
          <div className="prof-checklist">
            {[
              { key: "account", label: "Account", icon: <UserOutlined /> },
              { key: "photo", label: "Photo", icon: <CameraOutlined /> },
              { key: "personal", label: "Personal", icon: <IdcardOutlined /> },
              { key: "address", label: "Address", icon: <EnvironmentOutlined /> },
              { key: "bank", label: "Bank", icon: <BankOutlined /> },
            ].map((item) => (
              <span key={item.key} className={`prof-check-chip${(done as any)[item.key] ? " done" : ""}`}>
                {(done as any)[item.key] ? <CheckCircleFilled /> : item.icon}
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className="prof-grid">
          {/* Personal Info */}
          <div className="prof-card" style={{ gridColumn: "1 / -1" }}>
            <div className="prof-card-header">
              <div className="prof-card-title"><span className="icon"><IdcardOutlined /></span>Personal Info</div>
              {editing === "personal" ? (
                <button className="prof-cancel-btn" onClick={cancelEdit}><CloseOutlined /> Cancel</button>
              ) : (
                <button className="prof-edit-btn" onClick={() => startEdit("personal")}><EditOutlined /> Edit</button>
              )}
            </div>
            <div className="prof-card-body">
              {editing === "personal" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="prof-edit-grid">
                    <EditField label="First Name" field="firstName" />
                    <EditField label="Last Name" field="lastName" />
                    <EditField label="Phone" field="phone" />
                    <EditField label="Date of Birth" field="dateOfBirth" type="date" />
                    <EditField label="Gender" field="gender" />
                    <EditField label="Marital Status" field="maritalStatus" />
                    <EditField label="Blood Group" field="bloodGroup" />
                    <EditField label="Aadhar Number" field="aadharNo" />
                    <EditField label="PAN Number" field="panNo" />
                    <EditField label="Emergency Contact" field="emergencyContact" />
                    <EditField label="Permanent Address" field="permanentAddress" type="textarea" full />
                  </div>
                  <div>
                    <button className="prof-save-btn" disabled={saving} onClick={() => saveSection("personal")}>
                      {saving ? <Spin size="small" /> : null}
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="prof-fields-grid wide">
                  <Field label="Email" value={user.email} icon={<MailOutlined />} />
                  <Field label="Phone" value={user.phone} icon={<PhoneOutlined />} />
                  <Field label="Date of Birth" value={user.dateOfBirth} />
                  <Field label="Gender" value={user.gender} />
                  <Field label="Marital Status" value={user.maritalStatus} />
                  <Field label="Blood Group" value={user.bloodGroup} icon={<HeartOutlined />} />
                  <Field label="Aadhar No" value={user.aadharNo} icon={<SafetyCertificateOutlined />} />
                  <Field label="PAN No" value={user.panNo} icon={<SafetyCertificateOutlined />} />
                  <Field label="Emergency Contact" value={user.emergencyContact} />
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Permanent Address" value={user.permanentAddress} icon={<EnvironmentOutlined />} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bank & Salary */}
          <div className="prof-card" style={{ gridColumn: "1 / -1" }}>
            <div className="prof-card-header">
              <div className="prof-card-title"><span className="icon"><BankOutlined /></span>Bank & Salary Details</div>
              {editing === "bank" ? (
                <button className="prof-cancel-btn" onClick={cancelEdit}><CloseOutlined /> Cancel</button>
              ) : (
                <button className="prof-edit-btn" onClick={() => startEdit("bank")}><EditOutlined /> Edit</button>
              )}
            </div>
            <div className="prof-card-body">
              {editing === "bank" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="prof-edit-grid">
                    <EditField label="Bank Name" field="bankName" />
                    <EditField label="Branch Name" field="branchName" />
                    <EditField label="Account Number" field="accountNumber" />
                    <EditField label="Account Type" field="accountType" />
                    <EditField label="IFSC Code" field="ifscCode" />
                    <EditField label="MICR Code" field="micrCode" />
                    <EditField label="Salary Payment Mode" field="salaryPaymentMode" />
                  </div>
                  <div>
                    <button className="prof-save-btn" disabled={saving} onClick={() => saveSection("bank")}>
                      {saving ? <Spin size="small" /> : null}
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="prof-fields-grid wide">
                  <Field label="Bank Name" value={user.bankName} />
                  <Field label="Branch Name" value={user.branchName} />
                  <Field label="Account Number" value={user.accountNumber} />
                  <Field label="Account Type" value={user.accountType} />
                  <Field label="IFSC Code" value={user.ifscCode} />
                  <Field label="MICR Code" value={user.micrCode} />
                  <Field label="Salary Payment Mode" value={user.salaryPaymentMode} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
