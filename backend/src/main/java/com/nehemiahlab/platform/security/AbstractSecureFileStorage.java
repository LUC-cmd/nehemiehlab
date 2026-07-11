package com.nehemiahlab.platform.security;

import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedInputStream;
import java.io.InputStream;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

abstract class AbstractSecureFileStorage implements SecureFileStorage {

    private static final Map<String, Set<String>> ALLOWED = Map.of(
            "image", Set.of("image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"),
            "document", Set.of(
                    "application/pdf",
                    "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
                    "application/msword",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "application/vnd.ms-excel"
            ),
            "media", Set.of(
                    "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
                    "video/mp4", "video/webm",
                    "application/x-scratch3", "application/octet-stream"
            )
    );

    private static final Set<String> SAFE_EXT = Set.of(
            ".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf",
            ".xlsx", ".xls", ".doc", ".docx", ".mp4", ".webm", ".sb3"
    );

    @Override
    public final String store(
            MultipartFile file, String folder, String category, long maxBytes, String prefix) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Aucun fichier envoyé.");
        }
        if (file.getSize() > maxBytes) {
            throw new IllegalArgumentException("Fichier trop volumineux.");
        }

        String contentType = file.getContentType() == null
                ? ""
                : file.getContentType().toLowerCase(Locale.ROOT);
        Set<String> allowedTypes = ALLOWED.getOrDefault(category, ALLOWED.get("image"));
        if (!contentType.isBlank() && !allowedTypes.contains(contentType) && !"media".equals(category)) {
            boolean prefixOk = "document".equals(category) && (
                    contentType.startsWith("image/")
                            || contentType.startsWith("application/pdf")
                            || contentType.startsWith("application/msword")
                            || contentType.startsWith("application/vnd.")
            );
            if (!prefixOk) {
                throw new IllegalArgumentException("Type de fichier non autorisé.");
            }
        }

        String original = file.getOriginalFilename() == null ? "file.bin" : file.getOriginalFilename();
        String baseName = Paths.get(original).getFileName().toString();
        String extension = "";
        int dot = baseName.lastIndexOf('.');
        if (dot >= 0) {
            extension = baseName.substring(dot).toLowerCase(Locale.ROOT);
        }
        if (!SAFE_EXT.contains(extension)) {
            if (contentType.contains("jpeg") || contentType.contains("jpg")) extension = ".jpg";
            else if (contentType.contains("png")) extension = ".png";
            else if (contentType.contains("webp")) extension = ".webp";
            else if (contentType.contains("gif")) extension = ".gif";
            else if (contentType.contains("pdf")) extension = ".pdf";
            else if (contentType.contains("sheet") || contentType.contains("excel")) extension = ".xlsx";
            else throw new IllegalArgumentException("Extension de fichier non autorisée.");
        }

        validateSignature(file, category, extension);

        String safeFolder = sanitizeFolder(folder);
        String safePrefix = prefix == null ? "file" : prefix.replaceAll("[^a-zA-Z0-9_-]", "");
        if (safePrefix.isBlank()) safePrefix = "file";
        String filename = safePrefix + "-" + UUID.randomUUID() + extension;
        String key = safeFolder + "/" + filename;

        try (InputStream input = file.getInputStream()) {
            writeObject(key, input, file.getSize(),
                    contentType.isBlank() ? "application/octet-stream" : contentType);
        }
        return "/uploads/" + key;
    }

    protected abstract void writeObject(String key, InputStream input, long contentLength, String contentType)
            throws Exception;

    protected static String keyFromReference(String reference) {
        if (reference == null || reference.isBlank()) {
            throw new IllegalArgumentException("Chemin manquant.");
        }
        String cleaned = reference.trim().replace('\\', '/');
        if (cleaned.startsWith("/uploads/")) {
            cleaned = cleaned.substring("/uploads/".length());
        }
        if (cleaned.startsWith("/") || cleaned.isBlank() || cleaned.contains("..")
                || cleaned.contains("//") || cleaned.contains("%")) {
            throw new IllegalArgumentException("Chemin invalide.");
        }
        for (String segment : cleaned.split("/")) {
            if (segment.isBlank() || !segment.matches("[a-zA-Z0-9._-]+")) {
                throw new IllegalArgumentException("Chemin invalide.");
            }
        }
        return cleaned;
    }

    private static String sanitizeFolder(String folder) {
        if (folder == null || folder.isBlank()) return "misc";
        String sanitized = folder.replaceAll("[^a-zA-Z0-9_-]", "");
        return sanitized.isBlank() ? "misc" : sanitized;
    }

    private static void validateSignature(MultipartFile file, String category, String extension) throws Exception {
        byte[] header = new byte[16];
        int length;
        try (BufferedInputStream input = new BufferedInputStream(file.getInputStream())) {
            length = input.read(header);
        }
        if (length < 4) throw new IllegalArgumentException("Fichier vide ou illisible.");

        String detected;
        if (matches(header, 0xFF, 0xD8, 0xFF)) detected = "image";
        else if (matches(header, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)) detected = "image";
        else if (matchesAscii(header, "GIF87a") || matchesAscii(header, "GIF89a")) detected = "image";
        else if (matchesAscii(header, "RIFF") && matchesAscii(header, 8, "WEBP")
                && extension.equals(".webp")) detected = "image";
        else if (matchesAscii(header, "%PDF-")) detected = "pdf";
        else if (matches(header, 0x50, 0x4B, 0x03, 0x04)) detected = "zip";
        else if (matches(header, 0xD0, 0xCF, 0x11, 0xE0)) detected = "office";
        else if (matchesAscii(header, 4, "ftyp")) detected = "video";
        else if (matches(header, 0x1A, 0x45, 0xDF, 0xA3)) detected = "video";
        else throw new IllegalArgumentException("Signature réelle du fichier non reconnue.");

        boolean allowed = switch (category) {
            case "image" -> detected.equals("image");
            case "document" -> detected.equals("image") || detected.equals("pdf")
                    || detected.equals("zip") || detected.equals("office");
            case "media" -> detected.equals("image") || detected.equals("video")
                    || (detected.equals("zip") && extension.equals(".sb3"));
            default -> false;
        };
        if (!allowed) {
            throw new IllegalArgumentException("Le contenu réel ne correspond pas au type de fichier autorisé.");
        }
    }

    private static boolean matches(byte[] bytes, int... expected) {
        if (bytes.length < expected.length) return false;
        for (int i = 0; i < expected.length; i++) {
            if ((bytes[i] & 0xFF) != expected[i]) return false;
        }
        return true;
    }

    private static boolean matchesAscii(byte[] bytes, String expected) {
        return matchesAscii(bytes, 0, expected);
    }

    private static boolean matchesAscii(byte[] bytes, int offset, String expected) {
        if (bytes.length < offset + expected.length()) return false;
        for (int i = 0; i < expected.length(); i++) {
            if (bytes[offset + i] != (byte) expected.charAt(i)) return false;
        }
        return true;
    }
}
