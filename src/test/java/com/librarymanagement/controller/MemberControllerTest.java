package com.librarymanagement.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Answers;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.ResponseEntity;

import com.librarymanagement.dto.request.CreateMemberRequest;
import com.librarymanagement.dto.response.MemberResponse;
import com.librarymanagement.entity.Member;
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

		Member member = org.mockito.Mockito.mock(Member.class, Answers.RETURNS_DEEP_STUBS);

		when(member.getId()).thenReturn(1L);
		when(member.getFullName()).thenReturn("Nguyen Van A");
		when(member.getDateOfBirth()).thenReturn(LocalDate.of(2005, 5, 10));
		when(member.getPhone()).thenReturn("0901234567");
		when(member.getAddress()).thenReturn("Ho Chi Minh");
		when(member.getAccount().getId()).thenReturn(10L);
		when(member.getAccount().getEmail()).thenReturn("member@gmail.com");

		Page<Member> page = new PageImpl<>(List.of(member));

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

		Member member = org.mockito.Mockito.mock(Member.class, Answers.RETURNS_DEEP_STUBS);

		when(member.getId()).thenReturn(2L);
		when(member.getFullName()).thenReturn("Tran Van B");
		when(member.getDateOfBirth()).thenReturn(LocalDate.of(2004, 8, 20));
		when(member.getPhone()).thenReturn("0912345678");
		when(member.getAddress()).thenReturn("Go Vap");
		when(member.getAccount().getId()).thenReturn(11L);
		when(member.getAccount().getEmail()).thenReturn("member2@gmail.com");

		when(memberService.createMember(request)).thenReturn(member);

		ResponseEntity<MemberResponse> response = memberController.createMember(request);

		assertEquals(201, response.getStatusCode().value());

		assertNotNull(response.getBody());

		assertEquals("Tran Van B", response.getBody().getFullName());

		assertEquals("member2@gmail.com", response.getBody().getEmail());

		verify(memberService).createMember(request);
	}
}