"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import styles from "./GlobalHeader.module.css";
import { markAllNotificationsRead } from "../actions/appointmentActions";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

export default function NotificationBell(props: {
  initialUnreadCount: number;
  initialNotifications: NotificationItem[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>(props.initialNotifications);
  const [unreadCount, setUnreadCount] = useState<number>(props.initialUnreadCount);
  const [isMarkingRead, setIsMarkingRead] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    if (isMarkingRead) return;
    setIsMarkingRead(true);
    try {
      const res = await markAllNotificationsRead();
      if (res?.success) {
        const nowIso = new Date().toISOString();
        setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? nowIso })));
        setUnreadCount(0);
      }
    } finally {
      setIsMarkingRead(false);
    }
  };

  return (
    <div className={styles.notificationWrapper} ref={dropdownRef}>
      <button className={styles.notificationBtn} onClick={() => setIsOpen(!isOpen)}>
        <Image src="/icones/notifications.svg" alt="Notifications" width={20} height={20} />
        {unreadCount > 0 && <span className={styles.notificationBadge}>{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className={styles.notificationDropdown}>
          <div className={styles.notificationDropdownHeader}>
            <h3>Notifications</h3>
            <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>×</button>
          </div>
          <div className={styles.notificationList}>
            {notifications.length === 0 ? (
              <div className={styles.notificationItem}>
                <div className={styles.notificationDot} style={{ backgroundColor: "transparent" }}></div>
                <div className={styles.notificationContent}>
                  <p style={{ color: "#888" }}>Aucune notification</p>
                </div>
              </div>
            ) : (
              notifications.map((n) => {
                const when = new Date(n.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
                const isUnread = !n.readAt;
                return (
                  <div key={n.id} className={styles.notificationItem}>
                    <div
                      className={styles.notificationDot}
                      style={{ backgroundColor: isUnread ? undefined : "transparent" }}
                    ></div>
                    <div className={styles.notificationContent}>
                      <p><strong>{n.title}</strong></p>
                      <p style={{ color: "#666", fontSize: "0.85rem", marginTop: "4px" }}>{n.body}</p>
                      <span>{when}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className={styles.notificationFooter}>
            <button onClick={handleMarkAllRead} disabled={unreadCount === 0 || isMarkingRead}>
              {isMarkingRead ? "..." : "Marquer tout comme lu"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
