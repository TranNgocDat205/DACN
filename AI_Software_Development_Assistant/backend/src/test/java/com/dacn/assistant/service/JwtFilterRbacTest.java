package com.dacn.assistant.service;

import com.dacn.assistant.config.JwtAuthenticationFilter;
import com.dacn.assistant.config.SecurityConfig;
import com.dacn.assistant.model.Models.User;
import com.dacn.assistant.repo.Repos;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class JwtFilterRbacTest {
  private static final String SECRET="long-strong-jwt-unit-test-secret-for-2026";
  @AfterEach void clear() { SecurityContextHolder.clearContext(); }

  private void call(JwtAuthenticationFilter filter,String token) throws Exception {
    MockHttpServletRequest req=new MockHttpServletRequest("GET","/api/admin/users");
    MockHttpServletResponse res=new MockHttpServletResponse();
    if(token!=null)req.addHeader("Authorization","Bearer "+token);
    FilterChain chain=(r,s)->{};
    filter.doFilter(req,res,chain);
  }
  @Test void adminDemotionTakesEffectWithSameJwt() throws Exception {
    Repos.Users users=mock(Repos.Users.class);
    User user=new User();user.id=42L;user.role="ADMIN";
    when(users.findById(42L)).thenReturn(Optional.of(user));
    SecurityConfig config=new SecurityConfig(SECRET,users);
    String token=config.createToken(user);
    var filter=new JwtAuthenticationFilter(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)),users);
    call(filter,token);
    assertTrue(SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
      .anyMatch(a->"ROLE_ADMIN".equals(a.getAuthority())));
    user.role="USER";
    call(filter,token);
    assertTrue(SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
      .anyMatch(a->"ROLE_USER".equals(a.getAuthority())));
    assertFalse(SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
      .anyMatch(a->"ROLE_ADMIN".equals(a.getAuthority())));
  }
  @Test void invalidJwtAndDeletedAccountCannotAuthenticate() throws Exception {
    Repos.Users users=mock(Repos.Users.class);
    User user=new User();user.id=42L;user.role="ADMIN";
    var config=new SecurityConfig(SECRET,users);
    String jwt=config.createToken(user);
    var filter=new JwtAuthenticationFilter(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)),users);
    when(users.findById(42L)).thenReturn(Optional.empty());
    call(filter,jwt);
    assertNull(SecurityContextHolder.getContext().getAuthentication());
    call(filter,jwt+"forged");
    assertNull(SecurityContextHolder.getContext().getAuthentication());
  }
}
