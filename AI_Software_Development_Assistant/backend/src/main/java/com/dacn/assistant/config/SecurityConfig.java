package com.dacn.assistant.config;

import com.dacn.assistant.model.Models.User;
import com.dacn.assistant.repo.Repos;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;

/** Signed JWT is proof of identity; database roles are the source of truth on EVERY request. */
@Configuration
public class SecurityConfig {
  private final SecretKey key;
  private final Repos.Users users;
  @Value("${app.cors-origin}") String cors;

  public SecurityConfig(@Value("${app.jwt-secret}") String secret, Repos.Users users) {
    if (secret == null || secret.startsWith("CHANGE_ME") || secret.getBytes(StandardCharsets.UTF_8).length < 32)
      throw new IllegalArgumentException("Set a strong JWT_SECRET (at least 32 UTF-8 bytes) in backend/.env");
    key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.users = users;
  }

  public String createToken(User user) {
    // The role claim helps client diagnostics; authorization NEVER trusts it on its own.
    String role = "ADMIN".equals(user.role) ? "ADMIN" : "USER";
    return Jwts.builder().subject(String.valueOf(user.id)).claim("role", role)
        .issuer("devpilot").id(UUID.randomUUID().toString())
        .issuedAt(Date.from(Instant.now()))
        .expiration(Date.from(Instant.now().plusSeconds(86400)))
        .signWith(key).compact();
  }

  public Long currentUser() {
    var auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !(auth.getPrincipal() instanceof Long id))
      throw new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.UNAUTHORIZED, "Login required");
    return id;
  }

  @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

  @Bean SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    CorsConfiguration cc = new CorsConfiguration();
    cc.setAllowedOrigins(List.of(cors.split(",")));
    cc.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    cc.setAllowedHeaders(List.of("Authorization", "Content-Type"));
    UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
    src.registerCorsConfiguration("/**", cc);

    return http.cors(c -> c.configurationSource(src)).csrf(c -> c.disable())
      .sessionManagement(c -> c.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
      .httpBasic(AbstractHttpConfigurer::disable)
      .formLogin(AbstractHttpConfigurer::disable)
      .exceptionHandling(c -> c
        .authenticationEntryPoint((req, res, e) -> res.sendError(401, "Login required"))
        .accessDeniedHandler((req, res, e) -> res.sendError(403, "Access denied")))
      .authorizeHttpRequests(c -> c
        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
        .requestMatchers(HttpMethod.POST, "/api/auth/register", "/api/auth/login",
            "/api/auth/verify-email", "/api/auth/resend-otp").permitAll()
        .requestMatchers(HttpMethod.GET, "/api/health").permitAll()
        .requestMatchers("/error").permitAll()
        .requestMatchers("/api/admin/**").hasRole("ADMIN")
        .anyRequest().authenticated())
      .addFilterBefore(new JwtAuthenticationFilter(key, users), UsernamePasswordAuthenticationFilter.class)
      .build();
  }
}
