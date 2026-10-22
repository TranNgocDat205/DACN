package com.dacn.assistant.service;

import com.dacn.assistant.config.SecurityConfig;
import com.dacn.assistant.model.Models.*;
import com.dacn.assistant.repo.Repos;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Grounded, project-scoped engineering intelligence. AI suggestions are never treated as verified database links. */
@Service
public class EngineeringIntelligenceService {
  private final Repos.Requirements requirements;
  private final Repos.Stories stories;
  private final Repos.Criteria criteria;
  private final Repos.Tasks tasks;
  private final Repos.Sprints sprints;
  private final Repos.Conflicts conflicts;
  private final Repos.Versions versions;
  private final Repos.ImpactReports reports;
  private final Repos.Verifications verifications;
  private final ProjectAccess access;
  private final SecurityConfig auth;
  private final AiClient ai;
  private final ObjectMapper mapper;

  public EngineeringIntelligenceService(Repos.Requirements requirements, Repos.Stories stories,
      Repos.Criteria criteria, Repos.Tasks tasks, Repos.Sprints sprints,
      Repos.Conflicts conflicts, Repos.Versions versions, Repos.ImpactReports reports,
      Repos.Verifications verifications, ProjectAccess access, SecurityConfig auth,
      AiClient ai, ObjectMapper mapper) {
    this.requirements=requirements; this.stories=stories; this.criteria=criteria;
    this.tasks=tasks; this.sprints=sprints; this.conflicts=conflicts; this.versions=versions;
    this.reports=reports; this.verifications=verifications; this.access=access;
    this.auth=auth; this.ai=ai; this.mapper=mapper;
  }
  private Requirement requirement(Long projectId, Long id) {
    access.require(projectId);
    Requirement r = requirements.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Requirement not found"));
    access.ensure(projectId.equals(r.projectId));
    return r;
  }
  private static String text(Object value, int max) {
    String s=value==null?"":String.valueOf(value).trim();
    return s.length()>max?s.substring(0,max):s;
  }
  private static String required(Object value,int max,String field) {
    String s=text(value,max+1);
    if(s.isBlank()||s.length()>max) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,field+" required (max "+max+")");
    return s;
  }
  private static long longValue(Object value) {
    try{return Long.parseLong(String.valueOf(value));}
    catch(Exception e){return -1L;}
  }
  private String json(Object value) {
    try {return mapper.writeValueAsString(value);}
    catch(JsonProcessingException e){throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,"Cannot serialize analysis");}
  }
  private static String fingerprint(Requirement r) {
    try {
      MessageDigest sha=MessageDigest.getInstance("SHA-256");
      String s=r.id+"\u0000"+r.title+"\u0000"+Objects.toString(r.description,"");
      return HexFormat.of().formatHex(sha.digest(s.getBytes(StandardCharsets.UTF_8)));
    } catch(Exception e) {throw new IllegalStateException(e);}
  }
  private static Map<String,Object> reqData(Requirement r) {
    return Map.of("id",r.id,"title",Objects.toString(r.title,""),"description",Objects.toString(r.description,""),
      "priority",Objects.toString(r.priority,"MEDIUM"),"status",Objects.toString(r.status,"DRAFT"));
  }

  /** LLM evaluates all requirements; references accepted only if they match IDs in the current project. */
  @Transactional
  public Map<String,Object> scanConflicts(Long projectId) {
    access.require(projectId);
    List<Requirement> list=requirements.findByProjectIdOrderByCreatedAtDesc(projectId);
    if(list.size()>50) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Scan supports max 50 requirements per project; split the project or add retrieval batching");
    if(list.size()<2) return Map.of("mode","none","scanned",list.size(),"findings",List.of(),"warning","Cần ít nhất 2 yêu cầu để so sánh.");
    Map<String,Object> response=ai.post("/ai/requirements/conflicts", Map.of("requirements",list.stream().map(EngineeringIntelligenceService::reqData).toList()));
    String mode=text(response.get("mode"),24);
    Set<Long> validIds=list.stream().map(r->r.id).collect(Collectors.toSet());
    List<RequirementConflict> existing=conflicts.findByProjectIdOrderByCreatedAtDesc(projectId);
    Map<String,RequirementConflict> indexes=new HashMap<>();
    for(RequirementConflict c:existing) indexes.put(c.firstRequirementId+":"+c.secondRequirementId+":"+c.kind,c);
    Set<String> found=new HashSet<>();
    Object value=response.get("findings");
    if(value instanceof List<?> rows) {
      int n=0;
      for(Object item:rows) {
        if(n>=50) break;
        if(!(item instanceof Map<?,?> raw)) continue;
        long x=longValue(raw.get("firstId")), y=longValue(raw.get("secondId"));
        if(!validIds.contains(x)||!validIds.contains(y)||x==y) continue;
        long first=Math.min(x,y), second=Math.max(x,y);
        String kind=text(raw.get("kind"),32).toUpperCase(Locale.ROOT);
        if(!Set.of("CONTRADICTION","DUPLICATE","DEPENDENCY","AMBIGUITY").contains(kind))continue;
        String signature=first+":"+second+":"+kind;
        if(!found.add(signature))continue;
        RequirementConflict c=indexes.getOrDefault(signature,new RequirementConflict());
        c.projectId=projectId;c.firstRequirementId=first;c.secondRequirementId=second;c.kind=kind;
        String severity=text(raw.get("severity"),16).toUpperCase(Locale.ROOT);
        c.severity=Set.of("LOW","MEDIUM","HIGH","CRITICAL").contains(severity)?severity:"MEDIUM";
        c.explanation=text(raw.get("explanation"),4000);
        c.suggestion=text(raw.get("suggestion"),4000);
        c.evidence=text(raw.get("evidence"),3000);
        c.detectionMode=mode;
        if(c.id==null || "STALE".equals(c.status))c.status="OPEN"; // Reopen changed or newly confirmed alerts.
        conflicts.save(c);
        n++;
      }
    }
    // Never mark old reports stale when offline heuristic could not analyze real conflicts.
    if("llm".equals(mode)) {
      for(RequirementConflict c:existing) {
        String key=c.firstRequirementId+":"+c.secondRequirementId+":"+c.kind;
        if(!found.contains(key) && "OPEN".equals(c.status)) {c.status="STALE";conflicts.save(c);}
      }
    }
    return Map.of("mode",mode,"scanned",list.size(),"findings",conflicts.findByProjectIdOrderByCreatedAtDesc(projectId),
      "warning",Objects.toString(response.get("warning"),""));
  }
  public List<RequirementConflict> conflicts(Long projectId){access.require(projectId);return conflicts.findByProjectIdOrderByCreatedAtDesc(projectId);}
  @Transactional
  public RequirementConflict reviewConflict(Long projectId,Long id,Map<String,Object> body){
    access.require(projectId);
    RequirementConflict conflict=conflicts.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Conflict not found"));
    access.ensure(projectId.equals(conflict.projectId));
    String status=required(body.get("status"),16,"status");
    if(!Set.of("OPEN","RESOLVED","DISMISSED").contains(status))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid review status");
    conflict.status=status;conflict.reviewedAt=Instant.now();conflict.reviewedBy=auth.currentUser();
    return conflicts.save(conflict);
  }

  /** Only SQL relations contribute to exact impacts; LLM contributions remain explicit suggestions. */
  @Transactional
  public Map<String,Object> simulate(Long projectId,Long requirementId,Map<String,Object> input){
    Requirement r=requirement(projectId,requirementId);
    String proposedTitle=required(input.get("newTitle"),200,"newTitle");
    String proposedDescription=required(input.get("newDescription"),15000,"newDescription");
    List<Story> linkedStories=stories.findByRequirementId(r.id).stream().filter(s->projectId.equals(s.projectId)).toList();
    Set<Long> storyIds=linkedStories.stream().map(s->s.id).collect(Collectors.toSet());
    List<Criterion> linkedCriteria=criteria.findByProjectId(projectId).stream().filter(c->storyIds.contains(c.storyId)).toList();
    List<Task> linkedTasks=tasks.findByProjectIdOrderByCreatedAtDesc(projectId).stream().filter(t->t.storyId!=null&&storyIds.contains(t.storyId)).toList();
    Set<Long> sprintIds=linkedTasks.stream().map(t->t.sprintId).filter(Objects::nonNull).collect(Collectors.toSet());
    List<Sprint> linkedSprints=sprints.findByProjectIdOrderByCreatedAtDesc(projectId).stream().filter(s->sprintIds.contains(s.id)).toList();
    Map<String,Object> exactLinks=new LinkedHashMap<>();
    exactLinks.put("stories",linkedStories.stream().map(s->Map.of("id",s.id,"title",s.title)).toList());
    exactLinks.put("criteria",linkedCriteria.stream().map(c->Map.of("id",c.id,"storyId",c.storyId,"text",Objects.toString(c.givenText,"")+" / "+Objects.toString(c.whenText,"")+" / "+Objects.toString(c.thenText,""))).toList());
    exactLinks.put("tasks",linkedTasks.stream().map(t->Map.of("id",t.id,"title",t.title,"status",t.status,"storyId",t.storyId)).toList());
    exactLinks.put("sprints",linkedSprints.stream().map(s->Map.of("id",s.id,"name",s.name,"status",s.status)).toList());
    Map<String,Object> answer=ai.post("/ai/requirements/impact",Map.of(
      "before",Map.of("title",r.title,"description",Objects.toString(r.description,"")),
      "after",Map.of("title",proposedTitle,"description",proposedDescription),
      "linkedStories",linkedStories.stream().map(s->Map.of("id",s.id,"title",s.title)).toList(),
      "linkedTasks",linkedTasks.stream().map(t->Map.of("id",t.id,"title",t.title)).toList()));
    ImpactReport report=new ImpactReport();report.projectId=projectId;report.requirementId=r.id;
    report.baselineFingerprint=fingerprint(r);report.newTitle=proposedTitle;report.newDescription=proposedDescription;
    report.createdBy=auth.currentUser();
    Map<String,Object> result=new LinkedHashMap<>();result.put("requirementId",r.id);
    result.put("before",Map.of("title",r.title,"description",Objects.toString(r.description,"")));
    result.put("after",Map.of("title",proposedTitle,"description",proposedDescription));
    result.put("exactLinks",exactLinks);result.put("ai",answer);
    result.put("hasChanges",!r.title.equals(proposedTitle)||!Objects.equals(Objects.toString(r.description,""),proposedDescription));
    report.reportJson=json(result);report=reports.save(report);result.put("id",report.id);result.put("status",report.status);
    return result;
  }
  @Transactional
  public Requirement apply(Long projectId,Long requirementId,Long reportId){
    Requirement r=requirement(projectId,requirementId);
    ImpactReport report=reports.findById(reportId).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Analysis not found"));
    access.ensure(projectId.equals(report.projectId)&&requirementId.equals(report.requirementId));
    if(!"PREVIEW".equals(report.status))throw new ResponseStatusException(HttpStatus.CONFLICT,"Analysis already applied");
    if(!fingerprint(r).equals(report.baselineFingerprint))throw new ResponseStatusException(HttpStatus.CONFLICT,"Requirement changed after preview; simulate again");
    if(!r.title.equals(report.newTitle)||!Objects.equals(Objects.toString(r.description,""),report.newDescription)){
      recordVersion(r,report.newTitle,report.newDescription,"AI_IMPACT");
      invalidateAfterRequirementEdit(r);
      r.title=report.newTitle;r.description=report.newDescription;r.aiAnalysis=null;
      requirements.save(r);
    }
    report.status="APPLIED";report.appliedAt=Instant.now();reports.save(report);
    return r;
  }
  @Transactional
  public void recordVersion(Requirement existing,String newTitle,String newDescription,String source){
    if(Objects.equals(existing.title,newTitle)&&Objects.equals(existing.description,newDescription))return;
    RequirementVersion v=new RequirementVersion();v.projectId=existing.projectId;v.requirementId=existing.id;
    v.oldTitle=existing.title;v.oldDescription=existing.description;
    v.newTitle=newTitle;v.newDescription=newDescription;v.changedBy=auth.currentUser();v.source=source;
    versions.save(v);
  }
  /** Requirement changes invalidate conflict reports and manual QA confirmations to prevent stale release readiness. */
  @Transactional
  public void invalidateAfterRequirementEdit(Requirement r) {
    for(RequirementConflict c:conflicts.findByProjectIdOrderByCreatedAtDesc(r.projectId)) {
      if(r.id.equals(c.firstRequirementId)||r.id.equals(c.secondRequirementId)) {
        c.status="STALE";conflicts.save(c);
      }
    }
    Set<Long> storyIds=stories.findByRequirementId(r.id).stream().filter(s->r.projectId.equals(s.projectId)).map(s->s.id).collect(Collectors.toSet());
    for(Criterion c:criteria.findByProjectId(r.projectId)) {
      if(!storyIds.contains(c.storyId))continue;
      verifications.findByProjectIdAndCriterionId(r.projectId,c.id).ifPresent(v->{
        v.status="NOT_RUN";
        v.notes="Cần kiểm thử lại: Requirement nguồn đã được sửa.";
        v.verifiedAt=null;
        v.verifiedBy=null;
        verifications.save(v);
      });
    }
  }
  /** Avoid orphaned intelligence rows when the original domain object is deleted. */
  @Transactional
  public void cleanupDeletedRequirement(Long projectId, Long requirementId) {
    requirement(projectId,requirementId);
    for(RequirementConflict c:conflicts.findByProjectIdOrderByCreatedAtDesc(projectId)) {
      if(requirementId.equals(c.firstRequirementId)||requirementId.equals(c.secondRequirementId)) conflicts.delete(c);
    }
    versions.deleteAll(versions.findByProjectIdAndRequirementIdOrderByCreatedAtDesc(projectId,requirementId));
    reports.deleteAll(reports.findByProjectIdAndRequirementIdOrderByCreatedAtDesc(projectId,requirementId));
  }
  @Transactional
  public void cleanupDeletedStory(Long projectId, Long storyId) {
    access.require(projectId);
    for(Criterion c:criteria.findByStoryId(storyId)) {
      access.ensure(projectId.equals(c.projectId));
      verifications.findByProjectIdAndCriterionId(projectId,c.id).ifPresent(verifications::delete);
    }
  }
  public List<RequirementVersion> versions(Long projectId,Long requirementId){requirement(projectId,requirementId);return versions.findByProjectIdAndRequirementIdOrderByCreatedAtDesc(projectId,requirementId);}
  public List<ImpactReport> reports(Long projectId,Long requirementId){requirement(projectId,requirementId);return reports.findByProjectIdAndRequirementIdOrderByCreatedAtDesc(projectId,requirementId);}

  @Transactional
  public CriterionVerification verify(Long projectId,Long criterionId,Map<String,Object> input){
    access.require(projectId);
    Criterion criterion=criteria.findById(criterionId).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Criterion not found"));
    access.ensure(projectId.equals(criterion.projectId));
    String status=required(input.get("status"),20,"status");
    if(!Set.of("NOT_RUN","PASSED","FAILED","BLOCKED").contains(status))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid verification status");
    CriterionVerification v=verifications.findByProjectIdAndCriterionId(projectId,criterionId).orElseGet(CriterionVerification::new);
    v.projectId=projectId;v.criterionId=criterionId;v.status=status;
    v.notes=text(input.get("notes"),3000);v.verifiedBy=auth.currentUser();v.verifiedAt=Instant.now();
    return verifications.save(v);
  }
  public Map<String,Object> traceability(Long projectId){
    access.require(projectId);
    List<Requirement> reqs=requirements.findByProjectIdOrderByCreatedAtDesc(projectId);
    List<Story> storyRows=stories.findByProjectIdOrderByCreatedAtDesc(projectId);
    List<Criterion> criterionRows=criteria.findByProjectId(projectId);
    List<Task> taskRows=tasks.findByProjectIdOrderByCreatedAtDesc(projectId);
    Map<Long,CriterionVerification> checks=verifications.findByProjectId(projectId).stream().collect(Collectors.toMap(v->v.criterionId,Function.identity(),(a,b)->a));
    Map<Long,Sprint> sprintMap=sprints.findByProjectIdOrderByCreatedAtDesc(projectId).stream().collect(Collectors.toMap(s->s.id,Function.identity()));
    List<Map<String,Object>> result=new ArrayList<>();int ready=0, criterionTotal=0, passedTotal=0;
    for(Requirement r:reqs){
      List<Story> ss=storyRows.stream().filter(s->r.id.equals(s.requirementId)).toList();
      List<Map<String,Object>> storyInfo=new ArrayList<>();
      List<String> gaps=new ArrayList<>();
      if(ss.isEmpty())gaps.add("Chưa có User Story");
      if(!"COMPLETED".equals(r.status))gaps.add("Requirement chưa ở trạng thái Hoàn thành");
      int total=0,passed=0,linkedTaskCount=0,doneTaskCount=0;
      for(Story s:ss){
        List<Criterion> cs=criterionRows.stream().filter(c->s.id.equals(c.storyId)).toList();
        List<Task> ts=taskRows.stream().filter(t->s.id.equals(t.storyId)).toList();
        if(cs.isEmpty())gaps.add("US-"+s.id+" chưa có Acceptance Criteria");
        if(ts.isEmpty())gaps.add("US-"+s.id+" chưa liên kết Task");
        List<Map<String,Object>> cInfo=new ArrayList<>();
        for(Criterion c:cs){
          total++;criterionTotal++;
          CriterionVerification v=checks.get(c.id);String state=v==null?"NOT_RUN":v.status;
          if("PASSED".equals(state)){passed++;passedTotal++;}
          else gaps.add("AC-"+c.id+" chưa đạt: "+state);
          Map<String,Object> item=new LinkedHashMap<>();item.put("id",c.id);item.put("given",Objects.toString(c.givenText,""));
          item.put("when",Objects.toString(c.whenText,""));item.put("then",Objects.toString(c.thenText,""));
          item.put("verificationStatus",state);item.put("notes",v==null?"":v.notes);
          item.put("verifiedAt",v==null?null:v.verifiedAt);cInfo.add(item);
        }
        List<Map<String,Object>> tInfo=new ArrayList<>();
        for(Task t:ts){
          linkedTaskCount++;if("DONE".equals(t.status))doneTaskCount++;
          else gaps.add("Task-"+t.id+" chưa hoàn thành: "+t.status);
          Map<String,Object> item=new LinkedHashMap<>();item.put("id",t.id);item.put("title",t.title);item.put("status",t.status);
          item.put("sprintId",t.sprintId);item.put("sprintName",t.sprintId==null?null:Optional.ofNullable(sprintMap.get(t.sprintId)).map(sp->sp.name).orElse(null));
          tInfo.add(item);
        }
        storyInfo.add(Map.of("id",s.id,"title",s.title,"criteria",cInfo,"tasks",tInfo));
      }
      boolean eligible=gaps.isEmpty();if(eligible)ready++;
      Map<String,Object> row=new LinkedHashMap<>();row.put("id",r.id);row.put("title",r.title);row.put("status",r.status);
      row.put("ready",eligible);row.put("stories",storyInfo);row.put("gaps",gaps);
      row.put("criteriaTotal",total);row.put("criteriaPassed",passed);
      row.put("tasksTotal",linkedTaskCount);row.put("tasksDone",doneTaskCount);result.add(row);
    }
    return Map.of("requirements",result,"total",reqs.size(),"ready",ready,"criteriaTotal",criterionTotal,"criteriaPassed",passedTotal,
      "notice","PASSED là xác nhận kiểm thử THỦ CÔNG của thành viên dự án, không phải kết quả chạy test tự động. READY chỉ phản ánh các quy tắc kiểm tra hiện tại, không phải phê duyệt phát hành chính thức.");
  }
}
