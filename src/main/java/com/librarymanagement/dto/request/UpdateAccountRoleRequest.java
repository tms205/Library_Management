package com.librarymanagement.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Request body khi Admin thực hiện đổi nhóm quyền cho tài khoản
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UpdateAccountRoleRequest {

	@NotNull(message = "Vui lòng chọn nhóm quyền muốn gán")
	private Long groupId;
}
