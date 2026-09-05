import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

/**
 * Universal SHA-1 hasher using Web Crypto (available in Node 18+, Bun, Cloudflare Workers, and browser).
 */
async function sha1(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Resolves the authenticated staff user and an authenticated Supabase client
 * using the incoming server request context (Authorization header, cookies, or optional token).
 */
async function resolveStaffAuth(fallbackToken?: string) {
  const SUPABASE_URL = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const SUPABASE_KEY =
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ??
    process.env["SUPABASE_PUBLISHABLE_KEY"] ??
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Server configuration error: Missing Supabase URL or key.");
  }

  let token = fallbackToken?.trim() || "";

  // 1. Check request headers from TanStack Start server context
  try {
    const request = getRequest();
    if (request?.headers) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.replace("Bearer ", "").trim();
      }

      // 2. Check cookies if Bearer header is absent
      if (!token) {
        const cookieHeader = request.headers.get("cookie");
        if (cookieHeader) {
          const match =
            cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/) ||
            cookieHeader.match(/sb-access-token=([^;]+)/);
          if (match && match[1]) {
            try {
              const decoded = decodeURIComponent(match[1]);
              if (decoded.startsWith("base64-")) {
                const json = Buffer.from(decoded.replace("base64-", ""), "base64").toString(
                  "utf-8",
                );
                const parsed = JSON.parse(json);
                token = Array.isArray(parsed) ? parsed[0] : parsed?.access_token || "";
              } else {
                const parsed = JSON.parse(decoded);
                token = Array.isArray(parsed) ? parsed[0] : parsed?.access_token || decoded;
              }
            } catch {
              token = match[1];
            }
          }
        }
      }
    }
  } catch {
    // getRequest may throw if invoked outside of request lifecycle; token fallback used.
  }

  if (!token) {
    throw new Error("Unauthorized: Staff authentication required.");
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    throw new Error("Unauthorized: Invalid user session.");
  }

  // Verify staff access via existing database is_staff RPC
  const { data: isStaff, error: staffError } = await supabase.rpc("is_staff", {
    _user_id: userData.user.id,
  });

  if (staffError || !isStaff) {
    throw new Error("Forbidden: Staff access required.");
  }

  return { user: userData.user, supabase };
}

function getCloudinaryConfig() {
  const cloudName = process.env["CLOUDINARY_CLOUD_NAME"];
  const apiKey = process.env["CLOUDINARY_API_KEY"];
  const apiSecret = process.env["CLOUDINARY_API_SECRET"];

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary configuration is missing on server. Please ensure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set.",
    );
  }

  return { cloudName, apiKey, apiSecret };
}

/**
 * Secure upload signature generator for Cloudinary.
 * Validates staff session on server, signs folder + timestamp, returns credentials for direct upload.
 * CLOUDINARY_API_SECRET is NEVER returned to client.
 */
export const getCloudinaryUploadSignatureServerFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().optional() }).optional().parse(d))
  .handler(async ({ data }) => {
    await resolveStaffAuth(data?.token);

    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "phone-store-ormskirk/products";

    // Cloudinary signature: sort parameters alphabetically, append API secret, hash with SHA-1
    const stringToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = await sha1(stringToSign);

    return {
      timestamp,
      signature,
      apiKey,
      cloudName,
      folder,
    };
  });

/**
 * Secure image deletion server function.
 * 1. Authenticates staff
 * 2. Looks up product_images row by imageId from trusted database
 * 3. Deletes Cloudinary asset using trusted public_id + CLOUDINARY_API_SECRET
 * 4. Deletes product_images database row
 * 5. Normalizes remaining sort_order for ONLY that product (0, 1, 2...)
 */
export const deleteProductImageServerFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        imageId: z.string().uuid(),
        token: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabase } = await resolveStaffAuth(data.token);
    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();

    // 1. Read the trusted image record from DB
    const { data: imgRow, error: fetchErr } = await supabase
      .from("product_images")
      .select("id, product_id, public_id, sort_order")
      .eq("id", data.imageId)
      .maybeSingle();

    if (fetchErr) {
      throw new Error(`Failed to verify product image: ${fetchErr.message}`);
    }

    if (!imgRow) {
      // Row is already deleted or not found
      return { success: true, message: "Image already removed" };
    }

    const productId = imgRow.product_id;

    // 2. Destroy Cloudinary asset if public_id exists
    if (imgRow.public_id) {
      try {
        const timestamp = Math.floor(Date.now() / 1000);
        const stringToSign = `public_id=${imgRow.public_id}&timestamp=${timestamp}${apiSecret}`;
        const signature = await sha1(stringToSign);

        const formData = new URLSearchParams();
        formData.append("public_id", imgRow.public_id);
        formData.append("timestamp", String(timestamp));
        formData.append("api_key", apiKey);
        formData.append("signature", signature);

        const destroyUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`;
        const res = await fetch(destroyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData.toString(),
        });

        const destroyRes = (await res.json()) as { result?: string; error?: { message?: string } };
        if (destroyRes.result !== "ok" && destroyRes.result !== "not found") {
          console.warn(
            `[Cloudinary Destroy Warning] public_id=${imgRow.public_id} returned ${JSON.stringify(destroyRes)}`,
          );
        }
      } catch (err) {
        console.error("[Cloudinary Destroy Error]", err);
        // Do not permanently block DB cleanup if asset is missing or network hiccuped
      }
    }

    // 3. Delete DB row
    const { error: deleteErr } = await supabase
      .from("product_images")
      .delete()
      .eq("id", data.imageId);

    if (deleteErr) {
      throw new Error(`Failed to delete product image from database: ${deleteErr.message}`);
    }

    // 4. Normalize remaining sort_order for ONLY this product
    const { data: remaining, error: remErr } = await supabase
      .from("product_images")
      .select("id, sort_order")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (!remErr && remaining) {
      for (let i = 0; i < remaining.length; i++) {
        const item = remaining[i];
        if (!item) continue;
        if (item.sort_order !== i) {
          await supabase.from("product_images").update({ sort_order: i }).eq("id", item.id);
        }
      }
    }

    return { success: true };
  });

/**
 * Server-side cleanup function if direct Cloudinary upload succeeds but subsequent
 * product_images database insertion fails. Avoids orphan files in Cloudinary.
 */
export const cleanupCloudinaryAssetServerFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        publicId: z.string().min(1),
        token: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await resolveStaffAuth(data.token);
    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const stringToSign = `public_id=${data.publicId}&timestamp=${timestamp}${apiSecret}`;
      const signature = await sha1(stringToSign);

      const formData = new URLSearchParams();
      formData.append("public_id", data.publicId);
      formData.append("timestamp", String(timestamp));
      formData.append("api_key", apiKey);
      formData.append("signature", signature);

      const destroyUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`;
      const res = await fetch(destroyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      });

      const json = await res.json();
      return { success: true, result: json };
    } catch (err) {
      console.error("[Cloudinary Cleanup Error]", err);
      return { success: false };
    }
  });
