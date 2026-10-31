package com.dacn.assistant.web;

import com.dacn.assistant.config.SecurityConfig;
import com.dacn.assistant.model.Models.User;
import com.dacn.assistant.repo.Repos;
import com.dacn.assistant.service.EmailVerificationService;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.*;

@RestController
@RequestMapping("/api")
public class AuthController {
  private final Repos.Users users;
  private final SecurityConfig auth;
  private final PasswordEncoder passwords;
  private final EmailVerificationService verification;

  public AuthController(Repos.Users users, SecurityConfig auth, PasswordEncoder passwords,
                        EmailVerificationService verification) {
    this.users=users; this.auth=auth; this.passwords=passwords; this.verification=verification;
  }

  public record Credentials(String name, String email, String password) {}
  public record VerifyRequest(String email, String otp) {}
  public record EmailRequest(String email) {}

  private Map<String,Object> session(User user) {
    return Map.of("token",auth.createToken(user),"user",user);
  }

  @PostMapping("/auth/register")
  public ResponseEntity<Map<String,Object>> register(@RequestBody Credentials body) {
    if(body==null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid registration data");
    String email=EmailVerificationService.normalizeEmail(body.email());
    EmailVerificationService.validateName(body.name());
    EmailVerificationService.validatePassword(body.password());
    verification.begin(body.name().trim(),email,body.password());
    return ResponseEntity.accepted().body(Map.of(
        "email",email, "expiresInSeconds",600, "resendAfterSeconds",60,
        "message","Mã xác minh đã được gửi. Kiểm tra hộp thư và thư mục Spam."));
  }

  @PostMapping("/auth/verify-email")
  public Map<String,Object> verifyEmail(@RequestBody VerifyRequest body) {
    if(body==null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"OTP required");
    User user=verification.verify(EmailVerificationService.normalizeEmail(body.email()),body.otp());
    return session(user);
  }

  @PostMapping("/auth/resend-otp")
  public Map<String,String> resendOtp(@RequestBody EmailRequest body) {
    if(body==null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Email required");
    verification.resend(EmailVerificationService.normalizeEmail(body.email()));
    return Map.of("message","Nếu có đăng ký chờ xác minh, mã mới sẽ được gửi đến email.");
  }

  @PostMapping("/auth/login")
  public Map<String,Object> login(@RequestBody Credentials body) {
    String email=body==null || body.email()==null?"":body.email().trim().toLowerCase(Locale.ROOT);
    User user=users.findByEmail(email).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Email hoặc mật khẩu không đúng"));
    if(body==null || body.password()==null || !passwords.matches(body.password(),user.passwordHash))
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Email hoặc mật khẩu không đúng");
    return session(user);
  }

  @GetMapping("/me") public User me() {
    return users.findById(auth.currentUser()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
  }
  @GetMapping("/health") public Map<String,String> health() {
    return Map.of("status","ok","service","backend");
  }
}
