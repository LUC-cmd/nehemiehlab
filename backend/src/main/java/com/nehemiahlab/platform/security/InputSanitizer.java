package com.nehemiahlab.platform.security;

import java.util.regex.Pattern;

/**
 * Nettoyage défensif des entrées utilisateur (XSS / caractères de contrôle).
 * Les requêtes JPA restent paramétrées — cette couche complète la protection.
 */
public final class InputSanitizer {

    private static final Pattern CONTROL_CHARS = Pattern.compile("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]");
    private static final Pattern SCRIPT_TAGS = Pattern.compile(
            "(?i)<\\s*/?\\s*(script|iframe|object|embed|link|meta|svg|form)[^>]*>"
    );
    private static final Pattern EVENT_HANDLERS = Pattern.compile("(?i)\\bon\\w+\\s*=");
    private static final Pattern JS_PROTOCOL = Pattern.compile("(?i)javascript\\s*:");

    private InputSanitizer() {}

    public static String clean(String raw) {
        if (raw == null) return null;
        String value = CONTROL_CHARS.matcher(raw).replaceAll("");
        value = SCRIPT_TAGS.matcher(value).replaceAll("");
        value = EVENT_HANDLERS.matcher(value).replaceAll("");
        value = JS_PROTOCOL.matcher(value).replaceAll("");
        return value.trim();
    }

    public static String cleanNullable(String raw) {
        if (raw == null) return null;
        String cleaned = clean(raw);
        return cleaned.isEmpty() ? null : cleaned;
    }

    public static String digitsOnly(String raw, int maxLen) {
        if (raw == null) return null;
        String digits = raw.replaceAll("\\D", "");
        if (digits.isBlank()) return null;
        if (digits.length() > maxLen) digits = digits.substring(0, maxLen);
        return digits;
    }

    public static boolean isSafeEmail(String email) {
        if (email == null || email.isBlank()) return false;
        if (email.length() > 180
                || email.contains("'")
                || email.contains(";")
                || email.contains("--")) {
            return false;
        }
        return email.matches("^[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9.-]+\\.[A-Za-z]{2,}|localhost|[A-Za-z0-9.-]+\\.local)$");
    }
}
