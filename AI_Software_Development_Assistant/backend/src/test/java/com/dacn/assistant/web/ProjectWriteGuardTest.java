package com.dacn.assistant.web;

import com.dacn.assistant.config.SecurityConfig;
import com.dacn.assistant.repo.Repos;
import com.dacn.assistant.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProjectWriteGuardTest {
  @Test void readOnlyViewerCannotCreateRequirementEvenByDirectApi() {
    var requirements=mock(Repos.Requirements.class);
    var access=mock(ProjectAccess.class);
    doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN,"Read-only"))
      .when(access).write(7L);
    var controller=new WorkController(requirements,mock(Repos.Stories.class),mock(Repos.Criteria.class),
      mock(Repos.Sprints.class),mock(Repos.Tasks.class),mock(Repos.Members.class),access,
      mock(AiClient.class),mock(EngineeringIntelligenceService.class));
    assertEquals(HttpStatus.FORBIDDEN,assertThrows(ResponseStatusException.class,
      ()->controller.createRequirement(7L,Map.of("title","Attempted write"))).getStatusCode());
    verify(requirements,never()).save(any());
  }

  @Test void readOnlyViewerCannotUploadRagDocument() throws Exception {
    var documents=mock(Repos.Documents.class);
    var access=mock(ProjectAccess.class);
    doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN,"Read-only"))
      .when(access).write(7L);
    var client=mock(AiClient.class);
    var controller=new DocumentsController(documents,access,mock(SecurityConfig.class),client);
    assertEquals(HttpStatus.FORBIDDEN,assertThrows(ResponseStatusException.class,
      ()->controller.upload(7L,mock(MultipartFile.class))).getStatusCode());
    verifyNoInteractions(client);
    verify(documents,never()).save(any());
  }
}
