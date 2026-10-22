package com.dacn.assistant.web;

import com.dacn.assistant.model.Models.*;
import com.dacn.assistant.repo.Repos;
import com.dacn.assistant.service.RoleAccess;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminManageControllerTest {
  @Mock Repos.Users users;
  @Mock Repos.Projects projects;
  @Mock Repos.Members members;
  @Mock Repos.Requirements requirements;
  @Mock Repos.Stories stories;
  @Mock Repos.Criteria criteria;
  @Mock Repos.Sprints sprints;
  @Mock Repos.Tasks tasks;
  @Mock Repos.Documents documents;
  @Mock RoleAccess access;
  @Mock PasswordEncoder encoder;
  AdminManageController controller;

  @BeforeEach void setup(){controller=new AdminManageController(users,projects,members,requirements,stories,criteria,sprints,tasks,documents,access,encoder);}

  @Test void adminCannotDeleteOwnAccount(){
    User actor=new User();actor.id=1L;actor.role="ADMIN";
    when(access.currentUser()).thenReturn(actor);
    ResponseStatusException err=assertThrows(ResponseStatusException.class,()->controller.deleteUser(1L));
    assertEquals(HttpStatus.CONFLICT,err.getStatusCode());
    verify(users,never()).delete(any());
  }

  @Test void deletionOfProjectWithRagDocumentsIsBlocked(){
    Project p=new Project();p.id=5L;
    when(projects.findById(5L)).thenReturn(Optional.of(p));
    Document doc=new Document();doc.id=15L;doc.projectId=5L;
    when(documents.findByProjectIdOrderByCreatedAtDesc(5L)).thenReturn(List.of(doc));
    ResponseStatusException err=assertThrows(ResponseStatusException.class,()->controller.deleteProject(5L));
    assertEquals(HttpStatus.CONFLICT,err.getStatusCode());
    verify(projects,never()).deleteById(anyLong());
  }

  @Test void createdAccountHasHashedPasswordAndDefaultUserRole(){
    when(users.findByEmail("new@example.org")).thenReturn(Optional.empty());
    when(encoder.encode("VerySecret123!")).thenReturn("$2a$12$hashed");
    when(users.save(any(User.class))).thenAnswer(inv->{User u=inv.getArgument(0);u.id=11L;return u;});
    var dto=controller.createUser(new AdminManageController.UserInput("New User","new@example.org","VerySecret123!",null));
    assertEquals("USER",dto.role());
    assertEquals(11L,dto.id());
    assertEquals("new@example.org",dto.email());
    verify(encoder).encode("VerySecret123!");
  }

  @Test void regularUserCannotCreateAdminProject(){
    doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN)).when(access).requireAdmin();
    assertEquals(HttpStatus.FORBIDDEN,assertThrows(ResponseStatusException.class,
      ()->controller.createProject(new AdminManageController.ProjectInput("Test","",1L))).getStatusCode());
    verify(projects,never()).save(any());
  }
}
