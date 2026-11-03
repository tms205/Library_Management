package com.librarymanagement.controller;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.librarymanagement.dto.request.UpdateAccountRoleRequest;
import com.librarymanagement.dto.response.AccountRoleResponse;
import com.librarymanagement.dto.response.PermissionGroupResponse;
import com.librarymanagement.service.RoleService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

// Controller dành riêng cho Quản trị viên để tra cứu và thay đổi nhóm quyền (Role/Permissions)
@RestController
@RequestMapping("/api/admin/roles")
@RequiredArgsConstructor
@Tag(name = "Admin Role Controller", description = "Các API phân quyền và quản lý vai trò người dùng (chỉ dành cho Admin)")
public class RoleController {

	private final RoleService roleService;

	// Lấy danh sách các nhóm quyền trong hệ thống (ADMIN_GROUP, STAFF_GROUP, USER_GROUP, ...)
	@GetMapping("/groups")
	@Operation(summary = "Lấy danh sách các nhóm quyền có trong hệ thống")
	public ResponseEntity<List<PermissionGroupResponse>> getAllGroups() {
		return ResponseEntity.ok(roleService.getAllPermissionGroups());
	}

	// Lấy danh sách tài khoản kèm quyền hiện tại (có tìm kiếm và phân trang)
	@GetMapping("/accounts")
	@Operation(summary = "Lấy danh sách tài khoản để phân quyền")
	public ResponseEntity<Page<AccountRoleResponse>> searchAccounts(
			@RequestParam(required = false) String search,
			@PageableDefault(size = 10) Pageable pageable) {

		return ResponseEntity.ok(roleService.searchAccounts(search, pageable));
	}

	// Cập nhật nhóm quyền mới cho một tài khoản cụ thể
	@PutMapping("/accounts/{accountId}")
	@Operation(summary = "Thay đổi nhóm quyền của một tài khoản")
	public ResponseEntity<AccountRoleResponse> updateAccountRole(
			@PathVariable Long accountId,
			@Valid @RequestBody UpdateAccountRoleRequest request,
			Authentication authentication) {

		String currentAdminEmail = authentication != null ? authentication.getName() : null;
		AccountRoleResponse updated = roleService.updateAccountGroup(accountId, request.getGroupId(), currentAdminEmail);

		return ResponseEntity.ok(updated);
	}
}
