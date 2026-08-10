import React, { useState } from "react";
import apiClient from "@/api/axios";

interface FormState {
  name: string;
  company_name: string;
  phone: string;
  email: string;
  message: string;
}

const initialState: FormState = {
  name: "",
  company_name: "",
  phone: "",
  email: "",
  message: "",
};

const CallbackForm: React.FC = () => {
  const [form, setForm] = useState<FormState>(initialState);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setStatus("error");
      setErrorMsg("Please enter your name");
      return;
    }
    if (!form.phone.trim() && !form.email.trim()) {
      setStatus("error");
      setErrorMsg("Please provide a phone number or email address");
      return;
    }

    setStatus("submitting");
    setErrorMsg("");
    try {
      await apiClient.post("/callback/request", form);
      setStatus("success");
      setForm(initialState);
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err?.response?.data?.message || "Something went wrong. Please try again.");
    }
  };

  if (status === "success") {
    return (
      <div className="lp-form-success">
        <div className="lp-form-success-icon">✓</div>
        <h3>Thanks, we&apos;ve got your request!</h3>
        <p>Our team will reach out to you shortly.</p>
        <button className="lp-btn-ghost" type="button" onClick={() => setStatus("idle")}>
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <form className="lp-form" onSubmit={handleSubmit}>
      <div className="lp-form-grid">
        <div className="lp-form-field">
          <label>Full Name *</label>
          <input value={form.name} onChange={handleChange("name")} placeholder="Your name" />
        </div>
        <div className="lp-form-field">
          <label>Company Name</label>
          <input
            value={form.company_name}
            onChange={handleChange("company_name")}
            placeholder="Your business name"
          />
        </div>
        <div className="lp-form-field">
          <label>Phone Number</label>
          <input value={form.phone} onChange={handleChange("phone")} placeholder="10-digit phone number" />
        </div>
        <div className="lp-form-field">
          <label>Email Address</label>
          <input
            type="email"
            value={form.email}
            onChange={handleChange("email")}
            placeholder="you@company.com"
          />
        </div>
      </div>

      <div className="lp-form-field lp-form-field-full">
        <label>What are you looking for?</label>
        <textarea
          rows={3}
          value={form.message}
          onChange={handleChange("message")}
          placeholder="Tell us a bit about your business…"
        />
      </div>

      {status === "error" && errorMsg && <div className="lp-form-error">{errorMsg}</div>}

      <button className="lp-btn lp-btn-primary lp-form-submit" type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Sending…" : "Request a Callback"}
      </button>
    </form>
  );
};

export default CallbackForm;
