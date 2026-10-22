package com.dacn.assistant.web;
import com.dacn.assistant.config.SecurityConfig;
import com.dacn.assistant.model.Models.*;
import com.dacn.assistant.repo.Repos;
import com.dacn.assistant.service.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@RestController @RequestMapping("/api/projects/{projectId}")
public class WorkController {
  private final Repos.Requirements requirements;private final Repos.Stories stories;private final Repos.Criteria criteria;
  private final Repos.Sprints sprints;private final Repos.Tasks tasks;private final Repos.Members members;
  private final ProjectAccess access;private final AiClient ai;private final EngineeringIntelligenceService intelligence;
  public WorkController(Repos.Requirements r,Repos.Stories s,Repos.Criteria c,Repos.Sprints sp,Repos.Tasks t,Repos.Members m,ProjectAccess a,AiClient ai,EngineeringIntelligenceService intelligence){this.intelligence=intelligence;requirements=r;stories=s;criteria=c;sprints=sp;tasks=t;members=m;access=a;this.ai=ai;}
  private static String str(Map<String,Object> map,String k,String fallback){return map.get(k)==null?fallback:String.valueOf(map.get(k)).trim();}
  private static String valid(String s,int limit,String field){if(s.isBlank()||s.length()>limit)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,field+" required (max "+limit+")");return s;}
  private static String choice(String s,String field,String... values){if(!Arrays.asList(values).contains(s))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid "+field);return s;}
  private static Long num(Object value){if(value==null||String.valueOf(value).isBlank())return null;try{return Long.valueOf(value.toString());}catch(NumberFormatException e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid numeric ID");}}
  private Requirement requireRequirement(Long p,Long id){access.require(p);Requirement r=requirements.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Requirement not found"));access.ensure(p.equals(r.projectId));return r;}
  private Story requireStory(Long p,Long id){access.require(p);Story s=stories.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Story not found"));access.ensure(p.equals(s.projectId));return s;}
  private Sprint requireSprint(Long p,Long id){access.require(p);Sprint s=sprints.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Sprint not found"));access.ensure(p.equals(s.projectId));return s;}
  private Task requireTask(Long p,Long id){access.require(p);Task t=tasks.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Task not found"));access.ensure(p.equals(t.projectId));return t;}

  @GetMapping("/requirements") public List<Requirement> requirements(@PathVariable Long projectId){access.require(projectId);return requirements.findByProjectIdOrderByCreatedAtDesc(projectId);}
  @PostMapping("/requirements") public Requirement createRequirement(@PathVariable Long projectId,@RequestBody Map<String,Object> input){access.require(projectId);Requirement r=new Requirement();r.projectId=projectId;setRequirement(r,input);return requirements.save(r);}
  @Transactional
  @PutMapping("/requirements/{id}") public Requirement updateRequirement(@PathVariable Long projectId,@PathVariable Long id,@RequestBody Map<String,Object> input){Requirement r=requireRequirement(projectId,id);String newTitle=valid(str(input,"title",r.title),200,"Title");String newDescription=str(input,"description",r.description);intelligence.recordVersion(r,newTitle,newDescription,"MANUAL");if(!Objects.equals(r.title,newTitle)||!Objects.equals(r.description,newDescription))intelligence.invalidateAfterRequirementEdit(r);setRequirement(r,input);r.aiAnalysis=null;return requirements.save(r);}
  private void setRequirement(Requirement r,Map<String,Object> m){
    r.title=valid(str(m,"title",r.title==null?"":r.title),200,"Title");r.description=str(m,"description",r.description);
    r.priority=choice(str(m,"priority",r.priority),"priority","LOW","MEDIUM","HIGH","CRITICAL");
    r.type=choice(str(m,"type",r.type),"type","FUNCTIONAL","NON_FUNCTIONAL");
    r.status=choice(str(m,"status",r.status),"status","DRAFT","ANALYZING","APPROVED","IN_DEVELOPMENT","COMPLETED");
  }
  @Transactional
  @DeleteMapping("/requirements/{id}") public void deleteRequirement(@PathVariable Long projectId,@PathVariable Long id){Requirement r=requireRequirement(projectId,id);if(!stories.findByRequirementId(id).isEmpty())throw new ResponseStatusException(HttpStatus.CONFLICT,"Delete child stories first");intelligence.cleanupDeletedRequirement(projectId,id);requirements.delete(r);}
  @PostMapping("/requirements/{id}/analyze") public Map<String,Object> analyze(@PathVariable Long projectId,@PathVariable Long id){Requirement r=requireRequirement(projectId,id);
    Map<String,Object> answer=ai.post("/ai/analyze",Map.of("title",r.title,"description",r.description));
    try{r.aiAnalysis=new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(answer);}catch(Exception ignored){}r.status="ANALYZING";requirements.save(r);return answer;
  }
  @GetMapping("/stories") public List<Story> stories(@PathVariable Long projectId){access.require(projectId);return stories.findByProjectIdOrderByCreatedAtDesc(projectId);}
  @GetMapping("/criteria") public List<Criterion> criteria(@PathVariable Long projectId){access.require(projectId);return criteria.findByProjectId(projectId);}
  @PostMapping("/requirements/{id}/generate-stories") @SuppressWarnings("unchecked")
  public List<Story> generateStories(@PathVariable Long projectId,@PathVariable Long id){Requirement r=requireRequirement(projectId,id);
    Map<String,Object> answer=ai.post("/ai/stories",Map.of("title",r.title,"description",r.description));
    List<Story> result=new ArrayList<>();Object data=answer.get("stories");
    if(data instanceof List<?> list) for(Object o:list) if(o instanceof Map<?,?> item){
      Story s=new Story();s.projectId=projectId;s.requirementId=id;s.title=valid(Objects.toString(item.get("title"),"User story"),240,"Story title");
      s.narrative=Objects.toString(item.get("narrative"),"");s.priority=r.priority;result.add(stories.save(s));
    }
    return result;
  }
  @PostMapping("/stories") public Story createStory(@PathVariable Long projectId,@RequestBody Map<String,Object> map){access.require(projectId);Long requirementId=num(map.get("requirementId"));if(requirementId==null)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"requirementId required");requireRequirement(projectId,requirementId);
    Story s=new Story();s.projectId=projectId;s.requirementId=requirementId;s.title=valid(str(map,"title",""),240,"Story title");s.narrative=str(map,"narrative","");return stories.save(s);
  }
  @Transactional
  @DeleteMapping("/stories/{id}") public void deleteStory(@PathVariable Long projectId,@PathVariable Long id){Story s=requireStory(projectId,id);if(tasks.findByProjectIdOrderByCreatedAtDesc(projectId).stream().anyMatch(t->id.equals(t.storyId)))throw new ResponseStatusException(HttpStatus.CONFLICT,"Unlink related tasks first");intelligence.cleanupDeletedStory(projectId,id);criteria.deleteAll(criteria.findByStoryId(id));stories.delete(s);}
  @PostMapping("/stories/{id}/generate-criteria") @SuppressWarnings("unchecked")
  public List<Criterion> generateCriteria(@PathVariable Long projectId,@PathVariable Long id){Story story=requireStory(projectId,id);
    Map<String,Object> response=ai.post("/ai/criteria",Map.of("title",story.title,"narrative",Objects.toString(story.narrative,"")));
    List<Criterion> result=new ArrayList<>();if(response.get("criteria") instanceof List<?> list)for(Object item:list)if(item instanceof Map<?,?> values){
      Criterion c=new Criterion();c.projectId=projectId;c.storyId=id;c.givenText=Objects.toString(values.get("given"),"");c.whenText=Objects.toString(values.get("when"),"");c.thenText=Objects.toString(values.get("then"),"");result.add(criteria.save(c));
    }return result;
  }
  @GetMapping("/sprints") public List<Sprint> sprints(@PathVariable Long projectId){access.require(projectId);return sprints.findByProjectIdOrderByCreatedAtDesc(projectId);}
  @PostMapping("/sprints") public Sprint createSprint(@PathVariable Long projectId,@RequestBody Map<String,Object> map){access.require(projectId);Sprint s=new Sprint();s.projectId=projectId;setSprint(s,map);return sprints.save(s);}
  @PutMapping("/sprints/{id}") public Sprint editSprint(@PathVariable Long projectId,@PathVariable Long id,@RequestBody Map<String,Object> map){Sprint s=requireSprint(projectId,id);setSprint(s,map);return sprints.save(s);}
  private void setSprint(Sprint s,Map<String,Object> map){s.name=valid(str(map,"name",s.name==null?"":s.name),180,"Sprint name");s.goal=str(map,"goal",s.goal);s.startDate=str(map,"startDate",s.startDate);s.endDate=str(map,"endDate",s.endDate);s.status=choice(str(map,"status",s.status),"status","PLANNED","ACTIVE","COMPLETED");if(s.startDate!=null&&s.endDate!=null&&!s.startDate.isBlank()&&!s.endDate.isBlank()&&s.startDate.compareTo(s.endDate)>0)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Start date must be before end date");}
  @DeleteMapping("/sprints/{id}") public void deleteSprint(@PathVariable Long projectId,@PathVariable Long id){Sprint s=requireSprint(projectId,id);if(tasks.findByProjectIdOrderByCreatedAtDesc(projectId).stream().anyMatch(t->id.equals(t.sprintId)))throw new ResponseStatusException(HttpStatus.CONFLICT,"Move tasks out of sprint first");sprints.delete(s);}
  @GetMapping("/tasks") public List<Task> tasks(@PathVariable Long projectId){access.require(projectId);return tasks.findByProjectIdOrderByCreatedAtDesc(projectId);}
  @PostMapping("/tasks") public Task createTask(@PathVariable Long projectId,@RequestBody Map<String,Object> map){access.require(projectId);Task t=new Task();t.projectId=projectId;setTask(projectId,t,map);return tasks.save(t);}
  @PutMapping("/tasks/{id}") public Task editTask(@PathVariable Long projectId,@PathVariable Long id,@RequestBody Map<String,Object> map){Task t=requireTask(projectId,id);setTask(projectId,t,map);return tasks.save(t);}
  private void setTask(Long p,Task t,Map<String,Object> map){
    t.title=valid(str(map,"title",t.title==null?"":t.title),230,"Task title");t.description=str(map,"description",t.description);
    t.priority=choice(str(map,"priority",t.priority),"priority","LOW","MEDIUM","HIGH","CRITICAL");
    t.status=choice(str(map,"status",t.status),"status","TODO","IN_PROGRESS","REVIEW","DONE");
    t.dueDate=str(map,"dueDate",t.dueDate);
    if(map.containsKey("sprintId")){t.sprintId=num(map.get("sprintId"));if(t.sprintId!=null)requireSprint(p,t.sprintId);}
    if(map.containsKey("storyId")){t.storyId=num(map.get("storyId"));if(t.storyId!=null)requireStory(p,t.storyId);}
    if(map.containsKey("assigneeId")){t.assigneeId=num(map.get("assigneeId"));if(t.assigneeId!=null&&members.findByProjectIdAndUserId(p,t.assigneeId).isEmpty())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Assignee is not a project member");}
  }
  @DeleteMapping("/tasks/{id}") public void deleteTask(@PathVariable Long projectId,@PathVariable Long id){tasks.delete(requireTask(projectId,id));}
}
