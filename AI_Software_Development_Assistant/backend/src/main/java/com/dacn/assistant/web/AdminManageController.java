package com.dacn.assistant.web;

import com.dacn.assistant.model.Models.*;
import com.dacn.assistant.repo.Repos;
import com.dacn.assistant.service.RoleAccess;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

/** Server-enforced account, project and team management for system ADMINs. */
@RestController
@RequestMapping("/api/admin/manage")
public class AdminManageController {
  private final Repos.Users users;
  private final Repos.Projects projects;
  private final Repos.Members members;
  private final Repos.Requirements requirements;
  private final Repos.Stories stories;
  private final Repos.Criteria criteria;
  private final Repos.Sprints sprints;
  private final Repos.Tasks tasks;
  private final Repos.Documents documents;
  private final RoleAccess access;
  private final PasswordEncoder encoder;

  public AdminManageController(Repos.Users users, Repos.Projects projects, Repos.Members members,
      Repos.Requirements requirements, Repos.Stories stories, Repos.Criteria criteria,
      Repos.Sprints sprints, Repos.Tasks tasks, Repos.Documents documents,
      RoleAccess access, PasswordEncoder encoder) {
    this.users=users;this.projects=projects;this.members=members;this.requirements=requirements;
    this.stories=stories;this.criteria=criteria;this.sprints=sprints;this.tasks=tasks;
    this.documents=documents;this.access=access;this.encoder=encoder;
  }
  public record UserInput(String name,String email,String password,String role) {}
  public record ProjectInput(String name,String description,Long ownerId) {}
  public record MemberInput(String email) {}
  public record UserDto(Long id,String name,String email,String role) {
    static UserDto from(User u) {return new UserDto(u.id,u.name,u.email,"ADMIN".equals(u.role)?"ADMIN":"USER");}
  }
  private ResponseStatusException bad(String message) {return new ResponseStatusException(HttpStatus.BAD_REQUEST,message);}
  private String name(String value,int maximum) {
    if(value==null||value.isBlank()||value.trim().length()>maximum)throw bad("Name is required and cannot exceed "+maximum+" characters");
    return value.trim();
  }
  private String email(String value) {
    String result=value==null?"":value.trim().toLowerCase(Locale.ROOT);
    if(result.length()>200||!result.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$"))throw bad("Invalid email address");
    return result;
  }
  private String role(String value) {
    String r=value==null?"USER":value.trim().toUpperCase(Locale.ROOT);
    if(!List.of("USER","ADMIN").contains(r))throw bad("Role must be USER or ADMIN");
    return r;
  }
  private Project project(Long id) {
    return projects.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Project not found"));
  }

  @PostMapping("/users") @Transactional
  public UserDto createUser(@RequestBody UserInput request) {
    access.requireAdmin();
    if(request==null)throw bad("Account is required");
    String mail=email(request.email());
    if(users.findByEmail(mail).isPresent())throw new ResponseStatusException(HttpStatus.CONFLICT,"Email already exists");
    if(request.password()==null||request.password().length()<8||request.password().length()>72)throw bad("Password must be 8-72 characters");
    User user=new User();user.name=name(request.name(),120);user.email=mail;
    user.passwordHash=encoder.encode(request.password());user.role=role(request.role());
    return UserDto.from(users.save(user));
  }

  @PutMapping("/users/{id}") @Transactional
  public UserDto updateUser(@PathVariable Long id,@RequestBody UserInput request) {
    access.requireAdmin();
    User target=users.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Account not found"));
    if(request==null)throw bad("Account data is required");
    String mail=email(request.email());
    users.findByEmail(mail).ifPresent(other->{if(!other.id.equals(id))throw new ResponseStatusException(HttpStatus.CONFLICT,"Email already exists");});
    target.name=name(request.name(),120);target.email=mail;
    // Editing a profile never silently changes a password or system role.
    return UserDto.from(users.save(target));
  }

  @DeleteMapping("/users/{id}") @Transactional
  public void deleteUser(@PathVariable Long id) {
    User actor=access.currentUser();access.requireAdmin();
    if(actor.id.equals(id))throw new ResponseStatusException(HttpStatus.CONFLICT,"You cannot delete your own account");
    User target=users.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Account not found"));
    if("ADMIN".equals(target.role)&&users.countByRole("ADMIN")<=1)
      throw new ResponseStatusException(HttpStatus.CONFLICT,"The last administrator cannot be deleted");
    if(!projects.findByOwnerId(id).isEmpty())
      throw new ResponseStatusException(HttpStatus.CONFLICT,"This account owns projects. Transfer or delete those projects before deleting the account");
    // Preserve tasks and documents; remove only links to the deleted account.
    List<Task> affected=tasks.findAll().stream().filter(t->id.equals(t.assigneeId)).toList();
    affected.forEach(t->t.assigneeId=null);tasks.saveAll(affected);
    List<Document> uploaded=documents.findAll().stream().filter(d->id.equals(d.uploadedBy)).toList();
    uploaded.forEach(d->d.uploadedBy=null);documents.saveAll(uploaded);
    members.deleteAll(members.findByUserId(id));
    users.delete(target);
  }

  @PostMapping("/projects") @Transactional
  public Project createProject(@RequestBody ProjectInput request) {
    access.requireAdmin();
    if(request==null||request.ownerId()==null)throw bad("Project owner is required");
    User owner=users.findById(request.ownerId()).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Owner account not found"));
    Project project=new Project();project.name=name(request.name(),160);project.description=Objects.toString(request.description(),"");
    if(project.description.length()>10000)throw bad("Description is too long");
    project.ownerId=owner.id;project=projects.save(project);
    Member m=new Member();m.projectId=project.id;m.userId=owner.id;m.role="OWNER";members.save(m);
    return project;
  }

  @PutMapping("/projects/{id}") @Transactional
  public Project updateProject(@PathVariable Long id,@RequestBody ProjectInput request) {
    access.requireAdmin();
    if(request==null)throw bad("Project data is required");
    Project p=project(id);p.name=name(request.name(),160);
    if(request.description()!=null){if(request.description().length()>10000)throw bad("Description is too long");p.description=request.description();}
    if(request.ownerId()!=null&&!request.ownerId().equals(p.ownerId)) {
      User owner=users.findById(request.ownerId()).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Owner not found"));
      Long oldId=p.ownerId;
      members.findByProjectIdAndUserId(id,oldId).ifPresent(m->{m.role="MEMBER";members.save(m);});
      Member replacement=members.findByProjectIdAndUserId(id,owner.id).orElseGet(()->{Member m=new Member();m.projectId=id;m.userId=owner.id;return m;});
      replacement.role="OWNER";members.save(replacement);p.ownerId=owner.id;
    }
    return projects.save(p);
  }

  @DeleteMapping("/projects/{id}") @Transactional
  public void deleteProject(@PathVariable Long id) {
    access.requireAdmin();project(id);
    // RAG documents are indexed in a separate Python service. Block deletion until
    // they are removed using the existing document API so the external index is not orphaned.
    if(documents.findByProjectIdOrderByCreatedAtDesc(id).size()>0)
      throw new ResponseStatusException(HttpStatus.CONFLICT,"Delete RAG documents in this project before deleting the project");
    tasks.deleteAll(tasks.findByProjectIdOrderByCreatedAtDesc(id));
    criteria.deleteAll(criteria.findByProjectId(id));
    stories.deleteAll(stories.findByProjectIdOrderByCreatedAtDesc(id));
    sprints.deleteAll(sprints.findByProjectIdOrderByCreatedAtDesc(id));
    requirements.deleteAll(requirements.findByProjectIdOrderByCreatedAtDesc(id));
    members.deleteAll(members.findByProjectId(id));
    projects.deleteById(id);
  }

  public record TeamMember(Long membershipId,Long userId,String name,String email,String role,boolean isOwner) {}
  @GetMapping("/projects/{id}/team")
  public List<TeamMember> team(@PathVariable Long id) {
    access.requireAdmin();Project p=project(id);
    return members.findByProjectId(id).stream().map(m->{
      User u=users.findById(m.userId).orElse(null);
      return u==null?null:new TeamMember(m.id,u.id,u.name,u.email,m.role,p.ownerId.equals(u.id));
    }).filter(Objects::nonNull).toList();
  }
  @PostMapping("/projects/{id}/team") @Transactional
  public TeamMember addMember(@PathVariable Long id,@RequestBody MemberInput request) {
    access.requireAdmin();project(id);
    if(request==null)throw bad("Email is required");
    User user=users.findByEmail(email(request.email())).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Account not found"));
    if(members.findByProjectIdAndUserId(id,user.id).isPresent())throw new ResponseStatusException(HttpStatus.CONFLICT,"Already a member");
    Member m=new Member();m.projectId=id;m.userId=user.id;m.role="MEMBER";m=members.save(m);
    return new TeamMember(m.id,user.id,user.name,user.email,m.role,false);
  }
  @DeleteMapping("/projects/{id}/team/{userId}") @Transactional
  public void removeMember(@PathVariable Long id,@PathVariable Long userId) {
    access.requireAdmin();Project p=project(id);
    if(p.ownerId.equals(userId))throw new ResponseStatusException(HttpStatus.CONFLICT,"Transfer project ownership before removing the owner");
    Member member=members.findByProjectIdAndUserId(id,userId).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Member not found"));
    List<Task> affected=tasks.findByProjectIdOrderByCreatedAtDesc(id).stream().filter(t->userId.equals(t.assigneeId)).toList();
    affected.forEach(t->t.assigneeId=null);tasks.saveAll(affected);
    members.delete(member);
  }
}
