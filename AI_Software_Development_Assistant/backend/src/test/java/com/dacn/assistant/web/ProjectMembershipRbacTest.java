package com.dacn.assistant.web;

import com.dacn.assistant.config.SecurityConfig;
import com.dacn.assistant.model.Models.*;
import com.dacn.assistant.repo.Repos;
import com.dacn.assistant.service.ProjectAccess;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProjectMembershipRbacTest {
  @Test void ownerMayGrantViewerButNotOwnerUsingMemberEndpoint() {
    var projects=mock(Repos.Projects.class);
    var members=mock(Repos.Members.class);
    var users=mock(Repos.Users.class);
    var auth=mock(SecurityConfig.class);
    var access=mock(ProjectAccess.class);
    var controller=new ProjectsController(projects,members,users,auth,access);
    Project p=new Project();p.id=20L;p.ownerId=1L;
    Member m=new Member();m.projectId=20L;m.userId=2L;m.role="MEMBER";
    when(access.require(20L)).thenReturn(p);
    when(members.findByProjectIdAndUserId(20L,2L)).thenReturn(Optional.of(m));
    assertEquals("VIEWER",controller.changeMemberRole(20L,2L,new ProjectsController.MemberRoleRequest("VIEWER")).get("role"));
    verify(access).owner(20L);
    assertEquals(HttpStatus.BAD_REQUEST,assertThrows(ResponseStatusException.class,
      ()->controller.changeMemberRole(20L,2L,new ProjectsController.MemberRoleRequest("OWNER"))).getStatusCode());
    assertEquals(HttpStatus.CONFLICT,assertThrows(ResponseStatusException.class,
      ()->controller.removeMember(20L,1L)).getStatusCode());
  }
  @Test void nonOwnerCannotChangeRoles() {
    var controller=new ProjectsController(mock(Repos.Projects.class),mock(Repos.Members.class),
      mock(Repos.Users.class),mock(SecurityConfig.class),mock(ProjectAccess.class));
    // With live ProjectAccess this guard rejects before accessing any member data.
    ProjectAccess access=mock(ProjectAccess.class);
    doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN)).when(access).owner(20L);
    controller=new ProjectsController(mock(Repos.Projects.class),mock(Repos.Members.class),
      mock(Repos.Users.class),mock(SecurityConfig.class),access);
    ProjectsController ctl=controller;
    assertEquals(HttpStatus.FORBIDDEN,assertThrows(ResponseStatusException.class,
      ()->ctl.changeMemberRole(20L,2L,new ProjectsController.MemberRoleRequest("VIEWER"))).getStatusCode());
  }
}
