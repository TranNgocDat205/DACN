package com.dacn.assistant.service;

import com.dacn.assistant.config.SecurityConfig;
import com.dacn.assistant.model.Models.User;
import com.dacn.assistant.repo.Repos;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RoleAccess {
  private final Repos.Users users;
  private final SecurityConfig auth;
  public RoleAccess(Repos.Users users, SecurityConfig auth) {
    this.users=users; this.auth=auth;
  }
  public User currentUser() {
    return users.findById(auth.currentUser()).orElseThrow(
      () -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account not found"));
  }
  // Read live role from database: changing role takes effect without issuing a new JWT.
  public boolean isAdmin() { return "ADMIN".equals(currentUser().role); }
  public void requireAdmin() {
    if (!isAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Administrator access required");
  }
}
