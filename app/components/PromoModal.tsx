"use client";

import { useEffect, useState } from "react";
import styles from "./NewAppointmentModal.module.css";

export type EditableMessageTemplate = {
  id: string;
  name: string;
  channel: "SMS" | "EMAIL";
  subject: string | null;
  body: string;
  isSystem: boolean;
};

interface PromoModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: EditableMessageTemplate | null;
  onSaved?: () => void;
}

export default function PromoModal({ isOpen, onClose, template, onSaved }: PromoModalProps) {
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<"SMS" | "EMAIL">("SMS");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    setName(template?.name || "");
    setChannel(template?.channel || "SMS");
    setSubject(template?.subject || "");
    setBody(template?.body || "");
    setError("");
    setIsSaving(false);
  }, [isOpen, template]);

  if (!isOpen) return null;

  const isEditing = Boolean(template?.id);
  const canSave = name.trim().length > 0 && body.trim().length > 0 && !isSaving;

  const handleSave = async () => {
    if (!canSave) return;

    setIsSaving(true);
    setError("");

    try {
      const response = await fetch("/api/campaigns/templates", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: template?.id,
          name,
          channel,
          subject,
          body,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Impossible d'enregistrer le template");
      }

      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer le template");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={onClose} type="button" aria-label="Fermer">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className={styles.title}>{isEditing ? "Modifier le template" : "Nouveau template"}</h1>
        </div>

        <div className={styles.sectionPink} style={{ padding: "20px" }}>
          <div className={styles.sectionTitle}>Template</div>

          <input
            type="text"
            className={styles.clientInput}
            placeholder="Nom du template"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ marginBottom: "15px" }}
          />

          <div className={styles.categoryTabs} style={{ marginBottom: "15px" }}>
            <button
              className={`${styles.categoryBtn} ${channel === "SMS" ? styles.active : ""}`}
              onClick={() => setChannel("SMS")}
              style={{ flex: 1 }}
              type="button"
            >
              SMS
            </button>
            <button
              className={`${styles.categoryBtn} ${channel === "EMAIL" ? styles.active : ""}`}
              onClick={() => setChannel("EMAIL")}
              style={{ flex: 1 }}
              type="button"
            >
              Email
            </button>
          </div>

          {channel === "EMAIL" && (
            <input
              type="text"
              className={styles.clientInput}
              placeholder="Objet de l'email"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          )}
        </div>

        <div className={styles.sectionWhite} style={{ padding: "20px" }}>
          <div className={styles.sectionTitle}>Message</div>
          <textarea
            className={styles.notesInput}
            placeholder="Votre message. Variables disponibles : {firstName}, {lastName}, {businessName}, {offer}, {bookingLink}"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            style={{ minHeight: "150px" }}
          />
          <p style={{ color: "#777", fontSize: "0.82rem", lineHeight: 1.5, margin: "10px 0 0" }}>
            Variables disponibles : {"{firstName}"}, {"{lastName}"}, {"{businessName}"}, {"{offer}"}, {"{bookingLink}"}.
          </p>
        </div>

        {error && (
          <div style={{
            background: "#FDECEC",
            border: "1px solid #F0B6B6",
            borderRadius: "12px",
            color: "#8A2D2D",
            fontSize: "0.85rem",
            marginBottom: "12px",
            padding: "12px",
          }}>
            {error}
          </div>
        )}

        <button className={styles.submitBtn} onClick={handleSave} disabled={!canSave} type="button">
          {isSaving ? "Enregistrement..." : "Enregistrer le template"}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "5px" }}>
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
