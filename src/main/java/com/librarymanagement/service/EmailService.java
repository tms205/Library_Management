package com.librarymanagement.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
	private final JavaMailSender mailSender;

	public EmailService(JavaMailSender mailSender) {
		this.mailSender = mailSender;
	}

	// gui link nhan ma xac thuc
	public void sendVerificationEmail(String email, String token) {
		String verificationLink = "http://localhost:8080/auth/verify-email?token=" + token;

		SimpleMailMessage message = new SimpleMailMessage();

		message.setTo(email);

		message.setSubject("Xác minh tài khoản Library Management");

		message.setText("Xin chào!\n\n" + "Vui lòng nhấn vào link bên dưới để xác minh email:\n\n" + verificationLink
				+ "\n\nLink có hiệu lực trong 15 phút.");

		mailSender.send(message);
	}

	// gui ma xac thuc
	public void sendPasswordResetEmail(String email, String token) {
		SimpleMailMessage message = new SimpleMailMessage();

		message.setTo(email);

		message.setSubject("Đặt lại mật khẩu Library Management");

		message.setText(
				"Xin chào!\n\n" + "Yêu cầu đặt lại mật khẩu\n\n" + "Mã reset password của bạn là:\n" + token);

		mailSender.send(message);
	}

	// ma xac thuc doi email

	public void sendChangeEmailCode(String newEmail, String code) {
		SimpleMailMessage message = new SimpleMailMessage();

		message.setTo(newEmail);

		message.setSubject("Xác minh thay đổi email - Library Management");

		message.setText("Xin chào bạn!n\n\"" + "Mã xác minh email của bạn là:\n\n" + code
				+ "\n\nMã có hiệu lực trong 15 phút!");

		mailSender.send(message);
	}
}
