package com.nehemiahlab.platform.security;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

/**
 * Stockage privé de fichiers. Les références retournées sont des chemins
 * logiques internes, jamais des URL publiques du fournisseur objet.
 */
public interface SecureFileStorage {

    String store(MultipartFile file, String folder, String category, long maxBytes, String prefix)
            throws Exception;

    StoredFile open(String reference) throws Exception;

    record StoredFile(Resource resource, String contentType, long contentLength, String filename) {
    }
}
