"use client";

import { useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { createPublicBooking } from "../../actions/publicPageActions";
import styles from "./publicProfile.module.css";

type BookingService = {
  id: string;
  name: string;
  durationMin: number;
  price: number;
};

const timeSlots = ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00"];

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
}: {
  slug: string;
  services: BookingService[];
  initialServiceId?: string;
  triggerClassName: string;
  triggerLabel: string;
  triggerContent?: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [serviceId, setServiceId] = useState(initialServiceId || services[0]?.id || "");
  const [date, setDate] = useState(getToday());
  const [time, setTime] = useState(timeSlots[0]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId),
    [serviceId, services]
  );

  function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const result = await createPublicBooking({
        slug,
        serviceId,
        date,
        time,
        firstName,
        lastName,
        phone,
        email,
        message,
      });

      if (!result.success) {
        setFeedback({ type: "error", message: result.error });
        return;
      }

      setFeedback({
        type: "success",
        message: "Votre demande de rendez-vous a bien ete envoyee.",
      });
      setFirstName("");
      setLastName("");
      setPhone("");
      setEmail("");
      setMessage("");
    });
  }

  return (
    <>
      <button
        className={triggerClassName}
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={services.length === 0}
      >
        {triggerContent || triggerLabel}
      </button>

      {isOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Reservation">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.kicker}>Reservation</span>
                <h2>Choisir un creneau</h2>
              </div>
              <button className={styles.closeButton} type="button" onClick={() => setIsOpen(false)} aria-label="Fermer">
                ×
              </button>
            </div>

            <form className={styles.bookingForm} onSubmit={submitBooking}>
              <label>
                Prestation
                <select value={serviceId} onChange={(event) => setServiceId(event.target.value)} required>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} - {service.durationMin} min
                    </option>
                  ))}
                </select>
              </label>

              {selectedService && (
                <div className={styles.selectedService}>
                  <span>{selectedService.name}</span>
                  <strong>{selectedService.durationMin} min</strong>
                </div>
              )}

              <div className={styles.formSplit}>
                <label>
                  Date
                  <input type="date" value={date} min={getToday()} onChange={(event) => setDate(event.target.value)} required />
                </label>
                <label>
                  Heure
                  <select value={time} onChange={(event) => setTime(event.target.value)} required>
                    {timeSlots.map((slot) => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </label>
              </div>

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
                Message optionnel
                <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} />
              </label>

              {feedback && (
                <div className={feedback.type === "success" ? styles.modalSuccess : styles.modalError}>
                  {feedback.message}
                </div>
              )}

              <button className={styles.submitButton} type="submit" disabled={isPending || !serviceId}>
                {isPending ? "Envoi..." : "Confirmer la demande"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
