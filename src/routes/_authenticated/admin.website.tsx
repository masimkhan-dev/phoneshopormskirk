import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ArrowDown, ArrowUp, Edit2, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  EmptyState,
  PageHeader,
  Section,
  StatusBadge,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { ukDate } from "@/lib/admin/money";
import {
  getCloudinaryImageUrl,
  validateProductImageFile,
  uploadImageToCloudinary,
} from "@/lib/cloudinary";
import {
  cleanupCloudinaryAssetServerFn,
  getCloudinaryUploadSignatureServerFn,
} from "@/lib/cloudinary.server";
import {
  adminGalleryQuery,
  GALLERY_CATEGORIES,
  type GalleryCategory,
  type GalleryItem,
} from "@/lib/gallery";

export const Route = createFileRoute("/_authenticated/admin/website")({
  component: WebsiteContent,
});

type Review = {
  id: string;
  author_name: string;
  rating: number | null;
  quote: string;
  source: string;
  reviewed_on: string | null;
  public_visible: boolean;
};

type Faq = {
  id: string;
  question: string;
  answer: string;
  topic: string;
  public_visible: boolean;
};

function WebsiteContent() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"gallery" | "reviews" | "faqs">("gallery");

  // Gallery queries & modal states
  const galleryQuery = useQuery(adminGalleryQuery());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [category, setCategory] = useState<GalleryCategory>("Shop & Storefront");
  const [featured, setFeatured] = useState(true);
  const [visible, setVisible] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Reviews and FAQ queries
  const reviews = useQuery({
    queryKey: ["admin", "reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_reviews")
        .select("id,author_name,rating,quote,source,reviewed_on,public_visible")
        .order("sort_order");
      if (error) throw new Error(error.message);
      return (data ?? []) as Review[];
    },
  });

  const faqs = useQuery({
    queryKey: ["admin", "faqs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faqs")
        .select("id,question,answer,topic,public_visible")
        .order("sort_order");
      if (error) throw new Error(error.message);
      return (data ?? []) as Faq[];
    },
  });

  const toggle = useMutation({
    mutationFn: async ({
      table,
      id,
      next,
    }: {
      table: "customer_reviews" | "faqs";
      id: string;
      next: boolean;
    }) => {
      const { error } = await supabase.from(table).update({ public_visible: next }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Website content updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "faqs"] });
      queryClient.invalidateQueries({ queryKey: ["customer-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Open Dialog for Add New
  function handleOpenAdd() {
    setEditingItem(null);
    setTitle("");
    setAltText("");
    setCategory("Shop & Storefront");
    setFeatured(true);
    setVisible(true);
    setPendingFile(null);
    setPreviewUrl(null);
    setIsDialogOpen(true);
  }

  // Open Dialog for Edit
  function handleOpenEdit(item: GalleryItem) {
    setEditingItem(item);
    setTitle(item.title);
    setAltText(item.alt_text);
    setCategory(item.category as GalleryCategory);
    setFeatured(item.featured);
    setVisible(item.visible);
    setPendingFile(null);
    setPreviewUrl(item.image_url);
    setIsDialogOpen(true);
  }

  // Handle File Select
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateProductImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid file format or size.");
      return;
    }

    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  // Save (Create or Update)
  async function handleSaveGallery() {
    if (!title.trim()) {
      toast.error("Please enter a photo title.");
      return;
    }
    if (!altText.trim()) {
      toast.error("Please enter descriptive alt text.");
      return;
    }

    setIsSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (editingItem) {
        // Edit existing metadata
        const { error } = await supabase
          .from("gallery_items")
          .update({
            title: title.trim(),
            alt_text: altText.trim(),
            category,
            featured,
            visible,
          })
          .eq("id", editingItem.id);

        if (error) throw new Error(error.message);
        toast.success("Gallery photo updated successfully.");
      } else {
        // Create new
        if (!pendingFile) {
          throw new Error("Please select an image file to upload.");
        }

        // 1. Get upload signature
        const sig = await getCloudinaryUploadSignatureServerFn({ data: { token } });

        // 2. Direct browser upload to Cloudinary
        const uploadResult = await uploadImageToCloudinary(pendingFile, sig);

        // Calculate next sort order
        const currentItems = galleryQuery.data ?? [];
        const nextOrder =
          currentItems.length > 0 ? Math.max(...currentItems.map((i) => i.sort_order)) + 1 : 1;

        // 3. Save metadata to Supabase
        const { error: dbError } = await supabase.from("gallery_items").insert({
          title: title.trim(),
          alt_text: altText.trim(),
          category,
          image_url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
          featured,
          visible,
          sort_order: nextOrder,
        });

        if (dbError) {
          console.error("Database insert failed, cleaning Cloudinary asset:", dbError);
          // Cleanup orphan Cloudinary asset
          await cleanupCloudinaryAssetServerFn({
            data: { publicId: uploadResult.public_id, token },
          }).catch((cleanErr) => console.error("Cloudinary cleanup error:", cleanErr));

          throw new Error(`Failed to save image metadata: ${dbError.message}`);
        }

        toast.success("Photo uploaded to gallery successfully.");
      }

      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "gallery"] });
      queryClient.invalidateQueries({ queryKey: ["gallery"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save photo.";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  }

  // Delete safely
  async function handleDeleteGallery(item: GalleryItem) {
    if (!confirm(`Are you sure you want to delete "${item.title}"?`)) return;

    setIsDeletingId(item.id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      // 1. If item has Cloudinary public_id, delete asset first
      if (item.public_id) {
        try {
          await cleanupCloudinaryAssetServerFn({
            data: { publicId: item.public_id, token },
          });
        } catch (cloudErr) {
          console.error("Cloudinary delete failed:", cloudErr);
          throw new Error("Failed to delete image from Cloudinary. Database record preserved.");
        }
      }

      // 2. Delete database row
      const { error: dbErr } = await supabase.from("gallery_items").delete().eq("id", item.id);

      if (dbErr) throw new Error(dbErr.message);

      toast.success("Gallery photo deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin", "gallery"] });
      queryClient.invalidateQueries({ queryKey: ["gallery"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete photo.";
      toast.error(msg);
    } finally {
      setIsDeletingId(null);
    }
  }

  // Toggle Featured
  async function handleToggleFeatured(item: GalleryItem) {
    try {
      const { error } = await supabase
        .from("gallery_items")
        .update({ featured: !item.featured })
        .eq("id", item.id);

      if (error) throw new Error(error.message);
      queryClient.invalidateQueries({ queryKey: ["admin", "gallery"] });
      queryClient.invalidateQueries({ queryKey: ["gallery"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update featured state.";
      toast.error(msg);
    }
  }

  // Toggle Visibility
  async function handleToggleVisible(item: GalleryItem) {
    try {
      const { error } = await supabase
        .from("gallery_items")
        .update({ visible: !item.visible })
        .eq("id", item.id);

      if (error) throw new Error(error.message);
      queryClient.invalidateQueries({ queryKey: ["admin", "gallery"] });
      queryClient.invalidateQueries({ queryKey: ["gallery"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update visibility.";
      toast.error(msg);
    }
  }

  // Reorder (Move Up / Down)
  async function handleMove(index: number, direction: "up" | "down") {
    const list = galleryQuery.data;
    if (!list) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const currentItem = list[index];
    const targetItem = list[targetIndex];
    if (!currentItem || !targetItem) return;

    try {
      const currentOrder = currentItem.sort_order;
      const targetOrder = targetItem.sort_order;

      // Swap sort_order
      const [res1, res2] = await Promise.all([
        supabase.from("gallery_items").update({ sort_order: targetOrder }).eq("id", currentItem.id),
        supabase.from("gallery_items").update({ sort_order: currentOrder }).eq("id", targetItem.id),
      ]);

      if (res1.error) throw new Error(res1.error.message);
      if (res2.error) throw new Error(res2.error.message);

      queryClient.invalidateQueries({ queryKey: ["admin", "gallery"] });
      queryClient.invalidateQueries({ queryKey: ["gallery"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update sort order.";
      toast.error(msg);
    }
  }

  const isDbError = Boolean(galleryQuery.error);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Website content"
        description="Manage your shop photos, customer reviews, and frequently asked questions."
      />

      <div className="flex gap-2">
        {(["gallery", "reviews", "faqs"] as const).map((t) => (
          <Button
            key={t}
            size="sm"
            variant={tab === t ? "default" : "outline"}
            onClick={() => setTab(t)}
          >
            {t === "gallery" ? "Shop gallery" : t === "reviews" ? "Customer reviews" : "Questions"}
          </Button>
        ))}
      </div>

      {tab === "gallery" ? (
        <Section
          title="Shop photos & gallery"
          action={
            <Button
              size="sm"
              onClick={handleOpenAdd}
              disabled={isDbError || galleryQuery.isLoading}
            >
              <ImagePlus className="mr-1.5 size-4" />
              Upload photo
            </Button>
          }
        >
          <p className="mb-4 text-xs text-muted-foreground">
            Photos displayed in the full /gallery page and homepage slideshow. Homepage shows up to
            the first 8 featured photos.
          </p>
          {/* Database Setup Warning Banner */}
          {isDbError && (
            <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-2xs dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1 text-sm">
                  <p className="font-bold">Gallery database setup is not available yet.</p>
                  <p className="text-xs leading-relaxed opacity-90">
                    The{" "}
                    <code className="rounded bg-amber-200/60 px-1 py-0.5 font-mono text-[0.8rem] dark:bg-amber-900/60">
                      gallery_items
                    </code>{" "}
                    table was not found in Supabase. Please execute the migration{" "}
                    <code className="rounded bg-amber-200/60 px-1 py-0.5 font-mono text-[0.8rem] dark:bg-amber-900/60">
                      supabase/migrations/20260915220000_create_gallery_items.sql
                    </code>{" "}
                    in your Supabase SQL Editor.
                  </p>
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    *Public pages are safely displaying bundled real store seed photos. Admin
                    uploads, edits, and deletions are disabled until migration is applied.*
                  </p>
                </div>
              </div>
            </div>
          )}

          {galleryQuery.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : galleryQuery.data?.length ? (
            <TableShell>
              <thead>
                <tr>
                  <Th>Image</Th>
                  <Th>Title & Alt text</Th>
                  <Th>Category</Th>
                  <Th>Featured (Homepage)</Th>
                  <Th>Website</Th>
                  <Th>Order</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {galleryQuery.data.map((item, index) => (
                  <tr key={item.id} className="hover:bg-surface">
                    {/* Thumbnail */}
                    <Td className="w-16">
                      <div className="size-12 overflow-hidden rounded-lg border border-border bg-muted">
                        <img
                          src={getCloudinaryImageUrl(item.image_url, "THUMBNAIL")}
                          alt={item.alt_text}
                          className="size-full object-cover"
                        />
                      </div>
                    </Td>

                    {/* Title & Alt */}
                    <Td className="max-w-xs">
                      <p className="font-bold text-foreground line-clamp-1">{item.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{item.alt_text}</p>
                    </Td>

                    {/* Category */}
                    <Td>
                      <span className="rounded bg-surface px-2 py-0.5 text-xs font-medium text-foreground">
                        {item.category}
                      </span>
                    </Td>

                    {/* Featured Switch */}
                    <Td>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={item.featured}
                          onCheckedChange={() => handleToggleFeatured(item)}
                          aria-label={`Toggle featured for ${item.title}`}
                        />
                        <span className="text-xs text-muted-foreground">
                          {item.featured ? "Featured" : "No"}
                        </span>
                      </div>
                    </Td>

                    {/* Visibility Switch */}
                    <Td>
                      <StatusBadge tone={item.visible ? "green" : "neutral"}>
                        {item.visible ? "Shown" : "Hidden"}
                      </StatusBadge>
                    </Td>

                    {/* Reorder Buttons */}
                    <Td>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          disabled={index === 0}
                          onClick={() => handleMove(index, "up")}
                          aria-label={`Move ${item.title} up`}
                        >
                          <ArrowUp className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          disabled={index === (galleryQuery.data?.length ?? 0) - 1}
                          onClick={() => handleMove(index, "down")}
                          aria-label={`Move ${item.title} down`}
                        >
                          <ArrowDown className="size-3.5" />
                        </Button>
                      </div>
                    </Td>

                    {/* Actions */}
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleVisible(item)}
                        >
                          {item.visible ? "Hide" : "Show"}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          onClick={() => handleOpenEdit(item)}
                          aria-label={`Edit ${item.title}`}
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-destructive hover:bg-destructive/10"
                          disabled={isDeletingId === item.id}
                          onClick={() => handleDeleteGallery(item)}
                          aria-label={`Delete ${item.title}`}
                        >
                          {isDeletingId === item.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          ) : (
            <EmptyState
              title="No photos in gallery yet."
              description="Click 'Upload photo' above to add your first real shop photo."
            />
          )}
        </Section>
      ) : tab === "reviews" ? (
        <Section title="Customer reviews">
          {reviews.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : reviews.data?.length ? (
            <TableShell>
              <thead>
                <tr>
                  <Th>Customer</Th>
                  <Th>Review</Th>
                  <Th>Rating</Th>
                  <Th>Date</Th>
                  <Th>Website</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {reviews.data.map((r) => (
                  <tr key={r.id} className="hover:bg-surface">
                    <Td className="font-bold">{r.author_name}</Td>
                    <Td className="max-w-md text-muted-foreground">{r.quote}</Td>
                    <Td>{r.rating ? `${r.rating}/5` : "—"}</Td>
                    <Td className="text-muted-foreground">
                      {r.reviewed_on ? ukDate(r.reviewed_on) : "—"}
                    </Td>
                    <Td>
                      <StatusBadge tone={r.public_visible ? "green" : "neutral"}>
                        {r.public_visible ? "Shown" : "Hidden"}
                      </StatusBadge>
                    </Td>
                    <Td className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          toggle.mutate({
                            table: "customer_reviews",
                            id: r.id,
                            next: !r.public_visible,
                          })
                        }
                      >
                        {r.public_visible ? "Hide" : "Show"}
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          ) : (
            <EmptyState title="No reviews saved yet." />
          )}
        </Section>
      ) : (
        <Section title="Questions and answers">
          {faqs.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : faqs.data?.length ? (
            <TableShell>
              <thead>
                <tr>
                  <Th>Question</Th>
                  <Th>Topic</Th>
                  <Th>Website</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {faqs.data.map((f) => (
                  <tr key={f.id} className="hover:bg-surface">
                    <Td>
                      <span className="font-bold">{f.question}</span>
                      <span className="mt-0.5 block max-w-xl text-xs text-muted-foreground">
                        {f.answer}
                      </span>
                    </Td>
                    <Td className="capitalize text-muted-foreground">
                      {f.topic.replace(/_/g, " ").toLowerCase()}
                    </Td>
                    <Td>
                      <StatusBadge tone={f.public_visible ? "green" : "neutral"}>
                        {f.public_visible ? "Shown" : "Hidden"}
                      </StatusBadge>
                    </Td>
                    <Td className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          toggle.mutate({ table: "faqs", id: f.id, next: !f.public_visible })
                        }
                      >
                        {f.public_visible ? "Hide" : "Show"}
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          ) : (
            <EmptyState title="No questions saved yet." />
          )}
        </Section>
      )}

      {/* Upload / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit photo details" : "Upload photo to gallery"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update the caption, category or display flags for this photo."
                : "Select an image file and provide natural, descriptive text."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Image Preview & File Input */}
            {!editingItem && (
              <div className="space-y-2">
                <Label htmlFor="gallery-file">Image file</Label>
                <Input
                  id="gallery-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                />
                {previewUrl && (
                  <div className="mt-2 aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-muted">
                    <img src={previewUrl} alt="Preview" className="size-full object-cover" />
                  </div>
                )}
              </div>
            )}

            {editingItem && previewUrl && (
              <div className="aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-muted">
                <img
                  src={getCloudinaryImageUrl(previewUrl, "GALLERY")}
                  alt={title}
                  className="size-full object-cover"
                />
              </div>
            )}

            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="gallery-title">Photo title</Label>
              <Input
                id="gallery-title"
                placeholder="e.g. Phone Store Ormskirk Storefront"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Alt text */}
            <div className="space-y-1.5">
              <Label htmlFor="gallery-alt">Alt text (for accessibility & SEO)</Label>
              <Input
                id="gallery-alt"
                placeholder="e.g. Front entrance of Phone Store Ormskirk on Aughton Street"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
              />
              <p className="text-[0.7rem] text-muted-foreground">
                Keep it concise and factual. Avoid repeating keywords.
              </p>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="gallery-category">Category</Label>
              <select
                id="gallery-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as GalleryCategory)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                {GALLERY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggles */}
            <div className="flex items-center justify-between border-t border-border pt-3">
              <div>
                <Label htmlFor="gallery-featured" className="cursor-pointer">
                  Featured on Homepage
                </Label>
                <p className="text-[0.7rem] text-muted-foreground">
                  Homepage shows up to the first 8 featured items.
                </p>
              </div>
              <Switch id="gallery-featured" checked={featured} onCheckedChange={setFeatured} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="gallery-visible" className="cursor-pointer">
                  Visible on Website
                </Label>
                <p className="text-[0.7rem] text-muted-foreground">
                  Publicly visible on /gallery and homepage.
                </p>
              </div>
              <Switch id="gallery-visible" checked={visible} onCheckedChange={setVisible} />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveGallery} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              {editingItem ? "Save changes" : "Upload & Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
