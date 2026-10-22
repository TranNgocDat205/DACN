package com.dacn.assistant.web;
import com.dacn.assistant.config.SecurityConfig;
import com.dacn.assistant.model.Models.*;
import com.dacn.assistant.repo.Repos;
import com.dacn.assistant.service.ProjectAccess;
import org.springframework.http.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
@RestController @RequestMapping("/api/projects")
public class ProjectsController {
  private final Repos.Projects projects;private final Repos.Members members;private final Repos.Users users;
  private final SecurityConfig auth;private final ProjectAccess access;
  public ProjectsController(Repos.Projects p,Repos.Members m,Repos.Users u,SecurityConfig a,ProjectAccess x){projects=p;members=m;users=u;auth=a;access=x;}
  public record ProjectRequest(String name,String description){}
  public record MemberRequest(String email,String role){}
  @GetMapping public List<Project> list(){
    if(access.isAdmin())return projects.findAll();
    List<Long> ids=members.findByUserId(auth.currentUser()).stream().map(m->m.projectId).distinct().toList();
    return projects.findAllById(ids);
  }
  @GetMapping("/{id}") public Project get(@PathVariable Long id){return access.require(id);}
  @PostMapping @Transactional public Project create(@RequestBody ProjectRequest req){
    if(req.name()==null||req.name().isBlank()||req.name().length()>160)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Project name required (max 160)");
    Project p=new Project();p.name=req.name().trim();p.description=Objects.toString(req.description(),"");p.ownerId=auth.currentUser();p=projects.save(p);
    Member m=new Member();m.projectId=p.id;m.userId=auth.currentUser();m.role="OWNER";members.save(m);return p;
  }
  @PutMapping("/{id}") public Project update(@PathVariable Long id,@RequestBody ProjectRequest req){
    access.owner(id);Project p=access.require(id);
    if(req.name()!=null&&!req.name().isBlank()&&req.name().length()<=160)p.name=req.name().trim();
    if(req.description()!=null)p.description=req.description();
    return projects.save(p);
  }
  @GetMapping("/{id}/members") public List<Map<String,Object>> listMembers(@PathVariable Long id){
    access.require(id);List<Map<String,Object>> out=new ArrayList<>();
    for(Member m:members.findByProjectId(id)) users.findById(m.userId).ifPresent(u->out.add(Map.of("id",m.id,"userId",u.id,"name",u.name,"email",u.email,"role",m.role)));
    return out;
  }
  @PostMapping("/{id}/members") public Map<String,Object> addMember(@PathVariable Long id,@RequestBody MemberRequest request){
    access.owner(id);String email=request.email()==null?"":request.email().trim().toLowerCase(Locale.ROOT);
    User user=users.findByEmail(email).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Account not found; user must register first"));
    if(members.findByProjectIdAndUserId(id,user.id).isPresent())throw new ResponseStatusException(HttpStatus.CONFLICT,"Already a member");
    Member m=new Member();m.projectId=id;m.userId=user.id;m.role="MEMBER";members.save(m);
    return Map.of("id",m.id,"name",user.name,"email",user.email,"role",m.role);
  }
}
