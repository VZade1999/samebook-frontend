import React, { useState } from "react";
import { ArrowRightOutlined, CheckOutlined } from "@ant-design/icons";
import apiClient from "@/api/axios";

interface FormState {
  name: string;
  company_name: string;
  phone: string;
  email: string;
  message: string;
}

type Errors = Partial<Record<"name" | "phone" | "email" | "contact", string>>;

const EMPTY: FormState = { name: "", company_name: "", phone: "", email: "", message: "" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Limits mirror the backend DTO (callback-request.dto.ts).
const MAX = { name: 150, company_name: 200, phone: 30, email: 255, message: 2000 };

const validate = (f: FormState): Errors => {
  const e: Errors = {};
  const phone = f.phone.trim();
  const email = f.email.trim();
  if (!f.name.trim()) e.name = "Please tell us your name";
  if (!phone && !email) e.contact = "Add a phone number or an email so we can reach you";
  if (phone) {
    const digits = phone.replace(/\D/g, "").length;
    if (digits < 10 || digits > 13) e.phone = "Enter a 10-digit mobile number (with country code if outside India)";
  }
  if (email && !EMAIL_RE.test(email)) e.email = "That doesn't look like an email address";
  return e;
};

// Only send fields that have a value: the API rejects an empty string for
// email (it validates the format of anything that's present).
const toPayload = (f: FormState) =>
  Object.fromEntries(
    Object.entries(f)
      .map(([k, v]) => [k, v.trim()])
      .filter(([, v]) => v !== ""),
  );

const errorText = (err: any): string => {
  if (!err?.response) return "We couldn't reach SameBook. Check your connection and try again.";
  if (err.response.status === 429) return "You've sent a few requests just now. Please wait a minute and try again.";
  const msg = err.response.data?.message;
  if (Array.isArray(msg)) return msg[0] || "Please check your details and try again.";
  return msg || "Something went wrong. Please try again.";
};

const CallbackForm: React.FC = () => {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [sentName, setSentName] = useState("");

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear the message for the field being fixed (and the "phone or email" one).
    setErrors((prev) => {
      if (!Object.keys(prev).length) return prev;
      const next = { ...prev };
      delete next[field as keyof Errors];
      if (field === "phone" || field === "email") delete next.contact;
      return next;
    });
    setSubmitError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) {
      const first = found.name ? "cb-name" : found.phone || found.contact ? "cb-phone" : "cb-email";
      document.getElementById(first)?.focus();
      return;
    }
    setStatus("submitting");
    setSubmitError("");
    try {
      await apiClient.post("/callback/request", toPayload(form));
      setSentName(form.name.trim().split(/\s+/)[0]);
      setForm(EMPTY);
      setStatus("success");
    } catch (err: any) {
      setStatus("idle");
      setSubmitError(errorText(err));
    }
  };

  if (status === "success") {
    return (
      <div className="lp-cb-success" role="status">
        <span className="lp-cb-success-ic">
          <CheckOutlined />
        </span>
        <h3>Thanks{sentName ? `, ${sentName}` : ""}! We've got your request.</h3>
        <p>Our team will reach out to you shortly.</p>
        <button className="lp-btn lp-btn-soft" type="button" onClick={() => setStatus("idle")}>
          Send another request
        </button>
      </div>
    );
  }

  const busy = status === "submitting";
  const field = (
    id: string,
    key: keyof FormState,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement>,
    error?: string,
  ) => (
    <div className={`lp-field${error ? " has-error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={form[key]}
        onChange={set(key)}
        maxLength={MAX[key]}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
        disabled={busy}
        {...props}
      />
      {error && (
        <span className="lp-field-err" id={`${id}-err`}>
          {error}
        </span>
      )}
    </div>
  );

  return (
    <form className="lp-cb" onSubmit={handleSubmit} noValidate>
      <div className="lp-cb-head">
        <b>Request a callback</b>
        <span>Takes under a minute</span>
      </div>

      <div className="lp-cb-grid">
        {field("cb-name", "name", "Your name", { placeholder: "Full name", autoComplete: "name" }, errors.name)}
        {field("cb-company", "company_name", "Company", { placeholder: "Business name (optional)", autoComplete: "organization" })}
        {field(
          "cb-phone",
          "phone",
          "Phone",
          { type: "tel", inputMode: "tel", placeholder: "10-digit mobile", autoComplete: "tel" },
          errors.phone,
        )}
        {field(
          "cb-email",
          "email",
          "Email",
          { type: "email", inputMode: "email", placeholder: "you@company.com", autoComplete: "email", spellCheck: false },
          errors.email,
        )}
      </div>
      {errors.contact ? (
        <p className="lp-cb-note is-error" role="alert">{errors.contact}</p>
      ) : (
        <p className="lp-cb-note">A phone number or an email is enough.</p>
      )}

      <div className="lp-field">
        <label htmlFor="cb-message">What are you looking for?</label>
        <textarea
          id="cb-message"
          rows={3}
          value={form.message}
          onChange={set("message")}
          maxLength={MAX.message}
          placeholder="Tell us a bit about your business (optional)"
          disabled={busy}
        />
      </div>

      {submitError && (
        <div className="lp-cb-error" role="alert">
          {submitError}
        </div>
      )}

      <button className="lp-btn lp-btn-primary lp-cb-submit" type="submit" disabled={busy} aria-busy={busy}>
        {busy ? (
          <>
            <span className="lp-spinner" aria-hidden="true" /> Sending…
          </>
        ) : (
          <>
            Request a callback <ArrowRightOutlined />
          </>
        )}
      </button>
    </form>
  );
};

export default CallbackForm;
