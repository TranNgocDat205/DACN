package com.dacn.assistant.service;
import com.dacn.assistant.repo.Repos;
import com.dacn.assistant.config.SecurityConfig;
import com.dacn.assistant.model.Models.*;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
@Service
public class ProjectAccess {
  public final Repos.Projects projects;
  public final Repos.Members members;
  public final SecurityConfig auth;
  public final RoleAccess roles;
  public ProjectAccess(Repos.Projects p,Repos.Members m,SecurityConfig a,RoleAccess r){projects=p;members=m;auth=a;roles=r;}
  public boolean isAdmin(){return roles.isAdmin();}
  public Project require(Long projectId) {
    Project p=projects.findById(projectId).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Project not found"));
    if(!roles.isAdmin() && members.findByProjectIdAndUserId(projectId,auth.currentUser()).isEmpty()) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Not a project member");
    return p;
  }
  public void owner(Long projectId){ Project p=require(projectId);if(!roles.isAdmin() && !p.ownerId.equals(auth.currentUser())) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Only owner"); }
  public <T> T owned(T entity,Long parentId) { require(parentId);return entity; }
  public void ensure(boolean condition){ if(!condition) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Resource not found in this project"); }
}
