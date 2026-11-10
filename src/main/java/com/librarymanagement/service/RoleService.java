package com.librarymanagement.service;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.librarymanagement.dto.request.CreatePermissionGroupRequest;
import com.librarymanagement.dto.request.UpdatePermissionGroupRequest;
import com.librarymanagement.dto.response.AccountRoleResponse;
import com.librarymanagement.dto.response.PermissionGroupResponse;
import com.librarymanagement.dto.response.PermissionResponse;
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
import com.librarymanagement.repository.PermissionRepository;

import lombok.RequiredArgsConstructor;

// Service này phụ trách toàn bộ nghiệp vụ phân quyền người dùng theo nhóm
// Chỉ Admin mới được phép gọi các hàm trong này
@Service
@RequiredArgsConstructor
public class RoleService {

	private final AccountRepository accountRepository;
	private final PermissionGroupRepository permissionGroupRepository;
	private final MemberRepository memberRepository;
	private final PermissionRepository permissionRepository;

	// Lấy tất cả các nhóm quyền có sẵn trong hệ thống (kèm số lượng tài khoản và cờ mặc định)
	@Transactional(readOnly = true)
	public List<PermissionGroupResponse> getAllPermissionGroups() {
		List<PermissionGroup> groups = permissionGroupRepository.findAll();

		return groups.stream().map(this::mapToGroupResponse).toList();
	}

	// Lấy toàn bộ danh sách quyền hạn (Permissions) hiện có trong hệ thống
	@Transactional(readOnly = true)
	public List<PermissionResponse> getAllPermissions() {
		return permissionRepository.findAllByOrderByNameAsc().stream()
				.map(p -> new PermissionResponse(p.getId(), p.getName(), p.getDescription()))
				.toList();
	}

	// Tạo một nhóm quyền mới hoàn toàn linh hoạt
	@Transactional
	public PermissionGroupResponse createPermissionGroup(CreatePermissionGroupRequest request) {
		String trimmedName = request.getName().trim();

		// Kiểm tra trùng tên nhóm quyền
		if (permissionGroupRepository.existsByName(trimmedName)) {
			throw new BadRequestException("Tên nhóm quyền \"" + trimmedName + "\" đã tồn tại trong hệ thống!");
		}

		// Không cho phép đặt tên trùng các tiền tố hệ thống cố định
		if ("ADMIN_GROUP".equalsIgnoreCase(trimmedName) || "STAFF_GROUP".equalsIgnoreCase(trimmedName) || "USER_GROUP".equalsIgnoreCase(trimmedName)) {
			throw new BadRequestException("Không thể sử dụng tên nhóm quyền mặc định của hệ thống!");
		}

		PermissionGroup newGroup = new PermissionGroup();
		newGroup.setName(trimmedName);
		newGroup.setDescription(request.getDescription() != null ? request.getDescription().trim() : null);
		newGroup.setIsDefault(false);

		// Gán các permission được chọn
		if (request.getPermissionIds() != null && !request.getPermissionIds().isEmpty()) {
			List<Permission> perms = permissionRepository.findByIdIn(request.getPermissionIds());
			newGroup.setPermissions(new HashSet<>(perms));
		}

		PermissionGroup saved = permissionGroupRepository.save(newGroup);
		return mapToGroupResponse(saved);
	}

	// Chỉnh sửa thông tin nhóm quyền (tên, mô tả, quyền hạn)
	@Transactional
	public PermissionGroupResponse updatePermissionGroup(Long groupId, UpdatePermissionGroupRequest request) {
		PermissionGroup group = permissionGroupRepository.findById(groupId)
				.orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhóm quyền với ID: " + groupId));

		String trimmedName = request.getName().trim();

		// Nếu là nhóm quyền mặc định của hệ thống, không cho phép đổi tên
		if (Boolean.TRUE.equals(group.getIsDefault()) && !group.getName().equalsIgnoreCase(trimmedName)) {
			throw new BadRequestException("Không thể đổi tên nhóm quyền mặc định (" + group.getName() + ") của hệ thống!");
		}

		// Kiểm tra trùng tên với nhóm khác
		if (permissionGroupRepository.existsByNameAndIdNot(trimmedName, groupId)) {
			throw new BadRequestException("Tên nhóm quyền \"" + trimmedName + "\" đã được sử dụng bởi nhóm khác!");
		}

		// Kiểm tra an toàn: Nhóm ADMIN_GROUP bắt buộc phải giữ lại quyền quản trị tối cao (SYSTEM_MAINTENANCE)
		if ("ADMIN_GROUP".equalsIgnoreCase(group.getName())) {
			if (request.getPermissionIds() != null) {
				List<Permission> perms = permissionRepository.findByIdIn(request.getPermissionIds());
				boolean hasMaintenance = perms.stream().anyMatch(p -> "SYSTEM_MAINTENANCE".equals(p.getName()));
				if (!hasMaintenance) {
					throw new BadRequestException("Không thể loại bỏ quyền Quản trị hệ thống (SYSTEM_MAINTENANCE) khỏi nhóm ADMIN_GROUP!");
				}
			}
		}

		if (!Boolean.TRUE.equals(group.getIsDefault())) {
			group.setName(trimmedName);
		}
		group.setDescription(request.getDescription() != null ? request.getDescription().trim() : null);

		if (request.getPermissionIds() != null) {
			List<Permission> perms = permissionRepository.findByIdIn(request.getPermissionIds());
			group.setPermissions(new HashSet<>(perms));
		}

		PermissionGroup saved = permissionGroupRepository.save(group);
		return mapToGroupResponse(saved);
	}

	// Xóa nhóm quyền tùy chỉnh (chỉ cho phép xóa khi nhóm không phải mặc định và chưa được gán cho tài khoản nào)
	@Transactional
	public void deletePermissionGroup(Long groupId) {
		PermissionGroup group = permissionGroupRepository.findById(groupId)
				.orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhóm quyền với ID: " + groupId));

		if (Boolean.TRUE.equals(group.getIsDefault())) {
			throw new BadRequestException("Không thể xóa nhóm quyền mặc định cốt lõi của hệ thống!");
		}

		long assignedCount = permissionGroupRepository.countAccountsByGroupId(groupId);
		if (assignedCount > 0) {
			throw new BadRequestException("Nhóm quyền \"" + group.getName() + "\" hiện đang được gán cho " + assignedCount + " tài khoản. Vui lòng chuyển các tài khoản này sang nhóm khác trước khi xóa!");
		}

		permissionGroupRepository.delete(group);
	}

	// Lấy danh sách tài khoản thuộc một nhóm quyền cụ thể
	@Transactional(readOnly = true)
	public Page<AccountRoleResponse> getAccountsInGroup(Long groupId, Pageable pageable) {
		if (!permissionGroupRepository.existsById(groupId)) {
			throw new ResourceNotFoundException("Không tìm thấy nhóm quyền với ID: " + groupId);
		}

		Page<Account> accountPage = accountRepository.findAccountsByPermissionGroupId(groupId, pageable);
		return accountPage.map(this::mapToAccountRoleResponse);
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
		boolean hasAdminPerm = newGroup.getPermissions().stream()
				.anyMatch(p -> "SYSTEM_MAINTENANCE".equals(p.getName()));
		if (hasAdminPerm || "ADMIN_GROUP".equalsIgnoreCase(newGroup.getName())) {
			account.setRole(Role.ADMIN);
		} else {
			account.setRole(Role.USER);
		}

		accountRepository.save(account);

		return mapToAccountRoleResponse(account);
	}

	// Helper map group entity sang DTO response
	private PermissionGroupResponse mapToGroupResponse(PermissionGroup g) {
		List<String> perms = g.getPermissions().stream()
				.map(Permission::getName)
				.sorted()
				.toList();

		long count = permissionGroupRepository.countAccountsByGroupId(g.getId());
		boolean isDefault = Boolean.TRUE.equals(g.getIsDefault());

		return new PermissionGroupResponse(
				g.getId(),
				g.getName(),
				g.getDescription(),
				isDefault,
				count,
				perms
		);
	}

	// Helper map account entity sang DTO hiển thị
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
