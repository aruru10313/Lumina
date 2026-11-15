package io.papermc.paper.threadedregions;

import com.mojang.logging.LogUtils;
import net.minecraft.server.level.ServerLevel;
import org.bukkit.plugin.Plugin;
import org.slf4j.Logger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;

/**
 * Legacy (non Folia-supported) plugin compatibility layer.
 * <p>
 * Region ticks normally run in parallel. Code that was written for a single main thread
 * (listeners / sync tasks of plugins without {@code folia-supported: true}, and commands that
 * Folia disabled because they touch multiple regions) is executed through
 * {@link #runExclusive(Runnable)}: the caller waits until every other region tick has reached a
 * safepoint (finished its current tick or task batch, or is itself waiting for exclusive access),
 * then runs alone with all thread ownership checks relaxed. Other regions resume afterwards.
 * </p>
 * <p>
 * Deadlock freedom: a thread that requests exclusive access while inside a region tick counts
 * itself as parked while it waits, so two region threads requesting at the same time never wait
 * for each other. New region ticks are not started while any thread is waiting for exclusive access,
 * which prevents starvation of the exclusive requester.
 * </p>
 */
public final class LegacyCompat {

    private static final Logger LOGGER = LogUtils.getLogger();

    /** Whether legacy plugin compatibility is enabled. Disable with -Dfolia.legacyCompat=false */
    public static final boolean ENABLED = Boolean.parseBoolean(System.getProperty("folia.legacyCompat", "true"));
    /** Re-enable vanilla / Paper / Spigot commands that Folia disabled. Disable with -Dfolia.legacyCommands=false */
    public static final boolean COMMANDS = ENABLED && Boolean.parseBoolean(System.getProperty("folia.legacyCommands", "true"));
    /** Exclusive executions slower than this are logged (ms). */
    private static final long SLOW_WARN_MS = Long.getLong("folia.legacyCompat.slowWarnMs", 100L);

    /** Set once the global region ticks; before that (plugin enabling at startup) waiters drain global chunk tasks themselves. */
    static volatile boolean globalTickStarted;

    private static final Object LOCK = new Object();
    /** Number of region handles currently executing a tick or task batch (not parked). */
    private static int active;
    /** Number of threads waiting to acquire exclusive access. */
    private static int waiting;
    private static volatile Thread exclusiveOwner;
    private static final ThreadLocal<int[]> REGION_DEPTH = ThreadLocal.withInitial(() -> new int[1]);
    private static final ThreadLocal<int[]> EXCLUSIVE_DEPTH = ThreadLocal.withInitial(() -> new int[1]);

    // statistics
    private static long exclusiveCount;
    private static long exclusiveWaitNanos;
    private static long exclusiveRunNanos;

    private LegacyCompat() {}

    // ------------------------------------------------------------------ region tick boundaries

    /** Called by the region scheduler before a region (or the global region) executes a tick or task batch. */
    static void enterRegion() {
        if (!ENABLED) {
            return;
        }
        final int[] depth = REGION_DEPTH.get();
        if (depth[0]++ != 0) {
            return;
        }
        boolean interrupted = false;
        synchronized (LOCK) {
            while (exclusiveOwner != null || waiting > 0) {
                try {
                    LOCK.wait();
                } catch (final InterruptedException ex) {
                    interrupted = true;
                }
            }
            ++active;
        }
        if (interrupted) {
            Thread.currentThread().interrupt();
        }
    }

    /** Called by the region scheduler after a region (or the global region) finished a tick or task batch. */
    static void exitRegion() {
        if (!ENABLED) {
            return;
        }
        final int[] depth = REGION_DEPTH.get();
        if (--depth[0] != 0) {
            return;
        }
        synchronized (LOCK) {
            --active;
            LOCK.notifyAll();
        }
    }

    // ------------------------------------------------------------------ exclusive execution

    /** @return {@code true} if the current thread is running with every other region parked. */
    public static boolean isExclusiveOwner() {
        return exclusiveOwner == Thread.currentThread();
    }

    public static void runExclusive(final Runnable task) {
        callExclusive(() -> {
            task.run();
            return null;
        });
    }

    public static <T> T callExclusive(final Supplier<T> task) {
        final Thread self = Thread.currentThread();
        if (!ENABLED || exclusiveOwner == self) {
            return task.get();
        }
        final boolean inRegion = REGION_DEPTH.get()[0] > 0;
        final long waitStart = System.nanoTime();
        boolean interrupted = false;
        synchronized (LOCK) {
            ++waiting;
            if (inRegion) {
                // park ourselves, so that other exclusive requesters do not wait on us
                --active;
                LOCK.notifyAll();
            }
            try {
                while (exclusiveOwner != null || active > 0) {
                    try {
                        LOCK.wait();
                    } catch (final InterruptedException ex) {
                        interrupted = true;
                    }
                }
                exclusiveOwner = self;
            } finally {
                --waiting;
            }
        }
        final long runStart = System.nanoTime();
        final int[] exclusiveDepth = EXCLUSIVE_DEPTH.get();
        ++exclusiveDepth[0];
        try {
            return task.get();
        } finally {
            --exclusiveDepth[0];
            final long runEnd = System.nanoTime();
            synchronized (LOCK) {
                exclusiveOwner = null;
                if (inRegion) {
                    // resume our in-progress tick immediately; pending exclusive requesters wait for it to finish
                    ++active;
                }
                ++exclusiveCount;
                exclusiveWaitNanos += (runStart - waitStart);
                exclusiveRunNanos += (runEnd - runStart);
                LOCK.notifyAll();
            }
            final long totalMs = (runEnd - waitStart) / 1_000_000L;
            if (totalMs >= SLOW_WARN_MS) {
                LOGGER.warn("[Lumina] Legacy exclusive section took " + totalMs + "ms (waited "
                    + (runStart - waitStart) / 1_000_000L + "ms) on thread " + self.getName());
            }
            if (interrupted) {
                self.interrupt();
            }
        }
    }

    // ------------------------------------------------------------------ plugins

    public static boolean isLegacy(final Plugin plugin) {
        return ENABLED && plugin != null && !plugin.getPluginMeta().isFoliaSupported();
    }

    public static void logLegacyPlugin(final String name) {
        LOGGER.warn("[Lumina] Loading '" + name + "' in legacy compatibility mode (not marked folia-supported). "
            + "Its sync listeners, tasks and commands run while all regions are paused.");
    }

    /** Runs the Bukkit scheduler's sync tasks. Called once per global tick. */
    static void tickLegacyScheduler() {
        if (!ENABLED) {
            return;
        }
        ((org.bukkit.craftbukkit.scheduler.CraftScheduler)org.bukkit.Bukkit.getScheduler()).legacyHeartbeat();
    }

    // ------------------------------------------------------------------ region data resolution

    /**
     * Resolves the regionised world data of the region owning the given chunk, for use while exclusive.
     * Returns {@code null} if no region owns the chunk.
     */
    public static RegionizedWorldData worldDataAt(final ServerLevel world, final int chunkX, final int chunkZ) {
        final ThreadedRegionizer.ThreadedRegion<TickRegions.TickRegionData, TickRegions.TickRegionSectionData> region =
            world.regioniser.getRegionAtUnsynchronised(chunkX, chunkZ);
        if (region == null) {
            return null;
        }
        return region.getData().getOrCreateRegionizedData(world.worldRegionData);
    }

    /**
     * Fallback regionised world data used while exclusive when the current thread has no data for the
     * requested world (e.g. on the global tick thread). Prefers the region of the current thread if it
     * belongs to the world, otherwise any region of that world.
     */
    public static RegionizedWorldData anyWorldData(final ServerLevel world) {
        final AtomicReference<RegionizedWorldData> ret = new AtomicReference<>();
        world.regioniser.computeForAllRegionsUnsynchronised((region) -> {
            if (ret.get() == null) {
                ret.set(region.getData().getOrCreateRegionizedData(world.worldRegionData));
            }
        });
        return ret.get();
    }

    /**
     * Temporarily gives up exclusive access while {@code blockingWait} runs, then re-acquires it.
     * Used when the exclusive owner must wait for work that another (paused) region has to perform,
     * such as completing a synchronous chunk load. Without this, such waits would deadlock.
     */
    public static void releaseWhile(final Runnable blockingWait) {
        final Thread self = Thread.currentThread();
        if (exclusiveOwner != self) {
            blockingWait.run();
            return;
        }
        synchronized (LOCK) {
            exclusiveOwner = null;
            LOCK.notifyAll();
        }
        boolean interrupted = false;
        try {
            blockingWait.run();
        } finally {
            synchronized (LOCK) {
                ++waiting;
                try {
                    while (exclusiveOwner != null || active > 0) {
                        try {
                            LOCK.wait();
                        } catch (final InterruptedException ex) {
                            interrupted = true;
                        }
                    }
                    exclusiveOwner = self;
                } finally {
                    --waiting;
                }
            }
            if (interrupted) {
                self.interrupt();
            }
        }
    }

    /**
     * Waits for {@code future} with exclusive access released. If the current thread is the global tick thread,
     * it keeps executing global chunk tasks while waiting, because chunks that no region owns yet are completed
     * by the global region - which is this very thread.
     */
    public static void awaitReleased(final ServerLevel targetWorld, final int chunkX, final int chunkZ,
                                     final Runnable schedule, final java.util.concurrent.CompletableFuture<?> future) {
        releaseWhile(() -> {
            // schedule with the exclusive bypass off, so the request is routed to the owning region like on stock Folia
            schedule.run();
            while (!future.isDone()) {
                boolean ran = false;
                if (RegionizedServer.isGlobalTickThread() || !globalTickStarted) {
                    for (final ServerLevel world : net.minecraft.server.MinecraftServer.getServer().getAllLevels()) {
                        ran |= world.taskQueueRegionData.executeGlobalChunkTask();
                    }
                }
                // help the owning region: with few tick threads, nobody else may be free to run it
                final ThreadedRegionizer.ThreadedRegion<TickRegions.TickRegionData, TickRegions.TickRegionSectionData> target =
                    targetWorld.regioniser.getRegionAtUnsynchronised(chunkX, chunkZ);
                if (target != null && target != TickRegionScheduler.getCurrentRegion()) {
                    final TickRegionScheduler.RegionScheduleHandle handle = target.getData().getRegionSchedulingHandle();
                    if (handle.hasTasks()) {
                        synchronized (LOCK) {
                            ++active;
                        }
                        try {
                            ran |= TickRegionScheduler.legacyRunRegionTasksInline(handle, () -> !future.isDone());
                        } finally {
                            synchronized (LOCK) {
                                --active;
                                LOCK.notifyAll();
                            }
                        }
                    }
                }
                if (!ran) {
                    java.util.concurrent.locks.LockSupport.parkNanos(200_000L);
                }
            }
        });
    }

    /** @return whether the chunk is really owned by the region of the current thread (ignoring the exclusive bypass). */
    public static boolean isOwnedByCurrentRegion(final ServerLevel world, final int chunkX, final int chunkZ) {
        final ThreadedRegionizer.ThreadedRegion<TickRegions.TickRegionData, TickRegions.TickRegionSectionData> current =
            TickRegionScheduler.getCurrentRegion();
        return current != null && world.regioniser.getRegionAtUnsynchronised(chunkX, chunkZ) == current;
    }

    /**
     * While exclusive: loads the chunk if needed, then runs {@code run} in the context of the region owning it,
     * so that every Folia structure (region data, entity schedulers, tick data) matches the position.
     * Outside an exclusive section this simply runs {@code run}.
     */
    public static <T> T inRegionAt(final ServerLevel world, final int chunkX, final int chunkZ, final Supplier<T> run) {
        if (exclusiveOwner != Thread.currentThread()) {
            return run.get();
        }
        ThreadedRegionizer.ThreadedRegion<TickRegions.TickRegionData, TickRegions.TickRegionSectionData> region =
            world.regioniser.getRegionAtUnsynchronised(chunkX, chunkZ);
        if (region == null) {
            // not loaded: load it like Paper would (the load itself is handled with exclusive released)
            world.getChunk(chunkX, chunkZ);
            region = world.regioniser.getRegionAtUnsynchronised(chunkX, chunkZ);
        }
        if (region == null) {
            return run.get();
        }
        return TickRegionScheduler.legacyRunInRegion(region, run);
    }

    // ------------------------------------------------------------------ position context

    /** Position hint: while exclusive, world data lookups without a position resolve to the region owning this chunk. */
    private record Context(ServerLevel world, int chunkX, int chunkZ) {}
    private static final ThreadLocal<Context> CONTEXT = new ThreadLocal<>();
    private static final Object NO_CONTEXT = new Object();

    /** @return the previous context, to be passed to {@link #popContext(Object)}; {@code null} if not exclusive. */
    public static Object pushContext(final net.minecraft.world.level.Level world, final net.minecraft.core.BlockPos pos) {
        if (exclusiveOwner != Thread.currentThread() || !(world instanceof ServerLevel serverLevel)) {
            return null;
        }
        final Context prev = CONTEXT.get();
        CONTEXT.set(new Context(serverLevel, pos.getX() >> 4, pos.getZ() >> 4));
        return prev == null ? NO_CONTEXT : prev;
    }

    public static void popContext(final Object prev) {
        if (prev == null) {
            return;
        }
        CONTEXT.set(prev == NO_CONTEXT ? null : (Context)prev);
    }

    private static final java.util.Map<ServerLevel, RegionizedWorldData> DETACHED = new java.util.concurrent.ConcurrentHashMap<>();

    /**
     * World data to use while exclusive. Order: the region owning the current position context, the
     * current thread's own data for this world, any region of the world, and finally a detached per-world
     * instance (only reached when the world has no regions at all; used for flag reads like tree capture).
     */
    public static RegionizedWorldData resolveExclusive(final ServerLevel world, final RegionizedWorldData current) {
        final Context ctx = CONTEXT.get();
        if (ctx != null && ctx.world == world) {
            final RegionizedWorldData owner = worldDataAt(world, ctx.chunkX, ctx.chunkZ);
            if (owner != null) {
                return owner;
            }
        }
        if (current != null && current.world == world) {
            return current;
        }
        final RegionizedWorldData any = anyWorldData(world);
        if (any != null) {
            return any;
        }
        return DETACHED.computeIfAbsent(world, (w) -> new RegionizedWorldData(w));
    }

    // ------------------------------------------------------------------ stats

    public static String stats() {
        synchronized (LOCK) {
            final double avgWait = exclusiveCount == 0 ? 0.0 : (exclusiveWaitNanos / 1.0E6) / exclusiveCount;
            final double avgRun = exclusiveCount == 0 ? 0.0 : (exclusiveRunNanos / 1.0E6) / exclusiveCount;
            return String.format("exclusive sections: %d, avg wait: %.2fms, avg run: %.2fms, total paused: %.1fs",
                exclusiveCount, avgWait, avgRun, (exclusiveWaitNanos + exclusiveRunNanos) / 1.0E9);
        }
    }
}
