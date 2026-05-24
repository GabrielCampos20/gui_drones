-- CreateTable
CREATE TABLE "Execution" (
    "id" TEXT NOT NULL,
    "simulator" TEXT NOT NULL,
    "propertiesContent" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "logPath" TEXT,
    "queueTimeCsvPath" TEXT,
    "missionTimeCsvPath" TEXT,
    "flightTimeCsvPath" TEXT,
    "dropProbabilityCsvPath" TEXT,

    CONSTRAINT "Execution_pkey" PRIMARY KEY ("id")
);
