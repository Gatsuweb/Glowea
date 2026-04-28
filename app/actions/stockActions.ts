"use server";

import { revalidatePath } from "next/cache";
import prisma from "../../lib/prisma";
import { getTenantId } from "../../lib/tenant";


export async function createProduct(data: {
  name: string;
  desc?: string;
  price: number;
  initialStock: number;
  expireAt?: Date | null;
  categoryId?: string | null;
}) {
  const TENANT_ID = await getTenantId();
  try {
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
        productCategoryId: data.categoryId || null,
        unitType: "UNIT",
        trackingType: "UNIDOSE",
        updatedAt: new Date(),
      },
    });

    // Create the initial lot
    const lot = await prisma.productLot.create({
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
  categoryId?: string | null;
}) {
  const TENANT_ID = await getTenantId();
  try {
    const product = await prisma.product.update({
      where: { id, tenantId: TENANT_ID },
      data: {
        name: data.name,
        notes: data.desc,
        defaultUnitCost: data.price,
        productCategoryId: data.categoryId || null,
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
  try {
    // Get active lot
    const lot = await prisma.productLot.findFirst({
      where: { productId, status: "ACTIVE" },
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
        productId,
        productLotId: lot.id,
        type: delta > 0 ? "IN" : "OUT",
        quantity: Math.abs(delta),
        reason: "MANUAL_ADJUSTMENT",
      },
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
