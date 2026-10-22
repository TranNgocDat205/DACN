package com.dacn.assistant.web;

import com.dacn.assistant.model.Models.User;
import com.dacn.assistant.repo.Repos;
import com.dacn.assistant.service.RoleAccess;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
  private final Repos.Users users;
  private final RoleAccess access;
  public AdminController(Repos.Users users, RoleAccess access) {this.users=users;this.access=access;}

  // Never send password hashes or other credential fields to an administrator UI.
  public record UserView(Long id, String name, String email, String role) {
    static UserView from(User user) {
      return new UserView(user.id,user.name,user.email,"ADMIN".equals(user.role)?"ADMIN":"USER");
    }
  }
  public record RoleRequest(String role) {}

  @GetMapping("/users")
  public List<UserView> users() {
    access.requireAdmin();
    return users.findAll().stream().sorted(Comparator.comparing(u -> u.id))
      .map(UserView::from).toList();
  }

  @PutMapping("/users/{id}/role")
  @Transactional
  public UserView changeRole(@PathVariable Long id, @RequestBody RoleRequest body) {
    User actor=access.currentUser();
    if(!"ADMIN".equals(actor.role))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Administrator access required");
    String role=body==null||body.role()==null?"":body.role().trim().toUpperCase(Locale.ROOT);
    if(!List.of("ADMIN","USER").contains(role))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Role must be ADMIN or USER");
    User target=users.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Account not found"));
    if("ADMIN".equals(target.role) && "USER".equals(role)) {
      if(id.equals(actor.id))throw new ResponseStatusException(HttpStatus.CONFLICT,"Cannot remove your own administrator role");
      if(users.countByRole("ADMIN")<=1)throw new ResponseStatusException(HttpStatus.CONFLICT,"At least one administrator is required");
    }
    target.role=role;
    return UserView.from(users.save(target));
  }
}
