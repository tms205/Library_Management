package com.librarymanagement.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.librarymanagement.dto.request.BorrowBookRequest;
import com.librarymanagement.dto.response.BorrowResponse;
import com.librarymanagement.entity.BorrowRecord;
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

	// muon sach
	@PostMapping
	public ResponseEntity<BorrowResponse> borrowBook(@Valid @RequestBody BorrowBookRequest request) {

		BorrowRecord record = borrowService.borrowBook(request);

		return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(record));
	}

	// tra sach
	@PutMapping("/{id}/return")
	public BorrowResponse returnBook(@PathVariable Long id) {

		BorrowRecord record = borrowService.returnBook(id);

		return toResponse(record);
	}

	// chuyen BorrowRecord thanh BorrowResponse
	private BorrowResponse toResponse(BorrowRecord record) {

		return new BorrowResponse(record.getId(), //
				record.getMember().getId(), //
				record.getMember().getFullName(), //
				record.getBook().getId(), //
				record.getBook().getTitle(), //
				record.getBorrowDate(), //
				record.getReturnDate(), //
				record.getStatus());
	}
}