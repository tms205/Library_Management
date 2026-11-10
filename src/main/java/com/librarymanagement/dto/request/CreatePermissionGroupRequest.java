package com.librarymanagement.dto.request;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreatePermissionGroupRequest {

	@NotBlank(message = "Tên nhóm quyền không được để trống")
	@Size(min = 2, max = 100, message = "Tên nhóm quyền phải từ 2 đến 100 ký tự")
	private String name;

	@Size(max = 255, message = "Mô tả không được vượt quá 255 ký tự")
	private String description;

	private List<Long> permissionIds;
}
