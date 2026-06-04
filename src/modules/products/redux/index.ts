import instance from "./instance";

class ProductService {
  getProducts(payload?: any) {
    return instance.get("/product/list", {
      params: payload,
    });
  }

  getProduct(productId: any) {
    return instance.get(`/product/${productId}`);
  }

  createProduct(payload: any) {
    return instance.post("/product/create", payload);
  }

  deleteProduct(productId: any) {
    return instance.delete(`/product/${productId}`);
  }

  updateProduct(payload: any) {
    const { id, ...rest } = payload;
    return instance.put(`/product/${id}`, rest);
  }
}

export default ProductService;
