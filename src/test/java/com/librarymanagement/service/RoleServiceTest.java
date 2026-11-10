package com.librarymanagement.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.librarymanagement.dto.request.CreatePermissionGroupRequest;
import com.librarymanagement.dto.request.UpdatePermissionGroupRequest;
import com.librarymanagement.dto.response.PermissionGroupResponse;
import com.librarymanagement.dto.response.PermissionResponse;
import com.librarymanagement.entity.Account;
import com.librarymanagement.entity.Permission;
import com.librarymanagement.entity.PermissionGroup;
import com.librarymanagement.entity.Role;
import com.librarymanagement.exception.BadRequestException;
import com.librarymanagement.repository.AccountRepository;
import com.librarymanagement.repository.MemberRepository;
import com.librarymanagement.repository.PermissionGroupRepository;
import com.librarymanagement.repository.PermissionRepository;

class RoleServiceTest {

	private AccountRepository accountRepository;
	private PermissionGroupRepository permissionGroupRepository;
	private MemberRepository memberRepository;
	private PermissionRepository permissionRepository;

	private RoleService roleService;

	private PermissionGroup defaultAdminGroup;
	private PermissionGroup customGroup;
	private Permission bookViewPerm;
	private Permission bookCreatePerm;
	private Permission maintenancePerm;

	@BeforeEach
	void setUp() {
		accountRepository = mock(AccountRepository.class);
		permissionGroupRepository = mock(PermissionGroupRepository.class);
		memberRepository = mock(MemberRepository.class);
		permissionRepository = mock(PermissionRepository.class);

		roleService = new RoleService(accountRepository, permissionGroupRepository, memberRepository, permissionRepository);

		bookViewPerm = new Permission();
		bookViewPerm.setId(1L);
		bookViewPerm.setName("BOOK_VIEW");
		bookViewPerm.setDescription("Xem sách");

		bookCreatePerm = new Permission();
		bookCreatePerm.setId(2L);
		bookCreatePerm.setName("BOOK_CREATE");
		bookCreatePerm.setDescription("Tạo sách");

		maintenancePerm = new Permission();
		maintenancePerm.setId(10L);
		maintenancePerm.setName("SYSTEM_MAINTENANCE");
		maintenancePerm.setDescription("Quản trị hệ thống");

		defaultAdminGroup = new PermissionGroup();
		defaultAdminGroup.setId(1L);
		defaultAdminGroup.setName("ADMIN_GROUP");
		defaultAdminGroup.setDescription("Nhóm quản trị");
		defaultAdminGroup.setIsDefault(true);
		defaultAdminGroup.setPermissions(new HashSet<>(Set.of(bookViewPerm, maintenancePerm)));

		customGroup = new PermissionGroup();
		customGroup.setId(10L);
		customGroup.setName("INVENTORY_STAFF");
		customGroup.setDescription("Nhân viên kho");
		customGroup.setIsDefault(false);
		customGroup.setPermissions(new HashSet<>(Set.of(bookViewPerm, bookCreatePerm)));
	}

	@Test
	@DisplayName("getAllPermissions should return list of permission responses")
	void testGetAllPermissions() {
		when(permissionRepository.findAllByOrderByNameAsc()).thenReturn(List.of(bookViewPerm, bookCreatePerm));

		List<PermissionResponse> result = roleService.getAllPermissions();

		assertEquals(2, result.size());
		assertEquals("BOOK_VIEW", result.get(0).getName());
	}

	@Test
	@DisplayName("createPermissionGroup success should create custom group with isDefault false")
	void testCreatePermissionGroup_Success() {
		CreatePermissionGroupRequest req = new CreatePermissionGroupRequest("INVENTORY_NEW", "Mô tả mới", List.of(1L, 2L));

		when(permissionGroupRepository.existsByName("INVENTORY_NEW")).thenReturn(false);
		when(permissionRepository.findByIdIn(List.of(1L, 2L))).thenReturn(List.of(bookViewPerm, bookCreatePerm));
		when(permissionGroupRepository.save(any(PermissionGroup.class))).thenAnswer(i -> {
			PermissionGroup g = i.getArgument(0);
			g.setId(100L);
			return g;
		});

		PermissionGroupResponse resp = roleService.createPermissionGroup(req);

		assertNotNull(resp);
		assertEquals("INVENTORY_NEW", resp.getName());
		assertFalse(resp.getIsDefault());
		assertEquals(2, resp.getPermissions().size());
	}

	@Test
	@DisplayName("createPermissionGroup should throw when name already exists")
	void testCreatePermissionGroup_DuplicateName() {
		CreatePermissionGroupRequest req = new CreatePermissionGroupRequest("ADMIN_GROUP", "Mô tả", List.of());
		when(permissionGroupRepository.existsByName("ADMIN_GROUP")).thenReturn(true);

		assertThrows(BadRequestException.class, () -> roleService.createPermissionGroup(req));
		verify(permissionGroupRepository, never()).save(any());
	}

	@Test
	@DisplayName("deletePermissionGroup should throw when group is default")
	void testDeletePermissionGroup_DefaultGroupThrows() {
		when(permissionGroupRepository.findById(1L)).thenReturn(Optional.of(defaultAdminGroup));

		BadRequestException ex = assertThrows(BadRequestException.class, () -> roleService.deletePermissionGroup(1L));
		assertTrue(ex.getMessage().contains("mặc định"));
		verify(permissionGroupRepository, never()).delete(any());
	}

	@Test
	@DisplayName("deletePermissionGroup should throw when group still has assigned accounts")
	void testDeletePermissionGroup_HasAccountsThrows() {
		when(permissionGroupRepository.findById(10L)).thenReturn(Optional.of(customGroup));
		when(permissionGroupRepository.countAccountsByGroupId(10L)).thenReturn(3L);

		BadRequestException ex = assertThrows(BadRequestException.class, () -> roleService.deletePermissionGroup(10L));
		assertTrue(ex.getMessage().contains("đang được gán"));
		verify(permissionGroupRepository, never()).delete(any());
	}

	@Test
	@DisplayName("deletePermissionGroup success when custom and 0 accounts")
	void testDeletePermissionGroup_Success() {
		when(permissionGroupRepository.findById(10L)).thenReturn(Optional.of(customGroup));
		when(permissionGroupRepository.countAccountsByGroupId(10L)).thenReturn(0L);

		roleService.deletePermissionGroup(10L);

		verify(permissionGroupRepository).delete(customGroup);
	}

	@Test
	@DisplayName("updatePermissionGroup should prevent removing SYSTEM_MAINTENANCE from ADMIN_GROUP")
	void testUpdatePermissionGroup_CannotStripAdminPerm() {
		when(permissionGroupRepository.findById(1L)).thenReturn(Optional.of(defaultAdminGroup));
		UpdatePermissionGroupRequest req = new UpdatePermissionGroupRequest("ADMIN_GROUP", "Mô tả", List.of(1L)); // only BOOK_VIEW
		when(permissionRepository.findByIdIn(List.of(1L))).thenReturn(List.of(bookViewPerm));

		assertThrows(BadRequestException.class, () -> roleService.updatePermissionGroup(1L, req));
	}

	@Test
	@DisplayName("updateAccountGroup should prevent self-lockout")
	void testUpdateAccountGroup_SelfLockoutBlocked() {
		Account adminAccount = new Account();
		adminAccount.setId(2L);
		adminAccount.setEmail("admin2@library.com");

		when(accountRepository.findById(2L)).thenReturn(Optional.of(adminAccount));

		assertThrows(BadRequestException.class, () ->
				roleService.updateAccountGroup(2L, 10L, "admin2@library.com"));
	}
}
