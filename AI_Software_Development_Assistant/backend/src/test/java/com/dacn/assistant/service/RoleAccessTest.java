package com.dacn.assistant.service;

import com.dacn.assistant.config.SecurityConfig;
import com.dacn.assistant.model.Models.*;
import com.dacn.assistant.repo.Repos;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RoleAccessTest {
  private final SecurityConfig auth=mock(SecurityConfig.class);
  private final Repos.Users users=mock(Repos.Users.class);
  private final Repos.Projects projects=mock(Repos.Projects.class);
  private final Repos.Members members=mock(Repos.Members.class);
  private final RoleAccess roles=new RoleAccess(users,auth);
  private final ProjectAccess access=new ProjectAccess(projects,members,auth,roles);

  private User login(long id,String role) {
    User u=new User();u.id=id;u.role=role;
    when(auth.currentUser()).thenReturn(id);
    when(users.findById(id)).thenReturn(Optional.of(u));
    return u;
  }
  @Test void userCannotReadAnotherProject() {
    login(5L,"USER");
    Project p=new Project();p.id=17L;p.ownerId=1L;
    when(projects.findById(17L)).thenReturn(Optional.of(p));
    assertEquals(HttpStatus.FORBIDDEN,assertThrows(ResponseStatusException.class,()->access.require(17L)).getStatusCode());
  }
  @Test void userCanReadOwnMemberProjectButCannotManageMembership() {
    login(5L,"USER");
    Project p=new Project();p.id=17L;p.ownerId=1L;
    when(projects.findById(17L)).thenReturn(Optional.of(p));
    Member m=new Member();m.projectId=17L;m.userId=5L;
    when(members.findByProjectIdAndUserId(17L,5L)).thenReturn(Optional.of(m));
    assertSame(p,access.require(17L));
    assertEquals(HttpStatus.FORBIDDEN,assertThrows(ResponseStatusException.class,()->access.owner(17L)).getStatusCode());
  }
  @Test void adminCanReadAndManageAnyProject() {
    login(5L,"ADMIN");
    Project p=new Project();p.id=17L;p.ownerId=1L;
    when(projects.findById(17L)).thenReturn(Optional.of(p));
    assertSame(p,access.require(17L));
    assertDoesNotThrow(()->access.owner(17L));
  }
  @Test void nonAdminCannotUseAdministration() {
    login(5L,"USER");
    assertEquals(HttpStatus.FORBIDDEN,assertThrows(ResponseStatusException.class,roles::requireAdmin).getStatusCode());
  }
}
