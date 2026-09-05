import { createFileRoute } from "@tanstack/react-router";
import { ProductForm } from "@/components/admin/ProductForm";

export const Route = createFileRoute("/_authenticated/admin/products/new")({
  component: NewProductPage,
});

function NewProductPage() {
  return <ProductForm />;
}
