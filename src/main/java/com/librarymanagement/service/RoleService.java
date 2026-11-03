package com.librarymanagement.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.librarymanagement.dto.response.AccountRoleResponse;
import com.librarymanagement.dto.response.PermissionGroupResponse;
import com.librarymanagement.entity.Account;
import com.librarymanagement.entity.Member;
import com.librarymanagement.entity.Permission;
import com.librarymanagement.entity.PermissionGroup;
import com.librarymanagement.entity.Role;
import com.librarymanagement.exception.BadRequestException;
import com.librarymanagement.exception.ResourceNotFoundException;
import com.librarymanagement.repository.AccountRepository;
import com.librarymanagement.repository.MemberRepository;
import com.librarymanagement.repository.PermissionGroupRepository;

import lombok.RequiredArgsConstructor;

// Service này phụ trách toàn bộ nghiệp vụ phân quyền người dùng theo nhóm
// Chỉ Admin mới được phép gọi các hàm trong này
@Service
@RequiredArgsConstructor
public class RoleService {

	private final AccountRepository accountRepository;
	private final PermissionGroupRepository permissionGroupRepository;
	private final MemberRepository memberRepository;

	// Lấy tất cả các nhóm quyền có sẵn trong hệ thống để đổ ra dropdown cho Admin chọn
	@Transactional(readOnly = true)
	public List<PermissionGroupResponse> getAllPermissionGroups() {
		List<PermissionGroup> groups = permissionGroupRepository.findAll();

		return groups.stream().map(g -> {
			List<String> perms = g.getPermissions().stream()
					.map(Permission::getName)
					.sorted()
					.toList();

			return new PermissionGroupResponse(
					g.getId(),
					g.getName(),
					g.getDescription(),
					perms
			);
		}).toList();
	}

	// Lấy danh sách tài khoản kèm vai trò và nhóm quyền hiện tại (hỗ trợ phân trang và tìm kiếm)
	@Transactional(readOnly = true)
	public Page<AccountRoleResponse> searchAccounts(String search, Pageable pageable) {
		String keyword = (search != null && !search.trim().isEmpty()) ? search.trim() : null;
		Page<Account> accountPage = accountRepository.searchAccountsForRoleManagement(keyword, pageable);

		return accountPage.map(this::mapToAccountRoleResponse);
	}

	// Cập nhật nhóm quyền mới cho một tài khoản
	@Transactional
	public AccountRoleResponse updateAccountGroup(Long accountId, Long groupId, String currentAdminEmail) {
		Account account = accountRepository.findById(accountId)
				.orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản với ID: " + accountId));

		// Chặn 1: Không cho phép đổi nhóm quyền của tài khoản Admin gốc (tránh phá vỡ hệ thống)
		if (account.getId() == 1L || "admin".equalsIgnoreCase(account.getEmail())) {
			throw new BadRequestException("Không thể thay đổi nhóm quyền của tài khoản Quản trị viên tối cao (Admin)!");
		}

		// Chặn 2: Admin không được tự đổi quyền của chính mình (chống self-lockout làm mất quyền admin)
		if (currentAdminEmail != null && currentAdminEmail.equalsIgnoreCase(account.getEmail())) {
			throw new BadRequestException("Bạn không thể tự thay đổi quyền hạn của tài khoản đang đăng nhập!");
		}

		PermissionGroup newGroup = permissionGroupRepository.findById(groupId)
				.orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhóm quyền với ID: " + groupId));

		// Gán nhóm quyền mới vào tài khoản (xóa nhóm cũ và gán nhóm mới)
		account.getPermissionGroups().clear();
		account.getPermissionGroups().add(newGroup);

		// Đồng bộ trường role cũ trong bảng accounts để không bị lỗi tương thích
		if ("ADMIN_GROUP".equalsIgnoreCase(newGroup.getName())) {
			account.setRole(Role.ADMIN);
		} else {
			account.setRole(Role.USER);
		}

		accountRepository.save(account);

		return mapToAccountRoleResponse(account);
	}

	// Helper map entity sang DTO hiển thị
	private AccountRoleResponse mapToAccountRoleResponse(Account account) {
		Optional<Member> memberOpt = memberRepository.findByAccount_Id(account.getId());

		Long memberId = memberOpt.map(Member::getId).orElse(null);
		String fullName = memberOpt.map(Member::getFullName).orElse("Chưa liên kết hồ sơ");

		// Lấy nhóm quyền đầu tiên của tài khoản (mỗi tài khoản sẽ thuộc 1 nhóm chính)
		PermissionGroup group = account.getPermissionGroups().stream().findFirst().orElse(null);
		Long groupId = group != null ? group.getId() : null;
		String groupName = group != null ? group.getName() : "CHƯA_PHÂN_NHÓM";
		String groupDesc = group != null ? group.getDescription() : "Chưa được gán nhóm quyền nào";

		// Tổng hợp danh sách tất cả permission từ các group
		List<String> perms = account.getPermissionGroups().stream()
				.flatMap(g -> g.getPermissions().stream())
				.map(Permission::getName)
				.distinct()
				.sorted()
				.toList();

		return new AccountRoleResponse(
				account.getId(),
				account.getEmail(),
				account.getRole() != null ? account.getRole().name() : "USER",
				memberId,
				fullName,
				groupId,
				groupName,
				groupDesc,
				account.getEnabled(),
				account.getIsDelete(),
				perms
		);
	}
}
