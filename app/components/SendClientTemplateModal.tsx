"use client";

import React, { useEffect, useMemo, useState } from "react";
import modalStyles from "./NewAppointmentModal.module.css";

type Template = {
  id: string;
  name: string;
  channel: "SMS" | "EMAIL";
  subject: string | null;
  body: string;
  isSystem: boolean;
};

type Preview = {
  totalTargeted: number;
  sendableCount: number;
  skippedCount: number;
  renderedPreview: string;
  providerMode: "mock" | "real";
  exampleRecipients: Array<{
    id: string;
    firstName: string;
    lastName: string | null;
    hasPhone: boolean;
    hasEmail: boolean;
  }>;
};

type SendResponse = {
  success: boolean;
  error?: string;
  sentCount?: number;
  failedCount?: number;
  skippedCount?: number;
  errorSummary?: string | null;
};

type SelectedClient = {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  selectedClients: SelectedClient[];
};

export default function SendClientTemplateModal({ isOpen, onClose, selectedClients }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) || null,
    [selectedTemplateId, templates]
  );

  useEffect(() => {
    if (!isOpen) return;

    let ignore = false;
    setIsLoadingTemplates(true);
    setError("");
    setSuccess("");
    setPreview(null);

    fetch("/api/campaigns/templates")
      .then((response) => response.json())
      .then((data) => {
        if (ignore) return;
        if (!data.success) throw new Error(data.error || "Impossible de charger les templates");
        const emailTemplates = (data.templates || []).filter((template: Template) => template.channel === "EMAIL");
        setTemplates(emailTemplates);
        setSelectedTemplateId(emailTemplates[0]?.id || "");
      })
      .catch((err) => {
        if (!ignore) setError(err instanceof Error ? err.message : "Impossible de charger les templates");
      })
      .finally(() => {
        if (!ignore) setIsLoadingTemplates(false);
      });

    return () => {
      ignore = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !selectedTemplateId || selectedClients.length === 0) {
      setPreview(null);
      return;
    }

    const controller = new AbortController();
    setIsLoadingPreview(true);
    setError("");

    fetch("/api/campaigns/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientIds: selectedClients.map((client) => client.id),
        templateId: selectedTemplateId,
        channel: "EMAIL",
      }),
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((data) => {
        if (!data.success) throw new Error(data.error || "Apercu indisponible");
        setPreview(data);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setPreview(null);
          setError(err instanceof Error ? err.message : "Impossible de preparer l'apercu");
        }
      })
      .finally(() => setIsLoadingPreview(false));

    return () => controller.abort();
  }, [isOpen, selectedClients, selectedTemplateId]);

  if (!isOpen) return null;

  const canSend =
    Boolean(selectedTemplateId) &&
    Boolean(preview) &&
    (preview?.sendableCount || 0) > 0 &&
    !isLoadingPreview &&
    !isSending;

  const handleSend = async () => {
    if (!canSend || !selectedTemplate) return;
    if (!window.confirm(`Envoyer ce template email a ${preview?.sendableCount || 0} cliente(s) ?`)) return;

    setIsSending(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/campaigns/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientIds: selectedClients.map((client) => client.id),
          templateId: selectedTemplateId,
          channel: "EMAIL",
        }),
      });
      const data = await response.json() as SendResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Envoi impossible");
      }

      const message = `Traitement termine : ${data.sentCount || 0} envoye(s), ${data.failedCount || 0} echec(s), ${data.skippedCount || 0} ignore(s).`;
      if ((data.failedCount || 0) > 0 && (data.sentCount || 0) === 0) {
        setError(data.errorSummary ? `${message} ${data.errorSummary}` : message);
      } else {
        setSuccess(data.errorSummary ? `${message} ${data.errorSummary}` : message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'envoyer le template");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={modalStyles.modalOverlay} onClick={onClose}>
      <div className={modalStyles.modalContent} onClick={(event) => event.stopPropagation()}>
        <div className={modalStyles.header}>
          <button className={modalStyles.backBtn} onClick={onClose} type="button" aria-label="Fermer">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className={modalStyles.title}>Envoyer un template mail</h1>
        </div>

        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Clientes selectionnees</div>
          <div style={chipsStyle}>
            {selectedClients.map((client) => (
              <span key={client.id} style={chipStyle}>
                {`${client.firstName} ${client.lastName || ""}`.trim()}
              </span>
            ))}
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Templates email</div>
          {isLoadingTemplates && <div style={mutedStyle}>Chargement des templates...</div>}
          {!isLoadingTemplates && templates.length === 0 && (
            <div style={mutedStyle}>Aucun template email disponible dans `Profil` &gt; `Templates Mail`.</div>
          )}
          <div style={{ display: "grid", gap: "10px" }}>
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedTemplateId(template.id)}
                style={{
                  ...templateButtonStyle,
                  borderColor: selectedTemplateId === template.id ? "var(--tertiary)" : "#E5D8D1",
                }}
              >
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontWeight: 700, color: "#333" }}>{template.name}</div>
                  <div style={{ color: "#777", fontSize: "0.78rem" }}>
                    {template.subject || "Sans objet"}
                  </div>
                </div>
                <span style={templateMetaStyle}>{template.isSystem ? "Systeme" : "Personnalise"}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Apercu avant envoi</div>
          {isLoadingPreview && <div style={mutedStyle}>Preparation de l&apos;apercu...</div>}
          {!isLoadingPreview && preview && (
            <>
              <div style={statsGridStyle}>
                <Stat label="Selectionnees" value={preview.totalTargeted} />
                <Stat label="Joignables" value={preview.sendableCount} />
                <Stat label="Ignorees" value={preview.skippedCount} />
              </div>
              <div style={previewBoxStyle}>{preview.renderedPreview || "Aucun contenu a afficher."}</div>
            </>
          )}
        </div>

        {error && <div style={errorStyle}>{error}</div>}
        {success && <div style={successStyle}>{success}</div>}

        <button className={modalStyles.submitBtn} onClick={handleSend} disabled={!canSend} type="button">
          {isSending ? "Envoi..." : "Envoyer le template"}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={statCardStyle}>
      <strong style={{ fontSize: "1.2rem", color: "var(--tertiary)" }}>{value}</strong>
      <span style={{ color: "#6b5b58", fontSize: "0.78rem", fontWeight: 700 }}>{label}</span>
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  background: "#fffdfd",
  border: "1px solid #eadfd9",
  borderRadius: "16px",
  padding: "18px",
  display: "grid",
  gap: "12px",
  marginBottom: "16px",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "0.9rem",
  fontWeight: 800,
  color: "#4a2a2f",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const chipsStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const chipStyle: React.CSSProperties = {
  background: "#f8eee8",
  border: "1px solid #ead8cf",
  borderRadius: "999px",
  padding: "7px 12px",
  fontSize: "0.8rem",
  color: "#7a2637",
  fontWeight: 700,
};

const templateButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #E5D8D1",
  borderRadius: "14px",
  padding: "14px 16px",
  background: "white",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  cursor: "pointer",
};

const templateMetaStyle: React.CSSProperties = {
  fontSize: "0.76rem",
  fontWeight: 800,
  color: "#7a2637",
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "12px",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  marginBottom: "12px",
};

const statCardStyle: React.CSSProperties = {
  background: "#faf4f4",
  border: "1px solid #eadfd9",
  borderRadius: "14px",
  display: "grid",
  gap: "4px",
  justifyItems: "center",
  padding: "14px 10px",
};

const previewBoxStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #eadfd9",
  borderRadius: "14px",
  color: "#333",
  lineHeight: 1.6,
  minHeight: "110px",
  padding: "14px",
  whiteSpace: "pre-wrap",
};

const mutedStyle: React.CSSProperties = {
  color: "#6b5b58",
  fontSize: "0.92rem",
};

const errorStyle: React.CSSProperties = {
  background: "#fff1f1",
  border: "1px solid #efc4c4",
  borderRadius: "14px",
  color: "#b42318",
  padding: "12px 14px",
  marginBottom: "12px",
};

const successStyle: React.CSSProperties = {
  background: "#f1fbf4",
  border: "1px solid #bfe7c9",
  borderRadius: "14px",
  color: "#286b3b",
  padding: "12px 14px",
  marginBottom: "12px",
};
