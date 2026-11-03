package com.librarymanagement.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import com.librarymanagement.dto.request.UpdateAccountRoleRequest;
import com.librarymanagement.dto.response.AccountRoleResponse;
import com.librarymanagement.dto.response.PermissionGroupResponse;
import com.librarymanagement.service.RoleService;

class RoleControllerTest {

	private RoleService roleService;
	private RoleController roleController;

	@BeforeEach
	void setUp() {
		roleService = mock(RoleService.class);
		roleController = new RoleController(roleService);
	}

	@Test
	void getAllGroups_ShouldReturnListOfGroups() {
		List<PermissionGroupResponse> groups = List.of(
				new PermissionGroupResponse(1L, "ADMIN_GROUP", "Quản trị", List.of("ALL")),
				new PermissionGroupResponse(2L, "STAFF_GROUP", "Nhân viên", List.of("BOOK_VIEW"))
		);

		when(roleService.getAllPermissionGroups()).thenReturn(groups);

		ResponseEntity<List<PermissionGroupResponse>> response = roleController.getAllGroups();

		assertNotNull(response.getBody());
		assertEquals(2, response.getBody().size());
		verify(roleService).getAllPermissionGroups();
	}

	@Test
	void searchAccounts_ShouldReturnPageOfAccounts() {
		Pageable pageable = PageRequest.of(0, 10);
		Page<AccountRoleResponse> mockPage = new PageImpl<>(List.of());

		when(roleService.searchAccounts("test", pageable)).thenReturn(mockPage);

		ResponseEntity<Page<AccountRoleResponse>> response = roleController.searchAccounts("test", pageable);

		assertNotNull(response.getBody());
		verify(roleService).searchAccounts("test", pageable);
	}

	@Test
	void updateAccountRole_ShouldCallServiceAndUpdate() {
		UpdateAccountRoleRequest request = new UpdateAccountRoleRequest(2L);
		Authentication auth = mock(Authentication.class);
		when(auth.getName()).thenReturn("admin@library.com");

		AccountRoleResponse mockResponse = new AccountRoleResponse();
		mockResponse.setAccountId(10L);
		mockResponse.setGroupId(2L);
		mockResponse.setGroupName("STAFF_GROUP");

		when(roleService.updateAccountGroup(10L, 2L, "admin@library.com")).thenReturn(mockResponse);

		ResponseEntity<AccountRoleResponse> response = roleController.updateAccountRole(10L, request, auth);

		assertNotNull(response.getBody());
		assertEquals("STAFF_GROUP", response.getBody().getGroupName());
		verify(roleService).updateAccountGroup(10L, 2L, "admin@library.com");
	}
}
