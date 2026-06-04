import instance from "./instance";


class CustomerService {
  // ======================================
  // GET CUSTOMERS LIST
  // ======================================

  getCustomers(payload?: any) {
    return instance.get(
      "/customer/list",
      {
        params: payload,
      },
    );
  }

  // ======================================
  // GET CUSTOMER DETAILS
  // ======================================

  getCustomerDetails(
    customerId: number,
  ) {
    return instance.get(
      `/customer/${customerId}`,
    );
  }

  // ======================================
  // CREATE CUSTOMER
  // ======================================

  createCustomer(payload: any) {
    return instance.post(
      "/customer/create",
      payload,
    );
  }

  // ======================================
  // UPDATE CUSTOMER
  // ======================================

  updateCustomer(payload: any) {
    const {
      id,
      ...rest
    } = payload;

    return instance.put(
      `/customer/${id}`,
      rest,
    );
  }

  // ======================================
  // DELETE CUSTOMER
  // ======================================

  deleteCustomer(
    customerId: number,
  ) {
    return instance.delete(
      `/customer/${customerId}`,
    );
  }
}

export default CustomerService;