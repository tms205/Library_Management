package com.librarymanagement.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.librarymanagement.dto.request.ChangeEmailRequest;
import com.librarymanagement.dto.request.ChangePasswordRequest;
import com.librarymanagement.dto.request.ConfirmChangeEmailRequest;
import com.librarymanagement.dto.request.ForgotPasswordRequest;
import com.librarymanagement.dto.request.LoginRequest;
import com.librarymanagement.dto.request.RefreshTokenRequest;
import com.librarymanagement.dto.request.RegisterRequest;
import com.librarymanagement.dto.request.ResetPasswordRequest;
import com.librarymanagement.dto.request.VerifyEmailOtpRequest;
import com.librarymanagement.dto.response.LoginResponse;
import com.librarymanagement.security.TokenBlacklistService;
import com.librarymanagement.service.AuthService;
import com.librarymanagement.service.EmailChangeService;
import com.librarymanagement.service.EmailVerificationService;
import com.librarymanagement.service.PasswordResetService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;

// Hỗ trợ song song cả 2 prefix "/auth" và "/api/auth":
// - Web Frontend hiện tại gọi trực tiếp qua "/auth/..."
// - Mobile App và các công cụ test API hay dùng tiền tố chuẩn RESTful "/api/auth/..."
// Giúp cả 2 client đều kết nối thông suốt, không bao giờ bị dính lỗi 404 Not Found
@RestController
@RequestMapping({ "/auth", "/api/auth" })
public class AuthController {

	private final AuthService authService;

	private final EmailVerificationService emailVerificationService;

	private final PasswordResetService passwordResetService;
	// logout
	private final TokenBlacklistService tokenBlacklistService;

	private final EmailChangeService emailChangeService;

	public AuthController(AuthService authService, //
			EmailVerificationService emailVerificationService, //
			TokenBlacklistService tokenBlacklistService, // ,
			PasswordResetService passwordResetService, //
			EmailChangeService emailChangeService) {
		this.authService = authService;
		this.emailVerificationService = emailVerificationService;
		this.tokenBlacklistService = tokenBlacklistService;
		this.passwordResetService = passwordResetService;
		this.emailChangeService = emailChangeService;
	}

	@PostMapping("/register")
	public ResponseEntity<String> register(@Valid @RequestBody RegisterRequest request) {
		authService.register(request);

		return ResponseEntity.ok("Đăng ký thành công!");
	}

	@PostMapping("/login")
	public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
		LoginResponse response = authService.login(request);

		return ResponseEntity.ok(response);
	}

	@GetMapping("/verify-email")
	public ResponseEntity<String> verifyEmail(@RequestParam String token) {
		emailVerificationService.verifyEmail(token);
		return ResponseEntity.ok("Xác minh email thành công!");
	}

	@PostMapping("/verify-email-otp")
	public ResponseEntity<String> verifyEmailOtp(@Valid @RequestBody VerifyEmailOtpRequest request) {
		emailVerificationService.verifyEmailOtp(request.getEmail(), request.getOtp());
		return ResponseEntity.ok("Xác minh tài khoản thành công! Bạn có thể đăng nhập ngay bây giờ.");
	}

	@PostMapping("/resend-verification")
	public ResponseEntity<String> resendVerification(@RequestParam String email) {
		authService.resendVerification(email);
		return ResponseEntity.ok("Mã xác minh mới đã được gửi tới email của bạn!");
	}

	@PostMapping("/logout")
	@SecurityRequirement(name = "bearerAuth")
	public ResponseEntity<String> logout(
			@RequestHeader(value = "Authorization", required = false) String authorizationHeader,
			@RequestBody(required = false) Map<String, String> body, Authentication authentication) {

		// 1. Kiểm tra an toàn và đưa Access Token vào blacklist (tránh lỗi
		// StringIndexOutOfBoundsException)
		if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
			String token = authorizationHeader.substring(7).trim();
			if (!token.isEmpty()) {
				tokenBlacklistService.blacklist(token);
			}
		}

		// 2. Thu hồi Refresh Token trong DB theo email của tài khoản đang đăng nhập
		if (authentication != null && authentication.getName() != null && !authentication.getName().isBlank()) {
			authService.logout(authentication.getName());
		}

		// 3. Nếu client gửi kèm refreshToken trong body, đảm bảo xóa triệt để token đó
		if (body != null && body.containsKey("refreshToken")) {
			String refreshToken = body.get("refreshToken");
			if (refreshToken != null && !refreshToken.isBlank()) {
				authService.logoutByRefreshToken(refreshToken);
			}
		}

		return ResponseEntity.ok("Đăng xuất thành công!");
	}

	@PostMapping("/forgot-password")
	public ResponseEntity<String> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {

		passwordResetService.forgotPassword(request.getEmail());

		return ResponseEntity.ok("Mã OTP đã được gửi tới email!");
	}

	@PostMapping("/reset-password")
	public ResponseEntity<String> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
		passwordResetService.resetPassword(//
				request.getEmail(), //
				request.getOtp(), //
				request.getNewPassword());//

		return ResponseEntity.ok("Đặt lại password thành công!");
	}

	@PutMapping("/change-password")
	@SecurityRequirement(name = "bearerAuth")
	public ResponseEntity<String> changePassword(@Valid @RequestBody ChangePasswordRequest request,
			Authentication authentication) {

		String email = authentication.getName();

		authService.changePassword(email, request.getOldPassword(), request.getNewPassword());

		return ResponseEntity.ok("Đổi mật khẩu thành công!");
	}

	@PostMapping("/change-email/request")
	@SecurityRequirement(name = "bearerAuth")
	public ResponseEntity<String> requestChangeEmail(@Valid @RequestBody ChangeEmailRequest request, //
			Authentication authentication) {

		String currentEmail = authentication.getName();

		emailChangeService.requestChangeEmail(currentEmail, request.getNewEmail());

		return ResponseEntity.ok("Mã xác minh đã được gửi tới email hiện tại của bạn!");
	}

	@PostMapping("/change-email/confirm")
	@SecurityRequirement(name = "bearerAuth")
	public ResponseEntity<String> confirmChangeEmail(@Valid @RequestBody ConfirmChangeEmailRequest request, //
			Authentication authentication, //
			@RequestHeader("Authorization") String authorizationHeader//
	) {
		String currentEmail = authentication.getName();

		emailChangeService.confirmChangeEmail(currentEmail, request.getCode());

		String token = authorizationHeader.substring(7);

		tokenBlacklistService.blacklist(token);

		return ResponseEntity.ok("Đổi email thành công!, vui lòng login lại!");
	}

	@PostMapping("/refresh")
	public ResponseEntity<LoginResponse> refreshToken(//
			@Valid @RequestBody RefreshTokenRequest request) {

		return ResponseEntity.ok(//
				authService.refreshToken(request.getRefreshToken()));
	}
}
