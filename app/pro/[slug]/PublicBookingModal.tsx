"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import { createPublicBooking } from "../../actions/publicPageActions";
import styles from "./publicProfile.module.css";

type BookingService = {
  id: string;
  name: string;
  durationMin: number;
  price: number;
};

type AvailabilitySlot = {
  time: string;
  startAt: string;
  endAt: string;
};

type BookingSettings = {
  depositsEnabled: boolean;
  depositsRequired: boolean;
};

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function formatParisDebug(date: Date) {
  if (Number.isNaN(date.getTime())) return "Invalid Date";

  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function logBookingTime(label: string, payload: Record<string, unknown>) {
  console.log(`[booking-timezone] ${label}`, {
    browserTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    browserOffsetMin: new Date().getTimezoneOffset(),
    ...payload,
  });
}

export default function PublicBookingModal({
  slug,
  services,
  initialServiceId,
  triggerClassName,
  triggerLabel,
  triggerContent,
  triggerStyle,
}: {
  slug: string;
  services: BookingService[];
  initialServiceId?: string;
  triggerClassName: string;
  triggerLabel: string;
  triggerContent?: ReactNode;
  triggerStyle?: CSSProperties;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(() => (
    initialServiceId ? [initialServiceId] : services[0]?.id ? [services[0].id] : []
  ));
  const [date, setDate] = useState(getToday());
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [bookingSettings, setBookingSettings] = useState<BookingSettings | null>(null);
  const [depositAmount, setDepositAmount] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const selectedServices = useMemo(
    () => services.filter((service) => selectedServiceIds.includes(service.id)),
    [selectedServiceIds, services]
  );
  const selectedDurationMin = selectedServices.reduce((sum, service) => sum + service.durationMin, 0);
  const selectedPriceCents = selectedServices.reduce((sum, service) => sum + Math.round(service.price * 100), 0);
  const selectedServiceLabel = selectedServices.map((service) => service.name).join(" + ");

  const remainingAmount = Math.max(selectedPriceCents - depositAmount, 0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  function formatMoneyFromCents(amount: number) {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount / 100);
  }

  useEffect(() => {
    if (!isOpen || selectedServiceIds.length === 0 || !date) return;

    const controller = new AbortController();

    async function loadSlots() {
      setIsLoadingSlots(true);
      setSlotError(null);

      try {
        const params = new URLSearchParams();
        selectedServiceIds.forEach((id) => params.append("serviceIds", id));
        params.set("date", date);
        const response = await fetch(`/api/public-booking/${encodeURIComponent(slug)}/availability?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || "Impossible de charger les creneaux.");
        }
        logBookingTime("AVAILABILITY_API_RETURNED", {
          date,
          firstSlot: data.slots?.[0] || null,
          selectedServiceIds,
          slots: (data.slots || []).slice(0, 5),
        });
        setSlots(data.slots || []);
        setBookingSettings(data.bookingSettings || null);
        setDepositAmount(Number(data.depositAmount || 0));
        setTime(data.slots?.[0]?.time || "");
      } catch (error) {
        if (controller.signal.aborted) return;
        setSlots([]);
        setTime("");
        setSlotError(error instanceof Error ? error.message : "Impossible de charger les creneaux.");
      } finally {
        if (!controller.signal.aborted) setIsLoadingSlots(false);
      }
    }

    void loadSlots();

    return () => controller.abort();
  }, [date, isOpen, selectedServiceIds, slug]);

  function toggleService(serviceId: string) {
    setSelectedServiceIds((current) => {
      const next = current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId];
      return next.length > 0 ? next : current;
    });
  }

  function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    const clientSelected = new Date(`${date}T${time}:00`);
    const selectedSlot = slots.find((slot) => slot.time === time) || null;

    logBookingTime("CLIENT_SELECTED", {
      selectedLabel: `${date} ${time} Europe/Paris`,
      selectedDate: date,
      selectedTime: time,
      parsedLocalIso: Number.isNaN(clientSelected.getTime()) ? null : clientSelected.toISOString(),
      parsedEuropeParis: formatParisDebug(clientSelected),
      selectedSlot,
    });
    logBookingTime("API_SENT", {
      action: "createPublicBooking",
      payload: {
        slug,
        serviceId: selectedServiceIds[0] || "",
        serviceIds: selectedServiceIds,
        date,
        time,
      },
    });

    startTransition(async () => {
      const result = await createPublicBooking({
        slug,
        serviceId: selectedServiceIds[0] || "",
        serviceIds: selectedServiceIds,
        date,
        time,
        firstName,
        lastName,
        phone,
        email,
        instagram,
        message,
      });

      logBookingTime("API_RETURNED_TO_CLIENT", {
        result,
        returnedScheduledAtIso: result.success ? result.scheduledAt : null,
        returnedScheduledAtEuropeParis: result.success ? formatParisDebug(new Date(result.scheduledAt)) : null,
      });

      if (!result.success) {
        setFeedback({ type: "error", message: result.error || "Impossible de reserver ce creneau." });
        return;
      }

      setFeedback({
        type: "success",
        message: "Votre demande de rendez-vous a bien été envoyée.",
      });
      setFirstName("");
      setLastName("");
      setPhone("");
      setEmail("");
      setInstagram("");
      setMessage("");

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    });
  }

  return (
    <>
      <button
        className={triggerClassName}
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={services.length === 0}
        style={triggerStyle}
      >
        {triggerContent || triggerLabel}
      </button>

      {isOpen && isMounted && createPortal(
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Reservation">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.kicker}>Reservation</span>
                <h2>Choisir un créneau</h2>
              </div>
              <button className={styles.closeButton} type="button" onClick={() => setIsOpen(false)} aria-label="Fermer">
                ×
              </button>
            </div>

            <form className={styles.bookingForm} onSubmit={submitBooking}>
              <div className={styles.bookingServicePicker}>
                <span className={styles.bookingServicePickerLabel}>Prestations</span>
                <div className={styles.bookingServiceOptions}>
                  {services.map((service) => {
                    const isSelected = selectedServiceIds.includes(service.id);
                    return (
                      <button
                        key={service.id}
                        type="button"
                        className={`${styles.bookingServiceOption} ${isSelected ? styles.bookingServiceOptionSelected : ""}`}
                        onClick={() => toggleService(service.id)}
                      >
                        <span>{service.name}</span>
                        <small>{service.durationMin} min{service.price ? ` - ${formatMoneyFromCents(service.price * 100)}` : ""}</small>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedServices.length > 0 && (
                <div className={styles.selectedService}>
                  <span>{selectedServiceLabel}</span>
                  <strong>
                    {selectedDurationMin} min
                    {selectedPriceCents ? ` - ${formatMoneyFromCents(selectedPriceCents)}` : ""}
                  </strong>
                </div>
              )}

              <div className={styles.formSplit}>
                <label>
                  Date
                  <input type="date" value={date} min={getToday()} onChange={(event) => setDate(event.target.value)} required />
                </label>
                <label>
                  Heure
                  <select value={time} onChange={(event) => setTime(event.target.value)} required disabled={isLoadingSlots || slots.length === 0}>
                    {slots.map((slot) => (
                      <option key={slot.startAt} value={slot.time}>{slot.time}</option>
                    ))}
                  </select>
                </label>
              </div>

              {isLoadingSlots && <div className={styles.modalInfo}>Chargement des creneaux disponibles...</div>}
              {!isLoadingSlots && slotError && <div className={styles.modalError}>{slotError}</div>}
              {!isLoadingSlots && !slotError && slots.length === 0 && (
                <div className={styles.modalInfo}>Aucun créneau disponible pour cette date.</div>
              )}

              <div className={styles.formSplit}>
                <label>
                  Prenom
                  <input value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
                </label>
                <label>
                  Nom
                  <input value={lastName} onChange={(event) => setLastName(event.target.value)} />
                </label>
              </div>

              <div className={styles.formSplit}>
                <label>
                  Telephone
                  <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required />
                </label>
                <label>
                  Email
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                </label>
              </div>

              <label>
                Instagram optionnel
                <input value={instagram} onChange={(event) => setInstagram(event.target.value)} placeholder="@votrecompte" />
              </label>

              <label>
                Message optionnel
                <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} />
              </label>

              {bookingSettings?.depositsEnabled && depositAmount > 0 && (
                <div className={styles.paymentSummary}>
                  <span>Arrhes {bookingSettings.depositsRequired ? "obligatoires" : "optionnelles"}</span>
                  <strong>{formatMoneyFromCents(depositAmount)}</strong>
                  <small>Reste a payer sur place : {formatMoneyFromCents(remainingAmount)}</small>
                </div>
              )}

              {feedback && (
                <div className={feedback.type === "success" ? styles.modalSuccess : styles.modalError}>
                  {feedback.message}
                </div>
              )}

              <button className={styles.submitButton} type="submit" disabled={isPending || selectedServiceIds.length === 0 || !time}>
                {isPending ? "Envoi..." : bookingSettings?.depositsRequired ? "Continuer vers le paiement" : "Confirmer la reservation"}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
