package com.dacn.assistant.config;

import com.dacn.assistant.repo.Repos;
import io.jsonwebtoken.Jwts;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import javax.crypto.SecretKey;
import java.io.IOException;
import java.util.List;

/** Verify JWT identity and resolve CURRENT roles from DB (not from user-controlled or stale claims). */
public final class JwtAuthenticationFilter extends OncePerRequestFilter {
  private final SecretKey key;
  private final Repos.Users users;

  public JwtAuthenticationFilter(SecretKey key, Repos.Users users) {
    this.key=key;this.users=users;
  }

  @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,
                                          FilterChain chain) throws ServletException,IOException {
    String header=req.getHeader("Authorization");
    if(header!=null && header.startsWith("Bearer ")) {
      SecurityContextHolder.clearContext();
      try {
        var claims=Jwts.parser().verifyWith(key).build()
            .parseSignedClaims(header.substring(7)).getPayload();
        if(claims.getIssuer()!=null && !"devpilot".equals(claims.getIssuer()))
          throw new IllegalArgumentException("Invalid JWT issuer");
        Long id=Long.valueOf(claims.getSubject());
        users.findById(id).ifPresent(user -> {
          String role="ADMIN".equals(user.role)?"ADMIN":"USER";
          SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(id,null,
              List.of(new SimpleGrantedAuthority("ROLE_"+role))));
        });
      } catch(Exception ignored) {
        // A bad, expired or forged token stays anonymous; Spring Security responds 401.
        SecurityContextHolder.clearContext();
      }
    }
    chain.doFilter(req,res);
  }
}
