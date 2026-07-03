"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import { createPublicBooking } from "../../actions/publicPageActions";
import { formatBookingTimeDebug, logBookingTimezone } from "../../../lib/bookingTimezone";
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

type BookingConfirmation = {
  appointmentId: string;
  clientName: string;
  businessName: string;
  services: string[];
  serviceName: string;
  scheduledAt: string;
  endAt: string;
  dateLabel: string;
  startTimeLabel: string;
  endTimeLabel: string;
  durationMin: number;
  priceCents: number;
  depositAmount: number;
  paidDepositAmount: number;
  remainingAmount: number;
  address: string;
  status: string;
  paymentStatus: string;
  requiresPayment: boolean;
  emailConfirmationSent: boolean;
};

const confirmationStorageKey = "glowea-public-booking-confirmation";

function getToday() {
  return new Date().toISOString().slice(0, 10);
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
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
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

  useEffect(() => {
    if (!isMounted || typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("booking") !== "success") return;

    const stored = window.sessionStorage.getItem(confirmationStorageKey);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as BookingConfirmation;
      if (parsed.appointmentId && parsed.appointmentId === params.get("appointmentId")) {
        setConfirmation({
          ...parsed,
          status: "CONFIRMED",
          paymentStatus: parsed.paymentStatus === "deposit_pending" ? "deposit_paid" : parsed.paymentStatus,
        });
        window.sessionStorage.removeItem(confirmationStorageKey);
      }
    } catch {
      window.sessionStorage.removeItem(confirmationStorageKey);
    }
  }, [isMounted]);

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
        logBookingTimezone("AVAILABILITY_API_RETURNED_CLIENT", {
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

  function getConfirmationTitle() {
    if (!confirmation) return "";
    if (confirmation.requiresPayment && confirmation.paymentStatus === "deposit_pending") {
      return "Votre rendez-vous est en attente de paiement";
    }

    return "Votre rendez-vous est confirmé";
  }

  function getConfirmationMessage() {
    if (!confirmation) return "";
    if (confirmation.emailConfirmationSent) {
      return "Un email de confirmation vient de vous être envoyé.";
    }

    return "Votre réservation a bien été transmise au salon.";
  }

  function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    const clientSelected = new Date(`${date}T${time}:00`);
    const selectedSlot = slots.find((slot) => slot.time === time) || null;

    logBookingTimezone("CLIENT_SELECTED", {
      selectedLabel: `${date} ${time} Europe/Paris`,
      selectedDate: date,
      selectedTime: time,
      parsedLocalIso: Number.isNaN(clientSelected.getTime()) ? null : clientSelected.toISOString(),
      parsedEuropeParis: formatBookingTimeDebug(clientSelected),
      selectedSlot,
    });
    logBookingTimezone("API_SENT", {
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

      logBookingTimezone("API_RETURNED_TO_CLIENT", {
        result,
        returnedScheduledAtIso: result.success ? result.scheduledAt : null,
        returnedScheduledAtEuropeParis: result.success ? formatBookingTimeDebug(new Date(result.scheduledAt)) : null,
      });

      if (!result.success) {
        setFeedback({ type: "error", message: result.error || "Impossible de reserver ce creneau." });
        return;
      }

      setFeedback(null);
      setFirstName("");
      setLastName("");
      setPhone("");
      setEmail("");
      setInstagram("");
      setMessage("");

      if (result.checkoutUrl) {
        window.sessionStorage.setItem(confirmationStorageKey, JSON.stringify(result.confirmation));
        window.location.href = result.checkoutUrl;
        return;
      }

      setConfirmation(result.confirmation);
      setIsOpen(false);
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

      {confirmation && isMounted && createPortal(
        <aside className={styles.bookingConfirmationPanel} role="status" aria-live="polite">
          <button
            className={styles.bookingConfirmationClose}
            type="button"
            onClick={() => setConfirmation(null)}
            aria-label="Fermer la confirmation"
          >
            ×
          </button>
          <div className={styles.bookingConfirmationIcon} aria-hidden="true">✓</div>
          <div className={styles.bookingConfirmationContent}>
            <span className={styles.kicker}>Réservation Glowea</span>
            <h2>{getConfirmationTitle()}</h2>
            <p>{getConfirmationMessage()}</p>
            <dl className={styles.bookingConfirmationGrid}>
              <div>
                <dt>Cliente</dt>
                <dd>{confirmation.clientName}</dd>
              </div>
              <div>
                <dt>Prestation</dt>
                <dd>{confirmation.services.length ? confirmation.services.join(" + ") : confirmation.serviceName}</dd>
              </div>
              <div>
                <dt>Date</dt>
                <dd>{confirmation.dateLabel}</dd>
              </div>
              <div>
                <dt>Horaire</dt>
                <dd>{confirmation.startTimeLabel} - {confirmation.endTimeLabel}</dd>
              </div>
              <div>
                <dt>Durée</dt>
                <dd>{confirmation.durationMin} min</dd>
              </div>
              <div>
                <dt>Prix total</dt>
                <dd>{confirmation.priceCents ? formatMoneyFromCents(confirmation.priceCents) : "Sur devis"}</dd>
              </div>
              {confirmation.depositAmount > 0 && (
                <div>
                  <dt>Arrhes</dt>
                  <dd>{formatMoneyFromCents(confirmation.depositAmount)}</dd>
                </div>
              )}
              {confirmation.address && (
                <div>
                  <dt>Adresse</dt>
                  <dd>{confirmation.address}</dd>
                </div>
              )}
            </dl>
          </div>
        </aside>,
        document.body
      )}

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

              {isLoadingSlots && <div className={styles.modalInfo}>Chargement des créneaux disponibles...</div>}
              {!isLoadingSlots && slotError && <div className={styles.modalError}>{slotError}</div>}
              {!isLoadingSlots && !slotError && slots.length === 0 && (
                <div className={styles.modalInfo}>Aucun créneau disponible pour cette date.</div>
              )}

              <div className={styles.formSplit}>
                <label>
                  Prénom
                  <input value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
                </label>
                <label>
                  Nom
                  <input value={lastName} onChange={(event) => setLastName(event.target.value)} />
                </label>
              </div>

              <div className={styles.formSplit}>
                <label>
                  Téléphone
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
                  <small>Reste à payer sur place : {formatMoneyFromCents(remainingAmount)}</small>
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
