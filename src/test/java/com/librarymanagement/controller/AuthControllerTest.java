package com.librarymanagement.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import com.librarymanagement.dto.request.LoginRequest;
import com.librarymanagement.dto.response.LoginResponse;
import com.librarymanagement.exception.GlobalExceptionHandler;
import com.librarymanagement.exception.UnauthorizedException;
import com.librarymanagement.security.TokenBlacklistService;
import com.librarymanagement.service.AuthService;
import com.librarymanagement.service.EmailChangeService;
import com.librarymanagement.service.EmailVerificationService;
import com.librarymanagement.service.PasswordResetService;

class AuthControllerTest {

	private AuthService authService;

	private EmailVerificationService emailVerificationService;

	private TokenBlacklistService tokenBlacklistService;

	private PasswordResetService passwordResetService;

	private EmailChangeService emailChangeService;

	private AuthController authController;

	private GlobalExceptionHandler globalExceptionHandler;

	@BeforeEach
	void setUp() {

		authService = org.mockito.Mockito.mock(AuthService.class);

		emailVerificationService = org.mockito.Mockito.mock(EmailVerificationService.class);

		tokenBlacklistService = org.mockito.Mockito.mock(TokenBlacklistService.class);

		passwordResetService = org.mockito.Mockito.mock(PasswordResetService.class);

		emailChangeService = org.mockito.Mockito.mock(EmailChangeService.class);

		authController = new AuthController(authService, emailVerificationService, tokenBlacklistService,
				passwordResetService, emailChangeService);

		globalExceptionHandler = new GlobalExceptionHandler();
	}

	@Test
	void loginSuccess_ShouldReturn200() {

		LoginRequest request = new LoginRequest();

		request.setEmail("admin");
		request.setPassword("admin");

		LoginResponse loginResponse = new LoginResponse("access-token-test", "refresh-token-test", "Bearer");

		when(authService.login(any(LoginRequest.class))).thenReturn(loginResponse);

		ResponseEntity<LoginResponse> response = authController.login(request);

		assertEquals(200, response.getStatusCode().value());

		assertNotNull(response.getBody());

		assertEquals("access-token-test", response.getBody().getAccessToken());

		assertEquals("refresh-token-test", response.getBody().getRefreshToken());

		assertEquals("Bearer", response.getBody().getTokenType());
	}

	@Test
	void loginFail_ShouldReturn401() {

		LoginRequest request = new LoginRequest();

		request.setEmail("admin");
		request.setPassword("sai-mat-khau");

		UnauthorizedException exception = new UnauthorizedException("Email hoặc mật khẩu không đúng!");

		when(authService.login(any(LoginRequest.class))).thenThrow(exception);

		UnauthorizedException thrown = assertThrows(UnauthorizedException.class, () -> authController.login(request));

		ResponseEntity<Map<String, String>> response = globalExceptionHandler.handleUnauthorized(thrown);

		assertEquals(401, response.getStatusCode().value());

		assertNotNull(response.getBody());

		assertEquals("Email hoặc mật khẩu không đúng!", response.getBody().get("message"));
	}
}