package com.dacn.assistant.web;
import com.dacn.assistant.model.Models.Document;
import com.dacn.assistant.repo.Repos;
import com.dacn.assistant.service.*;
import com.dacn.assistant.config.SecurityConfig;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.io.IOException;
import java.util.*;
import java.time.Instant;

@RestController @RequestMapping("/api/projects/{projectId}")
public class DocumentsController {
  private final Repos.Documents documents;private final ProjectAccess access;private final SecurityConfig auth;private final AiClient ai;
  public DocumentsController(Repos.Documents d,ProjectAccess a,SecurityConfig s,AiClient client){documents=d;access=a;auth=s;ai=client;}
  @GetMapping("/documents") public List<Document> list(@PathVariable Long projectId){access.require(projectId);return documents.findByProjectIdOrderByCreatedAtDesc(projectId);}
  @PostMapping(value="/documents",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
  public Document upload(@PathVariable Long projectId,@RequestParam("file") MultipartFile file) throws IOException {
    access.require(projectId);
    String name=Optional.ofNullable(file.getOriginalFilename()).orElse("file").replace('\\','/');name=name.substring(name.lastIndexOf('/')+1);
    if(file.isEmpty()||file.getSize()>10*1024*1024)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"File must be nonempty, <= 10MB");
    if(name.length()>255||!name.toLowerCase(Locale.ROOT).matches(".*\\.(pdf|docx|txt|md)$"))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Only PDF, DOCX, TXT and MD accepted");
    Map<String,Object> result=ai.upload(projectId,file);
    Document doc=new Document();doc.projectId=projectId;doc.filename=name;doc.externalId=String.valueOf(result.get("document_id"));doc.chunkCount=((Number)result.getOrDefault("chunks",0)).intValue();doc.uploadedBy=auth.currentUser();
    return documents.save(doc);
  }
  @DeleteMapping("/documents/{id}") public void delete(@PathVariable Long projectId,@PathVariable Long id){
    access.require(projectId);Document doc=documents.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));access.ensure(projectId.equals(doc.projectId));
    ai.deleteDoc(projectId,doc.externalId);documents.delete(doc);
  }
  record OfficialSearch(String query,Integer limit) {}
  record OfficialImport(String sourceId) {}
  @PostMapping("/official-sources/search")
  public Map<String,Object> searchOfficial(@PathVariable Long projectId,@RequestBody OfficialSearch input){
    access.require(projectId);
    String query=input==null||input.query()==null?"":input.query().trim();
    if(query.length()>300)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Query is too long");
    int limit=input==null||input.limit()==null?10:Math.min(25,Math.max(1,input.limit()));
    return ai.post("/rag/official/catalog",Map.of("query",query,"limit",limit));
  }
  @PostMapping("/official-sources/discover")
  public Map<String,Object> discoverOfficial(@PathVariable Long projectId,@RequestBody OfficialSearch input){
    access.require(projectId);
    String query=input==null||input.query()==null?"":input.query().trim();
    if(query.length()>300)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Query is too long");
    int limit=input==null||input.limit()==null?12:Math.min(25,Math.max(1,input.limit()));
    return ai.post("/rag/official/discover",Map.of("query",query,"limit",limit));
  }
  record OfficialWebImport(String url) {}
  @PostMapping("/official-sources/import-url")
  public Document importOfficialUrl(@PathVariable Long projectId,@RequestBody OfficialWebImport input){
    access.require(projectId);
    String url=input==null?null:input.url();
    if(url==null||url.length()>800||!url.startsWith("https://"))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"An HTTPS official URL is required");
    // FastAPI independently checks exact approved hostnames before requesting the page.
    Optional<Document> found=documents.findByProjectIdOrderByCreatedAtDesc(projectId).stream()
      .filter(d->url.equals(d.sourceUrl)).findFirst();
    if(found.isPresent())return found.get();
    Map<String,Object> result=ai.post("/rag/official/import-url",Map.of("project_id",projectId,"url",url));
    String externalId=String.valueOf(result.getOrDefault("document_id",""));
    if(!externalId.matches("official-web-[0-9a-f]{32}"))
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,"Invalid document ID from AI service");
    // Handles URL canonicalization (for example fragments) and prior imports.
    found=documents.findByProjectIdOrderByCreatedAtDesc(projectId).stream()
      .filter(d->externalId.equals(d.externalId)).findFirst();
    if(found.isPresent())return found.get();
    Document doc=new Document();doc.projectId=projectId;doc.externalId=externalId;
    String title=String.valueOf(result.getOrDefault("filename","Official documentation"));
    doc.filename=title.length()>255?title.substring(0,255):title;
    doc.chunkCount=((Number)result.getOrDefault("chunks",0)).intValue();
    doc.sourceType="OFFICIAL";
    doc.sourceUrl=String.valueOf(result.getOrDefault("sourceUrl",url));
    doc.publisher=String.valueOf(result.getOrDefault("publisher","Official publisher"));
    if(doc.publisher.length()>140)doc.publisher=doc.publisher.substring(0,140);
    if(result.get("fetchedAt") instanceof String timestamp&&!timestamp.isBlank())doc.fetchedAt=Instant.parse(timestamp);
    doc.uploadedBy=auth.currentUser();
    return documents.save(doc);
  }
  @PostMapping("/official-sources/import")
  public Document importOfficial(@PathVariable Long projectId,@RequestBody OfficialImport input){
    access.require(projectId);
    if(input==null||input.sourceId()==null||!input.sourceId().matches("[a-z0-9-]{1,80}"))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid official source ID");
    String externalId="official-"+input.sourceId();
    Optional<Document> found=documents.findByProjectIdOrderByCreatedAtDesc(projectId).stream()
      .filter(d->externalId.equals(d.externalId)).findFirst();
    if(found.isPresent())return found.get();
    Map<String,Object> result=ai.post("/rag/official/import",Map.of("project_id",projectId,"source_id",input.sourceId()));
    Document doc=new Document();doc.projectId=projectId;
    doc.externalId=String.valueOf(result.get("document_id"));
    doc.filename=String.valueOf(result.getOrDefault("filename","Official documentation"));
    if(doc.filename.length()>255)doc.filename=doc.filename.substring(0,255);
    doc.chunkCount=((Number)result.getOrDefault("chunks",0)).intValue();
    doc.sourceType="OFFICIAL";
    doc.sourceUrl=String.valueOf(result.getOrDefault("sourceUrl",""));
    doc.publisher=String.valueOf(result.getOrDefault("publisher",""));
    if(result.get("fetchedAt") instanceof String timestamp&&!timestamp.isBlank())doc.fetchedAt=Instant.parse(timestamp);
    doc.uploadedBy=auth.currentUser();
    return documents.save(doc);
  }
  record Question(String question,Boolean includeOfficialSources) {}
  @PostMapping("/chat") public Map<String,Object> chat(@PathVariable Long projectId,@RequestBody Question input){
    access.require(projectId);
    if(input.question()==null||input.question().isBlank()||input.question().length()>3000)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Question required (max 3000)");
    return ai.post("/rag/chat",Map.of("project_id",projectId,"question",input.question().trim(),"include_official_sources",Boolean.TRUE.equals(input.includeOfficialSources())));
  }
}
