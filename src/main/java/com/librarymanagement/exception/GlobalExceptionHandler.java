package com.librarymanagement.exception;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<Map<String, String>> handleValidationException(MethodArgumentNotValidException exception) {
		Map<String, String> errors = new HashMap<>();

		exception.getBindingResult().getFieldErrors().forEach(error -> {
			errors.put(error.getField(), error.getDefaultMessage());
		});

		return ResponseEntity.badRequest().body(errors);
	}

	@ExceptionHandler(InvalidCredentialsException.class)
	public ResponseEntity<Map<String, String>> handleInvalidCredentials(InvalidCredentialsException exception) {
		Map<String, String> error = new HashMap<>();

		error.put("message", exception.getMessage());

		return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
	}

	@ExceptionHandler(AccountNotVerifiedException.class)
	public ResponseEntity<Map<String, String>> handleAccountNotVerified(AccountNotVerifiedException exception) {
		Map<String, String> error = new HashMap<>();
		error.put("message", exception.getMessage());

		return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
	}

	@ExceptionHandler(VerificationTokenException.class)
	public ResponseEntity<Map<String, String>> handleVerificationToken(VerificationTokenException exception) {
		Map<String, String> error = new HashMap<>();
		error.put("message", exception.getMessage());

		return ResponseEntity.badRequest().body(error);
	}

	@ExceptionHandler(PasswordResetException.class)
	public ResponseEntity<Map<String, String>> handlePasswordReset(PasswordResetException exception) {
		Map<String, String> error = new HashMap<>();

		error.put("message", exception.getMessage());

		return ResponseEntity.badRequest().body(error);

	}

	@ExceptionHandler(ChangePasswordException.class)
	public ResponseEntity<Map<String, String>> handleChangePassword(ChangePasswordException exception) {
		Map<String, String> error = new HashMap<>();

		error.put("message", exception.getMessage());

		return ResponseEntity.badRequest().body(error);

	}

	@ExceptionHandler(ChangeEmailException.class)
	public ResponseEntity<Map<String, String>> handleChangeEmail(ChangeEmailException exception) {
		Map<String, String> error = new HashMap<>();

		error.put("message", exception.getMessage());

		return ResponseEntity.badRequest().body(error);

	}
}
