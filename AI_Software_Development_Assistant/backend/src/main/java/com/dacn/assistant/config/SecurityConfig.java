package com.dacn.assistant.config;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
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
import org.springframework.web.filter.OncePerRequestFilter;
import javax.crypto.SecretKey;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;

@Configuration
public class SecurityConfig {
  private final SecretKey key;
  @Value("${app.cors-origin}") String cors;
  public SecurityConfig(@Value("${app.jwt-secret}") String secret) {
    if(secret.getBytes(StandardCharsets.UTF_8).length < 32) throw new IllegalArgumentException("JWT_SECRET must contain at least 32 UTF-8 bytes");
    key=Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
  }
  public String createToken(Long id) {
    return Jwts.builder().subject(String.valueOf(id)).issuedAt(Date.from(Instant.now()))
        .expiration(Date.from(Instant.now().plusSeconds(86400))).signWith(key).compact();
  }
  public Long currentUser() {
    var auth=SecurityContextHolder.getContext().getAuthentication();
    if(auth==null || !(auth.getPrincipal() instanceof Long id)) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED,"Login required");
    return id;
  }
  @Bean PasswordEncoder passwordEncoder(){return new BCryptPasswordEncoder();}
  @Bean SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    CorsConfiguration cc=new CorsConfiguration();
    cc.setAllowedOrigins(List.of(cors.split(",")));
    cc.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS"));
    cc.setAllowedHeaders(List.of("Authorization","Content-Type"));
    UrlBasedCorsConfigurationSource src=new UrlBasedCorsConfigurationSource();src.registerCorsConfiguration("/**",cc);
    return http.cors(c->c.configurationSource(src)).csrf(c->c.disable())
      .sessionManagement(c->c.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
      .httpBasic(AbstractHttpConfigurer::disable).formLogin(AbstractHttpConfigurer::disable)
      .exceptionHandling(c->c.authenticationEntryPoint((req,res,e)->res.sendError(401,"Login required"))
        .accessDeniedHandler((req,res,e)->res.sendError(403,"Access denied")))
      .authorizeHttpRequests(c->c.requestMatchers("/api/auth/**", "/api/health", "/error").permitAll().anyRequest().authenticated())
      .addFilterBefore(new OncePerRequestFilter() {
        @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain) throws ServletException,IOException {
          String header=req.getHeader("Authorization");
          if(header!=null && header.startsWith("Bearer ")) {
            try {
              Long id=Long.valueOf(Jwts.parser().verifyWith(key).build().parseSignedClaims(header.substring(7)).getPayload().getSubject());
              SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(id,null,List.of()));
            } catch(Exception ignored) { SecurityContextHolder.clearContext(); }
          }
          chain.doFilter(req,res);
        }
      },UsernamePasswordAuthenticationFilter.class).build();
  }
}
