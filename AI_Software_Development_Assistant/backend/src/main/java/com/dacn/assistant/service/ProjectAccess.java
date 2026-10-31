package com.dacn.assistant.service;

import com.dacn.assistant.repo.Repos;
import com.dacn.assistant.config.SecurityConfig;
import com.dacn.assistant.model.Models.*;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Authoritative per-project authorization. Memberships are fetched live from SQL Server. */
@Service
public class ProjectAccess {
  public final Repos.Projects projects;
  public final Repos.Members members;
  public final SecurityConfig auth;
  public final RoleAccess roles;
  public ProjectAccess(Repos.Projects p, Repos.Members m, SecurityConfig a, RoleAccess r) {
    projects=p; members=m; auth=a; roles=r;
  }
  public boolean isAdmin() { return roles.isAdmin(); }

  public Project require(Long projectId) {
    Project project = projects.findById(projectId).orElseThrow(
      () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
    if (!roles.isAdmin() && !project.ownerId.equals(auth.currentUser()) &&
        members.findByProjectIdAndUserId(projectId, auth.currentUser()).isEmpty())
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a project member");
    return project;
  }

  /** OWNER, MEMBER and system ADMIN may write. VIEWER can only read and use non-mutating AI tools. */
  public Project write(Long projectId) {
    Project project = require(projectId);
    if (!roles.isAdmin() && !project.ownerId.equals(auth.currentUser())) {
      Member member = members.findByProjectIdAndUserId(projectId, auth.currentUser())
          .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a project member"));
      if (!"OWNER".equals(member.role) && !"MEMBER".equals(member.role))
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Project is read-only for your account");
    }
    return project;
  }

  /** Only the owner or system ADMIN can manage project identity and membership. */
  public void owner(Long projectId) {
    Project project = require(projectId);
    if (!roles.isAdmin() && !project.ownerId.equals(auth.currentUser()))
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only project owner can manage access");
  }
  public <T> T owned(T entity, Long parentId) { require(parentId); return entity; }
  public void ensure(boolean condition) {
    if (!condition) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Resource not found in this project");
  }
}
