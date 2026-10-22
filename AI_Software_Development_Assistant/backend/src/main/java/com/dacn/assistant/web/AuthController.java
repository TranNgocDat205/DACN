package com.dacn.assistant.web;
import com.dacn.assistant.config.SecurityConfig;
import com.dacn.assistant.model.Models.User;
import com.dacn.assistant.repo.Repos;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.*;
@RestController @RequestMapping("/api")
public class AuthController {
  private final Repos.Users users;
  private final SecurityConfig auth;
  private final PasswordEncoder passwords;
  public AuthController(Repos.Users u,SecurityConfig a,PasswordEncoder e){users=u;auth=a;passwords=e;}
  record Credentials(String name,String email,String password){}
  private Map<String,Object> session(User u){return Map.of("token",auth.createToken(u.id),"user",u);}
  @PostMapping("/auth/register") public Map<String,Object> register(@RequestBody Credentials body){
    if(body.name()==null||body.name().isBlank()||body.name().length()>120||body.email()==null||!body.email().matches("(?i)^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")||body.email().length()>200||body.password()==null||body.password().length()<8||body.password().length()>72)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Name, valid email and password (8-72 chars) required");
    String email=body.email().trim().toLowerCase(Locale.ROOT);
    if(users.findByEmail(email).isPresent()) throw new ResponseStatusException(HttpStatus.CONFLICT,"Email already exists");
    User u=new User();u.name=body.name().trim();u.email=email;u.passwordHash=passwords.encode(body.password());u.role="USER";
    return session(users.save(u));
  }
  @PostMapping("/auth/login") public Map<String,Object> login(@RequestBody Credentials body){
    String email=body.email()==null?"":body.email().trim().toLowerCase(Locale.ROOT);
    User u=users.findByEmail(email).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Invalid email or password"));
    if(body.password()==null||!passwords.matches(body.password(),u.passwordHash)) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Invalid email or password");
    return session(u);
  }
  @GetMapping("/me") public User me(){return users.findById(auth.currentUser()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));}
  @GetMapping("/health") public Map<String,String> health(){return Map.of("status","ok","service","backend");}
}
