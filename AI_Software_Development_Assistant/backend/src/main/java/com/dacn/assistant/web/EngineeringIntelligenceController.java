package com.dacn.assistant.web;

import com.dacn.assistant.model.Models.*;
import com.dacn.assistant.service.EngineeringIntelligenceService;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/projects/{projectId}")
public class EngineeringIntelligenceController {
  private final EngineeringIntelligenceService service;
  public EngineeringIntelligenceController(EngineeringIntelligenceService service){this.service=service;}

  @PostMapping("/requirements/scan-conflicts")
  public Map<String,Object> scan(@PathVariable Long projectId){return service.scanConflicts(projectId);}
  @GetMapping("/requirements/conflicts")
  public List<RequirementConflict> conflicts(@PathVariable Long projectId){return service.conflicts(projectId);}
  @PutMapping("/requirements/conflicts/{id}")
  public RequirementConflict review(@PathVariable Long projectId,@PathVariable Long id,@RequestBody Map<String,Object> body){return service.reviewConflict(projectId,id,body);}

  @PostMapping("/requirements/{id}/simulate-change")
  public Map<String,Object> simulate(@PathVariable Long projectId,@PathVariable Long id,@RequestBody Map<String,Object> body){return service.simulate(projectId,id,body);}
  @PostMapping("/requirements/{id}/apply-change/{reportId}")
  public Requirement apply(@PathVariable Long projectId,@PathVariable Long id,@PathVariable Long reportId){return service.apply(projectId,id,reportId);}
  @GetMapping("/requirements/{id}/versions")
  public List<RequirementVersion> history(@PathVariable Long projectId,@PathVariable Long id){return service.versions(projectId,id);}
  @GetMapping("/requirements/{id}/impact-reports")
  public List<ImpactReport> reports(@PathVariable Long projectId,@PathVariable Long id){return service.reports(projectId,id);}

  @GetMapping("/traceability")
  public Map<String,Object> traceability(@PathVariable Long projectId){return service.traceability(projectId);}
  @PutMapping("/criteria/{id}/verification")
  public CriterionVerification verify(@PathVariable Long projectId,@PathVariable Long id,@RequestBody Map<String,Object> body){return service.verify(projectId,id,body);}
}
