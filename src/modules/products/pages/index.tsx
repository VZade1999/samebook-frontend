import React, { useState, useEffect } from "react";
import {
  Table,
  Input,
  Pagination,
  Card,
  Space,
  Empty,
  Button,
  Popconfirm,
} from "antd";
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { deleteProduct, getProducts } from "../redux/productActions";

import EditProductModal from "./EditProduct/EditProductModal";
import ProductDetailsDrawer from "./ProductDetailsDrawer";
import { useAccess } from "@/permissions/useAccess";
import AddProductModal from "./CreateProduct/AddProductModal";

interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  category_id: number | null;
  stock_quantity: number | null;
  description: string | null;
  created_at: string;
}

const ProductListPage: React.FC = () => {
  const dispatch = useDispatch();
  const { can } = useAccess();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [searchFilters, setSearchFilters] = useState({
    name: "",
    sku: "",
    category_id: "",
  });
  const [debouncedFilters, setDebouncedFilters] = useState(searchFilters);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(searchFilters);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchFilters]);

  const productState = useSelector((state: any) => state.products);
  const products = productState?.products || [];
  const pagination = productState?.products?.pagination || {};
  const total = pagination?.total || 0;
  const loading = productState?.loading || false;

  useEffect(() => {
    dispatch(
      getProducts({
        ...debouncedFilters,
        category_id: debouncedFilters.category_id
          ? Number(debouncedFilters.category_id)
          : undefined,
        page,
        limit: pageSize,
      })
    );
  }, [dispatch, debouncedFilters, page, pageSize]);

  const handleSearchChange = (
    column: keyof typeof searchFilters,
    value: string
  ) => {
    setSearchFilters((prev) => ({
      ...prev,
      [column]: value,
    }));
    setPage(1);
  };

  const renderSearchInput = (
    key: keyof typeof searchFilters,
    placeholder: string
  ) => (
    <div style={{ padding: 8 }}>
      <Input
        allowClear
        placeholder={placeholder}
        prefix={<SearchOutlined />}
        value={searchFilters[key]}
        onChange={(e) => handleSearchChange(key, e.target.value)}
        style={{ width: 220 }}
      />
    </div>
  );

  const handleDelete = (record: Product) => {
    dispatch(deleteProduct(record.id));
  };

  const handleEdit = (record: Product) => {
    setSelectedProduct(record);
    setIsEditModalOpen(true);
  };

  const handleView = (record: Product) => {
    setSelectedProductId(record.id);
    setIsDetailOpen(true);
  };

  const columns: TableColumnsType<Product> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: 220,
      filterDropdown: () => renderSearchInput("name", "Search product name..."),
      filterIcon: <SearchOutlined />,
    },
    {
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
      width: 180,
      filterDropdown: () => renderSearchInput("sku", "Search SKU..."),
      filterIcon: <SearchOutlined />,
    },
    {
      title: "Category ID",
      dataIndex: "category_id",
      key: "category_id",
      render: (value) => (value != null ? value : "-"),
      filterDropdown: () => renderSearchInput("category_id", "Search category ID..."),
      filterIcon: <SearchOutlined />,
    },
    {
      title: "Price",
      dataIndex: "price",
      key: "price",
      width: 140,
      render: (value) => {
        const price = Number(value);
        return Number.isFinite(price) ? `$${price.toFixed(2)}` : "-";
      },
    },
    {
      title: "Stock Quantity",
      dataIndex: "stock_quantity",
      key: "stock_quantity",
      width: 140,
      render: (value) => {
        const stock = Number(value);
        return Number.isFinite(stock) ? stock : "-";
      },
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (value) => (value ? value : "-"),
    },
    {
      title: "Action",
      key: "action",
      fixed: "right",
      width: 160,
      render: (_, record) => (
        <Space size="small">
          {can("product.update") ? (
            <Button
              type="text"
              icon={<EditOutlined style={{ color: "#1677ff" }} />}
              onClick={() => handleEdit(record)}
            />
          ) : null}
          {can("product.delete") ? (
            <Popconfirm
              title="Delete Product"
              description="Are you sure?"
              onConfirm={() => handleDelete(record)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 10 }}>
      <Card
        title="Products"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
          >
            Add Product
          </Button>
        }
      >
        <Space orientation="vertical" style={{ width: "100%" }} size="large">
          <Table
            columns={columns}
            dataSource={products?.products?.map((product: Product) => ({
              ...product,
              stock_quantity: product.stock_quantity ?? null,
              key: product.id,
            }))}
            pagination={false}
            loading={loading}
            bordered
            scroll={{ x: "max-content" }}
            locale={{ emptyText: <Empty description="No products found" /> }}
          />

          {total > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 16,
                padding: "0 8px",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div>
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} records
              </div>

              <Pagination
                current={page}
                pageSize={pageSize}
                total={total}
                showSizeChanger
                showQuickJumper
                pageSizeOptions={["5", "10", "25", "50"]}
                onChange={(newPage) => setPage(newPage)}
                onShowSizeChange={(_, size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            </div>
          )}
        </Space>
      </Card>

      <AddProductModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <EditProductModal
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
      />
      <ProductDetailsDrawer
        open={isDetailOpen}
        productId={selectedProductId}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedProductId(null);
        }}
      />
    </div>
  );
};

export default ProductListPage;
