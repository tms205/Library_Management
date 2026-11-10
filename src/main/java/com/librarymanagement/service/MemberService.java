package com.librarymanagement.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.librarymanagement.dto.request.CreateMemberRequest;
import com.librarymanagement.dto.request.UpdateMemberRequest;
import com.librarymanagement.dto.response.MemberResponse;
import com.librarymanagement.entity.Account;
import com.librarymanagement.entity.BorrowStatus;
import com.librarymanagement.entity.Member;
import com.librarymanagement.entity.Role;
import com.librarymanagement.exception.BadRequestException;
import com.librarymanagement.exception.ConflictException;
import com.librarymanagement.exception.ResourceNotFoundException;
import com.librarymanagement.repository.AccountRepository;
import com.librarymanagement.repository.BorrowRecordRepository;
import com.librarymanagement.repository.MemberRepository;
import com.librarymanagement.specification.MemberSpecification;

@Service
public class MemberService {

	private final MemberRepository memberRepository;
	private final AccountRepository accountRepository;
	private final BorrowRecordRepository borrowRecordRepository;

	@Autowired
	public MemberService(MemberRepository memberRepository, AccountRepository accountRepository,
			BorrowRecordRepository borrowRecordRepository) {

		this.memberRepository = memberRepository;
		this.accountRepository = accountRepository;
		this.borrowRecordRepository = borrowRecordRepository;
	}

	public MemberService(MemberRepository memberRepository, AccountRepository accountRepository) {
		this(memberRepository, accountRepository, null);
	}

	// lay tat ca member
	@Transactional(readOnly = true)
	public List<MemberResponse> getAllMembers() {

		return memberRepository.findAll()
				.stream()
				.map(this::toResponse)
				.toList();
	}

	// lay member theo id
	@Transactional(readOnly = true)
	public MemberResponse getMemberById(Long id) {

		Member member = memberRepository.findById(id)
				.orElseThrow(() -> new ResourceNotFoundException(
						"Không tìm thấy member có id: " + id));

		return toResponse(member);
	}

	@Transactional(readOnly = true)
	public Member getMemberEntityById(Long id) {

		return memberRepository.findById(id)
				.orElseThrow(() -> new ResourceNotFoundException(
						"Không tìm thấy member có id: " + id));
	}

	// tao member
	@Transactional
	public MemberResponse createMember(CreateMemberRequest request) {

		Account account = accountRepository.findById(
				request.getAccountId())
				.orElseThrow(() -> 
				new ResourceNotFoundException(
						"Không tìm thấy account có id: "
								+ request.getAccountId()));

		if (memberRepository.existsByAccount_Id(account.getId())) {

			throw new ConflictException(
					"Account này đã có Member!");
		}

		Member member = new Member();

		member.setFullName(request.getFullName());
		member.setDateOfBirth(request.getDateOfBirth());
		member.setPhone(request.getPhone());
		member.setAddress(request.getAddress());
		member.setAccount(account);

		Member savedMember = memberRepository.save(member);
		return toResponse(savedMember);
	}

	// update member
	@Transactional
	public MemberResponse updateMember(Long id, UpdateMemberRequest request) {

		Member member = memberRepository.findById(id)
				.orElseThrow(() -> new ResourceNotFoundException(
						"Không tìm thấy member có id: " + id));

		member.setFullName(request.getFullName());
		member.setDateOfBirth(request.getDateOfBirth());
		member.setPhone(request.getPhone());
		member.setAddress(request.getAddress());

		Member savedMember = memberRepository.save(member);
		return toResponse(savedMember);
	}

	// XÓA ĐỘC GIẢ (XÓA MỀM: TÌM SANG ACCOUNT VÀ CHUYỂN IS_DELETE TỪ 0 -> 1)
	@Transactional
	public void deleteMember(Long id) {

		Member member = memberRepository.findById(id)
				.orElseThrow(() -> new ResourceNotFoundException(
						"Không tìm thấy member có id: " + id));

		Account account = member.getAccount();
		if (account == null) {
			throw new BadRequestException("Độc giả này chưa liên kết với tài khoản hệ thống nào!");
		}

		// Không cho phép xóa tài khoản Quản trị viên (Admin)
		if (account.getRole() == Role.ADMIN || "admin".equalsIgnoreCase(account.getEmail())) {
			throw new BadRequestException("Không thể xóa tài khoản Quản trị viên (Admin)!");
		}

		// Chặn xóa nếu độc giả ĐANG CẦM SÁCH CHƯA TRẢ để bảo đảm tài sản thư viện
		if (borrowRecordRepository != null) {
			boolean hasActiveBorrow = borrowRecordRepository.existsByMember_IdAndStatus(id, BorrowStatus.BORROWED)
					|| borrowRecordRepository.existsByMember_IdAndStatus(id, BorrowStatus.RETURN_PENDING);

			if (hasActiveBorrow) {
				throw new BadRequestException("Không thể xóa độc giả \"" + member.getFullName()
						+ "\" vì độc giả này đang có sách mượn chưa hoàn trả thư viện!");
			}
		}

		// 1. Chuyển trạng thái cột is_delete trên bảng accounts từ 0 -> 1
		account.setIsDelete(true);

		// 2. Đồng thời vô hiệu hóa tài khoản (enabled = false) để chặn đăng nhập
		account.setEnabled(false);

		accountRepository.save(account);
	}

	// =========================================================================
	// KHÓA / MỞ KHÓA TÀI KHOẢN ĐỘC GIẢ (THAY VÌ XÓA MẤT LỊCH SỬ THƯ VIỆN)
	// =========================================================================
	@Transactional
	public MemberResponse updateMemberStatus(Long memberId, Boolean enabled) {
		Member member = memberRepository.findById(memberId)
				.orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy độc giả có id: " + memberId));

		Account account = member.getAccount();
		if (account == null) {
			throw new BadRequestException("Độc giả này chưa liên kết với tài khoản hệ thống nào!");
		}

		// Không cho phép khóa tài khoản Quản trị viên (Admin)
		if (account.getRole() == Role.ADMIN || "admin".equalsIgnoreCase(account.getEmail())) {
			throw new BadRequestException("Không thể khóa tài khoản Quản trị viên (Admin)!");
		}

		if (enabled != null) {
			account.setEnabled(enabled);
		} else {
			account.setEnabled(!Boolean.TRUE.equals(account.getEnabled()));
		}

		accountRepository.save(account);
		return toResponse(member);
	}

	// search + paging + sorting
	@Transactional(readOnly = true)
	public Page<MemberResponse> searchMember(
			String fullName,
			String phone,
			String address,
			int page,
			int size,
			String sortBy,
			String direction,
			LocalDate fromDate,
			LocalDate toDate,
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
		if (!sortBy.equals("id")
				&& !sortBy.equals("fullName")
				&& !sortBy.equals("dateOfBirth")
				&& !sortBy.equals("phone")
				&& !sortBy.equals("address")) {

			sortBy = "id";
		}

		Sort.Direction sortDirection;

		if (direction.equalsIgnoreCase("desc")) {
			sortDirection = Sort.Direction.DESC;
		} else {
			sortDirection = Sort.Direction.ASC;
		}

		Pageable pageable = PageRequest.of(page,
				size,
				Sort.by(sortDirection, sortBy)
		);

		Specification<Member> spec = 
				MemberSpecification.isNotDeleted()
						.and(MemberSpecification.isNotAdmin())
						.and(MemberSpecification.hasFullName(fullName))
						.and(MemberSpecification.hasPhone(phone))
						.and(MemberSpecification.hasAddress(address))
						.and(MemberSpecification.hasDateOfBirthBetween(fromDate, toDate))
						.and(MemberSpecification.hasBorrowedBook(bookId));

		return memberRepository.findAll(spec, pageable).map(this::toResponse);
	}

	// Chuyen Member Entity thanh MemberResponse DTO trong Transaction Session an toan
	public MemberResponse toResponse(Member member) {
		if (member == null) {
			return null;
		}

		Account account = member.getAccount();

		Boolean enabled = (account != null && account.getEnabled() != null)
				? account.getEnabled()
				: true;

		Integer isDelete = (account != null && Boolean.TRUE.equals(account.getIsDelete()))
				? 1
				: 0;

		String role = (account != null && account.getRole() != null)
				? account.getRole().name()
				: "USER";

		return new MemberResponse(
				member.getId(),
				member.getFullName(),
				member.getDateOfBirth(),
				member.getPhone(),
				member.getAddress(),
				account != null ? account.getId() : null,
				account != null ? account.getEmail() : null,
				enabled,
				isDelete,
				role
		);
	}
}
