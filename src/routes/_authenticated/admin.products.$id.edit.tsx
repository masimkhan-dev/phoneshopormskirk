import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/admin/ProductForm";
import { EmptyState } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { adminProductQuery } from "@/lib/admin/queries";

export const Route = createFileRoute("/_authenticated/admin/products/$id/edit")({
  component: EditProductPage,
});

function EditProductPage() {
  const { id } = Route.useParams();
  const { data: product, isLoading, error } = useQuery(adminProductQuery(id));

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <EmptyState
          title="Product not found"
          description="This product could not be loaded, may have been removed, or the link is invalid."
          action={
            <Button asChild variant="outline">
              <Link to="/admin/products">
                <ArrowLeft className="mr-2 size-4" /> Back to products
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return <ProductForm initialData={product} />;
}
