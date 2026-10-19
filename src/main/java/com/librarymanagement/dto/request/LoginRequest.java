package com.librarymanagement.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LoginRequest {
	@NotBlank(message = "Email không được để trống!")
	// @Email(message = "Sai định dạng email!") bỏ vì admin kh có
	@Pattern(regexp = "^(admin|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,})$", message = "Email phải đúng định dạng!")
	private String email;

	@NotBlank(message = "Mật khẩu không được để trống!")
	private String password;

}
