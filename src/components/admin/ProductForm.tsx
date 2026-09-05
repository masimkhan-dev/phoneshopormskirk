import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Globe,
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useState, useId } from "react";
import { toast } from "sonner";

import {
  CheckTile,
  ComboBox,
  Field,
  FieldGrid,
  MoneyInput,
  Section,
  SelectField,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { callRpc } from "@/lib/admin/db";
import { money, penceToPounds, poundsToPence } from "@/lib/admin/money";
import { BRANDS } from "@/lib/admin/options";
import { categoriesQuery, type AdminProduct } from "@/lib/admin/queries";
import {
  getCloudinaryUploadSignatureServerFn,
  deleteProductImageServerFn,
  cleanupCloudinaryAssetServerFn,
} from "@/lib/cloudinary.server";
import {
  getCloudinaryImageUrl,
  validateProductImageFile,
  uploadImageToCloudinary,
  MAX_PRODUCT_IMAGES,
} from "@/lib/cloudinary";
import type { ProductImage } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ProductFormProps = {
  initialData?: AdminProduct | null;
  onSuccess?: (product: AdminProduct) => void;
  onCancel?: () => void;
};

export function ProductForm({ initialData, onSuccess, onCancel }: ProductFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputId = useId();

  const isEdit = Boolean(initialData?.id);
  const { data: categories = [] } = useQuery(categoriesQuery);

  // Form fields
  const [name, setName] = useState(initialData?.name ?? "");
  const [categoryId, setCategoryId] = useState(initialData?.category_id ?? "");
  const [brand, setBrand] = useState(initialData?.brand ?? "");
  const [model, setModel] = useState(initialData?.model ?? "");
  const [sku, setSku] = useState(initialData?.sku ?? "");

  const [cost, setCost] = useState(initialData ? penceToPounds(initialData.cost_price_pence) : "");
  const [price, setPrice] = useState(initialData ? penceToPounds(initialData.price_pence) : "");
  const [openingQuantity, setOpeningQuantity] = useState(
    initialData ? String(initialData.quantity ?? 0) : "0",
  );
  const [reorderLevel, setReorderLevel] = useState(
    initialData ? String(initialData.reorder_level ?? 0) : "0",
  );

  const [shortDescription, setShortDescription] = useState(initialData?.short_description ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [publicVisible, setPublicVisible] = useState(initialData?.public_visible ?? true);
  const [featured, setFeatured] = useState(initialData?.featured ?? false);

  // SEO fields (collapsed by default)
  const [isSeoOpen, setIsSeoOpen] = useState(false);
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [seoTitle, setSeoTitle] = useState(initialData?.specs?.["seo_title"] ?? "");
  const [metaDescription, setMetaDescription] = useState(
    initialData?.specs?.["meta_description"] ?? "",
  );

  // Images state
  const [existingImages, setExistingImages] = useState<ProductImage[]>(
    initialData?.product_images
      ? [...initialData.product_images].sort((a, b) => a.sort_order - b.sort_order)
      : [],
  );
  const [pendingFiles, setPendingFiles] = useState<
    { id: string; file: File; previewUrl: string }[]
  >([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

  // Financial calculations
  const costPence = poundsToPence(cost);
  const pricePence = poundsToPence(price);
  const expectedProfit = pricePence - costPence;
  const marginPct = pricePence > 0 ? ((expectedProfit / pricePence) * 100).toFixed(1) : "0.0";

  // Category options
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  function handleSelectImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentTotal = existingImages.length + pendingFiles.length;
    const availableSlots = MAX_PRODUCT_IMAGES - currentTotal;

    if (availableSlots <= 0) {
      toast.error("Maximum 3 product images allowed.");
      e.target.value = "";
      return;
    }

    const toAdd: { id: string; file: File; previewUrl: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      if (toAdd.length >= availableSlots) {
        toast.error("Maximum 3 product images allowed.");
        break;
      }
      const file = files[i];
      if (!file) continue;
      const validation = validateProductImageFile(file);
      if (!validation.valid) {
        toast.error(validation.error || "Invalid image file.");
        continue;
      }
      toAdd.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (toAdd.length > 0) {
      setPendingFiles((prev) => [...prev, ...toAdd]);
    }
    e.target.value = "";
  }

  function handleRemovePending(id: string) {
    setPendingFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }

  async function handleDeleteExisting(image: ProductImage) {
    if (!confirm("Are you sure you want to delete this image?")) return;
    setDeletingImageId(image.id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      await deleteProductImageServerFn({ data: { imageId: image.id, token } });

      setExistingImages((prev) => {
        const remaining = prev.filter((img) => img.id !== image.id);
        return remaining.map((img, idx) => ({ ...img, sort_order: idx }));
      });
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Image deleted successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete image.";
      toast.error(msg);
    } finally {
      setDeletingImageId(null);
    }
  }

  const saveProduct = useMutation({
    mutationFn: async () => {
      if (!name.trim()) {
        throw new Error("Please enter a product name.");
      }
      if (!categoryId) {
        throw new Error("Please select a product category.");
      }
      if (pricePence <= 0) {
        throw new Error("Please enter a valid selling price greater than £0.00.");
      }

      // Preserve existing specs and merge SEO metadata
      const currentSpecs: Record<string, string> = { ...(initialData?.specs ?? {}) };
      if (seoTitle.trim()) {
        currentSpecs["seo_title"] = seoTitle.trim();
      } else {
        delete currentSpecs["seo_title"];
      }
      if (metaDescription.trim()) {
        currentSpecs["meta_description"] = metaDescription.trim();
      } else {
        delete currentSpecs["meta_description"];
      }

      const p: Record<string, unknown> = {
        name: name.trim(),
        sku: sku.trim() || null,
        category_id: categoryId || null,
        brand: brand.trim() || null,
        model: model.trim() || null,
        short_description: shortDescription.trim() || null,
        description: description.trim() || null,
        specs: currentSpecs,
        cost_price_pence: costPence,
        price_pence: pricePence,
        reorder_level: Math.max(0, Number(reorderLevel || 0)),
        public_visible: Boolean(publicVisible),
        featured: Boolean(featured),
      };

      if (slug.trim()) {
        p["slug"] = slug.trim();
      }

      if (isEdit && initialData?.id) {
        p["id"] = initialData.id;
        // STOCK SAFETY: Do not pass opening_quantity on edit to protect existing stock
      } else {
        // Create mode: apply opening quantity
        const openQty = Math.max(0, Number(openingQuantity.replace(/[^0-9]/g, "") || 0));
        p["opening_quantity"] = openQty;
      }

      // 1. Save product record via authoritative RPC
      const saved = await callRpc<AdminProduct>("save_product", { p });
      if (!saved?.id) {
        throw new Error("Failed to obtain saved product identifier from database.");
      }

      // 2. Direct browser upload for any newly selected Cloudinary images
      if (pendingFiles.length > 0) {
        setIsUploadingImages(true);
        let uploadFailedCount = 0;
        let startingOrder = existingImages.length;

        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData.session?.access_token;

          for (const item of pendingFiles) {
            let uploadedAsset: { secure_url: string; public_id: string } | null = null;
            try {
              const sig = await getCloudinaryUploadSignatureServerFn({ data: { token } });
              uploadedAsset = await uploadImageToCloudinary(item.file, sig);

              const { error: dbError } = await supabase.from("product_images").insert({
                product_id: saved.id,
                url: uploadedAsset.secure_url,
                public_id: uploadedAsset.public_id,
                alt_text: `${saved.name || "Product"} - Phone Store Ormskirk`,
                sort_order: startingOrder,
              });

              if (dbError) {
                console.error("[product_images insert error]", dbError);
                if (uploadedAsset.public_id) {
                  await cleanupCloudinaryAssetServerFn({
                    data: { publicId: uploadedAsset.public_id, token },
                  }).catch((cleanErr) =>
                    console.error("Cloudinary orphan cleanup failed:", cleanErr),
                  );
                }
                uploadFailedCount++;
                toast.warning(
                  `Saved product, but image ${item.file.name} metadata failed. Cleaned up Cloudinary file.`,
                );
              } else {
                startingOrder++;
              }
            } catch (upErr) {
              console.error("[Cloudinary upload error]", upErr);
              uploadFailedCount++;
              toast.warning(
                `Upload failed for ${item.file.name}: ${upErr instanceof Error ? upErr.message : "Network error"}`,
              );
            }
          }

          if (uploadFailedCount > 0 && uploadFailedCount === pendingFiles.length) {
            toast.error(
              "Product saved, but image uploads failed. You can add images in edit mode.",
            );
          }
        } finally {
          setIsUploadingImages(false);
          pendingFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
          setPendingFiles([]);
        }
      }

      return saved;
    },
    onSuccess: (saved) => {
      toast.success(
        isEdit ? "Product updated successfully." : "Product added to catalogue successfully.",
      );
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      if (onSuccess) {
        onSuccess(saved);
      } else {
        navigate({ to: "/admin/products" });
      }
    },
    onError: (error: Error) => toast.error(error.message || "Failed to save product."),
  });

  const isBusy = saveProduct.isPending || isUploadingImages;

  const saveLabel = isUploadingImages
    ? "Uploading images…"
    : saveProduct.isPending
      ? "Saving…"
      : isEdit
        ? "Save changes"
        : "Create product";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        saveProduct.mutate();
      }}
      className="pb-24"
    >
      {/* ── STICKY TOP BAR ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-admin-border bg-admin-panel/95 px-4 py-3 shadow-sm backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={onCancel ?? (() => navigate({ to: "/admin/products" }))}
          >
            <ArrowLeft className="mr-1.5 size-4" /> Back
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-extrabold tracking-tight text-foreground">
              {isEdit ? `Edit: ${initialData?.name}` : "New Website Product"}
            </h1>
            <p className="text-[0.7rem] leading-tight text-muted-foreground">
              {isEdit
                ? "Update details, media, and publishing"
                : "Full catalogue listing — images, description, SEO"}
            </p>
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {pricePence > 0 && (
            <div className="hidden sm:flex items-center gap-2 rounded-lg border border-admin-border bg-surface/60 px-3 py-1.5 text-xs font-semibold">
              <span className="text-muted-foreground">{money(pricePence)}</span>
              {costPence > 0 && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span
                    className={
                      expectedProfit >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-destructive"
                    }
                  >
                    {money(expectedProfit)} ({marginPct}%)
                  </span>
                </>
              )}
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isBusy}
            onClick={onCancel ?? (() => navigate({ to: "/admin/products" }))}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isBusy || !name.trim()}
            className="font-bold shadow-soft"
          >
            {isBusy && <Loader2 className="mr-2 size-3.5 animate-spin" />}
            {saveLabel}
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-4">
        {/* ── SECTION 1: BASIC INFORMATION ───────────────────────────── */}
        <Section title="Basic Information">
          <div className="p-4">
            <FieldGrid cols={2}>
              <Field label="Product name *" htmlFor="prod-name">
                <Input
                  id="prod-name"
                  className="h-9 font-medium"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. 20W USB-C Fast Charger"
                  autoFocus={!isEdit}
                  required
                />
              </Field>

              <Field label="Category *" htmlFor="prod-cat">
                <SelectField
                  id="prod-cat"
                  value={categoryId}
                  onChange={setCategoryId}
                  options={categoryOptions}
                  placeholder={
                    categories.length === 0 ? "No categories found" : "Select a category…"
                  }
                />
              </Field>

              <Field label="Brand (optional)" htmlFor="prod-brand">
                <ComboBox id="prod-brand" value={brand} onChange={setBrand} options={BRANDS} />
              </Field>

              <Field label="Model (optional)" htmlFor="prod-model">
                <Input
                  id="prod-model"
                  className="h-9"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. Universal / MagSafe / iPhone 15"
                />
              </Field>

              <Field
                label="SKU / Barcode (optional)"
                htmlFor="prod-sku"
                hint="Scan barcode or leave blank to auto-generate"
              >
                <Input
                  id="prod-sku"
                  className="h-9 font-mono text-xs"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Scan or type barcode"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                    }
                  }}
                />
              </Field>
            </FieldGrid>
          </div>
        </Section>

        {/* ── SECTION 2: PRICING & INVENTORY ─────────────────────────── */}
        <Section title="Pricing & Inventory">
          <div className="p-4 space-y-4">
            <FieldGrid cols={2}>
              <Field label="Cost price" htmlFor="prod-cost" hint="What the shop pays for this item">
                <MoneyInput id="prod-cost" value={cost} onChange={setCost} placeholder="0.00" />
              </Field>

              <Field label="Selling price *" htmlFor="prod-price" hint="Retail counter price">
                <MoneyInput
                  id="prod-price"
                  value={price}
                  onChange={setPrice}
                  placeholder="0.00"
                  required
                />
              </Field>

              {/* STOCK SAFETY LOGIC */}
              {!isEdit ? (
                <Field
                  label="Opening stock quantity"
                  htmlFor="prod-opening-qty"
                  hint="Current units on shelf to initialize stock"
                >
                  <Input
                    id="prod-opening-qty"
                    className="h-9 tabular-nums font-semibold"
                    inputMode="numeric"
                    value={openingQuantity}
                    onChange={(e) => setOpeningQuantity(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="0"
                  />
                </Field>
              ) : (
                <div className="flex flex-col justify-center rounded-lg border border-admin-border bg-surface/40 px-3 py-2.5">
                  <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    Current stock
                  </span>
                  <div className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-foreground tabular-nums">
                      {initialData?.quantity ?? 0}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">units</span>
                  </div>
                  <p className="mt-1 text-[0.67rem] leading-tight text-muted-foreground">
                    Adjust via stock controls — edits never alter this count.
                  </p>
                </div>
              )}

              <Field
                label="Reorder warning level"
                htmlFor="prod-reorder"
                hint="Alert when stock hits this number"
              >
                <Input
                  id="prod-reorder"
                  className="h-9 tabular-nums"
                  inputMode="numeric"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="0"
                />
              </Field>
            </FieldGrid>

            {pricePence > 0 && costPence > 0 && (
              <div className="flex flex-wrap items-center gap-4 rounded-lg border border-admin-border bg-surface/50 px-3 py-2 text-xs">
                <span className="text-muted-foreground">
                  Selling at{" "}
                  <strong className="font-bold text-foreground">{money(pricePence)}</strong>
                </span>
                <span className="text-muted-foreground">
                  Cost <strong className="font-bold text-foreground">{money(costPence)}</strong>
                </span>
                <span
                  className={cn(
                    "font-bold",
                    expectedProfit >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-destructive",
                  )}
                >
                  Profit {money(expectedProfit)} ({marginPct}% margin)
                </span>
              </div>
            )}
          </div>
        </Section>

        {/* ── SECTION 3: PRODUCT IMAGES ──────────────────────────────── */}
        <Section title="Product Images">
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Up to 3 images · JPG, PNG, WebP · max 5 MB each · First image is primary
              </p>
              {existingImages.length + pendingFiles.length < MAX_PRODUCT_IMAGES && (
                <label
                  htmlFor={fileInputId}
                  className={cn(
                    "press inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-admin-border bg-surface px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted transition-colors",
                    isBusy && "pointer-events-none opacity-50",
                  )}
                >
                  <Plus className="size-3.5" />
                  Add images
                  <input
                    id={fileInputId}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    disabled={isBusy}
                    onChange={handleSelectImages}
                  />
                </label>
              )}
            </div>

            {existingImages.length === 0 && pendingFiles.length === 0 ? (
              <label
                htmlFor={fileInputId}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-admin-border/80 bg-surface/30 py-10 text-center cursor-pointer transition-colors hover:border-primary/40 hover:bg-tint/30",
                  isBusy && "pointer-events-none opacity-50",
                )}
              >
                <div className="grid size-10 place-items-center rounded-full bg-muted">
                  <ImageIcon className="size-5 text-muted-foreground/60" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Click to add photos</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Products save without images — add up to 3 to showcase online
                  </p>
                </div>
              </label>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {existingImages.map((img, idx) => (
                  <div
                    key={img.id}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-admin-border bg-surface shadow-xs"
                  >
                    <img
                      src={getCloudinaryImageUrl(img.url, "CARD")}
                      alt={img.alt_text ?? "Product thumbnail"}
                      className="size-full object-cover"
                    />
                    {img.sort_order === 0 ? (
                      <span className="absolute left-2 top-2 rounded bg-primary px-1.5 py-0.5 text-[0.65rem] font-bold text-primary-foreground shadow-xs">
                        Primary
                      </span>
                    ) : (
                      <span className="absolute left-2 top-2 rounded bg-background/80 px-1.5 py-0.5 text-[0.65rem] font-medium text-foreground backdrop-blur-xs">
                        #{idx + 1}
                      </span>
                    )}
                    <button
                      type="button"
                      title="Delete image"
                      disabled={deletingImageId === img.id || isBusy}
                      onClick={() => handleDeleteExisting(img)}
                      className="absolute right-2 top-2 rounded-full bg-destructive/90 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive focus:opacity-100 disabled:opacity-50"
                    >
                      {deletingImageId === img.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </button>
                  </div>
                ))}

                {pendingFiles.map((item, idx) => (
                  <div
                    key={item.id}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-primary/40 bg-surface shadow-xs"
                  >
                    <img src={item.previewUrl} alt="Preview" className="size-full object-cover" />
                    <span className="absolute left-2 top-2 rounded bg-emerald-600 px-1.5 py-0.5 text-[0.65rem] font-bold text-white shadow-xs">
                      {existingImages.length === 0 && idx === 0 ? "Primary" : "New"}
                    </span>
                    <button
                      type="button"
                      title="Remove file"
                      disabled={isBusy}
                      onClick={() => handleRemovePending(item.id)}
                      className="absolute right-2 top-2 rounded-full bg-foreground/85 p-1.5 text-background hover:bg-foreground transition-colors"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}

                {existingImages.length + pendingFiles.length < MAX_PRODUCT_IMAGES && (
                  <label
                    htmlFor={fileInputId}
                    className={cn(
                      "flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-admin-border/70 bg-surface/30 text-center transition-colors hover:border-primary/40 hover:bg-tint/20",
                      isBusy && "pointer-events-none opacity-50",
                    )}
                  >
                    <Plus className="size-5 text-muted-foreground/50" />
                    <span className="text-[0.65rem] font-semibold text-muted-foreground">Add</span>
                  </label>
                )}
              </div>
            )}

            {isUploadingImages && (
              <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">
                <Loader2 className="size-4 animate-spin shrink-0" />
                <span>Uploading images to Cloudinary…</span>
              </div>
            )}
          </div>
        </Section>

        {/* ── SECTION 4: WEBSITE CONTENT ─────────────────────────────── */}
        <Section title="Website Content">
          <div className="p-4 space-y-4">
            <Field
              label="Short summary"
              htmlFor="prod-short-desc"
              hint="1–2 sentences shown on product cards and search results"
            >
              <Input
                id="prod-short-desc"
                className="h-9"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="e.g. Certified 20W fast charging plug compatible with iPhone and iPad."
              />
            </Field>

            <Field
              label="Full description"
              htmlFor="prod-desc"
              hint="Detailed specs, compatibility, and features for the product page"
            >
              <Textarea
                id="prod-desc"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide complete product details, compatibility, what's in the box, and warranty information…"
                className="resize-y text-sm leading-relaxed"
              />
            </Field>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Visibility
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <CheckTile
                  checked={publicVisible}
                  onChange={(v) => {
                    setPublicVisible(v);
                    if (!v) setFeatured(false);
                  }}
                  label="Publish on website"
                />
                <CheckTile
                  checked={featured}
                  disabled={!publicVisible}
                  onChange={setFeatured}
                  label="Feature on homepage"
                />
              </div>
              {!publicVisible && (
                <p className="mt-2 text-[0.72rem] leading-snug text-muted-foreground">
                  Website publishing is <strong>OFF</strong>. This item is still available at the
                  counter via Direct Sale.
                </p>
              )}
            </div>
          </div>
        </Section>

        {/* ── SECTION 5: SEO (COLLAPSED) ─────────────────────────────── */}
        <div className="admin-card overflow-hidden">
          <button
            type="button"
            onClick={() => setIsSeoOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface/60"
            aria-expanded={isSeoOpen}
          >
            <div className="flex items-center gap-2.5">
              <Globe className="size-4 shrink-0 text-primary" />
              <div>
                <span className="text-sm font-bold text-foreground">SEO &amp; Search</span>
                <p className="text-[0.7rem] leading-tight text-muted-foreground">
                  Optional — auto-generated from product name if left blank
                </p>
              </div>
            </div>
            <div className="shrink-0 rounded border border-admin-border p-1 text-muted-foreground">
              {isSeoOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </div>
          </button>

          {isSeoOpen && (
            <div className="border-t border-admin-border p-4 space-y-4">
              <Field
                label="URL Slug"
                htmlFor="prod-slug"
                hint="Leave blank to auto-generate from product name"
              >
                <Input
                  id="prod-slug"
                  className="h-9 font-mono text-xs"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder={
                    name ? name.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "product-slug"
                  }
                />
              </Field>

              <Field
                label="SEO Title"
                htmlFor="prod-seo-title"
                hint={`Default: "${name || "Product"} | Phone Store Ormskirk"`}
              >
                <Input
                  id="prod-seo-title"
                  className="h-9"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder={`${name || "Product"} | Phone Store Ormskirk`}
                />
              </Field>

              <Field
                label="Meta Description"
                htmlFor="prod-meta-desc"
                hint="Summary for Google and search engine previews (150–160 chars)"
              >
                <Textarea
                  id="prod-meta-desc"
                  rows={2}
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder={
                    shortDescription ||
                    `${name || "Product"} available at Phone Store Ormskirk. Reserve over WhatsApp or collect in store.`
                  }
                  className="text-xs leading-relaxed"
                />
              </Field>
            </div>
          )}
        </div>
      </div>
      {/* end max-w-5xl */}

      {/* ── FIXED BOTTOM ACTION BAR ──────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-end gap-3 border-t border-admin-border bg-admin-panel/95 px-4 py-3 shadow-[0_-1px_3px_oklch(0.18_0_0/6%)] backdrop-blur-md sm:px-6 lg:px-8">
        {pricePence > 0 && (
          <div className="mr-auto hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              <strong className="font-bold text-foreground">{money(pricePence)}</strong> selling
              price
            </span>
            {costPence > 0 && (
              <span
                className={cn(
                  "font-bold",
                  expectedProfit >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-destructive",
                )}
              >
                {money(expectedProfit)} profit ({marginPct}%)
              </span>
            )}
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isBusy}
          onClick={onCancel ?? (() => navigate({ to: "/admin/products" }))}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isBusy || !name.trim()} className="font-bold shadow-soft">
          {isBusy && <Loader2 className="mr-2 size-3.5 animate-spin" />}
          {saveLabel}
        </Button>
      </div>
    </form>
  );
}
