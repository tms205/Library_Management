package com.librarymanagement.controller;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.librarymanagement.dto.request.CreatePermissionGroupRequest;
import com.librarymanagement.dto.request.UpdateAccountRoleRequest;
import com.librarymanagement.dto.request.UpdatePermissionGroupRequest;
import com.librarymanagement.dto.response.AccountRoleResponse;
import com.librarymanagement.dto.response.PermissionGroupResponse;
import com.librarymanagement.dto.response.PermissionResponse;
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

	// Lấy danh sách các nhóm quyền trong hệ thống
	@GetMapping("/groups")
	@Operation(summary = "Lấy danh sách các nhóm quyền có trong hệ thống")
	public ResponseEntity<List<PermissionGroupResponse>> getAllGroups() {
		return ResponseEntity.ok(roleService.getAllPermissionGroups());
	}

	// Tạo mới một nhóm quyền tùy chỉnh
	@PostMapping("/groups")
	@Operation(summary = "Tạo mới một nhóm quyền tùy chỉnh")
	public ResponseEntity<PermissionGroupResponse> createGroup(
			@Valid @RequestBody CreatePermissionGroupRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED).body(roleService.createPermissionGroup(request));
	}

	// Cập nhật thông tin và danh sách quyền của nhóm
	@PutMapping("/groups/{groupId}")
	@Operation(summary = "Cập nhật thông tin nhóm quyền")
	public ResponseEntity<PermissionGroupResponse> updateGroup(
			@PathVariable Long groupId,
			@Valid @RequestBody UpdatePermissionGroupRequest request) {
		return ResponseEntity.ok(roleService.updatePermissionGroup(groupId, request));
	}

	// Xóa nhóm quyền tùy chỉnh (chỉ xóa được nhóm không phải mặc định và chưa có tài khoản nào được gán)
	@DeleteMapping("/groups/{groupId}")
	@Operation(summary = "Xóa nhóm quyền tùy chỉnh")
	public ResponseEntity<Void> deleteGroup(@PathVariable Long groupId) {
		roleService.deletePermissionGroup(groupId);
		return ResponseEntity.noContent().build();
	}

	// Lấy toàn bộ danh sách quyền hạn (Permissions) trong hệ thống
	@GetMapping("/permissions")
	@Operation(summary = "Lấy toàn bộ danh sách quyền hạn (Permissions) của hệ thống")
	public ResponseEntity<List<PermissionResponse>> getAllPermissions() {
		return ResponseEntity.ok(roleService.getAllPermissions());
	}

	// Lấy danh sách tài khoản thuộc một nhóm quyền cụ thể
	@GetMapping("/groups/{groupId}/accounts")
	@Operation(summary = "Lấy danh sách tài khoản thuộc một nhóm quyền")
	public ResponseEntity<Page<AccountRoleResponse>> getAccountsInGroup(
			@PathVariable Long groupId,
			@PageableDefault(size = 10) Pageable pageable) {
		return ResponseEntity.ok(roleService.getAccountsInGroup(groupId, pageable));
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
