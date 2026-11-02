package com.dacn.assistant.web;

import com.dacn.assistant.model.Models.*;
import com.dacn.assistant.repo.Repos;
import com.dacn.assistant.service.RoleAccess;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Account-level administration. No credential hashes or internal API keys are returned. */
@RestController
@RequestMapping("/api/admin")
public class AdminInsightsController {
  private final Repos.Users users;
  private final Repos.Projects projects;
  private final Repos.Members members;
  private final Repos.Requirements requirements;
  private final Repos.Stories stories;
  private final Repos.Sprints sprints;
  private final Repos.Tasks tasks;
  private final Repos.Documents documents;
  private final RoleAccess access;

  public AdminInsightsController(Repos.Users users, Repos.Projects projects, Repos.Members members,
      Repos.Requirements requirements, Repos.Stories stories, Repos.Sprints sprints, Repos.Tasks tasks,
      Repos.Documents documents, RoleAccess access) {
    this.users=users; this.projects=projects; this.members=members; this.requirements=requirements;
    this.stories=stories; this.sprints=sprints; this.tasks=tasks; this.documents=documents; this.access=access;
  }

  public record AdminProjectView(Long id, String name, String description, Long ownerId,
      String ownerName, String ownerEmail, long members, long requirements, long stories,
      long tasks, long completedTasks, long documents, Instant createdAt, String membershipRole) { }
  public record MonthlyPoint(String month, long users, long projects, long tasks) { }
  public record DailyPoint(String date, long users, long projects, long tasks) { }
  public record Overview(long users, long admins, long projects, long requirements,
      long stories, long sprints, long tasks, long documents, long completedTasks,
      long activeTasks, long memberships, Map<String,Long> taskStatuses,
      List<MonthlyPoint> activity, List<DailyPoint> activityDaily, List<AdminProjectView> recentProjects,
      List<AdminProjectView> busiestProjects) { }

  private static <T> Map<Long,Long> totals(List<T> items, Function<T,Long> projectId) {
    return items.stream().collect(Collectors.groupingBy(projectId, Collectors.counting()));
  }
  private static long get(Map<Long,Long> count, Long key) { return count.getOrDefault(key, 0L); }
  private static YearMonth month(Instant instant) {
    return instant==null?null:YearMonth.from(instant.atZone(ZoneOffset.UTC));
  }
  private static long inMonth(List<? extends Base> list, YearMonth month) {
    return list.stream().filter(item->month.equals(month(item.createdAt))).count();
  }
  private List<AdminProjectView> buildProjectList(Map<Long,String> roles) {
    Map<Long,User> userMap=users.findAll().stream().collect(Collectors.toMap(u->u.id, Function.identity()));
    Map<Long,Long> memberCounts=totals(members.findAll(), m->m.projectId);
    Map<Long,Long> requirementCounts=totals(requirements.findAll(), r->r.projectId);
    Map<Long,Long> storyCounts=totals(stories.findAll(), s->s.projectId);
    Map<Long,Long> taskCounts=totals(tasks.findAll(), t->t.projectId);
    Map<Long,Long> completedCounts=totals(tasks.findAll().stream().filter(t->"DONE".equals(t.status)).toList(), t->t.projectId);
    Map<Long,Long> documentCounts=totals(documents.findAll(), d->d.projectId);
    return projects.findAll().stream()
      .filter(p->roles==null||roles.containsKey(p.id))
      .sorted(Comparator.comparing((Project p)->p.createdAt, Comparator.nullsFirst(Comparator.naturalOrder())).reversed())
      .map(p->{User owner=userMap.get(p.ownerId);return new AdminProjectView(p.id,p.name,p.description,p.ownerId,
        owner==null?"Tài khoản không tồn tại":owner.name, owner==null?"":owner.email,
        get(memberCounts,p.id),get(requirementCounts,p.id),get(storyCounts,p.id),
        get(taskCounts,p.id),get(completedCounts,p.id),get(documentCounts,p.id),p.createdAt,
        roles==null?null:roles.get(p.id));}).toList();
  }

  @GetMapping("/projects")
  public List<AdminProjectView> listProjects() {
    access.requireAdmin();
    return buildProjectList(null);
  }

  @GetMapping("/users/{id}/projects")
  public List<AdminProjectView> projectsForUser(@PathVariable Long id) {
    access.requireAdmin();
    User target=users.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Account not found"));
    Map<Long,String> membership=new LinkedHashMap<>();
    members.findByUserId(target.id).forEach(m->membership.put(m.projectId, m.role));
    // Older projects can have an owner without an explicit membership row.
    projects.findByOwnerId(target.id).forEach(p->membership.put(p.id,"OWNER"));
    return buildProjectList(membership);
  }

  @GetMapping("/overview")
  public Overview overview() {
    access.requireAdmin();
    List<User> allUsers=users.findAll();
    List<Project> allProjects=projects.findAll();
    List<Task> allTasks=tasks.findAll();
    List<AdminProjectView> projectViews=buildProjectList(null);
    long admins=allUsers.stream().filter(u->"ADMIN".equals(u.role)).count();
    Map<String,Long> states=new LinkedHashMap<>();
    for(String s:List.of("TODO","IN_PROGRESS","REVIEW","DONE"))
      states.put(s,allTasks.stream().filter(t->s.equals(t.status)).count());
    List<MonthlyPoint> activity=new ArrayList<>();
    YearMonth current=YearMonth.now(ZoneOffset.UTC);
    for(int i=5;i>=0;i--){YearMonth m=current.minusMonths(i);
      activity.add(new MonthlyPoint(m.format(DateTimeFormatter.ofPattern("MM/yyyy")),
        inMonth(allUsers,m), inMonth(allProjects,m), inMonth(allTasks,m)));}
    List<DailyPoint> daily=new ArrayList<>();
    LocalDate today=LocalDate.now(ZoneOffset.UTC);
    for(int i=89;i>=0;i--){
      LocalDate day=today.minusDays(i);
      daily.add(new DailyPoint(day.toString(),
        allUsers.stream().filter(u->u.createdAt!=null && day.equals(u.createdAt.atZone(ZoneOffset.UTC).toLocalDate())).count(),
        allProjects.stream().filter(p->p.createdAt!=null && day.equals(p.createdAt.atZone(ZoneOffset.UTC).toLocalDate())).count(),
        allTasks.stream().filter(t->t.createdAt!=null && day.equals(t.createdAt.atZone(ZoneOffset.UTC).toLocalDate())).count()));
    }
    List<AdminProjectView> top=projectViews.stream()
      .sorted(Comparator.comparingLong(AdminProjectView::tasks).reversed().thenComparing(AdminProjectView::name))
      .limit(5).toList();
    return new Overview(allUsers.size(),admins,allProjects.size(),requirements.count(),stories.count(),
      sprints.count(),allTasks.size(),documents.count(),states.get("DONE"),states.get("IN_PROGRESS"),
      members.count(),states,activity,daily,projectViews.stream().limit(6).toList(),top);
  }
}
