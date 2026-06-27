"use server";

import { revalidatePath } from "next/cache";
import prisma from "../../lib/prisma";
import { getTenantId } from "../../lib/tenant";
import { requireTenantMutationAccess } from "../../lib/subscription";
import { notifyStockLowIfNeeded } from "../../lib/notificationEvents";

async function getTenantCategoryId(tenantId: string, categoryId?: string | null) {
  if (!categoryId) return null;

  const category = await prisma.productCategory.findFirst({
    where: {
      id: categoryId,
      tenantId,
      isActive: true,
    },
    select: { id: true },
  });

  return category?.id || null;
}

export async function createProduct(data: {
  name: string;
  desc?: string;
  price: number;
  initialStock: number;
  alertThreshold?: number | null;
  expireAt?: Date | null;
  categoryId?: string | null;
  trackingType?: "UNIDOSE" | "MULTIDOSE";
}) {
  const TENANT_ID = await getTenantId();
  const access = await requireTenantMutationAccess(TENANT_ID);
  if (!access.allowed) {
    return { success: false, error: access.error };
  }

  try {
    const categoryId = await getTenantCategoryId(TENANT_ID, data.categoryId);

    if (data.categoryId && !categoryId) {
      return { success: false, error: "Categorie invalide pour cet espace" };
    }

    const productId = `prod_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const lotId = `lot_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

    // Create the product
    const product = await prisma.product.create({
      data: {
        id: productId,
        tenantId: TENANT_ID,
        name: data.name,
        notes: data.desc,
        defaultUnitCost: data.price,
        alertThreshold: data.alertThreshold ?? null,
        productCategoryId: categoryId,
        unitType: "UNIT",
        trackingType: data.trackingType || "MULTIDOSE",
        updatedAt: new Date(),
      },
    });

    // Create the initial lot
    await prisma.productLot.create({
      data: {
        id: lotId,
        productId,
        quantityInitial: data.initialStock,
        quantityRemaining: data.initialStock,
        expiresAt: data.expireAt || null,
        status: "ACTIVE",
        updatedAt: new Date(),
      },
    });

    // Create initial stock movement if > 0
    if (data.initialStock > 0) {
      await prisma.stockMovement.create({
        data: {
          id: `mov_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
          tenantId: TENANT_ID,
          productId,
          productLotId: lotId,
          type: "IN",
          quantity: data.initialStock,
          reason: "INITIAL_STOCK",
        },
      });
    }

    revalidatePath("/dashboard/stock");
    return { success: true, product };
  } catch (error) {
    console.error("Error creating product:", error);
    return { success: false, error: "Erreur lors de la création du produit" };
  }
}

export async function updateProduct(id: string, data: {
  name: string;
  desc?: string;
  price: number;
  alertThreshold?: number | null;
  categoryId?: string | null;
  trackingType?: "UNIDOSE" | "MULTIDOSE";
}) {
  const TENANT_ID = await getTenantId();
  const access = await requireTenantMutationAccess(TENANT_ID);
  if (!access.allowed) {
    return { success: false, error: access.error };
  }

  try {
    const categoryId = await getTenantCategoryId(TENANT_ID, data.categoryId);

    if (data.categoryId && !categoryId) {
      return { success: false, error: "Categorie invalide pour cet espace" };
    }

    const existingProduct = await prisma.product.findFirst({
      where: {
        id,
        tenantId: TENANT_ID,
        isActive: true,
      },
      select: { trackingType: true },
    });

    if (!existingProduct) {
      return { success: false, error: "Produit introuvable" };
    }

    const product = await prisma.product.update({
      where: { id, tenantId: TENANT_ID },
      data: {
        name: data.name,
        notes: data.desc,
        defaultUnitCost: data.price,
        alertThreshold: data.alertThreshold ?? null,
        productCategoryId: categoryId,
        trackingType: data.trackingType || existingProduct.trackingType,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/stock");
    return { success: true, product };
  } catch (error) {
    console.error("Error updating product:", error);
    return { success: false, error: "Erreur lors de la mise à jour du produit" };
  }
}

export async function deleteProduct(id: string) {
  const TENANT_ID = await getTenantId();
  const access = await requireTenantMutationAccess(TENANT_ID);
  if (!access.allowed) {
    return { success: false, error: access.error };
  }

  try {
    await prisma.product.delete({
      where: { id, tenantId: TENANT_ID },
    });

    revalidatePath("/dashboard/stock");
    return { success: true };
  } catch (error) {
    console.error("Error deleting product:", error);
    return { success: false, error: "Erreur lors de la suppression du produit" };
  }
}

export async function adjustStock(productId: string, delta: number) {
  const TENANT_ID = await getTenantId();
  const access = await requireTenantMutationAccess(TENANT_ID);
  if (!access.allowed) {
    return { success: false, error: access.error };
  }

  try {
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        tenantId: TENANT_ID,
        isActive: true,
      },
      select: { id: true },
    });

    if (!product) {
      return { success: false, error: "Produit introuvable" };
    }

    // Get active lot
    const lot = await prisma.productLot.findFirst({
      where: { productId: product.id, status: "ACTIVE" },
      orderBy: { createdAt: 'desc' },
    });

    if (!lot) {
      return { success: false, error: "Aucun lot actif trouvé" };
    }

    const currentQty = Number(lot.quantityRemaining || 0);
    const newQty = currentQty + delta;

    if (newQty < 0) {
      return { success: false, error: "Le stock ne peut pas être négatif" };
    }

    // Update lot
    await prisma.productLot.update({
      where: { id: lot.id },
      data: { quantityRemaining: newQty, updatedAt: new Date() },
    });

    // Create movement
    await prisma.stockMovement.create({
      data: {
        id: `mov_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
        tenantId: TENANT_ID,
        productId: product.id,
        productLotId: lot.id,
        type: delta > 0 ? "IN" : "OUT",
        quantity: Math.abs(delta),
        reason: "MANUAL_ADJUSTMENT",
      },
    });

    await notifyStockLowIfNeeded({
      tenantId: TENANT_ID,
      productId: product.id,
      previousQuantity: currentQty,
      nextQuantity: newQty,
    });

    revalidatePath("/dashboard/stock");
    return { success: true };
  } catch (error) {
    console.error("Error adjusting stock:", error);
    return { success: false, error: "Erreur lors de l'ajustement du stock" };
  }
}

export async function createProductCategory(name: string) {
  const TENANT_ID = await getTenantId();
  const access = await requireTenantMutationAccess(TENANT_ID);
  if (!access.allowed) {
    return { success: false, error: access.error };
  }

  try {
    const id = `pcat_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    
    const category = await prisma.productCategory.create({
      data: {
        id,
        tenantId: TENANT_ID,
        name,
        isActive: true,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/stock");
    return { success: true, category };
  } catch (error) {
    console.error("Error creating product category:", error);
    return { success: false, error: "Erreur lors de la création de la catégorie" };
  }
}
