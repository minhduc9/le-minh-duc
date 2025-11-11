import type { RedisOptions } from "ioredis";
import {
    Queue,
    Worker,
    QueueEvents,
    type Processor,
    type QueueOptions,
    type WorkerOptions,
    type JobsOptions,
    type QueueEventsOptions,
} from "bullmq";
import "dotenv/config";

// —— Redis connection (env-driven) ——
const REDIS_HOST = process.env.REDIS_HOST ?? "127.0.0.1";
const REDIS_PORT = Number(process.env.REDIS_PORT ?? 6379);
const REDIS_USERNAME = process.env.REDIS_USERNAME;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_DB = process.env.REDIS_DB
    ? Number(process.env.REDIS_DB)
    : undefined;
const REDIS_TLS = String(process.env.REDIS_TLS ?? "").toLowerCase() === "true";

export const redisConnection: RedisOptions = {
    host: REDIS_HOST,
    port: REDIS_PORT,
    ...(REDIS_USERNAME ? { username: REDIS_USERNAME } : {}),
    ...(REDIS_PASSWORD ? { password: REDIS_PASSWORD } : {}),
    ...(typeof REDIS_DB === "number" ? { db: REDIS_DB } : {}),
    ...(REDIS_TLS ? { tls: { rejectUnauthorized: false } } : {}),
};

// —- Defaults (can be overridden per-queue / per-job) ——
const QUEUE_PREFIX = process.env.BULLMQ_PREFIX ?? "bull";
const DEFAULT_CONCURRENCY = Number(process.env.BULLMQ_CONCURRENCY ?? 8);
const DEFAULT_ATTEMPTS = Number(process.env.BULLMQ_DEFAULT_ATTEMPTS ?? 3);
const DEFAULT_BACKOFF_DELAY = Number(process.env.BULLMQ_BACKOFF_DELAY ?? 1000);
const REMOVE_ON_COMPLETE = Number(
    process.env.BULLMQ_REMOVE_ON_COMPLETE ?? 1000,
);
const REMOVE_ON_FAIL = Number(process.env.BULLMQ_REMOVE_ON_FAIL ?? 100);

export const defaultJobOptions: JobsOptions = {
    attempts: DEFAULT_ATTEMPTS,
    backoff: { type: "exponential", delay: DEFAULT_BACKOFF_DELAY },
    removeOnComplete: REMOVE_ON_COMPLETE, // keep last N completed jobs for inspection
    removeOnFail: REMOVE_ON_FAIL,
};

// Create a queue with project defaults
export function createQueue(
    name: string,
    options?: Omit<
        QueueOptions,
        "connection" | "prefix" | "defaultJobOptions"
    > & {
        prefix?: string;
        defaultJobOptions?: JobsOptions;
    },
) {
    const { prefix, defaultJobOptions: jobOptions, ...queueOptions } =
        options ?? {};

    return new Queue(name, {
        connection: redisConnection,
        prefix: prefix ?? QUEUE_PREFIX,
        defaultJobOptions: {
            ...defaultJobOptions,
            ...(jobOptions ?? {}),
        },
        ...queueOptions,
    });
}

// Create QueueEvents (for lightweight event subscriptions)
export function createQueueEvents(
    name: string,
    options?: Omit<QueueEventsOptions, "connection" | "prefix"> & {
        prefix?: string;
    },
) {
    const { prefix, ...eventsOptions } = options ?? {};
    const events = new QueueEvents(name, {
        connection: redisConnection,
        prefix: prefix ?? QUEUE_PREFIX,
        ...eventsOptions,
    });

    // Minimal default logging — safe to remove if too chatty
    events.on("completed", ({ jobId, returnvalue }) => {
        console.log(`[${name}] job ${jobId} completed`, returnvalue ?? "");
    });
    events.on("failed", ({ jobId, failedReason }) => {
        console.error(`[${name}] job ${jobId} failed: ${failedReason}`);
    });

    registerShutdown(events);
    return events;
}

// Note: QueueScheduler was deprecated in BullMQ 2.x and removed in later versions; no longer needed.

// Create a worker with sane defaults and logging (v5-compatible)
export function createWorker<
    Data = any,
    Result = any,
    Name extends string = string,
>(
    name: Name,
    processor: Processor<Data, Result, Name>,
    options?: Omit<WorkerOptions, "connection" | "concurrency"> & {
        concurrency?: number;
    },
) {
    const { concurrency, ...workerOptions } = options ?? {};
    const worker = new Worker<Data, Result, Name>(name, processor, {
        connection: redisConnection,
        concurrency: concurrency ?? DEFAULT_CONCURRENCY,
        ...workerOptions,
    });

    worker.on("completed", (job, result) => {
        console.log(`[${name}] job ${job.id} completed`, result ?? "");
    });
    worker.on("failed", (job, err) => {
        console.error(`[${name}] job ${job?.id} failed`, err);
    });

    registerShutdown(worker);
    return worker;
}

// Helper to enqueue with project defaults merged in (v5-compatible)
export async function enqueue<Data = any, Name extends string = string>(
    queue: Queue,
    name: Name,
    data: Data,
    opts?: JobsOptions,
) {
    // Casts keep compatibility across BullMQ versions where generics changed (e.g., ExtractNameType in v5).
    return queue.add(name as any, data as any, {
        ...defaultJobOptions,
        ...(opts ?? {}),
    });
}

// —— Graceful shutdown (shared) ——

type Closable =
    | { close: () => Promise<unknown> }
    | { disconnect: () => Promise<unknown> };
const resources = new Set<Closable>();
let shutdownHookInstalled = false;

function registerShutdown(resource: Closable) {
    resources.add(resource);
    if (!shutdownHookInstalled) {
        const cleanup = async () => {
            for (const r of resources) {
                try {
                    if ("close" in r) await r.close();
                    else if ("disconnect" in r) await r.disconnect();
                } catch (e) {
                    console.error("[bullmq] cleanup error:", e);
                }
            }
            resources.clear();
            // Let Node exit naturally
        };
        process.on("SIGINT", cleanup);
        process.on("SIGTERM", cleanup);
        process.on("beforeExit", cleanup);
        shutdownHookInstalled = true;
    }
}

export type { Queue, Worker, QueueEvents };
