package com.librarymanagement.dto.response;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// DTO trả về thông tin tài khoản kèm vai trò và nhóm quyền phục vụ màn hình phân quyền
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AccountRoleResponse {

	private Long accountId;
	private String email;
	private String role;
	private Long memberId;
	private String fullName;
	private Long groupId;
	private String groupName;
	private String groupDescription;
	private Boolean enabled;
	private Boolean isDelete;
	private List<String> permissions;
}
