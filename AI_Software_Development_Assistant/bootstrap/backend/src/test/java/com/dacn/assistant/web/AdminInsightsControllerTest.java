package com.dacn.assistant.web;

import com.dacn.assistant.model.Models.*;
import com.dacn.assistant.repo.Repos;
import com.dacn.assistant.service.RoleAccess;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AdminInsightsControllerTest {
  record Fixture(AdminInsightsController controller, Repos.Users users, Repos.Projects projects,
    Repos.Members members, Repos.Requirements requirements, Repos.Stories stories,
    Repos.Sprints sprints, Repos.Tasks tasks, Repos.Documents documents, RoleAccess roles) {}
  Fixture fixture() {
    var users=mock(Repos.Users.class);
    var projects=mock(Repos.Projects.class);
    var members=mock(Repos.Members.class);
    var requirements=mock(Repos.Requirements.class);
    var stories=mock(Repos.Stories.class);
    var sprints=mock(Repos.Sprints.class);
    var tasks=mock(Repos.Tasks.class);
    var documents=mock(Repos.Documents.class);
    var roles=mock(RoleAccess.class);
    return new Fixture(new AdminInsightsController(users,projects,members,requirements,stories,
      sprints,tasks,documents,roles), users,projects,members,requirements,stories,sprints,tasks,documents,roles);
  }
  @Test void nonAdminCannotReadDashboardOrProjectList() {
    var f=fixture();
    doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN)).when(f.roles()).requireAdmin();
    assertEquals(HttpStatus.FORBIDDEN,assertThrows(ResponseStatusException.class,()->f.controller().overview()).getStatusCode());
    assertEquals(HttpStatus.FORBIDDEN,assertThrows(ResponseStatusException.class,()->f.controller().listProjects()).getStatusCode());
    assertEquals(HttpStatus.FORBIDDEN,assertThrows(ResponseStatusException.class,()->f.controller().projectsForUser(7L)).getStatusCode());
    verify(f.projects(),never()).findAll();
  }
  @Test void adminGetsCountsAndProjectsForAccount() {
    var f=fixture();
    User admin=new User();admin.id=1L;admin.role="ADMIN";admin.name="Admin";admin.email="admin@example.test";
    User member=new User();member.id=2L;member.role="USER";member.name="Member";member.email="member@example.test";
    Project p=new Project();p.id=11L;p.name="Demo";p.ownerId=admin.id;
    Member m=new Member();m.projectId=p.id;m.userId=member.id;m.role="MEMBER";
    Task t1=new Task();t1.projectId=p.id;t1.status="DONE";
    Task t2=new Task();t2.projectId=p.id;t2.status="IN_PROGRESS";
    when(f.users().findAll()).thenReturn(List.of(admin,member));
    when(f.users().findById(2L)).thenReturn(Optional.of(member));
    when(f.projects().findAll()).thenReturn(List.of(p));
    when(f.projects().findByOwnerId(2L)).thenReturn(List.of());
    when(f.members().findAll()).thenReturn(List.of(m));
    when(f.members().findByUserId(2L)).thenReturn(List.of(m));
    when(f.requirements().findAll()).thenReturn(List.of());
    when(f.stories().findAll()).thenReturn(List.of());
    when(f.tasks().findAll()).thenReturn(List.of(t1,t2));
    when(f.documents().findAll()).thenReturn(List.of());
    var result=f.controller().overview();
    assertEquals(2,result.users());
    assertEquals(1,result.admins());
    assertEquals(1,result.projects());
    assertEquals(2,result.tasks());
    assertEquals(1,result.completedTasks());
    assertEquals(1L,result.taskStatuses().get("IN_PROGRESS"));
    assertEquals(6,result.activity().size());
    var userProjects=f.controller().projectsForUser(2L);
    assertEquals(1,userProjects.size());
    assertEquals("MEMBER",userProjects.get(0).membershipRole());
    assertEquals("Admin",userProjects.get(0).ownerName());
  }
}
