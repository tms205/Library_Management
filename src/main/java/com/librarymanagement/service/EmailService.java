package com.librarymanagement.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
	private final JavaMailSender mailSender;

	@Value("${app.frontend.verify-url:http://localhost:5173/verify-email}")
	private String verifyBaseUrl;

	public EmailService(JavaMailSender mailSender) {
		this.mailSender = mailSender;
	}

	// gui link va ma xac thuc tai khoan (Hybrid: phu hop ca May tinh va Dien thoai)
	public void sendVerificationEmail(String email, String token, String otpCode) {
		String verificationLink = verifyBaseUrl + "?token=" + token;
		SimpleMailMessage message = new SimpleMailMessage();

		message.setTo(email);

		message.setSubject("Xác minh tài khoản Library Management");

		message.setText("Xin chào!\n\n"
				+ "Cảm ơn bạn đã đăng ký tài khoản tại Library Management.\n\n"
				+ "📱 DÀNH CHO ỨNG DỤNG ĐIỆN THOẠI (MOBILE APP):\n"
				+ "Mã kích hoạt OTP của bạn là: " + otpCode + "\n\n"
				+ "💻 DÀNH CHO MÁY TÍNH (WEB BROWSER):\n"
				+ "Vui lòng nhấn vào liên kết bên dưới để xác minh tài khoản:\n"
				+ verificationLink + "\n\n"
				+ "Mã xác nhận và liên kết có hiệu lực trong vòng 15 phút.");

		mailSender.send(message);
	}

	public void sendVerificationEmail(String email, String token) {
		sendVerificationEmail(email, token, "---");
	}

	// gui ma xac thuc
	public void sendPasswordResetOtp(String email, String otp) {

		SimpleMailMessage message = new SimpleMailMessage();

		message.setTo(email);
		message.setSubject("Mã OTP đặt lại mật khẩu");

		message.setText("Mã OTP đặt lại mật khẩu của bạn là: " + otp + "\n\nMã OTP có hiệu lực trong 5 phút.");

		mailSender.send(message);
	}

	// Mã xác thực đổi email - gửi về email hiện tại của tài khoản để bảo mật
	public void sendChangeEmailCode(String currentEmail, String code, String newEmail) {
		SimpleMailMessage message = new SimpleMailMessage();

		message.setTo(currentEmail);
		message.setSubject("Xác nhận yêu cầu thay đổi email - Library Management");

		String content = "Xin chào bạn!\n\n"
				+ "Hệ thống thư viện nhận được yêu cầu đổi địa chỉ email tài khoản của bạn"
				+ (newEmail != null && !newEmail.isBlank() ? " sang: " + newEmail : "") + ".\n\n"
				+ "Mã xác nhận bảo mật của bạn là: " + code + "\n\n"
				+ "Mã có hiệu lực trong 15 phút. Vui lòng nhập mã này trên hệ thống để hoàn tất.\n"
				+ "Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email hoặc liên hệ quản trị viên ngay lập tức!";

		message.setText(content);

		mailSender.send(message);
	}

	public void sendChangeEmailCode(String currentEmail, String code) {
		sendChangeEmailCode(currentEmail, code, null);
	}
}
