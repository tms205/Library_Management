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

	// bắt lỗi validation từ request gửi lên
	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<Map<String, String>> handleValidationException(MethodArgumentNotValidException exception) {
		Map<String, String> errors = new HashMap<>();

		exception.getBindingResult().getFieldErrors().forEach(error -> {
			errors.put(error.getField(), error.getDefaultMessage());
		});

		return ResponseEntity.badRequest().body(errors);
	}

	@ExceptionHandler(ResourceNotFoundException.class)
	public ResponseEntity<Map<String, String>> handleResourceNotFound(ResourceNotFoundException exception) {
		Map<String, String> error = new HashMap<>();
		error.put("message", exception.getMessage());

		return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
	}

	@ExceptionHandler(BadRequestException.class)
	public ResponseEntity<Map<String, String>> handleBadRequest(BadRequestException exception) {
		Map<String, String> error = new HashMap<>();
		error.put("message", exception.getMessage());

		return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
	}

	@ExceptionHandler(ConflictException.class)
	public ResponseEntity<Map<String, String>> handleConflict(ConflictException exception) {
		Map<String, String> error = new HashMap<>();
		error.put("message", exception.getMessage());

		return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
	}

	@ExceptionHandler(UnauthorizedException.class)
	public ResponseEntity<Map<String, String>> handleUnauthorized(UnauthorizedException exception) {
		Map<String, String> error = new HashMap<>();
		error.put("message", exception.getMessage());

		return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
	}
}
