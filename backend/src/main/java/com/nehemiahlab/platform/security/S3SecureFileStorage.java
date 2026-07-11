package com.nehemiahlab.platform.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.InputStreamResource;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.InputStream;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Service
@Profile("prod")
public class S3SecureFileStorage extends AbstractSecureFileStorage {

    private final S3Client s3;
    private final String bucket;
    private final Path legacyRoot;

    public S3SecureFileStorage(
            @Value("${app.storage.endpoint}") String endpoint,
            @Value("${app.storage.region:auto}") String region,
            @Value("${app.storage.bucket}") String bucket,
            @Value("${app.storage.access-key}") String accessKey,
            @Value("${app.storage.secret-key}") String secretKey,
            @Value("${app.storage.local-root:uploads}") String legacyRoot
    ) {
        this.bucket = bucket;
        this.legacyRoot = Paths.get(legacyRoot).toAbsolutePath().normalize();
        this.s3 = S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(true)
                        .build())
                .build();
    }

    @Override
    protected void writeObject(String key, InputStream input, long contentLength, String contentType) {
        s3.putObject(
                PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .contentType(contentType)
                        .build(),
                RequestBody.fromInputStream(input, contentLength)
        );
    }

    @Override
    public StoredFile open(String reference) throws Exception {
        String key = keyFromReference(reference);
        try {
            ResponseInputStream<GetObjectResponse> input = s3.getObject(
                    GetObjectRequest.builder().bucket(bucket).key(key).build());
            GetObjectResponse response = input.response();
            String contentType = response.contentType() == null
                    ? "application/octet-stream"
                    : response.contentType();
            long contentLength = response.contentLength() == null ? -1 : response.contentLength();
            return new StoredFile(
                    new InputStreamResource(input),
                    contentType,
                    contentLength,
                    filename(key)
            );
        } catch (S3Exception exception) {
            if (exception.statusCode() != 404) {
                throw exception;
            }
            return openLegacyFile(key);
        }
    }

    private StoredFile openLegacyFile(String key) throws Exception {
        Path file = legacyRoot.resolve(key).normalize();
        if (!file.startsWith(legacyRoot) || !Files.isRegularFile(file)) {
            throw new IllegalArgumentException("Fichier introuvable.");
        }
        String contentType = Files.probeContentType(file);
        if (contentType == null) contentType = "application/octet-stream";
        return new StoredFile(
                new org.springframework.core.io.FileSystemResource(file),
                contentType,
                Files.size(file),
                file.getFileName().toString()
        );
    }

    private static String filename(String key) {
        int slash = key.lastIndexOf('/');
        return slash < 0 ? key : key.substring(slash + 1);
    }
}
