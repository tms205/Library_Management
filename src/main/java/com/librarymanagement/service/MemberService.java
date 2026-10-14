package com.librarymanagement.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.librarymanagement.dto.CreateMemberRequest;
import com.librarymanagement.dto.UpdateMemberRequest;
import com.librarymanagement.entity.Account;
import com.librarymanagement.entity.Member;
import com.librarymanagement.exception.AccountNotFoundException;
import com.librarymanagement.exception.MemberAlreadyExistsException;
import com.librarymanagement.exception.MemberNotFoundException;
import com.librarymanagement.repository.AccountRepository;
import com.librarymanagement.repository.MemberRepository;
import com.librarymanagement.specification.MemberSpecification;

@Service
public class MemberService {

	private final MemberRepository memberRepository;
	private final AccountRepository accountRepository;

	public MemberService(MemberRepository memberRepository, AccountRepository accountRepository) {

		this.memberRepository = memberRepository;
		this.accountRepository = accountRepository;
	}

	// lay tat ca member
	@Transactional(readOnly = true)
	public List<Member> getAllMembers() {

		return memberRepository.findAll();
	}

	// lay member theo id
	@Transactional(readOnly = true)
	public Member getMemberById(Long id) {

		return memberRepository.findById(id)//
				.orElseThrow(() -> new MemberNotFoundException(//
						"Không tìm thấy member có id: " + id));//
	}

	// tao member
	@Transactional
	public Member createMember(CreateMemberRequest request) {

		Account account = accountRepository.findById(//
				request.getAccountId())//
				.orElseThrow(() -> //
				new AccountNotFoundException(//
						"Không tìm thấy account có id: "//
								+ request.getAccountId()));

		if (memberRepository.existsByAccount_Id(account.getId())) {

			throw new MemberAlreadyExistsException(//
					"Account này đã có Member!");
		}

		Member member = new Member();

		member.setFullName(request.getFullName());
		member.setDateOfBirth(request.getDateOfBirth());
		member.setPhone(request.getPhone());
		member.setAddress(request.getAddress());
		member.setAccount(account);

		return memberRepository.save(member);
	}

	// update member
	@Transactional
	public Member updateMember(Long id, UpdateMemberRequest request) {

		Member member = memberRepository.findById(id)//
				.orElseThrow(() -> new MemberNotFoundException(//
						"Không tìm thấy member có id: " + id));

		member.setFullName(request.getFullName());
		member.setDateOfBirth(request.getDateOfBirth());
		member.setPhone(request.getPhone());
		member.setAddress(request.getAddress());

		return memberRepository.save(member);
	}

	// xoa member
	@Transactional
	public void deleteMember(Long id) {

		Member member = memberRepository.findById(id)//
				.orElseThrow(() -> new MemberNotFoundException(//
						"Không tìm thấy member có id: " + id));

		memberRepository.delete(member);
	}

	// search + paging + sorting
	@Transactional(readOnly = true)
	public Page<Member> searchMember(//
			String fullName, //
			String phone, //
			String address, //
			int page, //
			int size, //
			String sortBy, //
			String direction, //
			LocalDate fromDate, //
			LocalDate toDate, //
			Long bookId) {

		// page khong duoc am
		if (page < 0) {
			page = 0;
		}

		// toi da 10 record / page
		if (size <= 0 || size > 10) {
			size = 10;
		}

		// chi cho sort cac field nay
		if (!sortBy.equals("id")//
				&& !sortBy.equals("fullName")//
				&& !sortBy.equals("dateOfBirth")//
				&& !sortBy.equals("phone")//
				&& !sortBy.equals("address")) {//

			sortBy = "id";
		}

		Sort.Direction sortDirection;

		if (direction.equalsIgnoreCase("desc")) {
			sortDirection = Sort.Direction.DESC;
		} else {
			sortDirection = Sort.Direction.ASC;
		}

		Pageable pageable = PageRequest.of(page, //
				size, //
				Sort.by(sortDirection, sortBy)//
		);

		Specification<Member> spec = //
				MemberSpecification.hasFullName(fullName)//
						.and(MemberSpecification.hasPhone(phone))//
						.and(MemberSpecification.hasAddress(address))//
						.and(MemberSpecification.hasDateOfBirthBetween(fromDate, toDate))//
						.and(MemberSpecification.hasBorrowedBook(bookId));//

		return memberRepository.findAll(spec, pageable);
	}
}