package com.librarymanagement.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LoginRequest {
	@NotBlank(message = "Email không được để trống!")
	// @Email(message = "Sai định dạng email!") bỏ vì admin kh có
	private String email;

	@NotBlank(message = "Mật khẩu không được để trống!")
	private String password;

}
