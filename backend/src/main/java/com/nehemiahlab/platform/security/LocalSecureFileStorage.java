package com.nehemiahlab.platform.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.FileSystemResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

@Service
@Profile({"local", "demo"})
public class LocalSecureFileStorage extends AbstractSecureFileStorage {

    private final Path root;

    public LocalSecureFileStorage(@Value("${app.storage.local-root:uploads}") String root) {
        this.root = Paths.get(root).toAbsolutePath().normalize();
    }

    @Override
    protected void writeObject(String key, InputStream input, long contentLength, String contentType)
            throws Exception {
        Path target = resolveKey(key);
        Files.createDirectories(target.getParent());
        Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING);
    }

    @Override
    public StoredFile open(String reference) throws Exception {
        Path file = resolveKey(keyFromReference(reference));
        if (!Files.isRegularFile(file)) {
            throw new IllegalArgumentException("Fichier introuvable.");
        }
        String contentType = Files.probeContentType(file);
        if (contentType == null) contentType = "application/octet-stream";
        return new StoredFile(
                new FileSystemResource(file),
                contentType,
                Files.size(file),
                file.getFileName().toString()
        );
    }

    private Path resolveKey(String key) {
        Path resolved = root.resolve(key).normalize();
        if (!resolved.startsWith(root)) {
            throw new IllegalArgumentException("Chemin invalide.");
        }
        return resolved;
    }
}
