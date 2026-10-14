package com.librarymanagement.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.librarymanagement.dto.CreateMemberRequest;
import com.librarymanagement.dto.MemberResponse;
import com.librarymanagement.dto.UpdateMemberRequest;
import com.librarymanagement.entity.Member;
import com.librarymanagement.service.MemberService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/members")
public class MemberController {

	private final MemberService memberService;

	public MemberController(MemberService memberService) {
		this.memberService = memberService;
	}

	// lay tat ca member
	@GetMapping
	public List<MemberResponse> getAllMembers() {

		return memberService.getAllMembers()//
				.stream()///
				.map(this::toResponse)//
				.toList();//
	}

	// lay member theo id
	@GetMapping("/{id}")
	public MemberResponse getMemberById(@PathVariable Long id) {

		Member member = memberService.getMemberById(id);

		return toResponse(member);
	}

	// tao member
	@PostMapping
	public ResponseEntity<MemberResponse> createMember(//
			@Valid //
			@RequestBody CreateMemberRequest request) {//
///
		Member member = //
				memberService.createMember(request);//

		return ResponseEntity//
				.status(HttpStatus.CREATED)//
				.body(toResponse(member));//
	}

	// update member
	@PutMapping("/{id}")
	public MemberResponse updateMember(//
			@PathVariable Long id, //
			@Valid //
			@RequestBody UpdateMemberRequest request) {//

		Member member = //
				memberService.updateMember(id, request);//

		return toResponse(member);
	}

	// xoa member
	@DeleteMapping("/{id}")
	public ResponseEntity<Void> deleteMember(@PathVariable Long id) {

		memberService.deleteMember(id);

		return ResponseEntity.noContent()//
				.build();//
	}

	// search + paging + sorting
	@GetMapping("/search")
	public Page<MemberResponse> searchMember(@RequestParam(required = false) String fullName,

			@RequestParam(required = false) String phone,

			@RequestParam(required = false) String address,

			@RequestParam(defaultValue = "0") int page,

			@RequestParam(defaultValue = "10") int size,

			@RequestParam(defaultValue = "id") String sortBy,

			@RequestParam(defaultValue = "asc") String direction, //

			@RequestParam(required = false) LocalDate fromDate, //

			@RequestParam(required = false) LocalDate toDate, //

			@RequestParam(required = false) Long bookId) {

		return memberService///
				.searchMember(//
						fullName, //
						phone, //
						address, //
						page, //
						size, //
						sortBy, //
						direction, //
						fromDate, //
						toDate, //
						bookId)//
				.map(this::toResponse);
	}

	// chuyen Member thanh MemberResponse
	private MemberResponse toResponse(Member member) {

		return new MemberResponse(//
				member.getId(), //
				member.getFullName(), //
				member.getDateOfBirth(), //
				member.getPhone(), //
				member.getAddress(), //
				member.getAccount().getId(), //
				member.getAccount().getEmail()//
		);
	}
}