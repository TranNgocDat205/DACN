package com.dacn.assistant.service;

import com.dacn.assistant.model.Models.PendingRegistration;
import com.dacn.assistant.model.Models.User;
import com.dacn.assistant.repo.Repos;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.Duration;
import java.util.Properties;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class EmailVerificationServiceTest {
  private static final String PASSWORD="SecureTest1!";

  @Test void passwordValidationRejectsWeakStrings() {
    assertTrue(EmailVerificationService.validPassword(PASSWORD));
    assertFalse(EmailVerificationService.validPassword("short1A!"));
    assertFalse(EmailVerificationService.validPassword("alllowercase1!"));
    assertFalse(EmailVerificationService.validPassword("UPPERCASE123!"));
    assertFalse(EmailVerificationService.validPassword("NoDigitsHere!"));
    assertFalse(EmailVerificationService.validPassword("NoSpecial1234"));
    assertFalse(EmailVerificationService.validPassword("Has Space 1!"));
    assertFalse(EmailVerificationService.validPassword("A1!"+"x".repeat(80)));
  }

  @SuppressWarnings("unchecked")
  @Test void registrationMustVerifyOtpBeforeUserIsCreated() throws Exception {
    Repos.Users users=mock(Repos.Users.class);
    Repos.PendingRegistrations pending=mock(Repos.PendingRegistrations.class);
    ObjectProvider<JavaMailSender> provider=mock(ObjectProvider.class);
    JavaMailSender sender=mock(JavaMailSender.class);
    when(provider.getIfAvailable()).thenReturn(sender);
    when(sender.createMimeMessage()).thenAnswer(i->new MimeMessage(Session.getInstance(new Properties())));
    AtomicReference<MimeMessage> lastMail=new AtomicReference<>();
    doAnswer(i->{lastMail.set(i.getArgument(0));return null;}).when(sender).send(any(MimeMessage.class));
    AtomicReference<PendingRegistration> record=new AtomicReference<>();
    when(pending.lockByEmail("new@example.com")).thenAnswer(i->Optional.ofNullable(record.get()));
    when(pending.saveAndFlush(any(PendingRegistration.class))).thenAnswer(i->{
      PendingRegistration p=i.getArgument(0);p.id=1L;record.set(p);return p;
    });
    when(users.findByEmail("new@example.com")).thenReturn(Optional.empty());
    when(users.saveAndFlush(any(User.class))).thenAnswer(i->{User u=i.getArgument(0);u.id=7L;return u;});
    var service=new EmailVerificationService(users,pending,new BCryptPasswordEncoder(),provider);
    ReflectionTestUtils.setField(service,"mailFrom","no-reply@example.com");

    service.begin("A User","new@example.com",PASSWORD);
    verify(users,never()).saveAndFlush(any(User.class));
    assertNotNull(record.get());
    assertNotEquals(PASSWORD,record.get().passwordHash);
    assertNotNull(record.get().otpHash);
    String content=lastMail.get().getContent().toString();
    var matcher=Pattern.compile("\\b([0-9]{6})\\b").matcher(content);
    assertTrue(matcher.find(),"OTP is in the email");
    String code=matcher.group(1);
    assertThrows(ResponseStatusException.class,()->service.verify("new@example.com","123"));
    User user=service.verify("new@example.com",code);
    assertEquals("new@example.com",user.email);
    assertEquals("USER",user.role);
    verify(users,times(1)).saveAndFlush(any(User.class));
    verify(pending).delete(any(PendingRegistration.class));
  }

  @SuppressWarnings("unchecked")
  @Test void rateLimitsRepeatedRequests() {
    Repos.Users users=mock(Repos.Users.class);
    Repos.PendingRegistrations pending=mock(Repos.PendingRegistrations.class);
    ObjectProvider<JavaMailSender> provider=mock(ObjectProvider.class);
    PendingRegistration p=new PendingRegistration();p.email="new@example.com";
    p.name="Test User";p.createdAt=Instant.now();p.lastSentAt=Instant.now();
    p.sendCount=1;p.otpHash="a";p.expiresAt=Instant.now().plusSeconds(600);
    when(pending.lockByEmail(p.email)).thenReturn(Optional.of(p));
    when(users.findByEmail(p.email)).thenReturn(Optional.empty());
    var service=new EmailVerificationService(users,pending,new BCryptPasswordEncoder(),provider);
    var error=assertThrows(ResponseStatusException.class,()->service.resend(p.email));
    assertEquals(HttpStatus.TOO_MANY_REQUESTS,error.getStatusCode());
    verifyNoInteractions(provider);
  }
}
