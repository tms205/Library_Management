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
	// MUON NHIEU SACH (YEU CAU MUON - PENDING)
	// =========================

	@PostMapping
	public ResponseEntity<Map<String, Object>> borrowBooks(Authentication authentication,
			@Valid @RequestBody BorrowBookRequest request) {

		// Email lay tu JWT
		String email = authentication.getName();

		List<BorrowResponse> borrowedBooks = borrowService.borrowBooks(email, request);

		Map<String, Object> response = Map.of(
				"message", "Gửi yêu cầu mượn thành công! Vui lòng chờ thư viện xác nhận.",
				"total", borrowedBooks.size(),
				"items", borrowedBooks
		);

		return ResponseEntity.status(HttpStatus.CREATED).body(response);
	}

	// =========================
	// SACH CUA TOI
	// =========================

	@GetMapping("/me")
	public ResponseEntity<List<BorrowResponse>> getMyBorrowedBooks(Authentication authentication) {

		String email = authentication.getName();
		List<BorrowResponse> response = borrowService.getBorrowedBooksByEmail(email);

		return ResponseEntity.ok(response);
	}

	// =========================
	// USER YEU CAU TRA SACH
	// =========================

	@PutMapping("/{borrowRecordId}/request-return")
	public ResponseEntity<BorrowResponse> requestReturn(Authentication authentication,
			@PathVariable Long borrowRecordId) {

		String email = authentication.getName();
		BorrowResponse response = borrowService.requestReturn(email, borrowRecordId);

		return ResponseEntity.ok(response);
	}

	// =========================
	// STAFF / ADMIN: DANH SACH QUAN LY MUON TRA
	// =========================

	@GetMapping("/manage")
	public ResponseEntity<List<BorrowResponse>> getBorrowManagement() {

		List<BorrowResponse> response = borrowService.getAllBorrowRecords();

		return ResponseEntity.ok(response);
	}

	// =========================
	// STAFF / ADMIN: DUYET MUON
	// =========================

	@PutMapping("/{borrowRecordId}/approve")
	public ResponseEntity<BorrowResponse> approveBorrow(@PathVariable Long borrowRecordId) {

		BorrowResponse response = borrowService.approveBorrow(borrowRecordId);

		return ResponseEntity.ok(response);
	}

	// =========================
	// STAFF / ADMIN: TU CHOI MUON
	// =========================

	@PutMapping("/{borrowRecordId}/reject")
	public ResponseEntity<BorrowResponse> rejectBorrow(@PathVariable Long borrowRecordId) {

		BorrowResponse response = borrowService.rejectBorrow(borrowRecordId);

		return ResponseEntity.ok(response);
	}

	// =========================
	// STAFF / ADMIN: XAC NHAN TRA
	// =========================

	@PutMapping("/{borrowRecordId}/confirm-return")
	public ResponseEntity<BorrowResponse> confirmReturn(@PathVariable Long borrowRecordId) {

		BorrowResponse response = borrowService.confirmReturn(borrowRecordId);

		return ResponseEntity.ok(response);
	}
}