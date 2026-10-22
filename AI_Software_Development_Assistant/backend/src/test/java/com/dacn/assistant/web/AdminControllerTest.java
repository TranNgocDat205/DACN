package com.dacn.assistant.web;

import com.dacn.assistant.model.Models.User;
import com.dacn.assistant.repo.Repos;
import com.dacn.assistant.service.RoleAccess;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AdminControllerTest {
  @Test void cannotDemoteSelfOrGrantAnUnsupportedRole() {
    Repos.Users users=mock(Repos.Users.class);
    RoleAccess roleAccess=mock(RoleAccess.class);
    AdminController ctl=new AdminController(users,roleAccess);
    User actor=new User();actor.id=1L;actor.role="ADMIN";
    when(roleAccess.currentUser()).thenReturn(actor);
    when(users.findById(1L)).thenReturn(Optional.of(actor));
    assertEquals(HttpStatus.CONFLICT,assertThrows(ResponseStatusException.class,
      ()->ctl.changeRole(1L,new AdminController.RoleRequest("USER"))).getStatusCode());
    assertEquals(HttpStatus.BAD_REQUEST,assertThrows(ResponseStatusException.class,
      ()->ctl.changeRole(1L,new AdminController.RoleRequest("OWNER"))).getStatusCode());
  }
  @Test void userCannotGrantAdminEvenWithDirectApiCall() {
    Repos.Users users=mock(Repos.Users.class);
    RoleAccess roleAccess=mock(RoleAccess.class);
    AdminController ctl=new AdminController(users,roleAccess);
    User actor=new User();actor.id=1L;actor.role="USER";
    when(roleAccess.currentUser()).thenReturn(actor);
    assertEquals(HttpStatus.FORBIDDEN,assertThrows(ResponseStatusException.class,
      ()->ctl.changeRole(2L,new AdminController.RoleRequest("ADMIN"))).getStatusCode());
    verify(users,never()).save(any());
  }
}
