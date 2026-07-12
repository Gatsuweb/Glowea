import type { ReactNode } from "react";

export type PublicContactAction = {
  label: string;
  href: string | null;
  target?: "_blank" | "_self";
};

export function getPublicContactAction(profile: {
  instagramUrl?: string | null;
  email?: string | null;
  phone?: string | null;
}): PublicContactAction {
  const instagram = normalizeInstagram(profile.instagramUrl);
  if (instagram) {
    return {
      label: "Contacter sur Instagram",
      href: instagram,
      target: "_blank",
    };
  }

  const email = profile.email?.trim();
  if (email) {
    const subject = encodeURIComponent("Demande de rendez-vous");
    return {
      label: "Demander un rendez-vous",
      href: `mailto:${email}?subject=${subject}`,
      target: "_self",
    };
  }

  const phone = profile.phone?.trim();
  if (phone) {
    return {
      label: "Appeler le salon",
      href: `tel:${phone}`,
      target: "_self",
    };
  }

  return {
    label: "Contact indisponible",
    href: null,
  };
}

function normalizeInstagram(value: string | null | undefined) {
  const raw = value?.trim();
  if (!raw) return null;
  if (raw.includes("instagram.com")) return raw.startsWith("http") ? raw : `https://${raw}`;
  return `https://instagram.com/${raw.replace(/^@/, "")}`;
}

export default function PublicContactButton({
  action,
  className,
  children,
}: {
  action: PublicContactAction;
  className: string;
  children?: ReactNode;
}) {
  if (!action.href) {
    return (
      <button className={className} type="button" disabled>
        {children || action.label}
      </button>
    );
  }

  return (
    <a
      className={className}
      href={action.href}
      target={action.target || "_self"}
      rel={action.target === "_blank" ? "noreferrer" : undefined}
    >
      {children || action.label}
    </a>
  );
}
