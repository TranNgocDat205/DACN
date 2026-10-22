package com.dacn.assistant.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.Instant;

public final class Models {
  private Models() {}
  @MappedSuperclass
  public abstract static class Base {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(nullable=false) public Instant createdAt = Instant.now();
  }
  @Entity @Table(name="app_users", uniqueConstraints=@UniqueConstraint(columnNames="email"))
  public static class User extends Base {
    @Column(nullable=false, length=120, columnDefinition="nvarchar(120)") public String name;
    @Column(nullable=false,length=200) public String email;
    @JsonIgnore @Column(nullable=false,length=100) public String passwordHash;
    // Account-level role, distinct from OWNER/MEMBER within a project.
    @Column(name="system_role", length=16) public String role="USER";
  }
  @Entity @Table(name="projects")
  public static class Project extends Base {
    @Column(nullable=false, length=160, columnDefinition="nvarchar(160)") public String name;
    @Column(columnDefinition="nvarchar(max)") public String description = "";
    @Column(nullable=false) public Long ownerId;
  }
  @Entity @Table(name="project_members",uniqueConstraints=@UniqueConstraint(columnNames={"projectId","userId"}))
  public static class Member extends Base {
    @Column(nullable=false) public Long projectId;
    @Column(nullable=false) public Long userId;
    @Column(nullable=false,length=30) public String role="MEMBER";
  }
  @Entity @Table(name="requirements")
  public static class Requirement extends Base {
    @Column(nullable=false) public Long projectId;
    @Column(nullable=false, length=200, columnDefinition="nvarchar(200)") public String title;
    @Column(columnDefinition="nvarchar(max)") public String description="";
    @Column(length=20) public String priority="MEDIUM";
    @Column(length=40) public String type="FUNCTIONAL";
    @Column(length=30) public String status="DRAFT";
    @Column(columnDefinition="nvarchar(max)") public String aiAnalysis;
  }
  @Entity @Table(name="user_stories")
  public static class Story extends Base {
    @Column(nullable=false) public Long projectId;
    @Column(nullable=false) public Long requirementId;
    @Column(nullable=false, length=240, columnDefinition="nvarchar(240)") public String title;
    @Column(columnDefinition="nvarchar(max)") public String narrative;
    @Column(length=20) public String priority="MEDIUM";
  }
  @Entity @Table(name="acceptance_criteria")
  public static class Criterion extends Base {
    @Column(nullable=false) public Long projectId;
    @Column(nullable=false) public Long storyId;
    @Column(columnDefinition="nvarchar(max)") public String givenText;
    @Column(columnDefinition="nvarchar(max)") public String whenText;
    @Column(columnDefinition="nvarchar(max)") public String thenText;
  }
  @Entity @Table(name="sprints")
  public static class Sprint extends Base {
    @Column(nullable=false) public Long projectId;
    @Column(nullable=false, length=180, columnDefinition="nvarchar(180)") public String name;
    @Column(columnDefinition="nvarchar(max)") public String goal="";
    @Column(length=25) public String status="PLANNED";
    public String startDate;
    public String endDate;
  }
  @Entity @Table(name="tasks")
  public static class Task extends Base {
    @Column(nullable=false) public Long projectId;
    public Long storyId;
    public Long sprintId;
    public Long assigneeId;
    @Column(nullable=false, length=230, columnDefinition="nvarchar(230)") public String title;
    @Column(columnDefinition="nvarchar(max)") public String description="";
    @Column(length=30) public String status="TODO";
    @Column(length=20) public String priority="MEDIUM";
    public String dueDate;
  }
  @Entity @Table(name="requirement_conflicts")
  public static class RequirementConflict extends Base {
    @Column(nullable=false) public Long projectId;
    @Column(nullable=false) public Long firstRequirementId;
    @Column(nullable=false) public Long secondRequirementId;
    @Column(nullable=false,length=32) public String kind;
    @Column(nullable=false,length=16) public String severity="MEDIUM";
    @Column(columnDefinition="nvarchar(max)") public String explanation="";
    @Column(columnDefinition="nvarchar(max)") public String suggestion="";
    @Column(columnDefinition="nvarchar(max)") public String evidence="";
    @Column(nullable=false,length=16) public String status="OPEN";
    @Column(nullable=false,length=24) public String detectionMode="llm";
    public java.time.Instant reviewedAt;
    public Long reviewedBy;
  }
  @Entity @Table(name="requirement_versions")
  public static class RequirementVersion extends Base {
    @Column(nullable=false) public Long projectId;
    @Column(nullable=false) public Long requirementId;
    @Column(columnDefinition="nvarchar(max)") public String oldTitle;
    @Column(columnDefinition="nvarchar(max)") public String oldDescription;
    @Column(columnDefinition="nvarchar(max)") public String newTitle;
    @Column(columnDefinition="nvarchar(max)") public String newDescription;
    public Long changedBy;
    @Column(length=40) public String source="MANUAL";
  }
  @Entity @Table(name="requirement_impact_reports")
  public static class ImpactReport extends Base {
    @Column(nullable=false) public Long projectId;
    @Column(nullable=false) public Long requirementId;
    @Column(nullable=false,length=64) public String baselineFingerprint;
    @Column(columnDefinition="nvarchar(max)") public String newTitle;
    @Column(columnDefinition="nvarchar(max)") public String newDescription;
    @Column(columnDefinition="nvarchar(max)") public String reportJson;
    @Column(nullable=false,length=20) public String status="PREVIEW";
    public Long createdBy;
    public java.time.Instant appliedAt;
  }
  @Entity @Table(name="criterion_verifications", uniqueConstraints=@UniqueConstraint(columnNames={"projectId","criterionId"}))
  public static class CriterionVerification extends Base {
    @Column(nullable=false) public Long projectId;
    @Column(nullable=false) public Long criterionId;
    @Column(nullable=false,length=20) public String status="NOT_RUN";
    @Column(columnDefinition="nvarchar(max)") public String notes="";
    public Long verifiedBy;
    public java.time.Instant verifiedAt;
  }
  @Entity @Table(name="documents")
  public static class Document extends Base {
    @Column(nullable=false) public Long projectId;
    @Column(nullable=false, length=255, columnDefinition="nvarchar(255)") public String filename;
    @Column(nullable=false,length=100) public String externalId;
    public int chunkCount;
    public Long uploadedBy;
    @Column(nullable=false,length=20) public String sourceType="UPLOAD";
    @Column(length=800,columnDefinition="nvarchar(800)") public String sourceUrl;
    @Column(length=140,columnDefinition="nvarchar(140)") public String publisher;
    public java.time.Instant fetchedAt;
  }
}
