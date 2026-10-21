package com.librarymanagement.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import com.librarymanagement.dto.request.BorrowBookRequest;
import com.librarymanagement.dto.response.BorrowResponse;
import com.librarymanagement.entity.BorrowStatus;
import com.librarymanagement.service.BorrowService;

class BorrowControllerTest {

	private BorrowService borrowService;

	private BorrowController borrowController;

	private Authentication authentication;

	@BeforeEach
	void setUp() {

		borrowService = org.mockito.Mockito.mock(BorrowService.class);

		authentication = org.mockito.Mockito.mock(Authentication.class);

		borrowController = new BorrowController(borrowService);
	}

	@Test
	void borrowBooks_ShouldReturnPending() {

		String email = "user@gmail.com";

		when(authentication.getName()).thenReturn(email);

		BorrowBookRequest request = new BorrowBookRequest();

		request.setBookIds(List.of(5L));

		BorrowResponse borrowResponse = new BorrowResponse(1L, 10L, "Nguyen Van A", 5L, "Clean Code", null, null,
				BorrowStatus.PENDING);

		when(borrowService.borrowBooks(email, request)).thenReturn(List.of(borrowResponse));

		ResponseEntity<Map<String, Object>> response = borrowController.borrowBooks(authentication, request);

		assertEquals(201, response.getStatusCode().value());

		assertNotNull(response.getBody());

		assertEquals(1, response.getBody().get("total"));

		@SuppressWarnings("unchecked")
		List<BorrowResponse> items = (List<BorrowResponse>) response.getBody().get("items");

		assertEquals(BorrowStatus.PENDING, items.get(0).getStatus());

		verify(borrowService).borrowBooks(email, request);
	}

	@Test
	void approveBorrow_ShouldReturnBorrowed() {

		Long borrowRecordId = 1L;

		BorrowResponse borrowResponse = new BorrowResponse(borrowRecordId, 10L, "Nguyen Van A", 5L, "Clean Code",
				LocalDate.now(), null, BorrowStatus.BORROWED);

		when(borrowService.approveBorrow(borrowRecordId)).thenReturn(borrowResponse);

		ResponseEntity<BorrowResponse> response = borrowController.approveBorrow(borrowRecordId);

		assertEquals(200, response.getStatusCode().value());

		assertNotNull(response.getBody());

		assertEquals(BorrowStatus.BORROWED, response.getBody().getStatus());

		assertNotNull(response.getBody().getBorrowDate());

		verify(borrowService).approveBorrow(borrowRecordId);
	}

	@Test
	void requestReturn_ShouldReturnReturnPending() {

		String email = "user@gmail.com";

		Long borrowRecordId = 1L;

		when(authentication.getName()).thenReturn(email);

		BorrowResponse borrowResponse = new BorrowResponse(borrowRecordId, 10L, "Nguyen Van A", 5L, "Clean Code",
				LocalDate.now(), null, BorrowStatus.RETURN_PENDING);

		when(borrowService.requestReturn(email, borrowRecordId)).thenReturn(borrowResponse);

		ResponseEntity<BorrowResponse> response = borrowController.requestReturn(authentication, borrowRecordId);

		assertEquals(200, response.getStatusCode().value());

		assertNotNull(response.getBody());

		assertEquals(BorrowStatus.RETURN_PENDING, response.getBody().getStatus());

		verify(borrowService).requestReturn(email, borrowRecordId);
	}

	@Test
	void confirmReturn_ShouldReturnReturned() {

		Long borrowRecordId = 1L;

		BorrowResponse borrowResponse = new BorrowResponse(borrowRecordId, 10L, "Nguyen Van A", 5L, "Clean Code",
				LocalDate.now().minusDays(1), LocalDate.now(), BorrowStatus.RETURNED);

		when(borrowService.confirmReturn(borrowRecordId)).thenReturn(borrowResponse);

		ResponseEntity<BorrowResponse> response = borrowController.confirmReturn(borrowRecordId);

		assertEquals(200, response.getStatusCode().value());

		assertNotNull(response.getBody());

		assertEquals(BorrowStatus.RETURNED, response.getBody().getStatus());

		assertNotNull(response.getBody().getReturnDate());

		verify(borrowService).confirmReturn(borrowRecordId);
	}
}