import React from "react";
import prisma from "../../../lib/prisma";
import StockClientWrapper from "../../components/StockClientWrapper";

const TENANT_ID = "tenant_seed_123";

export default async function StockPage() {
  const categoriesData = await prisma.productCategory.findMany({
    where: { tenantId: TENANT_ID },
    orderBy: { name: "asc" },
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
    const count = lot ? Number(lot.quantityRemaining || 0) : 0;
    let status = "EN STOCK";
    let statusColor = "Green";

    if (count === 0) {
      status = "RUPTURE";
      statusColor = "Red";
    } else if (count <= 5) {
      status = "STOCK BAS";
      statusColor = "Orange";
    }

    return {
      id: prod.id,
      name: prod.name,
      desc: prod.notes || "",
      categoryId: prod.productCategoryId,
      tags: prod.ProductCategory ? [prod.ProductCategory.name] : ["Produit"],
      count,
      status,
      statusColor,
      price: prod.defaultUnitCost ? `${prod.defaultUnitCost.toString()}€` : "0€",
      rawPrice: prod.defaultUnitCost ? Number(prod.defaultUnitCost) : 0,
      expire: lot?.expiresAt ? lot.expiresAt.toLocaleDateString("fr-FR") : "N/A",
      expireAt: lot?.expiresAt ? lot.expiresAt.toISOString() : null,
    };
  });

  const movements = movementsData.map((mov) => {
    return {
      id: mov.id,
      name: mov.Product.name,
      desc: `${mov.reason || "Mouvement manuel"} - ${mov.createdAt.toLocaleDateString("fr-FR")}`,
      amount: mov.type === "OUT" || mov.type === "WASTE" ? `-${mov.quantity.toString()}` : `+${mov.quantity.toString()}`,
      type: mov.type === "OUT" || mov.type === "WASTE" ? "out" : "in",
    };
  });

  const categories = categoriesData.map((cat) => ({
    id: cat.id,
    name: cat.name,
  }));

  return <StockClientWrapper initialProducts={products} movements={movements} categories={categories} />;
}
