import React from "react";
import prisma from "../../../lib/prisma";
import StockClientWrapper from "../../components/StockClientWrapper";
import { getTenantId } from "../../../lib/tenant";
import {
  PRODUCT_CATEGORIES,
  getProductCategoryBySlug,
  getStoredProductCategoryName,
} from "../../../src/constants/productCategories";


export const dynamic = "force-dynamic";

export default async function StockPage() {
  const TENANT_ID = await getTenantId();
  const existingBusinessCategories = await prisma.productCategory.findMany({
    where: {
      tenantId: TENANT_ID,
      slug: { in: PRODUCT_CATEGORIES.map((category) => category.id) },
    },
    select: { slug: true },
  });

  const existingSlugs = new Set(existingBusinessCategories.map((category) => category.slug).filter(Boolean));
  const missingCategories = PRODUCT_CATEGORIES.filter((category) => !existingSlugs.has(category.id));

  if (missingCategories.length > 0) {
    await prisma.productCategory.createMany({
      data: missingCategories.map((category, index) => ({
        id: `pcat_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
        tenantId: TENANT_ID,
        name: getStoredProductCategoryName(category),
        slug: category.id,
        isActive: true,
        sortOrder: index,
        updatedAt: new Date(),
      })),
      skipDuplicates: true,
    });
  }

  const categoriesData = await prisma.productCategory.findMany({
    where: { tenantId: TENANT_ID },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const productsData = await prisma.product.findMany({
    where: { tenantId: TENANT_ID },
    include: {
      ProductLot: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      ProductCategory: true,
    },
    orderBy: { name: "asc" },
  });

  const movementsData = await prisma.stockMovement.findMany({
    where: { tenantId: TENANT_ID },
    include: {
      Product: true,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const products = productsData.map((prod) => {
    const lot = prod.ProductLot[0];
    const businessCategory = getProductCategoryBySlug(prod.ProductCategory?.slug);
    const count = lot ? Number(lot.quantityRemaining || 0) : 0;
    const alertThreshold = prod.alertThreshold ? Number(prod.alertThreshold) : 5;
    let status = "EN STOCK";
    let statusColor = "Green";

    if (count === 0) {
      status = "RUPTURE";
      statusColor = "Red";
    } else if (count <= alertThreshold) {
      status = "STOCK BAS";
      statusColor = "Orange";
    }

    return {
      id: prod.id,
      name: prod.name,
      desc: prod.notes || "",
      categoryId: prod.productCategoryId,
      categorySlug: prod.ProductCategory?.slug || null,
      categoryImage: businessCategory?.image || null,
      categoryLabel: businessCategory?.label || prod.ProductCategory?.name || null,
      categoryFamily: businessCategory?.family || null,
      tags: businessCategory ? [businessCategory.label] : prod.ProductCategory ? [prod.ProductCategory.name] : ["Produit"],
      count,
      alertThreshold,
      status,
      statusColor,
      price: prod.defaultUnitCost ? `${prod.defaultUnitCost.toString()}€` : "0€",
      rawPrice: prod.defaultUnitCost ? Number(prod.defaultUnitCost) : 0,
      expire: lot?.expiresAt ? lot.expiresAt.toLocaleDateString("fr-FR") : "N/A",
      expireAt: lot?.expiresAt ? lot.expiresAt.toISOString() : null,
      trackingType: prod.trackingType,
    };
  });

  const movements = movementsData.map((mov) => {
    return {
      id: mov.id,
      name: mov.Product.name,
      desc: `${mov.reason || "Mouvement manuel"} - ${mov.createdAt.toLocaleDateString("fr-FR")}`,
      amount: mov.type === "OUT" || mov.type === "WASTE" ? `-${mov.quantity.toString()}` : `+${mov.quantity.toString()}`,
      type: (mov.type === "OUT" || mov.type === "WASTE" ? "out" : "in") as "out" | "in",
    };
  });

  const categories = categoriesData.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    label: getProductCategoryBySlug(cat.slug)?.label || cat.name,
    family: getProductCategoryBySlug(cat.slug)?.family || null,
    image: getProductCategoryBySlug(cat.slug)?.image || null,
    description: getProductCategoryBySlug(cat.slug)?.description || null,
  }));

  return <StockClientWrapper initialProducts={products} movements={movements} categories={categories} />;
}
