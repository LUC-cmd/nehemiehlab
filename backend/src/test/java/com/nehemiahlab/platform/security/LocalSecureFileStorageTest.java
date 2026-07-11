package com.nehemiahlab.platform.security;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LocalSecureFileStorageTest {

    @TempDir
    Path tempDirectory;

    @Test
    void storesAndOpensValidatedPrivateFile() throws Exception {
        LocalSecureFileStorage storage = new LocalSecureFileStorage(tempDirectory.toString());
        byte[] png = new byte[]{
                (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
                0, 0, 0, 0, 0, 0, 0, 0
        };
        MockMultipartFile upload = new MockMultipartFile(
                "file", "photo.png", "image/png", png);

        String reference = storage.store(upload, "identite", "image", 1024, "recto");
        SecureFileStorage.StoredFile stored = storage.open(reference);

        assertThat(reference).startsWith("/uploads/identite/recto-").endsWith(".png");
        assertThat(stored.contentType()).isEqualTo("image/png");
        assertThat(stored.resource().getInputStream().readAllBytes()).isEqualTo(png);
    }

    @Test
    void rejectsTraversalAndSpoofedContent() {
        LocalSecureFileStorage storage = new LocalSecureFileStorage(tempDirectory.toString());
        MockMultipartFile spoofed = new MockMultipartFile(
                "file", "photo.png", "image/png", "<html>bad</html>".getBytes());

        assertThatThrownBy(() -> storage.open("/uploads/../secret"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> storage.store(spoofed, "identite", "image", 1024, "recto"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Signature");
    }
}
