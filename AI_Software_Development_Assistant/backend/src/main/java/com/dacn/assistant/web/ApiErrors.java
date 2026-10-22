package com.dacn.assistant.web;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;
@RestControllerAdvice
public class ApiErrors {
  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<Map<String,String>> response(ResponseStatusException e){return ResponseEntity.status(e.getStatusCode()).body(Map.of("error",e.getReason()==null?"Request failed":e.getReason()));}
  @ExceptionHandler(org.springframework.web.bind.MethodArgumentNotValidException.class)
  public ResponseEntity<Map<String,String>> validation(Exception e){return ResponseEntity.badRequest().body(Map.of("error","Invalid data"));}
}
