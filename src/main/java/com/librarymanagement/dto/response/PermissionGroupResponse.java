package com.librarymanagement.dto.response;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// DTO trả về thông tin nhóm quyền để hiển thị cho Admin chọn lựa
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PermissionGroupResponse {

	private Long id;
	private String name;
	private String description;
	private Boolean isDefault;
	private Long accountCount;
	private List<String> permissions;

	// Constructor tương thích ngược cho code cũ và unit tests
	public PermissionGroupResponse(Long id, String name, String description, List<String> permissions) {
		this(id, name, description, false, 0L, permissions);
	}
}
