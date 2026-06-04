const phoneRegex = /^[0-9]{10}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const getValidationRules = (dataIndex: string, title: string) => {
  const baseRules = [{ required: true, message: `${title} is required.` }];

  if (dataIndex === "email") {
    return [
      ...baseRules,
      {
        pattern: emailRegex,
        message:
          "Please enter a valid email address (e.g., example@domain.com)",
      },
    ];
  }

  if (dataIndex === "phone") {
    return [
      ...baseRules,
      {
        pattern: phoneRegex,
        message: "Please enter a valid phone number (10 digits)",
      },
    ];
  }

  return baseRules;
};