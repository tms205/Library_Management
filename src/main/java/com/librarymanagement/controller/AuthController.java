package com.librarymanagement.controller;

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

import com.librarymanagement.dto.ChangeEmailRequest;
import com.librarymanagement.dto.ChangePasswordRequest;
import com.librarymanagement.dto.ConfirmChangeEmailRequest;
import com.librarymanagement.dto.ForgotPasswordRequest;
import com.librarymanagement.dto.LoginRequest;
import com.librarymanagement.dto.LoginResponse;
import com.librarymanagement.dto.RegisterRequest;
import com.librarymanagement.dto.ResetPasswordRequest;
import com.librarymanagement.security.TokenBlacklistService;
import com.librarymanagement.service.AuthService;
import com.librarymanagement.service.EmailChangeService;
import com.librarymanagement.service.EmailVerificationService;
import com.librarymanagement.service.PasswordResetService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/auth")
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

	@PostMapping("/logout")
	public ResponseEntity<String> logout(@RequestHeader("Authorization") String authorizationHeader) {
		String token = authorizationHeader.substring(7);// - cai bearer

		tokenBlacklistService.blacklist(token);

		return ResponseEntity.ok("Đăng xuất thành công!");
	}

	@PostMapping("/forgot-password")
	public ResponseEntity<String> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
		passwordResetService.forgotPassword(request.getEmail());

		return ResponseEntity.ok("Đã gửi hướng dẫn đặt lại password qua email!");
	}

	@PostMapping("/reset-password")
	public ResponseEntity<String> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
		passwordResetService.resetPassword(//
				request.getToken(), //
				request.getNewPassword());//

		return ResponseEntity.ok("Đặt lại password thành công!");
	}

	@PutMapping("/change-password")
	public ResponseEntity<String> changePassword(@Valid @RequestBody ChangePasswordRequest request,
			Authentication authentication) {

		String email = authentication.getName();

		authService.changePassword(email, request.getOldPassword(), request.getNewPassword());

		return ResponseEntity.ok("Đổi mật khẩu thành công!");
	}

	@PostMapping("/change-email/request")
	public ResponseEntity<String> requestChangeEmail(@Valid @RequestBody ChangeEmailRequest request, //
			Authentication authentication) {

		String currentEmail = authentication.getName();

		emailChangeService.requestChangeEmail(currentEmail, request.getNewEmail());

		return ResponseEntity.ok("Mã xác minh đã được gửi tới email mới!");
	}

	@PostMapping("/change-email/confirm")
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
}
