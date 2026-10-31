package com.dacn.assistant.service;

import com.dacn.assistant.config.SecurityConfig;
import com.dacn.assistant.model.Models.User;
import com.dacn.assistant.repo.Repos;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class JwtAuthorizationTest {
  private static final String SECRET="unit-test-secret-with-at-least-32-bytes-2026";
  @AfterEach void clear() { SecurityContextHolder.clearContext(); }

  @Test void jwtIsSignedHasExpiryAndContainsNonAuthoritativeRoleClaim() {
    SecurityConfig config=new SecurityConfig(SECRET,mock(Repos.Users.class));
    User user=new User();user.id=42L;user.role="ADMIN";
    String token=config.createToken(user);
    var payload=Jwts.parser().verifyWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)))
      .build().parseSignedClaims(token).getPayload();
    assertEquals("42",payload.getSubject());
    assertEquals("ADMIN",payload.get("role",String.class));
    assertEquals("devpilot",payload.getIssuer());
    assertTrue(payload.getExpiration().after(payload.getIssuedAt()));
    assertNotNull(payload.getId());
  }

  @Test void insecureSecretCannotBootApp() {
    assertThrows(IllegalArgumentException.class,()->new SecurityConfig("CHANGE_ME_TO_A_RANDOM_SECRET_AT_LEAST_32_CHARACTERS",mock(Repos.Users.class)));
    assertThrows(IllegalArgumentException.class,()->new SecurityConfig("short-secret",mock(Repos.Users.class)));
  }

  @Test void requestRequiresAuthenticatedIdPrincipal() {
    SecurityConfig config=new SecurityConfig(SECRET,mock(Repos.Users.class));
    assertEquals(HttpStatus.UNAUTHORIZED,assertThrows(ResponseStatusException.class,config::currentUser).getStatusCode());
    SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(42L,null,List.of()));
    assertEquals(42L,config.currentUser());
  }
}
