package com.dacn.assistant.service;

import com.dacn.assistant.model.Models.PendingRegistration;
import com.dacn.assistant.model.Models.User;
import com.dacn.assistant.repo.Repos;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;

@Service
public class EmailVerificationService {
  public static final Duration OTP_LIFETIME=Duration.ofMinutes(10);
  public static final Duration RESEND_WAIT=Duration.ofSeconds(60);
  private static final int MAX_ATTEMPTS=5;
  private static final int MAX_SENDS=5;
  private static final Pattern MAIL=Pattern.compile("^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)+$");
  private static final Pattern UPPER=Pattern.compile("[A-Z]");
  private static final Pattern LOWER=Pattern.compile("[a-z]");
  private static final Pattern DIGIT=Pattern.compile("[0-9]");
  private static final Pattern SPECIAL=Pattern.compile("[^A-Za-z0-9\\s]");

  private final Repos.Users users;
  private final Repos.PendingRegistrations pending;
  private final PasswordEncoder passwords;
  private final ObjectProvider<JavaMailSender> mailProvider;
  private final SecureRandom random=new SecureRandom();
  @Value("${app.mail-from:}") private String mailFrom;

  public EmailVerificationService(Repos.Users users,Repos.PendingRegistrations pending,
      PasswordEncoder passwords,ObjectProvider<JavaMailSender> mailProvider) {
    this.users=users; this.pending=pending; this.passwords=passwords; this.mailProvider=mailProvider;
  }

  public static String normalizeEmail(String input) {
    String email=input==null?"":input.trim().toLowerCase(Locale.ROOT);
    if(email.length()>200 || !MAIL.matcher(email).matches())
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Email không hợp lệ");
    return email;
  }

  public static void validateName(String name) {
    if(name==null || name.trim().length()<2 || name.trim().length()>120)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Họ tên phải từ 2 đến 120 ký tự");
  }

  public static boolean validPassword(String password) {
    return password!=null && password.length()>=10 && password.getBytes(StandardCharsets.UTF_8).length<=72 &&
        UPPER.matcher(password).find() && LOWER.matcher(password).find() &&
        DIGIT.matcher(password).find() && SPECIAL.matcher(password).find() &&
        !password.chars().anyMatch(Character::isWhitespace);
  }
  public static void validatePassword(String password) {
    if(!validPassword(password))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
          "Mật khẩu cần 10–72 ký tự, có chữ hoa, chữ thường, số, ký tự đặc biệt và không có khoảng trắng");
  }

  @Transactional
  public void begin(String name,String email,String password) {
    if(users.findByEmail(email).isPresent())
      throw new ResponseStatusException(HttpStatus.CONFLICT,"Email đã được sử dụng");
    var existing=pending.lockByEmail(email);
    Instant now=Instant.now();
    if(existing.isPresent() && existing.get().lastSentAt.plus(RESEND_WAIT).isAfter(now))
      throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Vui lòng chờ 60 giây trước khi yêu cầu mã mới");
    PendingRegistration record=existing.orElseGet(PendingRegistration::new);
    if(existing.isPresent() && record.createdAt.plus(Duration.ofHours(1)).isAfter(now) && record.sendCount>=MAX_SENDS)
      throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Đã đạt giới hạn gửi mã. Hãy thử lại sau");
    if(existing.isEmpty() || !record.createdAt.plus(Duration.ofHours(1)).isAfter(now)) {
      record.sendCount=0;
      record.createdAt=now;
    }
    record.name=name;
    record.email=email;
    record.passwordHash=passwords.encode(password);
    sendAndSave(record,now);
  }

  @Transactional(noRollbackFor=ResponseStatusException.class)
  public User verify(String email,String otp) {
    if(otp==null || !otp.matches("[0-9]{6}"))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Mã OTP gồm 6 chữ số");
    PendingRegistration record=pending.lockByEmail(email)
        .orElseThrow(()->new ResponseStatusException(HttpStatus.BAD_REQUEST,"Không có đăng ký chờ xác minh"));
    if(!record.expiresAt.isAfter(Instant.now()))
      throw new ResponseStatusException(HttpStatus.GONE,"Mã đã hết hạn. Hãy yêu cầu mã mới");
    if(record.attempts>=MAX_ATTEMPTS)
      throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Đã nhập sai quá số lần cho phép. Hãy yêu cầu mã mới");
    if(!passwords.matches(otp,record.otpHash)) {
      record.attempts++;
      pending.save(record);
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Mã OTP không đúng");
    }
    if(users.findByEmail(email).isPresent())
      throw new ResponseStatusException(HttpStatus.CONFLICT,"Email đã được sử dụng");
    User user=new User();
    user.name=record.name;
    user.email=record.email;
    user.passwordHash=record.passwordHash;
    user.role="USER";
    User saved=users.saveAndFlush(user);
    pending.delete(record);
    return saved;
  }

  @Transactional
  public void resend(String email) {
    PendingRegistration record=pending.lockByEmail(email).orElse(null);
    if(record==null || users.findByEmail(email).isPresent()) return;
    Instant now=Instant.now();
    if(record.lastSentAt.plus(RESEND_WAIT).isAfter(now))
      throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Vui lòng chờ 60 giây trước khi gửi lại");
    if(record.createdAt.plus(Duration.ofHours(1)).isAfter(now) && record.sendCount>=MAX_SENDS)
      throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Đã đạt giới hạn gửi OTP. Hãy thử lại sau");
    if(!record.createdAt.plus(Duration.ofHours(1)).isAfter(now)) {
      record.sendCount=0;
      record.createdAt=now;
    }
    sendAndSave(record,now);
  }

  private void sendAndSave(PendingRegistration record,Instant now) {
    JavaMailSender sender=mailProvider.getIfAvailable();
    if(sender==null || mailFrom==null || mailFrom.isBlank())
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
          "Chưa cấu hình SMTP. Thiết lập SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD và MAIL_FROM trong backend/.env");
    String otp=String.format(Locale.ROOT,"%06d",random.nextInt(1_000_000));
    record.otpHash=passwords.encode(otp);
    record.expiresAt=now.plus(OTP_LIFETIME);
    record.lastSentAt=now;
    record.attempts=0;
    record.sendCount++;
    pending.saveAndFlush(record);
    try {
      MimeMessage message=sender.createMimeMessage();
      MimeMessageHelper helper=new MimeMessageHelper(message,"UTF-8");
      helper.setFrom(mailFrom);
      helper.setTo(record.email);
      helper.setSubject("DevPilot AI | Mã xác minh tài khoản");
      // Only the randomly-generated digits enter the HTML content.
      String html="""
          <div style="background:#f1f4f5;padding:36px 16px;font-family:Arial,sans-serif;color:#14242c">
          <div style="max-width:520px;margin:auto;background:#fff;border-radius:18px;padding:36px">
          <div style="font-size:19px;font-weight:800">DEVPILOT <span style="color:#4872ef">AI</span></div>
          <h1 style="font-size:26px;margin:34px 0 12px">Xác minh email của bạn</h1>
          <p style="line-height:1.7;color:#53606a">Nhập mã dưới đây để hoàn tất đăng ký và bắt đầu sử dụng DevPilot.</p>
          <div style="background:#eef1ff;border-radius:14px;padding:22px;text-align:center;letter-spacing:12px;font-size:34px;font-weight:bold;color:#3048a7">"""
          +otp+"""
          </div><p style="color:#64748b;font-size:13px;line-height:1.8">Mã có hiệu lực trong 10 phút. Không chia sẻ mã này với bất kỳ ai. Nếu bạn không đăng ký, hãy bỏ qua email.</p>
          </div></div>
          """;
      helper.setText(html,true);
      sender.send(message);
    } catch(MessagingException | MailException e) {
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
          "Không gửi được email OTP. Kiểm tra cấu hình SMTP hoặc thử lại sau");
    }
  }
}
