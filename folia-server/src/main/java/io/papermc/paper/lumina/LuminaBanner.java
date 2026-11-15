package io.papermc.paper.lumina;

import org.slf4j.Logger;

/**
 * Startup banner for Lumina (Folia based, with legacy plugin compatibility).
 * Uses ANSI colors: the terminal console renders them, the log file pattern strips them (%stripAnsi),
 * and consoles without color support get them stripped by TerminalConsoleAppender.
 */
public final class LuminaBanner {

    private static final String[] LOGO = {
        "  ██╗     ██╗   ██╗███╗   ███╗██╗███╗   ██╗ █████╗ ",
        "  ██║     ██║   ██║████╗ ████║██║████╗  ██║██╔══██╗",
        "  ██║     ██║   ██║██╔████╔██║██║██╔██╗ ██║███████║",
        "  ██║     ██║   ██║██║╚██╔╝██║██║██║╚██╗██║██╔══██║",
        "  ███████╗╚██████╔╝██║ ╚═╝ ██║██║██║ ╚████║██║  ██║",
        "  ╚══════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝",
    };

    // soft violet -> sky blue -> aqua, one colour per row (24-bit ANSI)
    private static final int[][] GRADIENT = {
        {214, 140, 255}, {190, 150, 255}, {160, 165, 255}, {125, 185, 255}, {95, 210, 250}, {80, 230, 230}
    };

    private static final String RESET = "\u001B[0m";
    private static final String GRAY = "\u001B[38;2;150;150;170m";
    private static final String DIM = "\u001B[38;2;100;100;120m";
    private static final String WHITE = "\u001B[1;38;2;255;255;255m";
    private static final String AQUA = "\u001B[38;2;95;210;250m";
    private static final String VIOLET = "\u001B[38;2;214;140;255m";
    private static final String GREEN = "\u001B[38;2;110;230;140m";
    private static final String RED = "\u001B[38;2;255;110;110m";

    private LuminaBanner() {}

    private static String rgb(final int[] c) {
        return "\u001B[38;2;" + c[0] + ";" + c[1] + ";" + c[2] + "m";
    }

    public static void print(final Logger logger, final String minecraftVersion) {
        logger.info("");
        for (int i = 0; i < LOGO.length; ++i) {
            logger.info(rgb(GRADIENT[i]) + LOGO[i] + RESET);
        }
        logger.info("");
        logger.info("  " + WHITE + "Lumina" + RESET + GRAY + " for Minecraft " + AQUA + minecraftVersion + DIM + "  |  " + GRAY + "based on "
            + VIOLET + "Folia" + DIM + "  |  " + GRAY + "legacy plugins: "
            + (io.papermc.paper.threadedregions.LegacyCompat.ENABLED ? GREEN + "ON" : RED + "OFF") + RESET);
        logger.info("  " + DIM + "regionised multithreading + Paper plugin compatibility" + RESET);
        logger.info("");
    }
}
