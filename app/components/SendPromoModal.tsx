"use client";

import React, { useEffect, useMemo, useState } from "react";
import styles from "./NewAppointmentModal.module.css";

type TargetSegment = "ALL" | "TOP_CLIENTS" | "INACTIVE";
type CampaignChannel = "SMS" | "EMAIL" | "MOCK";

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

type SendCampaignResponse = {
  success: boolean;
  error?: string;
  sentCount?: number;
  failedCount?: number;
  skippedCount?: number;
  errorSummary?: string | null;
  recipientErrors?: Array<{
    clientId: string;
    clientName: string;
    to: string;
    error: string;
  }>;
};

interface SendPromoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SEGMENTS: Array<{ value: TargetSegment; label: string; help: string }> = [
  { value: "ALL", label: "Toutes", help: "Clientes actives du compte" },
  { value: "TOP_CLIENTS", label: "Top clientes", help: "CA estime, puis nombre de visites" },
  { value: "INACTIVE", label: "Inactives", help: "Sans activite recente depuis 90 jours" },
];

const CHANNELS: Array<{ value: CampaignChannel; label: string }> = [
  { value: "MOCK", label: "Simulation" },
  { value: "SMS", label: "SMS" },
  { value: "EMAIL", label: "Email" },
];

export default function SendPromoModal({ isOpen, onClose }: SendPromoModalProps) {
  const [targetSegment, setTargetSegment] = useState<TargetSegment>("ALL");
  const [channel, setChannel] = useState<CampaignChannel>("MOCK");
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
        if (!data.success) throw new Error(data.error || "Templates indisponibles");
        setTemplates(data.templates || []);
        setSelectedTemplateId(data.templates?.[0]?.id || "");
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
    if (!isOpen || !selectedTemplateId) {
      setPreview(null);
      return;
    }

    const controller = new AbortController();
    setIsLoadingPreview(true);
    setError("");

    fetch("/api/campaigns/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetSegment, templateId: selectedTemplateId, channel }),
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
  }, [channel, isOpen, selectedTemplateId, targetSegment]);

  if (!isOpen) return null;

  const isMockMode = channel === "MOCK" || preview?.providerMode === "mock";
  const currentPreview = preview;
  const canSend =
    Boolean(selectedTemplateId) &&
    currentPreview !== null &&
    currentPreview.totalTargeted > 0 &&
    currentPreview.sendableCount > 0 &&
    !isLoadingPreview &&
    !isSending;

  const handleSend = async () => {
    if (!canSend || !preview || !selectedTemplate) return;

    const confirmMessage = isMockMode
      ? `Lancer une simulation pour ${preview.sendableCount} cliente(s) joignable(s) ?`
      : `Envoyer un vrai ${channel} a ${preview.sendableCount} cliente(s) ? Cette action peut generer des couts.`;

    if (!window.confirm(confirmMessage)) return;

    setIsSending(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/campaigns/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetSegment, templateId: selectedTemplateId, channel }),
      });
      const data = await response.json() as SendCampaignResponse;
      if (!data.success) throw new Error(data.error || "Envoi impossible");

      const details = data.errorSummary ? ` Raison : ${data.errorSummary}` : "";
      const resultMessage = `${isMockMode ? "Simulation terminee" : "Campagne traitee"} : ${data.sentCount || 0} envoyee(s), ${data.failedCount || 0} echec(s), ${data.skippedCount || 0} ignoree(s).${details}`;
      if ((data.failedCount || 0) > 0 && (data.sentCount || 0) === 0) {
        setError(resultMessage);
      } else {
        setSuccess(resultMessage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'envoyer la campagne");
    } finally {
      setIsSending(false);
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
          <h1 className={styles.title}>Envoyer une campagne</h1>
        </div>

        {isMockMode && (
          <div style={noticeStyle}>
            Mode simulation : aucun SMS/email reel ne sera envoye. Les destinataires seront journalises.
          </div>
        )}

        {!isMockMode && (
          <div style={warningStyle}>
            Envoi reel active : verifiez la cible et le message avant confirmation.
          </div>
        )}

        <div className={styles.sectionWhite}>
          <div className={styles.sectionTitle}>1. Selectionner la cible</div>
          <div className={styles.categoryTabs}>
            {SEGMENTS.map((segment) => (
              <button
                key={segment.value}
                className={`${styles.categoryBtn} ${targetSegment === segment.value ? styles.active : ""}`}
                onClick={() => setTargetSegment(segment.value)}
                style={{ padding: "10px 12px", flex: 1 }}
                type="button"
                title={segment.help}
              >
                {segment.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.sectionWhite}>
          <div className={styles.sectionTitle}>2. Canal</div>
          <div className={styles.categoryTabs}>
            {CHANNELS.map((item) => (
              <button
                key={item.value}
                className={`${styles.categoryBtn} ${channel === item.value ? styles.active : ""}`}
                onClick={() => setChannel(item.value)}
                style={{ padding: "10px 12px", flex: 1 }}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.sectionPink} style={{ padding: "20px" }}>
          <div className={styles.sectionTitle}>3. Selectionner un template</div>

          {isLoadingTemplates && <div style={mutedStyle}>Chargement des templates...</div>}

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => {
                  setSelectedTemplateId(template.id);
                  if (channel !== "MOCK") setChannel(template.channel);
                }}
                type="button"
                style={{
                  ...templateButtonStyle,
                  borderColor: selectedTemplateId === template.id ? "var(--tertiary)" : "transparent",
                }}
              >
                <div style={templateIconStyle}>{template.channel}</div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#333" }}>{template.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "#666" }}>
                    {template.isSystem ? "Template systeme" : "Template personnalise"}
                  </div>
                </div>
                <div style={radioStyle(selectedTemplateId === template.id)}>
                  {selectedTemplateId === template.id && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.sectionWhite}>
          <div className={styles.sectionTitle}>4. Apercu avant envoi</div>
          {isLoadingPreview && <div style={mutedStyle}>Calcul de la cible...</div>}
          {!isLoadingPreview && preview && (
            <>
              <div style={statsGridStyle}>
                <Stat label="Ciblees" value={preview.totalTargeted} />
                <Stat label="Joignables" value={preview.sendableCount} />
                <Stat label="Ignorees" value={preview.skippedCount} />
              </div>
              <div style={previewBoxStyle}>{preview.renderedPreview || "Aucun message a afficher."}</div>
              {preview.skippedCount > 0 && (
                <div style={mutedStyle}>
                  {preview.skippedCount} cliente(s) seront ignorees car le telephone ou l&apos;email manque pour ce canal.
                </div>
              )}
            </>
          )}
          {!isLoadingPreview && !preview && <div style={mutedStyle}>Selectionnez un template pour voir l&apos;apercu.</div>}
        </div>

        {error && <div style={errorStyle}>{error}</div>}
        {success && <div style={successStyle}>{success}</div>}

        <button className={styles.submitBtn} onClick={handleSend} disabled={!canSend} type="button">
          {isSending ? "Envoi..." : isMockMode ? "Simuler la campagne" : "Envoyer la campagne"}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "5px" }}>
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={statStyle}>
      <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--tertiary)" }}>{value}</div>
      <div style={{ fontSize: "0.72rem", color: "#666", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

const noticeStyle: React.CSSProperties = {
  background: "#EEF7F0",
  border: "1px solid #B7DCC0",
  borderRadius: "12px",
  color: "#2F6840",
  fontSize: "0.85rem",
  marginBottom: "16px",
  padding: "12px",
};

const warningStyle: React.CSSProperties = {
  ...noticeStyle,
  background: "#FFF6E8",
  border: "1px solid #E8C27A",
  color: "#7A4D00",
};

const mutedStyle: React.CSSProperties = {
  color: "#666",
  fontSize: "0.85rem",
};

const errorStyle: React.CSSProperties = {
  background: "#FDECEC",
  border: "1px solid #F0B6B6",
  borderRadius: "12px",
  color: "#8A2D2D",
  fontSize: "0.85rem",
  marginBottom: "12px",
  padding: "12px",
};

const successStyle: React.CSSProperties = {
  ...noticeStyle,
  marginTop: 0,
};

const templateButtonStyle: React.CSSProperties = {
  alignItems: "center",
  background: "white",
  border: "2px solid transparent",
  borderRadius: "12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  cursor: "pointer",
  display: "flex",
  gap: "15px",
  padding: "15px",
  transition: "all 0.2s",
  width: "100%",
};

const templateIconStyle: React.CSSProperties = {
  alignItems: "center",
  background: "var(--secondary)",
  borderRadius: "10px",
  color: "var(--tertiary)",
  display: "flex",
  fontSize: "0.7rem",
  fontWeight: 800,
  height: "40px",
  justifyContent: "center",
  width: "46px",
};

function radioStyle(active: boolean): React.CSSProperties {
  return {
    alignItems: "center",
    background: active ? "var(--tertiary)" : "transparent",
    border: `2px solid ${active ? "var(--tertiary)" : "#CCC"}`,
    borderRadius: "50%",
    display: "flex",
    height: "20px",
    justifyContent: "center",
    width: "20px",
  };
}

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "10px",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  marginBottom: "14px",
};

const statStyle: React.CSSProperties = {
  background: "#FFFDFD",
  border: "1px solid #EEE",
  borderRadius: "10px",
  padding: "12px",
  textAlign: "center",
};

const previewBoxStyle: React.CSSProperties = {
  background: "#FFFDFD",
  border: "1px solid #E8E1E1",
  borderRadius: "12px",
  color: "#333",
  fontSize: "0.9rem",
  lineHeight: 1.5,
  marginBottom: "10px",
  minHeight: "72px",
  padding: "14px",
  whiteSpace: "pre-wrap",
};
