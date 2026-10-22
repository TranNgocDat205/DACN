package com.dacn.assistant.repo;
import com.dacn.assistant.model.Models.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public final class Repos {
  private Repos() {}
  public interface Users extends JpaRepository<User,Long> { Optional<User> findByEmail(String email); long countByRole(String role); }
  public interface Projects extends JpaRepository<Project,Long> { List<Project> findByOwnerId(Long id); }
  public interface Members extends JpaRepository<Member,Long> {
    Optional<Member> findByProjectIdAndUserId(Long projectId,Long userId);
    List<Member> findByProjectId(Long projectId);
    List<Member> findByUserId(Long userId);
  }
  public interface Requirements extends JpaRepository<Requirement,Long> { List<Requirement> findByProjectIdOrderByCreatedAtDesc(Long p); }
  public interface Stories extends JpaRepository<Story,Long> { List<Story> findByProjectIdOrderByCreatedAtDesc(Long p); List<Story> findByRequirementId(Long r); }
  public interface Criteria extends JpaRepository<Criterion,Long> { List<Criterion> findByProjectId(Long p); List<Criterion> findByStoryId(Long s); }
  public interface Sprints extends JpaRepository<Sprint,Long> { List<Sprint> findByProjectIdOrderByCreatedAtDesc(Long p); }
  public interface Tasks extends JpaRepository<Task,Long> { List<Task> findByProjectIdOrderByCreatedAtDesc(Long p); }
  public interface Conflicts extends JpaRepository<RequirementConflict,Long> {
    List<RequirementConflict> findByProjectIdOrderByCreatedAtDesc(Long p);
  }
  public interface Versions extends JpaRepository<RequirementVersion,Long> {
    List<RequirementVersion> findByProjectIdAndRequirementIdOrderByCreatedAtDesc(Long p,Long r);
  }
  public interface ImpactReports extends JpaRepository<ImpactReport,Long> {
    List<ImpactReport> findByProjectIdAndRequirementIdOrderByCreatedAtDesc(Long p,Long r);
  }
  public interface Verifications extends JpaRepository<CriterionVerification,Long> {
    List<CriterionVerification> findByProjectId(Long p);
    Optional<CriterionVerification> findByProjectIdAndCriterionId(Long p,Long criterionId);
  }
  public interface Documents extends JpaRepository<Document,Long> { List<Document> findByProjectIdOrderByCreatedAtDesc(Long p); }
}
