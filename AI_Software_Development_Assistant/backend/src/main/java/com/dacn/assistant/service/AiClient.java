package com.dacn.assistant.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.io.IOException;
import java.util.Map;

@Service
public class AiClient {
    private final RestClient client;

    public AiClient(@Value("${app.ai-url}") String baseUrl,
                    @Value("${app.ai-internal-key}") String internalKey) {
        // Force regular HTTP/1.1 for the local FastAPI / Uvicorn server.
        // The default RestClient transport can negotiate a protocol that Uvicorn rejects.
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(240000); // 240s; must exceed FastAPI LLM read timeout (180s, max 210s).

        if (baseUrl == null || !baseUrl.matches("^http://(127\\.0\\.0\\.1|localhost):8000/?$")) {
            throw new IllegalArgumentException("AI_SERVICE_URL must be http://127.0.0.1:8000");
        }
        this.client = RestClient.builder()
                .requestFactory(factory)
                .baseUrl(baseUrl.replaceAll("/+$", ""))
                .defaultHeader("X-Internal-Key", internalKey)
                .defaultHeader("Accept", MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> status() {
        try {
            return client.get().uri("/health").retrieve().body(Map.class);
        } catch (RestClientException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "AI service health check failed: ensure FastAPI is running at http://127.0.0.1:8000", ex);
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> post(String path, Object payload) {
        try {
            return client.post().uri(path).contentType(MediaType.APPLICATION_JSON)
                    .body(payload).retrieve().body(Map.class);
        } catch (RestClientResponseException ex) {
            String detail = ex.getResponseBodyAsString();
            String message;
            if (ex.getStatusCode().value() == 401) {
                message = "AI internal key mismatch: verify both AI_INTERNAL_KEY values and restart both services";
            } else if (detail.contains("Invalid HTTP request received")) {
                message = "FastAPI rejected the HTTP request format. Verify AI_SERVICE_URL uses http://, "
                        + "replace AiClient.java with HTTP/1.1 fix, and restart Spring Boot";
            } else {
                message = "AI service HTTP " + ex.getStatusCode().value() + ": "
                        + (detail.length() > 350 ? detail.substring(0, 350) : detail);
            }
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, message, ex);
        } catch (RestClientException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Cannot contact FastAPI at http://127.0.0.1:8000: "
                    + ex.getClass().getSimpleName() + " (check FastAPI terminal)", ex);
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> upload(Long projectId, MultipartFile file) throws IOException {
        MultiValueMap<String, Object> data = new LinkedMultiValueMap<>();
        data.add("project_id", String.valueOf(projectId));
        data.add("file", new ByteArrayResource(file.getBytes()) {
            @Override public String getFilename() { return file.getOriginalFilename(); }
        });
        try {
            return client.post().uri("/rag/upload")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(data).retrieve().body(Map.class);
        } catch (RestClientException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "AI document upload failed (HTTP/1.1): " + ex.getClass().getSimpleName(), ex);
        }
    }

    public void deleteDoc(Long projectId, String docId) {
        try {
            client.delete().uri("/rag/documents/{project}/{doc}", projectId, docId)
                    .retrieve().toBodilessEntity();
        } catch (RestClientException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "AI document delete failed: " + ex.getClass().getSimpleName(), ex);
        }
    }
}
