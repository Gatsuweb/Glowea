-- CreateTable
CREATE TABLE "AppointmentService" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "priceSnapshot" INTEGER NOT NULL,
    "durationSnapshot" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentService_pkey" PRIMARY KEY ("id")
);

-- Backfill existing single-service appointments.
INSERT INTO "AppointmentService" (
    "id",
    "appointmentId",
    "serviceId",
    "nameSnapshot",
    "priceSnapshot",
    "durationSnapshot",
    "position",
    "createdAt"
)
SELECT
    CONCAT('aps_', SUBSTRING(MD5(a."id" || ':' || a."serviceId"), 1, 16)),
    a."id",
    a."serviceId",
    COALESCE(s."name", 'Prestation'),
    COALESCE(a."price", ROUND(COALESCE(s."price", 0) * 100)::INTEGER, 0),
    COALESCE(
        s."durationMin",
        CASE
            WHEN a."endAt" IS NOT NULL THEN GREATEST(15, ROUND(EXTRACT(EPOCH FROM (a."endAt" - a."scheduledAt")) / 60)::INTEGER)
            ELSE 60
        END
    ),
    0,
    a."createdAt"
FROM "Appointment" a
JOIN "Service" s ON s."id" = a."serviceId"
WHERE a."serviceId" IS NOT NULL
AND s."tenantId" = a."tenantId"
ON CONFLICT DO NOTHING;

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentService_appointmentId_serviceId_key" ON "AppointmentService"("appointmentId", "serviceId");

-- CreateIndex
CREATE INDEX "AppointmentService_appointmentId_idx" ON "AppointmentService"("appointmentId");

-- CreateIndex
CREATE INDEX "AppointmentService_serviceId_idx" ON "AppointmentService"("serviceId");

-- AddForeignKey
ALTER TABLE "AppointmentService" ADD CONSTRAINT "AppointmentService_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentService" ADD CONSTRAINT "AppointmentService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
