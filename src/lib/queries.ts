import { queryOptions } from "@tanstack/react-query";

import {
  getBusinessSettings,
  getCategories,
  getFaqs,
  getProductBySlug,
  getProducts,
  getRepairServices,
  getReviews,
} from "./site.functions";

export const businessQuery = () =>
  queryOptions({
    queryKey: ["business-settings"],
    queryFn: () => getBusinessSettings(),
    staleTime: 5 * 60 * 1000,
  });

export const categoriesQuery = () =>
  queryOptions({
    queryKey: ["product-categories"],
    queryFn: () => getCategories(),
    staleTime: 5 * 60 * 1000,
  });

export const productsQuery = () =>
  queryOptions({
    queryKey: ["products"],
    queryFn: () => getProducts(),
    staleTime: 60 * 1000,
  });

export const productQuery = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: () => getProductBySlug({ data: { slug } }),
    staleTime: 60 * 1000,
  });

export const repairServicesQuery = () =>
  queryOptions({
    queryKey: ["repair-services"],
    queryFn: () => getRepairServices(),
    staleTime: 5 * 60 * 1000,
  });

export const reviewsQuery = () =>
  queryOptions({
    queryKey: ["customer-reviews"],
    queryFn: () => getReviews(),
    staleTime: 5 * 60 * 1000,
  });

export const faqsQuery = () =>
  queryOptions({
    queryKey: ["faqs"],
    queryFn: () => getFaqs(),
    staleTime: 5 * 60 * 1000,
  });
