export const mapCustomerData = (customer: any) => ({
  key: customer.id,
  first_name: customer.first_name,
  last_name: customer.last_name,
  email: customer.email,
  phone: customer.phone,
  city: customer.city,
  country: customer.country,
  company_name: customer.company_name,
});
