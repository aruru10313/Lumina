package kr.foliacompat.test;

import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.World;
import org.bukkit.block.Block;
import org.bukkit.entity.ArmorStand;
import org.bukkit.entity.Entity;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.world.ChunkLoadEvent;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scoreboard.Scoreboard;
import org.bukkit.scoreboard.Team;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * A plugin written the "old" Paper way: no folia-supported flag, uses BukkitScheduler sync tasks,
 * touches blocks / entities in several regions from one task, uses sync teleport and scoreboards.
 * Every check prints "[LegacyTest] PASS ..." or "[LegacyTest] FAIL ...".
 */
public final class LegacyTestPlugin extends JavaPlugin implements Listener {

    private final AtomicInteger ticks = new AtomicInteger();
    private final AtomicInteger chunkEvents = new AtomicInteger();

    @Override
    public void onEnable() {
        Bukkit.getPluginManager().registerEvents(this, this);
        pass("enabled (plugin loaded without folia-supported)");

        // repeating sync task
        Bukkit.getScheduler().runTaskTimer(this, () -> this.ticks.incrementAndGet(), 1L, 1L);

        // async task
        Bukkit.getScheduler().runTaskAsynchronously(this, () -> pass("async task ran on " + Thread.currentThread().getName()));

        // delayed sync task that touches many regions at once
        Bukkit.getScheduler().runTaskLater(this, this::crossRegionChecks, 100L);
    }

    private void crossRegionChecks() {
        pass("sync task ran on " + Thread.currentThread().getName() + ", primaryThread=" + Bukkit.isPrimaryThread());
        final World world = Bukkit.getWorlds().get(0);
        try {
            // far apart -> different regions
            final int[][] spots = {{0, 0}, {2000, 0}, {-2000, 2000}};
            for (final int[] s : spots) {
                final Block block = world.getBlockAt(s[0], 200, s[1]);
                block.setType(Material.GOLD_BLOCK);
                if (block.getType() != Material.GOLD_BLOCK) {
                    fail("block set at " + s[0] + "," + s[1]);
                    return;
                }
            }
            pass("set/read blocks in 3 distant regions from one task");

            final Location far = new Location(world, 2000.5, 201, 0.5);
            final ArmorStand stand = world.spawn(far, ArmorStand.class, a -> a.setCustomName("legacy-test"));
            pass("spawned entity at 2000,0 (valid=" + stand.isValid() + ")");
            final boolean tp = stand.teleport(new Location(world, -2000.5, 201, 2000.5));
            pass("sync teleport() accepted=" + tp);

            int count = 0;
            for (final Entity e : world.getEntities()) {
                ++count;
            }
            pass("world.getEntities() returned " + count + " entities");

            final Scoreboard board = Bukkit.getScoreboardManager().getMainScoreboard();
            Team team = board.getTeam("legacytest");
            if (team == null) {
                team = board.registerNewTeam("legacytest");
            }
            team.setPrefix("[T] ");
            pass("scoreboard team registered");

            final Scoreboard fresh = Bukkit.getScoreboardManager().getNewScoreboard();
            fresh.registerNewObjective("legacyobj", org.bukkit.scoreboard.Criteria.DUMMY, net.kyori.adventure.text.Component.text("obj"));
            pass("new scoreboard + objective");

            Bukkit.dispatchCommand(Bukkit.getConsoleSender(), "say legacy dispatchCommand works");
            pass("dispatchCommand from sync task");

            Bukkit.getScheduler().runTaskLater(this, () -> {
                pass("repeating task ticks so far: " + this.ticks.get() + ", chunk load events: " + this.chunkEvents.get()
                    + ", tps=" + String.format("%.1f", Bukkit.getTPS()[0]));
                pass("ALL CHECKS DONE");
            }, 40L);
        } catch (final Throwable t) {
            fail("exception: " + t);
            t.printStackTrace();
        }
    }

    @EventHandler
    public void onChunkLoad(final ChunkLoadEvent event) {
        this.chunkEvents.incrementAndGet();
    }

    @EventHandler
    public void onJoin(final PlayerJoinEvent event) {
        event.getPlayer().sendMessage("legacy listener says hi");
    }

    private void pass(final String msg) {
        this.getLogger().info("PASS " + msg);
    }

    private void fail(final String msg) {
        this.getLogger().severe("FAIL " + msg);
    }
}
