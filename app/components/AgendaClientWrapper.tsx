"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import styles from "../dashboard/agenda/agenda.module.css";
import SessionModal from "./SessionModal";
import PaymentModal from "./PaymentModal";
import NewAppointmentModal from "./NewAppointmentModal";
import { deleteAppointment, updateAppointmentStatus } from "../actions/appointmentActions";
import { deleteAvailabilityException, saveAvailabilityException, saveBookingSettings } from "../actions/publicPageActions";
import {
  getAppointmentFinancialSummary,
  getAppointmentPaymentLabel,
} from "../../lib/appointmentFinance";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_TRANSITION_LABELS,
  type AppointmentStatusValue,
  getAllowedAppointmentStatusTransitions,
} from "../../lib/appointmentStatus";

import { exportElementToPDF } from "../../lib/exportUtils";
import { useRouter, useSearchParams } from "next/navigation";

type AgendaClient = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
};

type AgendaService = {
  id: string;
  name: string;
  durationMin: number;
  price: number | string;
  color?: string | null;
};

type AgendaAppointment = {
  id: string;
  scheduledAt: string;
  endAt: string;
  status: AppointmentStatusValue;
  paymentStatus: string;
  price?: number | null;
  depositAmount?: number | null;
  depositPaidAmount?: number | null;
  paidAmount?: number | null;
  remainingAmount?: number | null;
  paymentMethod?: string | null;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  expiresAt?: string | null;
  notes?: string;
  clientId: string;
  serviceId: string;
  client: AgendaClient;
  service: AgendaService;
  appointmentServices?: Array<{
    serviceId: string;
    name: string;
    durationMin: number;
    price: number;
    position: number;
  }>;
};

type BookingDay = {
  isOpen: boolean;
  start: string;
  end: string;
  breaks: Array<{ start: string; end: string }>;
};

type AgendaBookingSettings = {
  days: BookingDay[];
  minBookingNoticeMin: number;
  slotIntervalMin: number;
  bufferMin: number;
  depositsEnabled: boolean;
  depositsRequired: boolean;
  depositAmount: number;
  depositType: "fixed" | "percent";
  pendingBookingTtlMin: number;
};

type AgendaAvailabilityException = {
  id: string;
  type: "VACATION" | "ABSENCE" | "PERSONAL_APPOINTMENT" | "TRAINING" | "OTHER";
  title: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  notes: string;
};

type CalendarSelection = {
  dayIndex: number;
  startSlotIndex: number;
  endSlotIndex: number;
  menuX: number;
  menuY: number;
};

type ManagedCalendarItem =
  | {
      kind: "exception";
      id: string;
      type: AgendaAvailabilityException["type"];
      title: string;
      startAt: string;
      endAt: string;
      allDay: boolean;
      notes: string;
      menuX: number;
      menuY: number;
    }
  | {
      kind: "pause";
      dayIndex: number;
      breakIndex: number;
      start: string;
      end: string;
      menuX: number;
      menuY: number;
    };

type TouchCalendarGesture = {
  mode: "pending" | "scrolling" | "selecting";
  dayIndex: number;
  slotIndex: number;
  startX: number;
  startY: number;
};

const CALENDAR_START_HOUR = 7;
const CALENDAR_END_HOUR = 22;
const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 28;
const TOUCH_DIRECTION_THRESHOLD_PX = 8;
const DEFAULT_EVENT_COLOR = "#8B4B54";

function normalizeHexColor(color?: string | null) {
  const value = color?.trim();
  if (!value) return DEFAULT_EVENT_COLOR;

  const shortHex = value.match(/^#([0-9a-fA-F]{3})$/);
  if (shortHex) {
    return `#${shortHex[1].split("").map((char) => `${char}${char}`).join("")}`;
  }

  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : DEFAULT_EVENT_COLOR;
}

function hexToRgb(hex: string) {
  const normalized = normalizeHexColor(hex).slice(1);
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function mixColorWithBlack(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex);
  const ratio = Math.max(0, Math.min(amount, 1));
  const toHex = (channel: number) => Math.round(channel * (1 - ratio)).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getServiceEventStyle(color?: string | null): React.CSSProperties {
  const hex = normalizeHexColor(color);
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.18)`,
    borderLeft: `4px solid ${hex}`,
    color: luminance > 0.62 ? mixColorWithBlack(hex, 0.58) : mixColorWithBlack(hex, 0.18),
  };
}

function getPaymentBadgeClass(status: string | undefined, stylesMap: Record<string, string>) {
  switch (status) {
    case "deposit_pending":
      return stylesMap.paymentBadgeDepositPending;
    case "deposit_paid":
      return stylesMap.paymentBadgeDepositPaid;
    case "partial_paid":
      return stylesMap.paymentBadgePartialPaid;
    case "paid":
      return stylesMap.paymentBadgePaid;
    case "paid_offline":
      return stylesMap.paymentBadgePaidOffline;
    case "refunded":
      return stylesMap.paymentBadgeRefunded;
    default:
      return stylesMap.paymentBadgeNeutral;
  }
}

type PaymentSettings = {
  stripeConnected: boolean;
  stripeOnboardingComplete: boolean;
  paymentsEnabled: boolean;
  defaultDepositAmount: number;
  defaultDepositType: "fixed" | "percent";
};

const defaultBookingSettings: AgendaBookingSettings = {
  days: [
    { isOpen: false, start: "09:00", end: "18:00", breaks: [] },
    { isOpen: true, start: "09:00", end: "18:00", breaks: [] },
    { isOpen: true, start: "09:00", end: "18:00", breaks: [] },
    { isOpen: true, start: "09:00", end: "18:00", breaks: [] },
    { isOpen: true, start: "09:00", end: "18:00", breaks: [] },
    { isOpen: true, start: "09:00", end: "18:00", breaks: [] },
    { isOpen: true, start: "09:00", end: "18:00", breaks: [] },
  ],
  minBookingNoticeMin: 1440,
  slotIntervalMin: 30,
  bufferMin: 0,
  depositsEnabled: false,
  depositsRequired: false,
  depositAmount: 0,
  depositType: "fixed",
  pendingBookingTtlMin: 15,
};

const availabilityTypeLabels: Record<AgendaAvailabilityException["type"], string> = {
  VACATION: "Conge",
  ABSENCE: "Absence",
  PERSONAL_APPOINTMENT: "Rendez-vous personnel",
  TRAINING: "Formation",
  OTHER: "Blocage",
};

function parseTimeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return hours * 60 + minutes;
}

function toDatetimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function datetimeLocalToIso(value: string, fallback: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function getViewportMenuPosition(
  clientX: number,
  clientY: number,
  kind: "selection" | "managed"
) {
  const margin = 16;
  const offset = 12;
  const menuSize = kind === "managed"
    ? { width: 380, height: 560 }
    : { width: 320, height: 330 };

  if (typeof window === "undefined") {
    return { x: clientX + offset, y: clientY + offset };
  }

  let x = clientX + offset;
  let y = clientY + offset;

  if (x + menuSize.width > window.innerWidth - margin) {
    x = clientX - menuSize.width - offset;
  }

  if (y + menuSize.height > window.innerHeight - margin) {
    y = clientY - menuSize.height - offset;
  }

  return {
    x: Math.max(margin, Math.min(x, window.innerWidth - menuSize.width - margin)),
    y: Math.max(margin, Math.min(y, window.innerHeight - menuSize.height - margin)),
  };
}

export type AgendaClientWrapperProps = { 
  appointments?: AgendaAppointment[];
  clients?: AgendaClient[];
  services?: AgendaService[];
  bookingSettings?: AgendaBookingSettings;
  availabilityExceptions?: AgendaAvailabilityException[];
  paymentSettings?: PaymentSettings;
  onlineBookingUnreadCount?: number;
  displayMode?: "page" | "panel";
};

export default function AgendaClientWrapper({ 
  appointments = [],
  clients = [],
  services = [],
  bookingSettings = defaultBookingSettings,
  availabilityExceptions = [],
  paymentSettings = {
    stripeConnected: false,
    stripeOnboardingComplete: false,
    paymentsEnabled: false,
    defaultDepositAmount: 0,
    defaultDepositType: "fixed",
  },
  displayMode = "page",
}: AgendaClientWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPanelMode = displayMode === "panel";
 const [isSessionModalOpen, setSessionModalOpen] = useState(false);
  const [selectedSessionAppointment, setSelectedSessionAppointment] = useState<AgendaAppointment | null>(null);

  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAppointmentData, setPaymentAppointmentData] = useState<AgendaAppointment | null>(null);

  const [isNewAppointmentModalOpen, setNewAppointmentModalOpen] = useState(false);
  const [appointmentToEdit, setAppointmentToEdit] = useState<AgendaAppointment | null>(null);
  const [initialAppointmentSlot, setInitialAppointmentSlot] = useState<Date | null>(null);
  const [initialAppointmentEndSlot, setInitialAppointmentEndSlot] = useState<Date | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [actionAppointmentId, setActionAppointmentId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [currentBookingSettings, setCurrentBookingSettings] = useState(bookingSettings);
  const [currentAvailabilityExceptions, setCurrentAvailabilityExceptions] = useState(availabilityExceptions);
  const [dragSelection, setDragSelection] = useState<CalendarSelection | null>(null);
  const [confirmedSelection, setConfirmedSelection] = useState<CalendarSelection | null>(null);
  const [managedItem, setManagedItem] = useState<ManagedCalendarItem | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const touchSelectionRef = useRef<CalendarSelection | null>(null);
  const touchGestureRef = useRef<TouchCalendarGesture | null>(null);
  const isTouchSelectingRef = useRef(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setCurrentBookingSettings(bookingSettings);
    setManagedItem(null);
  }, [bookingSettings]);

  useEffect(() => {
    setCurrentAvailabilityExceptions(availabilityExceptions);
    setManagedItem(null);
  }, [availabilityExceptions]);

  // Mettre à jour l'heure toutes les minutes pour la ligne rouge
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (searchParams.get("payment") !== "success") return;

    const refreshToken =
      searchParams.get("session_id") ||
      searchParams.get("appointmentId") ||
      "stripe-payment-success";
    const storageKey = `agenda-stripe-refresh:${refreshToken}`;

    if (window.sessionStorage.getItem(storageKey) === "done") return;

    window.sessionStorage.setItem(storageKey, "done");
    router.refresh();

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("payment");
    nextUrl.searchParams.delete("session_id");
    nextUrl.searchParams.delete("appointmentId");
    window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}`);
  }, [router, searchParams]);

  // Obtenir le lundi de la semaine courante
  const [isHistoryView, setIsHistoryView] = useState(false);

  // Pagination pour l'historique
  const [historyPage, setHistoryPage] = useState(1);
  const itemsPerPage = 10;
  const canUseStripePayments =
    paymentSettings.stripeConnected &&
    paymentSettings.stripeOnboardingComplete &&
    paymentSettings.paymentsEnabled;

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const [currentWeekStart, setCurrentWeekStart] = useState(() => getStartOfWeek(new Date()));
  const [activeFilter, setActiveFilter] = useState("Aujourd'hui");

  const calendarSlots = Array.from({ length: ((CALENDAR_END_HOUR - CALENDAR_START_HOUR) * 60) / SLOT_MINUTES }).map((_, index) => {
    const totalMinutes = CALENDAR_START_HOUR * 60 + index * SLOT_MINUTES;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return {
      hour,
      minute,
      label: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
    };
  });

  const changeWeek = (offset: number) => {
    clearSelection();
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + offset * 7);
    setCurrentWeekStart(newDate);
    setActiveFilter(""); // Désactive le filtre si on navigue manuellement
  };

  const handleFilterClick = (filter: string) => {
    clearSelection();
    setActiveFilter(filter);
    const today = new Date();
    if (filter === "Aujourd'hui" || filter === "Cette semaine" || filter === "Ce mois") {
      setCurrentWeekStart(getStartOfWeek(today));
    } else if (filter === "Demain") {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      setCurrentWeekStart(getStartOfWeek(tomorrow));
    }
  };

  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const activeSelection = dragSelection || confirmedSelection;

  function getDateForSlot(day: Date, slotIndex: number) {
    if (slotIndex >= calendarSlots.length) {
      const date = new Date(day);
      date.setHours(CALENDAR_END_HOUR, 0, 0, 0);
      return date;
    }

    const slot = calendarSlots[Math.min(Math.max(slotIndex, 0), calendarSlots.length - 1)];
    const date = new Date(day);
    date.setHours(slot.hour, slot.minute, 0, 0);
    return date;
  }

  function getSelectionBounds(selection: CalendarSelection) {
    const day = weekDays[selection.dayIndex];
    const startIndex = Math.min(selection.startSlotIndex, selection.endSlotIndex);
    const endIndex = Math.max(selection.startSlotIndex, selection.endSlotIndex) + 1;
    return {
      day,
      startIndex,
      endIndex,
      startAt: getDateForSlot(day, startIndex),
      endAt: getDateForSlot(day, endIndex),
    };
  }

  function isSlotSelected(dayIndex: number, slotIndex: number) {
    if (!activeSelection || activeSelection.dayIndex !== dayIndex) return false;
    const start = Math.min(activeSelection.startSlotIndex, activeSelection.endSlotIndex);
    const end = Math.max(activeSelection.startSlotIndex, activeSelection.endSlotIndex);
    return slotIndex >= start && slotIndex <= end;
  }

  function startSlotSelection(dayIndex: number, slotIndex: number, event: React.MouseEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    const position = getViewportMenuPosition(event.clientX, event.clientY, "selection");
    setConfirmedSelection(null);
    setDragSelection({
      dayIndex,
      startSlotIndex: slotIndex,
      endSlotIndex: slotIndex,
      menuX: position.x,
      menuY: position.y,
    });
  }

  function extendSlotSelection(dayIndex: number, slotIndex: number) {
    setDragSelection((current) => {
      if (!current || current.dayIndex !== dayIndex) return current;
      return { ...current, endSlotIndex: slotIndex };
    });
  }

  function finishSlotSelection(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragSelection((current) => {
      if (!current) return null;
      const position = getViewportMenuPosition(event.clientX, event.clientY, "selection");
      setConfirmedSelection({
        ...current,
        menuX: position.x,
        menuY: position.y,
      });
      return null;
    });
  }

  function getSlotFromTouch(touch: React.Touch | Touch) {
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!(target instanceof Element)) return null;

    const cell = target.closest<HTMLElement>("[data-calendar-slot='true']");
    if (!cell) return null;

    const dayIndex = Number(cell.dataset.dayIndex);
    const slotIndex = Number(cell.dataset.slotIndex);
    if (!Number.isInteger(dayIndex) || !Number.isInteger(slotIndex)) return null;

    return { dayIndex, slotIndex };
  }

  function startTouchSlotSelection(dayIndex: number, slotIndex: number, event: React.TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 1) return;

    const touch = event.touches[0];
    touchGestureRef.current = {
      mode: "pending",
      dayIndex,
      slotIndex,
      startX: touch.clientX,
      startY: touch.clientY,
    };
    isTouchSelectingRef.current = false;
    touchSelectionRef.current = null;
    setDragSelection(null);
  }

  function moveTouchSlotSelection(event: React.TouchEvent<HTMLDivElement>) {
    const gesture = touchGestureRef.current;
    if (!gesture || event.touches.length !== 1) return;

    const touch = event.touches[0];
    const deltaX = Math.abs(touch.clientX - gesture.startX);
    const deltaY = Math.abs(touch.clientY - gesture.startY);

    if (gesture.mode === "pending") {
      if (deltaX <= TOUCH_DIRECTION_THRESHOLD_PX && deltaY <= TOUCH_DIRECTION_THRESHOLD_PX) return;

      if (deltaX > deltaY && deltaX > TOUCH_DIRECTION_THRESHOLD_PX) {
        touchGestureRef.current = { ...gesture, mode: "scrolling" };
        isTouchSelectingRef.current = false;
        touchSelectionRef.current = null;
        setDragSelection(null);
        return;
      }

      if (deltaY > deltaX && deltaY > TOUCH_DIRECTION_THRESHOLD_PX) {
        const position = getViewportMenuPosition(touch.clientX, touch.clientY, "selection");
        const slot = getSlotFromTouch(touch);
        const selection = {
          dayIndex: gesture.dayIndex,
          startSlotIndex: gesture.slotIndex,
          endSlotIndex: slot?.dayIndex === gesture.dayIndex ? slot.slotIndex : gesture.slotIndex,
          menuX: position.x,
          menuY: position.y,
        };

        event.preventDefault();
        event.stopPropagation();
        touchGestureRef.current = { ...gesture, mode: "selecting" };
        isTouchSelectingRef.current = true;
        touchSelectionRef.current = selection;
        setConfirmedSelection(null);
        setDragSelection(selection);
        return;
      }
    }

    if (gesture.mode === "scrolling") return;

    event.preventDefault();
    event.stopPropagation();

    const slot = getSlotFromTouch(touch);
    const current = touchSelectionRef.current;
    if (!slot || !current || slot.dayIndex !== current.dayIndex) return;

    const position = getViewportMenuPosition(touch.clientX, touch.clientY, "selection");
    const nextSelection = {
      ...current,
      endSlotIndex: slot.slotIndex,
      menuX: position.x,
      menuY: position.y,
    };

    touchSelectionRef.current = nextSelection;
    setDragSelection(nextSelection);
  }

  function finishTouchSlotSelection(event: React.TouchEvent<HTMLDivElement>) {
    const gesture = touchGestureRef.current;
    if (!gesture) return;

    if (gesture.mode !== "selecting" || !isTouchSelectingRef.current) {
      touchGestureRef.current = null;
      isTouchSelectingRef.current = false;
      touchSelectionRef.current = null;
      setDragSelection(null);
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const touch = event.changedTouches[0];
    const current = touchSelectionRef.current;
    const position = touch
      ? getViewportMenuPosition(touch.clientX, touch.clientY, "selection")
      : current
        ? { x: current.menuX, y: current.menuY }
        : null;

    if (current && position) {
      setConfirmedSelection({
        ...current,
        menuX: position.x,
        menuY: position.y,
      });
    }

    touchGestureRef.current = null;
    isTouchSelectingRef.current = false;
    touchSelectionRef.current = null;
    setDragSelection(null);
  }

  function cancelTouchSlotSelection(event: React.TouchEvent<HTMLDivElement>) {
    const shouldPreventDefault = touchGestureRef.current?.mode === "selecting" && isTouchSelectingRef.current;

    if (shouldPreventDefault) {
      event.preventDefault();
      event.stopPropagation();
    }

    touchGestureRef.current = null;
    isTouchSelectingRef.current = false;
    touchSelectionRef.current = null;
    setDragSelection(null);
  }

  function clearSelection() {
    setDragSelection(null);
    setConfirmedSelection(null);
    touchGestureRef.current = null;
    touchSelectionRef.current = null;
    isTouchSelectingRef.current = false;
  }

  function formatSelectionRange(selection: CalendarSelection) {
    const bounds = getSelectionBounds(selection);
    return `${bounds.startAt.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "short" })} - ${bounds.startAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} / ${bounds.endAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  }

  function getExceptionBlocksForSlot(day: Date, slot: { hour: number; minute: number }) {
    return currentAvailabilityExceptions.filter((item) => {
      const startAt = new Date(item.startAt);
      const flooredMinute = Math.floor(startAt.getMinutes() / SLOT_MINUTES) * SLOT_MINUTES;
      return (
        startAt.getDate() === day.getDate() &&
        startAt.getMonth() === day.getMonth() &&
        startAt.getFullYear() === day.getFullYear() &&
        startAt.getHours() === slot.hour &&
        flooredMinute === slot.minute
      );
    });
  }

  function getPauseBlocksForSlot(day: Date, slot: { hour: number; minute: number }) {
    const daySettings = currentBookingSettings.days[day.getDay()];
    if (!daySettings?.breaks?.length) return [];
    const slotMinutes = slot.hour * 60 + slot.minute;

    return daySettings.breaks
      .map((pause, breakIndex) => ({
        ...pause,
        breakIndex,
        startMinutes: parseTimeToMinutes(pause.start),
        endMinutes: parseTimeToMinutes(pause.end),
      }))
      .filter((pause) => Math.floor(pause.startMinutes / SLOT_MINUTES) * SLOT_MINUTES === slotMinutes);
  }

  function openExceptionMenu(item: AgendaAvailabilityException, event: React.MouseEvent<HTMLDivElement>) {
    event.stopPropagation();
    const position = getViewportMenuPosition(event.clientX, event.clientY, "managed");
    setConfirmedSelection(null);
    setDragSelection(null);
    setManagedItem({
      kind: "exception",
      id: item.id,
      type: item.type,
      title: item.title,
      startAt: item.startAt,
      endAt: item.endAt,
      allDay: item.allDay,
      notes: item.notes,
      menuX: position.x,
      menuY: position.y,
    });
  }

  function openPauseMenu(dayIndex: number, breakIndex: number, pause: { start: string; end: string }, event: React.MouseEvent<HTMLDivElement>) {
    event.stopPropagation();
    const position = getViewportMenuPosition(event.clientX, event.clientY, "managed");
    setConfirmedSelection(null);
    setDragSelection(null);
    setManagedItem({
      kind: "pause",
      dayIndex,
      breakIndex,
      start: pause.start,
      end: pause.end,
      menuX: position.x,
      menuY: position.y,
    });
  }

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isCurrentWeek = () => {
    const now = new Date();
    const startOfThisWeek = getStartOfWeek(now);
    return startOfThisWeek.getTime() === currentWeekStart.getTime();
  };

  const getRedLinePosition = () => {
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const startMinutes = CALENDAR_START_HOUR * 60;
    const endMinutes = CALENDAR_END_HOUR * 60;

    if (currentMinutes <= startMinutes) return 0;
    if (currentMinutes >= endMinutes) {
      return calendarSlots.length * SLOT_HEIGHT;
    }

    return (currentMinutes - startMinutes) * (SLOT_HEIGHT / SLOT_MINUTES);
  };

  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

  const formatMonthYear = () => {
    return `${monthNames[currentWeekStart.getMonth()]} ${currentWeekStart.getFullYear()}`;
  };

  const formatWeekRange = () => {
    const start = weekDays[0];
    const end = weekDays[6];
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} - ${end.getDate()} ${monthNames[start.getMonth()]}`;
    } else {
      return `${start.getDate()} ${monthNames[start.getMonth()].substring(0, 3)}. - ${end.getDate()} ${monthNames[end.getMonth()]}`;
    }
  };

  const getFilteredAppointments = () => {
    if (isHistoryView) {
      // Pour l'historique : uniquement les rendez-vous passés
      const now = new Date();
      return appointments
        .filter(app => new Date(app.scheduledAt).getTime() < now.getTime())
        .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()); // Plus récent au plus ancien
    }

    return appointments.filter(app => {
      const appDate = new Date(app.scheduledAt);
      appDate.setHours(0, 0, 0, 0);

      if (activeFilter === "Aujourd'hui") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return appDate.getTime() === today.getTime();
      } else if (activeFilter === "Demain") {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return appDate.getTime() === tomorrow.getTime();
      } else if (activeFilter === "Cette semaine") {
        const weekStart = getStartOfWeek(new Date());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return appDate >= weekStart && appDate <= weekEnd;
      } else if (activeFilter === "Ce mois") {
        const today = new Date();
        return appDate.getMonth() === today.getMonth() && appDate.getFullYear() === today.getFullYear();
      }
      
      // Default / No specific string filter, just match current week
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(currentWeekStart.getDate() + 6);
      return appDate >= currentWeekStart && appDate <= weekEnd;
    }).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  };

  const filteredAppointments = getFilteredAppointments();
  const weeklyAppointments = appointments
    .filter((app) => {
      const appDate = new Date(app.scheduledAt);
      appDate.setHours(0, 0, 0, 0);
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(currentWeekStart.getDate() + 6);
      return appDate >= currentWeekStart && appDate <= weekEnd;
    })
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const getTodaySubtitle = () => {
    if (isHistoryView) return "HISTORIQUE DES RENDEZ-VOUS PASSÉS";
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    const dateStr = today.toLocaleDateString('fr-FR', options).toUpperCase();
    const todayCount = appointments.filter(app => {
      const appDate = new Date(app.scheduledAt);
      return appDate.toDateString() === today.toDateString();
    }).length;
    return `${dateStr} - ${todayCount} RENDEZ-VOUS AUJOURD'HUI`;
  };

  const statusLabels = APPOINTMENT_STATUS_LABELS;
  const statusTransitionLabels = APPOINTMENT_STATUS_TRANSITION_LABELS;

  const formatMoneyFromCents = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount / 100);
  };

  const handleStatusChange = async (appointmentId: string, nextStatus: AppointmentStatusValue) => {
    setActionAppointmentId(appointmentId);
    setActionError(null);
    try {
      const res = await updateAppointmentStatus(appointmentId, nextStatus);
      if (!res.success) {
        setActionError(res.error || "Impossible de changer le statut.");
        return;
      }
      router.refresh();
    } catch (error) {
      console.error(error);
      setActionError("Une erreur inattendue est survenue.");
    } finally {
      setActionAppointmentId(null);
    }
  };

  function getAllowedStatusTransitions(app: AgendaAppointment) {
    return getAllowedAppointmentStatusTransitions({
      status: app.status,
      expiresAt: app.expiresAt,
      paymentStatus: app.paymentStatus,
      paidAmount: app.paidAmount,
      depositPaidAmount: app.depositPaidAmount,
    });
  }

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce rendez-vous ?')) return;

    setActionAppointmentId(appointmentId);
    setActionError(null);
    try {
      const res = await deleteAppointment(appointmentId);
      if (!res.success) {
        setActionError(res.error || "Impossible de supprimer ce rendez-vous.");
        return;
      }
      router.refresh();
    } catch (error) {
      console.error(error);
      setActionError("Une erreur inattendue est survenue.");
    } finally {
      setActionAppointmentId(null);
    }
  };

  const openCreateAppointmentAt = (day: Date, hour: number, minute: number, endAt?: Date | null) => {
    const scheduledAt = new Date(day);
    scheduledAt.setHours(hour, minute, 0, 0);
    setAppointmentToEdit(null);
    setInitialAppointmentSlot(scheduledAt);
    setInitialAppointmentEndSlot(endAt || null);
    setNewAppointmentModalOpen(true);
  };

  const openEditAppointment = (appointment: AgendaAppointment) => {
    setInitialAppointmentSlot(null);
    setInitialAppointmentEndSlot(null);
    setAppointmentToEdit(appointment);
    setNewAppointmentModalOpen(true);
  };

  const showSavedToast = () => {
    setToastMessage("Rendez-vous enregistre");
    window.setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCreatePaymentLink = async (appointmentId: string, paymentType: "deposit" | "full") => {
    if (!canUseStripePayments) {
      router.push("/settings/payments");
      return;
    }

    setActionAppointmentId(appointmentId);
    setActionError(null);

    try {
      const response = await fetch(`/api/appointments/${appointmentId}/create-payment-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentType }),
      });
      const data = await response.json();

      if (!response.ok || !data.url) {
        setActionError(data.error || "Impossible de cr?er le lien de paiement.");
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error(error);
      setActionError("Une erreur inattendue est survenue.");
    } finally {
      setActionAppointmentId(null);
    }
  };

  const handleSelectionCreateAppointment = () => {
    if (!confirmedSelection) return;
    const bounds = getSelectionBounds(confirmedSelection);
    openCreateAppointmentAt(bounds.startAt, bounds.startAt.getHours(), bounds.startAt.getMinutes(), bounds.endAt);
    clearSelection();
  };

  const saveSelectionException = async (type: AgendaAvailabilityException["type"], title: string) => {
    if (!confirmedSelection) return;

    const bounds = getSelectionBounds(confirmedSelection);
    setActionError(null);

    try {
      const result = await saveAvailabilityException({
        type,
        title,
        startAt: bounds.startAt.toISOString(),
        endAt: bounds.endAt.toISOString(),
        allDay: false,
        notes: "Cree depuis l'agenda",
      });

      if (!result.success) {
        setActionError(result.error);
        return;
      }

      setCurrentAvailabilityExceptions((current) => [...current, result.exception]);
      setToastMessage(`${title} ajoute`);
      window.setTimeout(() => setToastMessage(null), 2500);
      clearSelection();
      router.refresh();
    } catch (error) {
      console.error(error);
      setActionError("Impossible d'ajouter ce blocage.");
    }
  };

  const saveSelectionPause = async () => {
    if (!confirmedSelection) return;

    const bounds = getSelectionBounds(confirmedSelection);
    const dayKey = bounds.day.getDay();
    const pause = {
      start: bounds.startAt.toTimeString().slice(0, 5),
      end: bounds.endAt.toTimeString().slice(0, 5),
    };
    const nextSettings = {
      ...currentBookingSettings,
      days: currentBookingSettings.days.map((day, index) => (
        index === dayKey
          ? { ...day, isOpen: true, breaks: [...day.breaks, pause] }
          : day
      )),
    };

    setActionError(null);

    try {
      const result = await saveBookingSettings(nextSettings);
      if (!result.success) {
        setActionError(result.error);
        return;
      }

      setCurrentBookingSettings(result.bookingSettings);
      setToastMessage("Pause ajoutee aux horaires");
      window.setTimeout(() => setToastMessage(null), 2500);
      clearSelection();
      router.refresh();
    } catch (error) {
      console.error(error);
      setActionError("Impossible d'ajouter cette pause.");
    }
  };

  const updateManagedException = <K extends keyof Extract<ManagedCalendarItem, { kind: "exception" }>>(
    key: K,
    value: Extract<ManagedCalendarItem, { kind: "exception" }>[K]
  ) => {
    setManagedItem((current) => (
      current?.kind === "exception" ? { ...current, [key]: value } : current
    ));
  };

  const updateManagedPause = <K extends keyof Extract<ManagedCalendarItem, { kind: "pause" }>>(
    key: K,
    value: Extract<ManagedCalendarItem, { kind: "pause" }>[K]
  ) => {
    setManagedItem((current) => (
      current?.kind === "pause" ? { ...current, [key]: value } : current
    ));
  };

  const saveManagedException = async () => {
    if (!managedItem || managedItem.kind !== "exception") return;
    setActionError(null);

    try {
      const result = await saveAvailabilityException({
        id: managedItem.id,
        type: managedItem.type,
        title: managedItem.title,
        startAt: managedItem.startAt,
        endAt: managedItem.endAt,
        allDay: managedItem.allDay,
        notes: managedItem.notes,
      });

      if (!result.success) {
        setActionError(result.error);
        return;
      }

      setCurrentAvailabilityExceptions((current) => current.map((item) => (
        item.id === result.exception.id ? result.exception : item
      )));
      setManagedItem(null);
      setToastMessage("Blocage mis a jour");
      window.setTimeout(() => setToastMessage(null), 2500);
      router.refresh();
    } catch (error) {
      console.error(error);
      setActionError("Impossible de modifier cet element.");
    }
  };

  const deleteManagedException = async () => {
    if (!managedItem || managedItem.kind !== "exception") return;
    setActionError(null);

    try {
      const result = await deleteAvailabilityException(managedItem.id);
      if (!result.success) {
        setActionError(result.error);
        return;
      }

      setCurrentAvailabilityExceptions((current) => current.filter((item) => item.id !== managedItem.id));
      setManagedItem(null);
      setToastMessage("Blocage supprime");
      window.setTimeout(() => setToastMessage(null), 2500);
      router.refresh();
    } catch (error) {
      console.error(error);
      setActionError("Impossible de supprimer cet element.");
    }
  };

  const makeManagedExceptionRecurring = async () => {
    if (!managedItem || managedItem.kind !== "exception") return;
    const startAt = new Date(managedItem.startAt);
    const endAt = new Date(managedItem.endAt);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
      setActionError("La plage horaire est invalide.");
      return;
    }

    const dayIndex = startAt.getDay();
    const recurringBreak = {
      start: startAt.toTimeString().slice(0, 5),
      end: endAt.toTimeString().slice(0, 5),
    };
    const nextSettings = {
      ...currentBookingSettings,
      days: currentBookingSettings.days.map((day, index) => (
        index === dayIndex
          ? { ...day, isOpen: true, breaks: [...day.breaks, recurringBreak] }
          : day
      )),
    };

    setActionError(null);

    try {
      const result = await saveBookingSettings(nextSettings);
      if (!result.success) {
        setActionError(result.error);
        return;
      }

      setCurrentBookingSettings(result.bookingSettings);
      setManagedItem(null);
      setToastMessage("Blocage recurrent ajoute");
      window.setTimeout(() => setToastMessage(null), 2500);
      router.refresh();
    } catch (error) {
      console.error(error);
      setActionError("Impossible de rendre ce blocage recurrent.");
    }
  };

  const saveManagedPause = async () => {
    if (!managedItem || managedItem.kind !== "pause") return;
    setActionError(null);

    const nextSettings = {
      ...currentBookingSettings,
      days: currentBookingSettings.days.map((day, index) => {
        if (index !== managedItem.dayIndex) return day;
        return {
          ...day,
          breaks: day.breaks.map((pause, breakIndex) => (
            breakIndex === managedItem.breakIndex
              ? { start: managedItem.start, end: managedItem.end }
              : pause
          )),
        };
      }),
    };

    try {
      const result = await saveBookingSettings(nextSettings);
      if (!result.success) {
        setActionError(result.error);
        return;
      }

      setCurrentBookingSettings(result.bookingSettings);
      setManagedItem(null);
      setToastMessage("Pause mise a jour");
      window.setTimeout(() => setToastMessage(null), 2500);
      router.refresh();
    } catch (error) {
      console.error(error);
      setActionError("Impossible de modifier cette pause.");
    }
  };

  const deleteManagedPause = async () => {
    if (!managedItem || managedItem.kind !== "pause") return;
    setActionError(null);

    const nextSettings = {
      ...currentBookingSettings,
      days: currentBookingSettings.days.map((day, index) => {
        if (index !== managedItem.dayIndex) return day;
        return {
          ...day,
          breaks: day.breaks.filter((_, breakIndex) => breakIndex !== managedItem.breakIndex),
        };
      }),
    };

    try {
      const result = await saveBookingSettings(nextSettings);
      if (!result.success) {
        setActionError(result.error);
        return;
      }

      setCurrentBookingSettings(result.bookingSettings);
      setManagedItem(null);
      setToastMessage("Pause supprimee");
      window.setTimeout(() => setToastMessage(null), 2500);
      router.refresh();
    } catch (error) {
      console.error(error);
      setActionError("Impossible de supprimer cette pause.");
    }
  };

  const selectionActionMenu = confirmedSelection ? (
    <div
      className={styles.slotActionMenu}
      style={{
        left: `${confirmedSelection.menuX}px`,
        top: `${confirmedSelection.menuY}px`,
      }}
    >
      <strong>{formatSelectionRange(confirmedSelection)}</strong>
      <button type="button" onClick={handleSelectionCreateAppointment}>Creer un rendez-vous</button>
      <button type="button" onClick={() => saveSelectionException("OTHER", "Creneau bloque")}>Bloquer ce creneau</button>
      <button type="button" onClick={saveSelectionPause}>Ajouter une pause</button>
      <button type="button" onClick={() => saveSelectionException("ABSENCE", "Indisponibilite")}>Ajouter une indisponibilite</button>
      <button type="button" disabled title="Architecture a brancher sur une future recurrence">
        Ajouter une recurrence
      </button>
      <button type="button" onClick={clearSelection}>Annuler</button>
    </div>
  ) : null;

  const managedEventMenu = managedItem ? (
    <div
      className={styles.managedEventMenu}
      style={{
        left: `${managedItem.menuX}px`,
        top: `${managedItem.menuY}px`,
      }}
    >
      {managedItem.kind === "exception" ? (
        <>
          <strong>{managedItem.title || availabilityTypeLabels[managedItem.type]}</strong>
          <label>
            Type
            <select
              value={managedItem.type}
              onChange={(event) => updateManagedException("type", event.target.value as AgendaAvailabilityException["type"])}
            >
              {Object.entries(availabilityTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            Titre
            <input
              value={managedItem.title}
              onChange={(event) => updateManagedException("title", event.target.value)}
            />
          </label>
          <label>
            Debut
            <input
              type="datetime-local"
              value={toDatetimeLocal(managedItem.startAt)}
              onChange={(event) => updateManagedException("startAt", datetimeLocalToIso(event.target.value, managedItem.startAt))}
            />
          </label>
          <label>
            Fin
            <input
              type="datetime-local"
              value={toDatetimeLocal(managedItem.endAt)}
              onChange={(event) => updateManagedException("endAt", datetimeLocalToIso(event.target.value, managedItem.endAt))}
            />
          </label>
          <label>
            Notes
            <textarea
              value={managedItem.notes}
              onChange={(event) => updateManagedException("notes", event.target.value)}
              rows={3}
            />
          </label>
          <div className={styles.managedEventActions}>
            <button type="button" onClick={saveManagedException}>Modifier</button>
            <button type="button" onClick={deleteManagedException}>Supprimer</button>
            <button type="button" onClick={makeManagedExceptionRecurring}>Rendre recurrent</button>
            <button type="button" onClick={() => setManagedItem(null)}>Fermer</button>
          </div>
        </>
      ) : (
        <>
          <strong>Pause recurrente</strong>
          <label>
            Debut
            <input
              type="time"
              value={managedItem.start}
              onChange={(event) => updateManagedPause("start", event.target.value)}
            />
          </label>
          <label>
            Fin
            <input
              type="time"
              value={managedItem.end}
              onChange={(event) => updateManagedPause("end", event.target.value)}
            />
          </label>
          <div className={styles.managedEventActions}>
            <button type="button" onClick={saveManagedPause}>Modifier</button>
            <button type="button" onClick={deleteManagedPause}>Supprimer</button>
            <button type="button" disabled>Deja recurrente</button>
            <button type="button" onClick={() => setManagedItem(null)}>Fermer</button>
          </div>
        </>
      )}
    </div>
  ) : null;

  return (
    <main className={`${styles.layout} ${isPanelMode ? styles.panelLayout : ""}`}>
      {isMounted && (selectionActionMenu || managedEventMenu) && createPortal(
        <>
          {selectionActionMenu}
          {managedEventMenu}
        </>,
        document.body
      )}

      {!isPanelMode && (
        <>
      {/* Header Section */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>{isHistoryView ? "Historique" : "Mon Agenda"}</h1>
          <p className={styles.subtitle}>{getTodaySubtitle()}</p>
        </div>
        {toastMessage && <div className={styles.toastMessage}>{toastMessage}</div>}
        <div className={styles.headerActions}>
          {!isHistoryView && (
            <button
              className={styles.btnPrimary}
              onClick={() => {
                setAppointmentToEdit(null);
                setInitialAppointmentSlot(null);
                setNewAppointmentModalOpen(true);
              }}
            >
              + Nouveau RDV
            </button>
          )}
          <button 
            className={isHistoryView ? styles.btnPrimary : styles.btnSecondary} 
            onClick={() => setIsHistoryView(!isHistoryView)}
          >
            {isHistoryView ? "Retour à l'agenda" : "Historique des RDV"}
          </button>
        </div>
      </header>

      {!isHistoryView && (
        <section className={styles.filterCard}>
          <div className={styles.filterIcon}>
            <Image src="/icones/agenda.svg" alt="Calendrier" width={70} height={70} />
          </div>
          <div className={styles.filterControls}>
            <div className={styles.datePickerWrapper}>
              <input type="text" value={formatMonthYear()} className={styles.dateInput} readOnly />
              <Image src="/icones/agenda.svg" alt="Calendar Icon" width={20} height={20} className={styles.dateIcon} />
            </div>
            <div className={styles.filterPills}>
              {["Aujourd'hui", "Demain", "Cette semaine", "Ce mois"].map((filter) => (
                <button 
                  key={filter}
                  className={`${styles.pill} ${activeFilter === filter ? styles.active : ''}`}
                  onClick={() => handleFilterClick(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Liste des rendez-vous */}
      <section className={styles.listCard}>
        {actionError && (
          <div className={styles.errorAlert}>
            {actionError}
          </div>
        )}
        {filteredAppointments.length === 0 && (
          <div className={styles.emptyState}>
            Aucun rendez-vous {isHistoryView ? "dans l'historique" : "pour cette période"}
          </div>
        )}
        {(isHistoryView 
          ? filteredAppointments.slice((historyPage - 1) * itemsPerPage, historyPage * itemsPerPage) 
          : filteredAppointments
        ).map((app) => {
          const appDate = new Date(app.scheduledAt);
          const timeString = appDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          const dateString = appDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
          const finance = getAppointmentFinancialSummary(app);
          const paymentLabel = getAppointmentPaymentLabel(finance.paymentStatus);
          const paymentStatus = finance.paymentStatus;
          const paymentBadgeClass = getPaymentBadgeClass(paymentStatus, styles);
          const priceCents = finance.priceCents;
          const depositPaidCents = finance.depositPaidAmountCents;
          const remainingCents = finance.remainingAmountCents;
          const allowedStatusTransitions = getAllowedStatusTransitions(app);
          
          return (
            <div key={app.id} className={styles.appointmentItem}>
              {/* Bloc Temps */}
              <div className={styles.timeBlock}>
                <div className={styles.timeText}>{timeString}</div>
                <div className={styles.dateText}>{dateString}</div>
              </div>

              {/* Bloc Détails */}
              <div className={styles.detailsBlock}>
                <div className={styles.clientInfo}>
                  <div className={styles.clientName}>{app.client.name.toUpperCase()}</div>
                  <div className={styles.clientContact}>
                    {app.client.email} &nbsp;&nbsp; {app.client.phone}
                  </div>
                  <div className={styles.tags}>
                    <span className={styles.tag}>{app.service.name}</span>
                    {allowedStatusTransitions.length > 0 ? (
                      <select
                        className={styles.statusSelect}
                        value=""
                        disabled={actionAppointmentId === app.id}
                        onChange={(e) => {
                          const nextStatus = e.target.value as AppointmentStatusValue;
                          if (!nextStatus) return;
                          handleStatusChange(app.id, nextStatus);
                        }}
                        title={`Statut actuel : ${statusLabels[app.status]}`}
                      >
                        <option value="">Statut : {statusLabels[app.status]}</option>
                        {allowedStatusTransitions.map((value) => (
                          <option key={value} value={value}>{statusTransitionLabels[value]}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={styles.statusFinalBadge} title="Statut final">
                        {statusLabels[app.status]}
                      </span>
                    )}
                    <span className={`${styles.paymentBadge} ${paymentBadgeClass}`}>{paymentLabel}</span>
                  </div>
                  <div className={styles.paymentSummary}>
                    <span>
                      Total : {formatMoneyFromCents(priceCents)} · Arrhes encaissé : {formatMoneyFromCents(depositPaidCents)} · Reste : {formatMoneyFromCents(remainingCents)}
                    </span>
                  </div>
                  {app.notes && (
                    <div className={styles.appointmentNote}>
                      {app.notes}
                    </div>
                  )}
                </div>

                {/* Bloc Actions */}
                <div className={styles.actionsBlock}>
                  <div className={styles.topActions}>
                    <button className={styles.btnPlay} onClick={() => { setSelectedSessionAppointment(app); setSessionModalOpen(true); }}>
                      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="20" cy="20" r="20" fill="#8B4B54"/>
                        <path d="M26 20L16 26V14L26 20Z" fill="white"/>
                      </svg>
                    </button>
                    <button
                      className={styles.btnAfficher}
                      onClick={() => router.push(`/dashboard/clients?clientId=${encodeURIComponent(app.clientId)}&tab=infos`)}
                    >
                      AFFICHER
                    </button>
                  </div>
                  <div className={styles.paymentActions}>
                    <button
                      className={styles.paymentButton}
                      onClick={() => handleCreatePaymentLink(app.id, "deposit")}
                      disabled={actionAppointmentId === app.id || paymentStatus === "paid" || paymentStatus === "paid_offline" || paymentStatus === "deposit_paid"}
                    >
                      Demander les arrhes
                    </button>
                    <button
                      className={styles.paymentButtonSecondary}
                      onClick={() => handleCreatePaymentLink(app.id, "full")}
                      disabled={actionAppointmentId === app.id || paymentStatus === "paid" || paymentStatus === "paid_offline"}
                    >
                      Paiement complet
                    </button>
                  </div>
                  <div className={styles.bottomIcons}>
                    <button className={styles.iconBtn}>
                      <Image src="/icones/mail.svg" alt="Email" width={16} height={16} />
                    </button>
                    <button 
                      className={styles.iconBtn}
                      onClick={() => router.push(`/dashboard/clients?clientId=${app.clientId}&tab=consentement`)}
                      title="Gérer les consentements"
                    >
                      <Image src="/icones/doc.svg" alt="Doc" width={16} height={16} />
                    </button>
                    <button 
                      className={styles.iconBtn} 
                      onClick={() => openEditAppointment(app)}
                      title="Modifier"
                    >
                      <Image src="/icones/edit.svg" alt="Edit" width={16} height={16} />
                    </button>
                    <button 
                      className={styles.iconBtn} 
                      onClick={async () => {
                        await handleDeleteAppointment(app.id);
                      }}
                      disabled={actionAppointmentId === app.id}
                      title="Supprimer"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d32f2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Pagination pour l'historique */}
        {isHistoryView && filteredAppointments.length > itemsPerPage && (
          <div className={styles.pagination}>
            <button 
              className={styles.btnSecondary} 
              disabled={historyPage === 1}
              onClick={() => setHistoryPage(p => p - 1)}
            >
              Précédent
            </button>
            <span className={styles.pageIndicator}>
              Page {historyPage} / {Math.ceil(filteredAppointments.length / itemsPerPage)}
            </span>
            <button 
              className={styles.btnSecondary} 
              disabled={historyPage === Math.ceil(filteredAppointments.length / itemsPerPage)}
              onClick={() => setHistoryPage(p => p + 1)}
            >
              Suivant
            </button>
          </div>
        )}
      </section>

        </>
      )}

      {/* Calendar Section */}
      {(!isHistoryView || isPanelMode) && (
        <section className={`${styles.calendarSection} ${isPanelMode ? styles.panelCalendarSection : ""}`}>
          {isPanelMode && actionError && (
            <div className={styles.errorAlert}>
              {actionError}
            </div>
          )}
          <div className={styles.calendarHeader}>
            <h2 className={styles.calendarTitle}>Planning de la semaine</h2>
            <div className={styles.calendarActions}>
              <div className={styles.calendarNav}>
                <button className={styles.navBtn} onClick={() => changeWeek(-1)}>&lt;</button>
                <div className={styles.currentDate}>{formatWeekRange()}</div>
                <button className={styles.navBtn} onClick={() => changeWeek(1)}>&gt;</button>
              </div>
              <span className={styles.downloadText} onClick={() => exportElementToPDF('calendar-grid-export', 'planning_semaine', 'landscape')}>Télécharger</span>
              <button 
                className={styles.downloadBtn} 
                onClick={() => exportElementToPDF('calendar-grid-export', 'planning_semaine', 'landscape')}
                title="Télécharger le planning"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </button>
            </div>
          </div>
          <div className={styles.calendarScroller}>
            <div className={styles.calendarGrid} id="calendar-grid-export">
              {/* Header des jours */}
              <div className={styles.daysRow}>
                <div className={styles.timeLabel}></div>
                {weekDays.map((day, index) => (
                  <div key={index} className={`${styles.dayHeader} ${isToday(day) ? styles.today : ''}`}>
                    <span className={styles.dayName}>{dayNames[index]}</span>
                    <span className={styles.dayNumber}>{day.getDate()}</span>
                  </div>
                ))}
              </div>
              
              {/* Corps du calendrier scrollable */}
              <div
                className={styles.gridBody}
                onMouseLeave={() => setDragSelection(null)}
                onTouchMove={moveTouchSlotSelection}
                onTouchEnd={finishTouchSlotSelection}
                onTouchCancel={cancelTouchSlotSelection}
              >
                {/* Ligne indiquant l'heure actuelle */}
                {isCurrentWeek() && (
                  <div className={styles.currentTimeLine} style={{ top: `${getRedLinePosition()}px` }}></div>
                )}

                {/* Génération des créneaux de 30 minutes */}

                {calendarSlots.map((slot, slotIndex) => (
                  <div key={slot.label} className={styles.timeRow}>
                    <div className={styles.timeLabel}>{slot.label}</div>
                    {weekDays.map((day, dayIndex) => {
                      const dayAppointments = weeklyAppointments.filter(app => {
                        const appDate = new Date(app.scheduledAt);
                        const appSlotMinute = Math.floor(appDate.getMinutes() / SLOT_MINUTES) * SLOT_MINUTES;
                        return appDate.getDate() === day.getDate() && 
                               appDate.getMonth() === day.getMonth() &&
                               appDate.getHours() === slot.hour &&
                               appSlotMinute === slot.minute;
                      });
                      const dayExceptions = getExceptionBlocksForSlot(day, slot);
                      const dayPauses = getPauseBlocksForSlot(day, slot);

                      return (
                        <div
                          key={dayIndex}
                          className={`${styles.timeCell} ${isSlotSelected(dayIndex, slotIndex) ? styles.timeCellSelected : ""}`}
                          data-calendar-slot="true"
                          data-day-index={dayIndex}
                          data-slot-index={slotIndex}
                          onMouseDown={(event) => startSlotSelection(dayIndex, slotIndex, event)}
                          onMouseEnter={() => extendSlotSelection(dayIndex, slotIndex)}
                          onMouseUp={finishSlotSelection}
                          onTouchStart={(event) => startTouchSlotSelection(dayIndex, slotIndex, event)}
                          title={`Selectionner ${slot.label}`}
                        >
                          {dayExceptions.map((item) => {
                            const startAt = new Date(item.startAt);
                            const endAt = new Date(item.endAt);
                            const durationMinutes = Math.max((endAt.getTime() - startAt.getTime()) / 60000, SLOT_MINUTES);
                            const topOffset = ((startAt.getMinutes() - slot.minute) / SLOT_MINUTES) * SLOT_HEIGHT;
                            const height = Math.max(28, (durationMinutes / SLOT_MINUTES) * SLOT_HEIGHT);

                            return (
                              <div
                                key={item.id}
                                className={styles.blockedEvent}
                                style={{ top: `${topOffset}px`, height: `${height}px` }}
                                title={item.title || "Indisponibilite"}
                                onMouseDown={(event) => event.stopPropagation()}
                                onTouchStart={(event) => event.stopPropagation()}
                                onClick={(event) => openExceptionMenu(item, event)}
                              >
                                <div className={styles.eventTitle}>{item.title || "Indisponibilite"}</div>
                                <div className={styles.eventTime}>
                                  {startAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} -
                                  {endAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                </div>
                              </div>
                            );
                          })}
                          {dayPauses.map((pause) => {
                            const durationMinutes = Math.max(pause.endMinutes - pause.startMinutes, SLOT_MINUTES);
                            const topOffset = ((pause.startMinutes % 60) - slot.minute) / SLOT_MINUTES * SLOT_HEIGHT;
                            const height = Math.max(28, (durationMinutes / SLOT_MINUTES) * SLOT_HEIGHT);

                            return (
                              <div
                                key={`pause-${dayIndex}-${pause.breakIndex}`}
                                className={styles.pauseEvent}
                                style={{ top: `${topOffset}px`, height: `${height}px` }}
                                title="Modifier la pause"
                                onMouseDown={(event) => event.stopPropagation()}
                                onTouchStart={(event) => event.stopPropagation()}
                                onClick={(event) => openPauseMenu(day.getDay(), pause.breakIndex, pause, event)}
                              >
                                <div className={styles.eventTitle}>Pause</div>
                                <div className={styles.eventTime}>{pause.start} - {pause.end}</div>
                              </div>
                            );
                          })}
                          {dayAppointments.map((app) => {
                            const appDate = new Date(app.scheduledAt);
                            const endAt = new Date(app.endAt);
                            const durationMinutes = (endAt.getTime() - appDate.getTime()) / 60000;
                            const topOffset = ((appDate.getMinutes() - slot.minute) / SLOT_MINUTES) * SLOT_HEIGHT;
                            const height = Math.max(28, (durationMinutes / SLOT_MINUTES) * SLOT_HEIGHT);
                            const serviceEventStyle = getServiceEventStyle(app.service.color);

                            return (
                              <div 
                                key={app.id} 
                                className={styles.eventBlock}
                                style={{
                                  top: `${topOffset}px`,
                                  height: `${height}px`,
                                  ...serviceEventStyle,
                                }}
                                onMouseDown={(event) => event.stopPropagation()}
                                onTouchStart={(event) => event.stopPropagation()}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openEditAppointment(app);
                                }}
                                title={`Modifier ${app.client.name}`}
                              >
                                <div className={styles.eventTitle}>{app.client.name.toUpperCase()}</div>
                                <div className={styles.eventTime}>
                                  {appDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - 
                                  {endAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
      </section>
      )}

      <SessionModal 
        isOpen={isSessionModalOpen} 
        onClose={() => { setSessionModalOpen(false); setSelectedSessionAppointment(null); }} 
        clientName={selectedSessionAppointment?.client.name}
        time={selectedSessionAppointment ? new Date(selectedSessionAppointment.scheduledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : undefined}
        category={selectedSessionAppointment?.service.name}
        appointmentId={selectedSessionAppointment?.id}
        clientId={selectedSessionAppointment?.client.id}
        serviceId={selectedSessionAppointment?.service.id}
        onPaymentRequest={() => {
          setPaymentAppointmentData(selectedSessionAppointment);
          setSessionModalOpen(false);
          setSelectedSessionAppointment(null);
          setPaymentModalOpen(true);
        }}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => { setPaymentModalOpen(false); setPaymentAppointmentData(null); }}
        appointmentId={paymentAppointmentData?.id || ""}
        clientId={paymentAppointmentData?.client?.id || ""}
        clientName={paymentAppointmentData?.client?.name || ""}
        serviceName={paymentAppointmentData?.service?.name || ""}
        defaultAmount={paymentAppointmentData?.service?.price ? Number(paymentAppointmentData.service.price) : 0}
        price={paymentAppointmentData?.price}
        depositAmount={paymentAppointmentData?.depositAmount}
        depositPaidAmount={paymentAppointmentData?.depositPaidAmount}
        paidAmount={paymentAppointmentData?.paidAmount}
        remainingAmount={paymentAppointmentData?.remainingAmount}
        paymentMethod={paymentAppointmentData?.paymentMethod}
        paymentStatus={paymentAppointmentData?.paymentStatus || "none"}
        paymentsEnabled={canUseStripePayments}
        mode="closeout"
      />

      <NewAppointmentModal 
        isOpen={isNewAppointmentModalOpen} 
        onClose={() => {
          setNewAppointmentModalOpen(false);
          setAppointmentToEdit(null);
          setInitialAppointmentSlot(null);
          setInitialAppointmentEndSlot(null);
        }}
        clients={clients}
        services={services}
        initialData={appointmentToEdit}
        initialScheduledAt={initialAppointmentSlot}
        initialEndAt={initialAppointmentEndSlot}
        onSaved={showSavedToast}
      />

    </main>
  );
}
