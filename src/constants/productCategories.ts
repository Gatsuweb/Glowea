export type ProductFamily = "NAILS" | "LASHES";

export type ProductCategoryDefinition = {
  id: string;
  label: string;
  family: ProductFamily;
  image: string;
  description?: string;
};

export const PRODUCT_FAMILIES: Array<{
  id: ProductFamily;
  label: string;
  description: string;
}> = [
  {
    id: "NAILS",
    label: "Ongles",
    description: "Gels, couleurs, outils et soins pour les prestations ongles.",
  },
  {
    id: "LASHES",
    label: "Cils",
    description: "Extensions, colles, lift, brow lift et accessoires regard.",
  },
];

export const PRODUCT_CATEGORIES: ProductCategoryDefinition[] = [
  {
    id: "nails-preparation",
    label: "Préparation",
    family: "NAILS",
    image: "/ongles/preparation.png",
    description: "De quoi preparer l'ongle avant la pose.",
  },
  {
    id: "nails-bases",
    label: "Bases",
    family: "NAILS",
    image: "/ongles/bases.png",
    description: "Bases, rubber bases et produits d'accroche.",
  },
  {
    id: "nails-construction",
    label: "Construction",
    family: "NAILS",
    image: "/ongles/construction.png",
    description: "Gels, acrygels et matieres de construction.",
  },
  {
    id: "nails-colors",
    label: "Couleurs",
    family: "NAILS",
    image: "/ongles/couleurs.png",
    description: "Vernis, gels couleur et pigments.",
  },
  {
    id: "nails-finish",
    label: "Finition",
    family: "NAILS",
    image: "/ongles/finition.png",
    description: "Top coats, finitions et brillance.",
  },
  {
    id: "nails-removal",
    label: "Dépose",
    family: "NAILS",
    image: "/ongles/dépose.png",
    description: "Produits et materiel pour retirer les poses.",
  },
  {
    id: "nails-care",
    label: "Soins",
    family: "NAILS",
    image: "/ongles/soins.png",
    description: "Huiles, cremes et soins des ongles.",
  },
  {
    id: "nails-accessories",
    label: "Accessoires",
    family: "NAILS",
    image: "/ongles/accessoires.png",
    description: "Petits consommables et accessoires de poste.",
  },
  {
    id: "nails-tips-forms",
    label: "Capsules & Chablons",
    family: "NAILS",
    image: "/ongles/capsules&chablons.png",
    description: "Capsules, chablons et extensions.",
  },
  {
    id: "nails-decorations",
    label: "Décorations",
    family: "NAILS",
    image: "/ongles/decorations.png",
    description: "Strass, stickers, poudres et nail art.",
  },
  {
    id: "nails-tools",
    label: "Outils",
    family: "NAILS",
    image: "/ongles/outils.png",
    description: "Pinceaux, limes, embouts et instruments.",
  },
  {
    id: "nails-other",
    label: "Autre",
    family: "NAILS",
    image: "/ongles/ChatGPT Image 21 mai 2026, 10_48_41 1.png",
    description: "Produits ongles a classer plus tard.",
  },
  {
    id: "lashes-preparation",
    label: "Préparation",
    family: "LASHES",
    image: "/cils/preparation.png",
    description: "Nettoyage et preparation avant prestation.",
  },
  {
    id: "lashes-extensions",
    label: "Extensions de cils",
    family: "LASHES",
    image: "/cils/extensions-de-cils.png",
    description: "Boites d'extensions, courbures et longueurs.",
  },
  {
    id: "lashes-glues",
    label: "Colles",
    family: "LASHES",
    image: "/cils/colles.png",
    description: "Colles et produits d'adherence.",
  },
  {
    id: "lashes-removers",
    label: "Retrait / Removers",
    family: "LASHES",
    image: "/cils/retrait/removers.png",
    description: "Removers et solutions de retrait.",
  },
  {
    id: "lashes-isolation-application",
    label: "Isolation & Application",
    family: "LASHES",
    image: "/cils/isolation&application.png",
    description: "Pinces, isolation et application precise.",
  },
  {
    id: "lashes-patches-supports",
    label: "Patchs & Supports",
    family: "LASHES",
    image: "/cils/patchs&supports.png",
    description: "Patchs, pads et supports de travail.",
  },
  {
    id: "lashes-lash-lift",
    label: "Lash Lift",
    family: "LASHES",
    image: "/cils/lashlift.png",
    description: "Produits pour rehaussement de cils.",
  },
  {
    id: "lashes-brow-lift",
    label: "Brow Lift",
    family: "LASHES",
    image: "/cils/browlift.png",
    description: "Produits pour restructuration des sourcils.",
  },
  {
    id: "lashes-tints",
    label: "Teintures",
    family: "LASHES",
    image: "/cils/teintures.png",
    description: "Teintures cils et sourcils.",
  },
  {
    id: "lashes-care",
    label: "Soins",
    family: "LASHES",
    image: "/cils/soins.png",
    description: "Serums, soins et entretien.",
  },
  {
    id: "lashes-accessories",
    label: "Accessoires",
    family: "LASHES",
    image: "/cils/accessoires.png",
    description: "Consommables et accessoires regard.",
  },
  {
    id: "lashes-tools",
    label: "Outils",
    family: "LASHES",
    image: "/cils/outils.png",
    description: "Pinces, brosses et instruments.",
  },
  {
    id: "lashes-other",
    label: "Autre",
    family: "LASHES",
    image: "/cils/accessoires.png",
    description: "Produits cils a classer plus tard.",
  },
];

export const PRODUCT_CATEGORY_BY_SLUG = new Map(
  PRODUCT_CATEGORIES.map((category) => [category.id, category])
);

export function getProductCategoryBySlug(slug?: string | null) {
  if (!slug) return null;
  return PRODUCT_CATEGORY_BY_SLUG.get(slug) || null;
}

export function getProductCategoriesByFamily(family: ProductFamily) {
  return PRODUCT_CATEGORIES.filter((category) => category.family === family);
}

export function getStoredProductCategoryName(category: ProductCategoryDefinition) {
  const familyLabel = PRODUCT_FAMILIES.find((family) => family.id === category.family)?.label;
  return `${familyLabel || category.family} - ${category.label}`;
}
