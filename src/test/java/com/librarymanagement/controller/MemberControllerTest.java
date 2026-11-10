package com.librarymanagement.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.ResponseEntity;

import com.librarymanagement.dto.request.CreateMemberRequest;
import com.librarymanagement.dto.response.MemberResponse;
import com.librarymanagement.service.MemberService;

class MemberControllerTest {

	private MemberService memberService;

	private MemberController memberController;

	@BeforeEach
	void setUp() {

		memberService = org.mockito.Mockito.mock(MemberService.class);

		memberController = new MemberController(memberService);
	}

	@Test
	void searchMember_ShouldReturnResult() {

		MemberResponse memberResponse = new MemberResponse(
				1L,
				"Nguyen Van A",
				LocalDate.of(2005, 5, 10),
				"0901234567",
				"Ho Chi Minh",
				10L,
				"member@gmail.com",
				true,
				0,
				"USER"
		);

		Page<MemberResponse> page = new PageImpl<>(List.of(memberResponse));

		when(memberService.searchMember(null, null, null, 0, 10, "id", "asc", null, null, null)).thenReturn(page);

		Page<MemberResponse> response = memberController.searchMember(null, null, null, 0, 10, "id", "asc", null, null,
				null);

		assertNotNull(response);

		assertEquals(1, response.getContent().size());

		assertEquals("Nguyen Van A", response.getContent().get(0).getFullName());

		assertEquals("member@gmail.com", response.getContent().get(0).getEmail());
	}

	@Test
	void createMember_ShouldReturn201() {

		CreateMemberRequest request = org.mockito.Mockito.mock(CreateMemberRequest.class);

		MemberResponse memberResponse = new MemberResponse(
				2L,
				"Tran Van B",
				LocalDate.of(2004, 8, 20),
				"0912345678",
				"Go Vap",
				11L,
				"member2@gmail.com",
				true,
				0,
				"USER"
		);

		when(memberService.createMember(request)).thenReturn(memberResponse);

		ResponseEntity<MemberResponse> response = memberController.createMember(request);

		assertEquals(201, response.getStatusCode().value());

		assertNotNull(response.getBody());

		assertEquals("Tran Van B", response.getBody().getFullName());

		assertEquals("member2@gmail.com", response.getBody().getEmail());

		verify(memberService).createMember(request);
	}
}
