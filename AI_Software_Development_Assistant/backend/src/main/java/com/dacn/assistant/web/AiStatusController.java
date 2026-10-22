package com.dacn.assistant.web;
import com.dacn.assistant.service.AiClient;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
@RestController @RequestMapping("/api/ai")
public class AiStatusController {
 private final AiClient client;
 public AiStatusController(AiClient client){this.client=client;}
 @GetMapping("/status") public Map<String,Object> status(){return client.status();}
}
