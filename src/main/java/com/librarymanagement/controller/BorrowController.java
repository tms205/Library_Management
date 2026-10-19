package com.librarymanagement.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.librarymanagement.dto.request.BorrowBookRequest;
import com.librarymanagement.dto.response.BorrowResponse;
import com.librarymanagement.service.BorrowService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/borrow")
@SecurityRequirement(name = "bearerAuth")
public class BorrowController {

	private final BorrowService borrowService;

	public BorrowController(BorrowService borrowService) {

		this.borrowService = borrowService;
	}

	// =========================
	// MUON NHIEU SACH
	// =========================

	@PostMapping
	public ResponseEntity<Map<String, Object>> borrowBooks(Authentication authentication,
			@Valid @RequestBody BorrowBookRequest request) {

		// Email lay tu JWT
		String email = //
				authentication.getName();

		List<BorrowResponse> borrowedBooks = //
				borrowService.borrowBooks(email, request);

		Map<String, Object> response = //
				Map.of("message", "Mượn sách thành công!",

						"total", borrowedBooks.size(),

						"items", borrowedBooks);

		return ResponseEntity//
				.status(HttpStatus.CREATED)//
				.body(response);
	}

	// =========================
	// SACH TOI DANG MUON
	// =========================

	@GetMapping("/me")
	public ResponseEntity<List<BorrowResponse>> getMyBorrowedBooks(Authentication authentication) {

		String email = //
				authentication.getName();

		List<BorrowResponse> response = //
				borrowService.getBorrowedBooksByEmail(email);

		return ResponseEntity.ok(response);
	}

	// =========================
	// TRA SACH CUA TOI
	// =========================

	@PutMapping("/{borrowRecordId}/return")
	public ResponseEntity<BorrowResponse> returnBook(Authentication authentication, @PathVariable Long borrowRecordId) {

		String email = authentication.getName();

		BorrowResponse response = borrowService.returnBook(email, borrowRecordId);

		return ResponseEntity.ok(response);
	}
}